import { beforeEach, describe, expect, it, vi } from 'vitest';

// The vault talks to the native plugin and to Capacitor Preferences; both
// are stubbed so the web-side logic can be tested on its own.
const prefs = new Map<string, string>();

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    async get({ key }: { key: string }) {
      const value = prefs.get(key);
      return value === undefined ? { value: undefined } : { value };
    },
    async set({ key, value }: { key: string; value: string }) {
      prefs.set(key, value);
    },
  },
}));

const nativeCalls = { save: 0, status: 0 };

vi.mock('@capacitor/core', () => ({
  registerPlugin: () => ({
    async status() {
      nativeCalls.status += 1;
      return {
        folder: 'Documents/reSpotIt',
        fallbackFolder: 'Android/media/com.spotifydashboard.app.ts/reSpotIt',
        usingDocuments: true,
        needsPermission: false,
        lastSaved: 1700000000000,
        fileCount: 7,
      };
    },
    async save() {
      nativeCalls.save += 1;
      return { ok: true, lastSaved: 1700000000000, fileCount: 7 };
    },
    async openAccessSettings() { /* no-op */ },
  }),
}));

import {
  getStatus,
  mirrorLocalStorage,
  restoreLocalStorage,
  saveNow,
} from './dataVault';

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(key: string): string | null { return this.map.has(key) ? this.map.get(key)! : null; }
  setItem(key: string, value: string): void { this.map.set(key, value); }
  removeItem(key: string): void { this.map.delete(key); }
  clear(): void { this.map.clear(); }
  key(index: number): string | null { return [...this.map.keys()][index] ?? null; }
  get length(): number { return this.map.size; }
}

beforeEach(() => {
  prefs.clear();
  nativeCalls.save = 0;
  nativeCalls.status = 0;
  vi.stubGlobal('window', { localStorage: new MemoryStorage() });
});

describe('mirrorLocalStorage', () => {
  it('copies app-owned keys into Preferences', async () => {
    window.localStorage.setItem('respotit.linkHistory.v1.concerts', '[]');
    await mirrorLocalStorage();
    const raw = prefs.get('respotit.vault.localStorage');
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!)).toEqual({ 'respotit.linkHistory.v1.concerts': '[]' });
  });

  it('leaves the Spotify PKCE verifier out', async () => {
    window.localStorage.setItem('spotify_pkce', '{"verifier":"secret"}');
    await mirrorLocalStorage();
    const raw = prefs.get('respotit.vault.localStorage');
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!)).toEqual({});
    expect(raw).not.toContain('secret');
  });

  it('ignores keys that are not ours', async () => {
    window.localStorage.setItem('someone-else', 'value');
    await mirrorLocalStorage();
    expect(JSON.parse(prefs.get('respotit.vault.localStorage')!)).toEqual({});
  });
});

describe('restoreLocalStorage', () => {
  it('puts mirrored entries back after a fresh install', async () => {
    window.localStorage.setItem('respotit.linkHistory.v1.concerts', '[{"id":"1"}]');
    await mirrorLocalStorage();

    // Fresh install: the WebView storage is empty, Preferences survived.
    vi.stubGlobal('window', { localStorage: new MemoryStorage() });
    await restoreLocalStorage();

    expect(window.localStorage.getItem('respotit.linkHistory.v1.concerts'))
      .toBe('[{"id":"1"}]');
  });

  it('does not overwrite a value that is already there', async () => {
    window.localStorage.setItem('respotit.linkHistory.v1.concerts', 'old');
    await mirrorLocalStorage();

    window.localStorage.setItem('respotit.linkHistory.v1.concerts', 'new');
    await restoreLocalStorage();

    expect(window.localStorage.getItem('respotit.linkHistory.v1.concerts')).toBe('new');
  });

  it('survives a corrupted mirror', async () => {
    prefs.set('respotit.vault.localStorage', '{not json');
    await expect(restoreLocalStorage()).resolves.toBeUndefined();
  });
});

describe('saveNow', () => {
  it('mirrors first, then writes the copy', async () => {
    window.localStorage.setItem('respotit.linkHistory.v1.concerts', '[]');
    const ok = await saveNow();
    expect(ok).toBe(true);
    expect(nativeCalls.save).toBe(1);
    expect(prefs.get('respotit.vault.localStorage')).toContain('linkHistory');
  });
});

describe('getStatus', () => {
  it('reports where the copy lives', async () => {
    const status = await getStatus();
    expect(status?.folder).toBe('Documents/reSpotIt');
    expect(status?.usingDocuments).toBe(true);
    expect(status?.fileCount).toBe(7);
  });
});
