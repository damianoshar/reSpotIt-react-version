# reSpotIt — Android App (React + librespot)

## About

reSpotIt was built to fill gaps in Spotify's library management. It is an album-centric tool that lets you organize your library and playlists using rich filters, add entire artist discographies to your library or turn them into playlists, import album links from any website, and build queues from albums you are listening to right now. This is a work in progress — expect rough edges and things that may not work yet.

Standalone Android app for browsing your saved Spotify album library, plus an experimental on-device librespot player. No backend required — the library lives on the phone.

---

## 📥 Installation

Download the latest APK from the [releases page](https://github.com/damianoshar/reSpotIt-react-version/releases/tag/v0.1.3-librespot).

1. Download the APK.
2. Install on your Android device (enable "Install unknown sources" if needed).
3. Open the app and sign in with your Spotify account.
4. (Optional) Configure your own Spotify credentials, or the media-server URL, in Settings.

> **Note:** this client installs as `com.spotifydashboard.app.ts`. The Kotlin app is `com.spotifydashboard.app`, so both can be installed side by side. The two React variants share the same id — uninstall one before installing the other.

> **Build from source** — prerequisites, the native player, Gradle and release signing: [`docs/BUILD.md`](docs/BUILD.md).

---

## 🧱 Stack

- **UI:** React 18 + TypeScript 5.4, Vite 5
- **Shell:** Capacitor 6 (Android)
- **Storage:** `@capacitor-community/sqlite` + `jeep-sqlite`, `sql.js` for the browser
- **Native audio:** Rust librespot 0.8 core → Kotlin JNI bridge → `AudioTrack` (44.1 kHz stereo S16), driven by a Capacitor plugin
- **Auth:** OAuth 2.0 PKCE against Spotify (no SDK dependency)
- **Media-server mode:** optional HTTPS client for a reSpotIt server (`/api/v1`)
- **Toolchain:** Node 18+, JDK 17, Gradle 8.2.1 (wrapper), Rust + `cargo-ndk` + NDK 26.2 for the native player, compileSdk/targetSdk 34, minSdk 24 (Android 7.0)
- **App id:** `com.spotifydashboard.app` + `applicationIdSuffix ".ts"` → installs as **`com.spotifydashboard.app.ts`**

---

## reSpotIt Project Structure

reSpotIt is a multi-component project with several variants:

- **Local Server (standalone)** — Python/FastAPI backend + React web frontend + PostgreSQL. Runs entirely on your machine. No AI assistant. See `reSpotIt-local-server-app-version`.
- **Local Server + AI assistant** — Same server plus OpenWebUI, Keycloak, and MCP services for AI-powered library queries. See `reSpotIt-local-server-app-version` (full stack overlay).
- **React clients** (this repo) — Capacitor/TypeScript Android apps. Offer better compatibility on older Android models and low-RAM devices than the Kotlin client. Two variants:
  - **Standard** (`main` branch, see `reSpotIt-react-version`) — Web Playback SDK for browser-based playback.
  - **Librespot** (this repo, branch `librespot-player`) — Experimental on-device full-track playback via Rust/JNI. **Only this variant ships the on-device audio UI.**
- **Kotlin client** — Native Android app (Kotlin + Jetpack Compose). Full feature parity with media-server mode. See `reSpotIt-kotlin-version`.

This app is the **React client (librespot)** — it runs on older Android devices and provides experimental on-device full-track playback.

> **Standalone mode:** this app works fully offline without any server. All library data is stored on-device. Media-server mode is optional — enable it in Settings to sync, push/pull, and use the AI assistant.

**Repository:** https://github.com/damianoshar/reSpotIt-react-version (branch: `librespot-player`)

---

## 🎮 What you can do

| Area | What it does |
|---|---|
| **Library tab** | Album grid / list / compact-grid views, search, rich filters (artist, title, year, genre, date added), sorting, selection toolbar, album track sheet, stats bar, sync sheet with progress |
| **Playlists tab** | Create, edit, delete and reorder Spotify playlists, add/remove albums, public/private visibility, playlist expiry (retention), local queue playlist, duplicates inside a playlist |
| **Tools tab** | Stats, Add from site (in-app browser), **Scan page with AI (albums)**, Scan concerts (AI) / add concert manually, **concerts calendar** (month grid with day markers, day filter and card list), AI assistant, Playlist from Spotify search, Artist discography playlist, Find duplicate albums, Follow library artists |
| **Settings tab** | Media-server mode (server URL, sign-in, sync, push/pull), **phone storage vault** (sign-ins, settings and library survive a reinstall), backup (auto-backup + subfolder), album grid size, sync photos, autohide bottom nav / search bar, CSV import & export, hidden (duplicate) albums, retention, Spotify credentials, sign out |
| **Player tab** | Now playing, queue, Spotify Connect devices, Web Playback SDK player, **experimental on-device librespot player** (`LocalPlaybackCard`) |

**Media-server mode** unlocks the AI assistant, the AI page scans and concerts, because the LLM runs on the server. Everything else works offline.

---

## 📚 Documentation

| Document | What it covers |
|---|---|
| [`docs/LIBRESPOT.md`](docs/LIBRESPOT.md) | On-device playback architecture, runtime behaviour, known gaps |
| [`docs/FEATURES.md`](docs/FEATURES.md) | AI page capture and the phone-storage vault |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | PKCE auth flow, data flow, full source layout |
| [`docs/BUILD.md`](docs/BUILD.md) | Spotify developer setup, build steps, native player, release signing |
| [`docs/TESTING.md`](docs/TESTING.md) | Test suite and what it covers |
| [`docs/SECURITY.md`](docs/SECURITY.md) | CA trust, LAN access, secrets and the vault caveat |
| [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) | Common failures and fixes |
| [`docs/SCREENS.md`](docs/SCREENS.md) | Every screen, captured from a real device |
