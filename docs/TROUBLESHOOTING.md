# Troubleshooting — React client

| Symptom | Likely cause | Fix |
|---|---|---|
| `npx cap add android` fails | The platform is already committed | Do not add it — run `npm run sync` |
| App shows the old UI after a code change | The web bundle was not re-synced | `npm run sync` before building; verify the asset hash in `android/app/src/main/assets/public` |
| `SSLHandshakeException` / cert warning on the server URL | The server cert does not cover the LAN IP, or the CA is not trusted on the phone | Reissue the leaf with the LAN IP in the SAN list; install the CA as a user certificate (or build with the `src/personal/res` overlay) |
| "Server unreachable" | Phone and PC on different networks, or the firewall blocks the port | Same Wi-Fi; `adb shell nc -w 3 <pc-ip> 8000`; add a firewall rule |
| AI scan spins for minutes | Album extraction is synchronous and chunked server-side; a CPU-only LLM is slow | Wait it out; the client uses a long read timeout for LLM calls. Check the server log for `/api/v1/llm/extract-albums` |
| Login returns to the app but nothing happens | Another app registered the `com.spotifydashboard.app://callback` scheme | Remove the conflicting handler; `MainActivity` must be the only one |
| App killed in the background while logging in | Low-RAM device reclaimed the process | The PKCE state is persisted before the browser opens, so re-opening completes the flow |
| Playback jumps forward / underruns | Android throttling the WebView | Use Settings → playback tuning to disable battery optimisation and keep the screen on |
| Album page scan finds nothing | The page renders its list lazily | Scroll the page before snapshotting, or use **Scan** to extract the links already present |
| Only one client can be installed | Application-id clash | This client installs as `com.spotifydashboard.app.ts`; the Kotlin app is `com.spotifydashboard.app` — they coexist. Two React variants (same `.ts` id) do not: uninstall one first. |
| Playlist dashboard shows **No albums found.** with a red error banner | The sort field the server calls `added_at` has no column in the local `playlist_albums` table | Fixed in `v0.1.3` — `added_at` now maps to the physical `position` column. Update the app; the banner shows the real SQL error instead of an empty grid. |
| Artist filter only includes one name | The artist filter is multi-select; one or more names may be checked in **Filters → Artist** | Search for each artist and check them. Matching uses OR semantics across artist credits. Use **All Artists** or **Clear selected artists** to reset. |
| Pressing **Play** for a track in the album/playlist sheet appears to do nothing | Spotify rejects a single `spotify:track:` URI when sent as `context_uri` | Update the client. Single tracks are now sent as `uris: [trackUri]`; album, artist and playlist contexts still use `context_uri`. Ensure Spotify is open on an active device and the account has Premium playback access. |
| Playlist deletion is unavailable in media-server mode | The client previously only deleted playlists through the on-device Spotify session | Update the React client and media server. Remote deletion unfollows the playlist on Spotify and clears the server cache and retention rule. |
| Spotify / server sign-in and the library are gone after reinstalling | Android deleted the private data and no vault copy was restorable | Before uninstalling, open **Settings → Phone storage**, grant *All files access* and press **Save to Documents**. The `Android/media` copy needs no permission and is the automatic fallback. |
