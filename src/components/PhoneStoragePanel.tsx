import React, { useCallback, useEffect, useState } from 'react';
import {
  DataVaultStatus,
  getStatus,
  requestDocumentsAccess,
  saveNow,
} from '../services/dataVault';

function formatSaved(epochMs: number): string {
  if (!epochMs) return 'Not saved yet';
  try {
    return new Date(epochMs).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return new Date(epochMs).toISOString();
  }
}

export const PhoneStoragePanel: React.FC = () => {
  const [status, setStatus]   = useState<DataVaultStatus | null>(null);
  const [busy,   setBusy]     = useState(false);
  const [saved,  setSaved]    = useState(false);
  const [error,  setError]    = useState('');

  const refresh = useCallback(() => {
    getStatus().then(setStatus).catch(() => setStatus(null));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleSave = async () => {
    setBusy(true); setError(''); setSaved(false);
    try {
      const ok = await saveNow();
      if (!ok) setError('Could not write the copy - check the storage permission.');
      else setSaved(true);
    } catch (e: any) {
      setError(e?.message ?? 'Save failed');
    } finally {
      setBusy(false);
      refresh();
    }
  };

  const handleGrant = async () => {
    setError('');
    await requestDocumentsAccess();
    // The system screen opens in front of the app; the status refreshes when
    // the user comes back.
    setTimeout(refresh, 800);
  };

  if (!status) {
    return <p className="sync-desc">Checking the phone storage&hellip;</p>;
  }

  return (
    <div className="backup-panel">
      <div className="backup-path-row">
        <span className="backup-path-prefix">{status.folder}</span>
      </div>
      <p className="backup-path-hint">
        {status.fileCount > 0 ? `${status.fileCount} files` : 'No copy yet'}
        {status.lastSaved ? ` · Last saved ${formatSaved(status.lastSaved)}` : ''}
      </p>
      <p className="sync-desc">
        Sign-ins, settings and the library are copied to the phone so reinstalling the app keeps them.
        A second copy stays in {status.fallbackFolder} - a reinstall restores whichever is newest.
      </p>

      {!status.usingDocuments && (
        <>
          <p className="sync-desc" style={{ marginTop: '0.5rem' }}>
            Grant storage access to also keep a visible copy in Documents/reSpotIt.
          </p>
          <button className="sync-btn full-width" onClick={handleGrant}>
            Save to Documents
          </button>
        </>
      )}

      <button
        className={'sync-btn full-width ' + (busy ? 'syncing' : '')}
        onClick={handleSave}
        disabled={busy}
        style={{ marginTop: '0.75rem' }}
      >
        {busy
          ? <><span className="spinner" aria-hidden="true" />&nbsp;Saving&hellip;</>
          : saved ? 'Saved ✓' : 'Save now'}
      </button>

      {error && <div className="sync-error" role="alert">&#x26A0; {error}</div>}
    </div>
  );
};
