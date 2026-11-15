# Build & Release — React client

Everything needed to build the APK, sign it and let CI publish it.

---

## ⚙️ Spotify Developer Setup (do this first)

1. Go to https://developer.spotify.com/dashboard and create an app.
2. In your app settings, add this **Redirect URI** (exact string):
   ```
   com.spotifydashboard.app://callback
   ```
3. Under "APIs used", enable **Web API**.
4. Provide the **Client ID** either:
   - in the app: login screen → **Configure Spotify credentials** (Client ID, plus Client Secret for server flows), or
   - at build time: `VITE_SPOTIFY_CLIENT_ID` in `.env` (see `src/config/spotify.ts`).

> **Note:** Since Nov 2025 Spotify requires PKCE — implicit grant is removed. This app uses the PKCE Authorization Code flow as required.
> The app ships with a built-in reSpotIt client id; you only need your own if you want a different app registration.

---

## 🚀 Setup

### Prerequisites
- Node.js 18+
- JDK 17 + Android SDK (platform 34, build-tools 34.0.0)
- Android Studio (optional — the CLI works)

### 1 — Install dependencies
```bash
npm install
```

### 2 — Build the web bundle and sync Capacitor
```bash
npm run sync        # = npm run build (tsc --noEmit && vite build) && npx cap sync android
```

> **Note:** the `android/` platform is **already committed** to this repository (59 files). Do **not** run `npx cap add android` — Capacitor will refuse to add a platform that already exists.
> There is also **no `android-patches/` folder** in this repository: the manifest, `MainActivity` and the network security config are already in place under `android/app/src/main/`. (The Kotlin repo has an `android-patches/` folder; this one does not.)

### 3 — Build the APK
```bash
cd android
./gradlew assembleDebug      # -> android/app/build/outputs/apk/debug/app-debug.apk
./gradlew assembleRelease    # -> android/app/build/outputs/apk/release/app-release.apk
```

### 4 — Run in the IDE
```bash
npm run open:android         # = npx cap open android
# Press Run, or Build -> Build APK(s)
```

### 5 — Install on a device
```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

---

## 🔐 Release signing

Signing is opt-in through a **gitignored** properties file at `android/keystore.properties`:

```properties
storeFile=app-release.keystore
storePassword=…
keyAlias=…
keyPassword=…
```

- If the file exists, the `release` build type uses it; otherwise Gradle falls back to **debug signing** (installs fine, but the key differs from the signed release on the device).
- `android/keystore.properties` and `*.keystore` are gitignored — never commit them.
- CI (`.github/workflows/release.yml`) decodes the keystore from the `ANDROID_KEYSTORE_BASE64`, `ANDROID_STORE_PASSWORD`, `ANDROID_KEY_ALIAS` and `ANDROID_KEY_PASSWORD` secrets, runs `npm ci` → `npm run build` → `npx cap sync android` → `./gradlew assembleRelease`, uploads the APK as an artifact and publishes it to the GitHub release for `v*` tags.
