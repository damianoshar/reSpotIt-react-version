# Build & Release — React librespot client

Everything needed to build the APK (including the native player), sign it and let CI publish it.

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

## 🛠 Build from Source

### Prerequisites
- Node.js 18+
- JDK 17 + Android SDK (platform 34, build-tools 34.0.0)
- Android Studio (optional — the CLI works)
- **Rust toolchain + `cargo-ndk` + Android NDK 26.2** (only if you rebuild the native player)
- Spotify Developer account

### 1 — Install dependencies
```bash
npm install
```

### 2 — Build the web bundle and sync Capacitor
```bash
npm run sync        # = npm run build (tsc --noEmit && vite build) && npx cap sync android
```

> **Note:** the `android/` platform is **already committed** to this repository. Do **not** run `npx cap add android` — Capacitor refuses to add a platform that already exists.
> There is **no `android-patches/` folder** here: the manifest, `MainActivity` and the network security config are already in place under `android/app/src/main/`.

### 3 — Build the native librespot player (only if the `.so` files are missing)
```powershell
$env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"
$env:ANDROID_NDK_HOME = "$env:LOCALAPPDATA\Android\Sdk\ndk\26.2.11394342"
Set-Location native/audio-librespot/rust
cargo ndk -t arm64-v8a -t armeabi-v7a -t x86 -t x86_64 --platform 24 `
  -o ../src/main/jniLibs build --release
```

Output: `native/audio-librespot/src/main/jniLibs/<abi>/libspotify_librespot.so` (git-ignored). All four ABIs are needed for the phone/tablet matrix — `armeabi-v7a` (older Neffos/Lenovo), `arm64-v8a` (TCL/Xiaomi and most modern phones), `x86`/`x86_64` (emulators).

`cargo build --target aarch64-linux-android` alone is **not** enough: it neither produces the JNI-wrapped library nor populates `jniLibs`.

### 4 — Build the APK
```bash
cd android
./gradlew assembleDebug      # -> android/app/build/outputs/apk/debug/app-debug.apk
./gradlew assembleRelease    # -> android/app/build/outputs/apk/release/app-release.apk
```

### 5 — Run in the IDE
```bash
npm run open:android         # = npx cap open android
# Press Run, or Build -> Build APK(s)
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
