# AniVault Android

A minimal native Android shell for AniVault. The interface is the live AniVault website inside Android WebView; the only substantial native integration is Discord Rich Presence.

## Build

Requires JDK 17, Android SDK/NDK, CMake 3.22.1 and Gradle 8.7.

```bash
gradle :app:assembleRelease
```

APK: `app/build/outputs/apk/release/app-release.apk`.

The build targets ARM64 Android devices and includes the Discord Partner SDK.
