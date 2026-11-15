# AniVault Android — Discord Rich Presence

The app is a lightweight native Android WebView wrapper for `https://www.anivault.co`. It does not ship the old React Native/Expo screens or runtime. Discord Rich Presence is implemented natively using the Discord Partner SDK.

## Build

Requires JDK 17, Android SDK/NDK, CMake 3.22.1 and Gradle 8.7.

```bash
gradle --no-daemon :app:assembleRelease
```

The APK is generated at `app/build/outputs/apk/release/app-release.apk`. GitHub Actions builds and uploads it automatically on relevant Android source changes.

## Discord presence

The native bridge reads the current `/watch` page, including anime title, episode, poster/banner, playback state and progress. It updates Discord Rich Presence and clears it when playback ends or the user leaves the watch page.
