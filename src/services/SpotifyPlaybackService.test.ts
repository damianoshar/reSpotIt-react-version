import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./SpotifyAuthService', () => ({
  getValidAccessToken: vi.fn(async () => 'test-token'),
}));
vi.mock('../utils/spotifyFetch', () => ({ sleep: vi.fn(async () => {}) }));

import { playOnActiveDevice } from './SpotifyPlaybackService';

describe('playOnActiveDevice', () => {
  afterEach(() => vi.restoreAllMocks());

  it('sends a single track as a URI list, not a playback context', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ devices: [{ id: 'device-1', is_active: true, is_restricted: false }] }), { status: 200 }),
    ).mockResolvedValueOnce(new Response(null, { status: 204 }));

    await playOnActiveDevice('spotify:track:track-1');

    const playCall = fetchMock.mock.calls[1];
    expect(playCall[0]).toContain('/me/player/play?device_id=device-1');
    expect(JSON.parse(String(playCall[1]?.body))).toEqual({ uris: ['spotify:track:track-1'] });
  });

  it('keeps album context playback and its offset unchanged', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ devices: [{ id: 'device-1', is_active: true, is_restricted: false }] }), { status: 200 }),
    ).mockResolvedValueOnce(new Response(null, { status: 204 }));

    await playOnActiveDevice('spotify:album:album-1', { position: 2 });

    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({
      context_uri: 'spotify:album:album-1', offset: { position: 2 },
    });
  });
});
