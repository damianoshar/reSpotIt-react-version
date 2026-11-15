# Tests & CI — React librespot client

```bash
npm test          # vitest run
```

15 test files / **99 tests** cover the link history, playlist retention, Spotify API service, Spotify playlist service, the media-server API client and playlist remote client, the playlist database (including the `added_at` → `position` sort mapping that broke the local playlist grid), the vault's `localStorage` mirror, plus the duplicate finder, catalogue duplicates, playlist list options, playlist playback, queue snapshot and active-queue planner helpers.

CI (`.github/workflows/release.yml`): JDK 17 + Node 20 → `npm ci` → `npm run build` → `npx cap sync android` → `./gradlew assembleRelease` → APK artifact + GitHub release on `v*` tags (debug-signed when no keystore secret is configured).
