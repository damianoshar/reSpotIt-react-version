import { beforeEach, describe, expect, it, vi } from 'vitest';

// The playlist reader talks to SQLite through DatabaseService.ensureDb().
// We stub that connection so the test can inspect the SQL that is built.
const captured: string[] = [];

const db = {
  async query(statement: string, _values?: unknown[]) {
    captured.push(statement);
    return { values: [] };
  },
  async run() { return { changes: { changes: 0 } }; },
  async execute() { /* no-op */ },
};

vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => 'android' },
}));

vi.mock('@capacitor/filesystem', () => ({
  Filesystem: { writeFile: vi.fn() },
  Directory: { Documents: 'DOCUMENTS' },
  Encoding: { UTF8: 'utf8' },
}));

vi.mock('./DatabaseService', () => ({
  ensureDb: async () => db,
  saveToStore: async () => {},
  PAGE_SIZE: 48,
}));

import {
  loadPlaylistAlbums,
  resolvePlaylistOrderBy,
  resolvePlaylistSortColumn,
} from './PlaylistDatabaseService';

beforeEach(() => {
  captured.length = 0;
});

describe('resolvePlaylistSortColumn', () => {
  it('maps the "Date Added" field onto the position column', () => {
    // The playlist table has `position`, not `added_at` — ordering by
    // `added_at` raised "no such column" and emptied the album grid.
    expect(resolvePlaylistSortColumn('added_at')).toBe('position');
  });

  it('keeps the columns that exist under the same name', () => {
    for (const col of ['title', 'artist', 'year', 'genre', 'track_count']) {
      expect(resolvePlaylistSortColumn(col)).toBe(col);
    }
  });

  it('falls back to artist for an unknown field', () => {
    expect(resolvePlaylistSortColumn('drop table')).toBe('artist');
    expect(resolvePlaylistSortColumn('')).toBe('artist');
  });
});

describe('resolvePlaylistOrderBy', () => {
  it('sorts position numerically, without LOWER()', () => {
    expect(resolvePlaylistOrderBy('added_at')).toBe('position');
  });

  it('sorts text columns case-insensitively', () => {
    expect(resolvePlaylistOrderBy('title')).toBe('LOWER(title)');
    expect(resolvePlaylistOrderBy('artist')).toBe('LOWER(artist)');
  });

  it('sorts year numerically', () => {
    expect(resolvePlaylistOrderBy('year')).toBe('year');
  });
});

describe('loadPlaylistAlbums', () => {
  it('orders by position when sorting by "Date Added"', async () => {
    await loadPlaylistAlbums('p1', '', '', 'added_at', 'desc');
    expect(captured).toHaveLength(1);
    expect(captured[0]).toContain('ORDER BY position DESC');
    expect(captured[0]).not.toContain('added_at');
  });

  it('orders by artist by default', async () => {
    await loadPlaylistAlbums('p1');
    expect(captured[0]).toContain('ORDER BY LOWER(artist) ASC');
  });

  it('never emits an unknown column in ORDER BY', async () => {
    await loadPlaylistAlbums('p1', '', '', 'album_id; DROP TABLE playlist_albums', 'asc');
    expect(captured[0]).toContain('ORDER BY LOWER(artist) ASC');
  });
});
