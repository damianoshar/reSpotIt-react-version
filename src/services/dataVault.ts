import { registerPlugin } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

/**
 * Public data vault.
 *
 * The native side (DataVault.java) mirrors the app's private storage into
 * Documents/reSpotIt and Android/media/<pkg>/reSpotIt so a reinstall keeps the
 * sign-ins, settings and library. This module is the web layer's view of it.
 *
 * Capacitor Preferences (SharedPreferences) and the SQLite library are
 * mirrored natively. The few values that live in the WebView's localStorage
 * are copied into a Preferences key first, so they travel with the rest.
 */

export interface DataVaultStatus {
  /** Where the copy lives right now, e.g. "Documents/reSpotIt". */
  folder: string;
  /** The permission-free copy that makes an automatic restore possible. */
  fallbackFolder: string;
  /** True when the copy is in the real public Documents folder. */
  usingDocuments: boolean;
  /** True when the user still has to grant "All files access". */
  needsPermission: boolean;
  /** Epoch millis of the last save, 0 when there is none. */
  lastSaved: number;
  /** Number of mirrored files. */
  fileCount: number;
}

interface DataVaultNative {
  status(): Promise<DataVaultStatus>;
  save(): Promise<{ ok: boolean; lastSaved: number; fileCount: number }>;
  openAccessSettings(): Promise<void>;
}

/** Browser build: there is no native storage to mirror. */
const webFallback: DataVaultNative = {
  async status() {
    return {
      folder: 'browser storage',
      fallbackFolder: '',
      usingDocuments: false,
      needsPermission: false,
      lastSaved: 0,
      fileCount: 0,
    };
  },
  async save() {
    return { ok: false, lastSaved: 0, fileCount: 0 };
  },
  async openAccessSettings() { /* no-op in the browser */ },
};

const NativeVault = registerPlugin<DataVaultNative>('DataVault', {
  web: () => webFallback,
});

/** Preferences key that carries the localStorage snapshot. */
const MIRROR_KEY = 'respotit.vault.localStorage';

/**
 * Only app-owned keys are copied. The Spotify PKCE verifier
 * ("spotify_pkce") is deliberately left out: it is a short-lived credential
 * that is worthless once the auth code expires, and it has no business in a
 * folder other apps can read.
 */
const MIRRORED_PREFIXES = ['respotit.'];

function storageAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage;
}

/** Copies the app's localStorage entries into Preferences. */
export async function mirrorLocalStorage(): Promise<void> {
  if (!storageAvailable()) return;
  const snapshot: Record<string, string> = {};
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (!key) continue;
    if (!MIRRORED_PREFIXES.some((prefix) => key.startsWith(prefix))) continue;
    const value = window.localStorage.getItem(key);
    if (value !== null) snapshot[key] = value;
  }
  try {
    await Preferences.set({ key: MIRROR_KEY, value: JSON.stringify(snapshot) });
  } catch {
    /* the vault is best effort */
  }
}

/** Puts the mirrored localStorage entries back after a fresh install. */
export async function restoreLocalStorage(): Promise<void> {
  if (!storageAvailable()) return;
  try {
    const { value } = await Preferences.get({ key: MIRROR_KEY });
    if (!value) return;
    let parsed: Record<string, string>;
    try {
      parsed = JSON.parse(value);
    } catch {
      return;
    }
    for (const [key, entry] of Object.entries(parsed)) {
      if (window.localStorage.getItem(key) === null) {
        window.localStorage.setItem(key, entry);
      }
    }
  } catch {
    /* the vault is best effort */
  }
}

/** Mirrors everything and writes it to the public folder. */
export async function saveNow(): Promise<boolean> {
  await mirrorLocalStorage();
  try {
    const result = await NativeVault.save();
    return !!result?.ok;
  } catch {
    return false;
  }
}

export async function getStatus(): Promise<DataVaultStatus | null> {
  try {
    return await NativeVault.status();
  } catch {
    return null;
  }
}

/** Opens the system screen that grants "All files access". */
export async function requestDocumentsAccess(): Promise<void> {
  try {
    await NativeVault.openAccessSettings();
  } catch {
    /* the user can grant it from the system settings instead */
  }
}

/**
 * Flushes localStorage into Preferences when the app goes to the background,
 * so the native snapshot taken in onStop() includes it.
 */
export function watchAppHide(): void {
  if (typeof document === 'undefined') return;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void mirrorLocalStorage();
  });
}
