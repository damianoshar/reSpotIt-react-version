# Architecture — React client

How the app is wired: authentication, data flow and the source layout.

---

## 🔐 Auth Flow (PKCE)

```
User taps "Connect with Spotify"
        ↓
Chrome Custom Tab opens Spotify login
        ↓
User approves → Spotify redirects to:
  com.spotifydashboard.app://callback?code=XXX&state=YYY
        ↓
Android intent filter catches deep link → App resumes
        ↓
App exchanges code + verifier for access + refresh tokens
        ↓
Tokens stored via @capacitor/preferences (survives app restarts)
        ↓
Auto-refresh when token expires (55 min cycle)
```

The PKCE verifier/state are written to `localStorage` **before** the browser opens, so a low-RAM device that kills the app in the background can still complete the callback when it is re-opened.

---

## 🗺️ Data Flow

```
Spotify Auth (PKCE)
      ↓
SpotifyApiService.fetchAllSavedAlbums()
  → GET /me/albums  (paginated, 50/page)
  → GET /artists?ids=…  (batch genre enrichment)
      ↓
SyncService.downloadAlbumImage()  →  Filesystem (cached)
      ↓
DatabaseService.upsertAlbum()     →  SQLite
      ↓
useLibrary → React UI

Media-server mode:
  Server (FastAPI)  ⇄  services/remote/*  →  SQLite (push/pull)
                              ↓
                    POST /api/v1/llm/extract-albums (AI page scan)
```

---

## 📦 Project Structure

```
src/
├── config/spotify.ts            ← Client ID, scopes, redirect URIs
├── App.tsx                      ← Root component, tab router, tool wiring
├── components/                  ← 38 components
│   ├── LoginScreen.tsx / SpotifyCredentialsScreen.tsx / ServerLoginScreen.tsx
│   ├── Header.tsx / StatsBar.tsx / StatsPanel.tsx / FilterBar.tsx
│   ├── AlbumGrid.tsx / AlbumCard.tsx / AlbumTrackSheet.tsx / Artwork.tsx
│   ├── SyncModal.tsx / SyncProgress.tsx / SyncHistory.tsx
│   ├── PlaylistModal.tsx / PlaylistPicker.tsx / PlaylistDashboardView.tsx
│   ├── AddFromSiteDialog.tsx    ← in-app browser (WebView) + link/page snapshot
│   ├── AiUrlScanDialog.tsx      ← "Scan page with AI (albums)"
│   ├── ConcertsDialog.tsx / ConcertsListDialog.tsx / ConcertScanRow.tsx
│   ├── AIAssistantDialog.tsx
│   ├── DuplicatesDialog.tsx / RetentionDialog.tsx / LinkHistory.tsx
│   ├── BackupPanel.tsx / ServerPanel.tsx / SettingsView.tsx
│   ├── PhoneStoragePanel.tsx    ← vault status, "All files access", manual save
│   ├── PlayerView.tsx / WebPlaybackSdkPlayer.tsx
│   └── EmptyState.tsx / ErrorBoundary.tsx / SelectionToolbar.tsx
├── services/
│   ├── SpotifyAuthService.ts    ← PKCE flow, token exchange, refresh, storage
│   ├── SpotifyApiService.ts     ← saved albums + artist genres (paginated)
│   ├── SpotifyCatalogService.ts / SpotifyPlaylistService.ts / SpotifyPlaylistFeedService.ts
│   ├── SpotifyPlaybackService.ts / WebPlaybackSdkService.ts
│   ├── DatabaseService.ts / PlaylistDatabaseService.ts / webSqlite.ts
│   ├── SyncService.ts / ExportService.ts / LLMService.ts / addFromSite.ts
│   ├── linkHistory.ts / PlaylistRetentionService.ts / QueuePlaylistStore.ts
│   ├── playbackTuning.ts / librespotPlayer.ts / SpotifyCredentialsService.ts
│   ├── dataVault.ts             ← vault bridge + localStorage mirror
│   ├── remote/                  ← media-server client (apiClient, libraryRemote,
│   │                              playlistRemote, concertsRemote, concertScansRemote,
│   │                              duplicatesRemote, retentionRemote, serverAuth, spotifyRemote)
│   └── storage/                 ← filesystem/storage helpers
├── hooks/                       ← useSpotifyAuth, useLibrary, useDataSource, useServerAuth,
│                                  usePlayerQueue, usePlaylistDashboard, useSelection,
│                                  useBackupSettings, useLocalPlayback, useToast
├── contexts/SyncPhotosContext.tsx
├── types/index.ts
├── utils/                       ← duplicateFinder, catalogDuplicates, playlistListOptions,
│                                  playlistPlayback, queueSnapshot, activeQueuePlanner,
│                                  duplicateBlocklist, spotifyFetch, spotifyLinks, syncHistory, debounce
├── styles/global.css
└── config/spotify.ts

android/                          ← committed Capacitor project (59 files)
├── app/src/main/java/com/spotifydashboard/app/
│   ├── MainActivity.java        ← registers the Capacitor plugins + vault restore/backup
│   ├── AddFromSitePlugin.java   ← in-app browser bridge (link scan + page snapshot)
│   ├── PlaybackTuningPlugin.java← battery-optimisation / keep-screen-on prompts
│   ├── DataVault.java           ← mirrors shared_prefs, databases, files into the public folder
│   └── DataVaultPlugin.java     ← Capacitor plugin: status / save / openAccessSettings
└── app/src/main/res/xml/network_security_config.xml

native/audio-librespot/           ← Rust/JNI librespot module (present on this branch,
                                   the on-device player UI lives on librespot-player)
docs/                            ← landing-page assets + SCREENS.md (screen guide with screenshots)
docs/screenshots/                ← device screenshots used by the screen guide
```
