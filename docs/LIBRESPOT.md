# Experimental librespot playback — React librespot client

This variant embeds a real audio stack instead of streaming to a Connect device.

## Architecture

- **Rust core** — `native/audio-librespot/rust/` (librespot 0.8 + vendored identity/tempfile patches)
- **JNI bridge** — `native/audio-librespot/src/main/java/com/spotifydashboard/librespot/`:
  `LibrespotBridge.kt` → `LibrespotEngine.kt` → `PcmPlayer.kt` (44.1 kHz stereo S16 → `AudioTrack`)
- **Session/auth** — `LibrespotPlayback.kt`, `LibrespotAuth.kt`, `LibrespotCredentialsStore.kt`
- **App layer** — `playback/LocalPlaybackController.kt`, `playback/LocalPlaybackService.kt` (foreground media service)
- **Web bridge** — `LibrespotPlayerPlugin.kt` (`@CapacitorPlugin(name = "LibrespotPlayer")`), registered in `MainActivity.java`
- **Gradle wiring** — `android/settings.gradle` maps `:audio-librespot` to `../native/audio-librespot`; `android/app/build.gradle` depends on it

## Runtime behaviour

- The on-device card only appears when the native plugin is present (`isLocalPlaybackAvailable()` checks `Capacitor.isPluginAvailable('LibrespotPlayer')`), so the same web bundle also runs without the native libs.
- **First play** opens Spotify's consent page with the librespot desktop client id. The resulting reusable credentials are stored in the app's private SharedPreferences; later starts connect silently. "Forget account" removes them.
- **Full tracks require Spotify Premium.**
- The player registers as a **Spotify Connect device**. It is independent from the dashboard's Spotify login and does not change it.
- The player can be toggled off, kept connected between sessions, and driven from the album track sheet (play / queue next / queue end / queue album).

## Known gaps

Experimental: seek accuracy, gapless playback, background audio focus handling and battery behaviour on older devices are still rough. The Web Playback SDK path remains available as a fallback.

---

## ⚙️ Player limitations

- The **Web Playback SDK** path is browser-based: it requires Spotify Premium and the `streaming` scope, and offers no buffer/quality settings.
- The **on-device librespot** path (this variant) plays full tracks locally, but see the known gaps above.
- The dashboard's own Spotify login and the librespot login are separate credentials.
