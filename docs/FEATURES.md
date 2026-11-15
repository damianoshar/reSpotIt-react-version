# Features & behaviour — React client

What each tab does, plus the technical notes behind the AI scans, the phone-storage vault and playback.

---

## 🎮 Features

| Area | What it does |
|---|---|
| **Library tab** | Album grid / list / compact-grid views, search, rich filters (artist, title, year, genre, date added), sorting, selection toolbar, album track sheet, stats bar, sync sheet with progress |
| **Playlists tab** | Create, edit, delete and reorder Spotify playlists, add/remove albums, public/private visibility, playlist expiry (retention), local queue playlist, duplicates inside a playlist |
| **Tools tab** | Stats, Add from site (in-app browser), **Scan page with AI (albums)**, Scan concerts (AI) / add concert manually, **concerts calendar** (month grid with day markers, day filter and card list), AI assistant, Playlist from Spotify search, Artist discography playlist, Find duplicate albums, Follow library artists |
| **Settings tab** | Media-server mode (server URL, sign-in, sync, push/pull), **phone storage vault** (sign-ins, settings and library survive a reinstall), backup (auto-backup + subfolder), album grid size, sync photos, autohide bottom nav / search bar, CSV import & export, hidden (duplicate) albums, retention, Spotify credentials, sign out |
| **Player tab** | Now playing, queue, Spotify Connect devices, Web Playback SDK player |

**Media-server mode** unlocks the AI assistant, the AI page scans and concerts, because the LLM runs on the server. Everything else works offline.

---

## AI page capture (albums)

`Tools → Scan page with AI (albums)` → paste a URL → **Open in browser and scan** loads the page in the app's own WebView (`AddFromSiteDialog`) → **Scan this page for albums (AI)** snapshots the rendered DOM. The captured text is posted to the media server (`POST /api/v1/llm/extract-albums`), which chunks long pages, extracts `(artist, album)` pairs with the local LLM and resolves them against Spotify.

The same browser offers **Scan this page for concerts (AI)** for concert pages.

---

## 💾 Phone storage vault (data survives a reinstall)

Android deletes `/data/data/com.spotifydashboard.app.ts` on uninstall, so a
fresh install used to ask for the Spotify login, the media-server login and the
library all over again. The app now keeps a copy of that private data in a
**public folder** and restores it before the first screen loads.

* **What is mirrored** — `shared_prefs/` (Spotify tokens, server URL + JWT,
  every setting), `databases/` (the SQLite library and playlists) and `files/`
  (CSV exports written through the Filesystem plugin). The WebView `localStorage`
  keys are mirrored into a Capacitor Preferences key, so the dashboard state
  survives too. The PKCE `spotify_pkce` verifier is deliberately **not** copied.
* **Where it goes** — two destinations, so at least one always works:
  * `Documents/reSpotIt/` — visible in the Files app. Needs **All files access**
    on Android 11+; the *Phone storage* card in Settings offers a button for it.
  * `Android/media/com.spotifydashboard.app.ts/reSpotIt/` — no permission
    required, also survives an uninstall, just less discoverable.
* **How the restore picks a copy** — the newest `vault-info.txt` marker wins.
  The marker is written last, so a half-finished copy is never treated as valid.
* **When it runs** — a restore happens on start, before any SharedPreferences or
  database is opened (so the app comes up already signed in); a backup happens
  when the app goes to the background. Settings → **Phone storage** shows the
  folder, the file count and the last save, with **Save now** and **Save to
  Documents** (the latter grants *All files access*).

> **Security:** the public copies contain the Spotify refresh token and the
> server JWT **in plaintext**, readable by any app with storage access. They are
> never uploaded anywhere and are excluded from Git. *Sign out* clears the
> private data, but the last vault copy stays until the next save — delete
> `Documents/reSpotIt` by hand on a shared device.

---

## ⚙️ Player limitations

- This branch uses Spotify's official **Web Playback SDK** (browser-based). It requires Spotify Premium and the `streaming` scope.
- No buffer/quality settings are available in the Web Playback SDK.
- On-device playback is **not** available on this branch: `native/audio-librespot` is present as a Gradle module, but the local-player UI lives on the `librespot-player` branch of `reSpotIt-react-version`.
- The Web Playback SDK is exposed as an opt-in diagnostic in Settings; `PlayerView.tsx` keeps the queue-based player.
