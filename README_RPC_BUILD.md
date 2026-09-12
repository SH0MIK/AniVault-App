# AniVault Android build + Discord Rich Presence

This app is the separate React Native/Expo AniVault app. Discord Rich Presence is integrated into the native Android build; it is not the website bridge.

## Local build

```bash
npm ci
npx expo prebuild --platform android --no-install
cd android
./gradlew assembleRelease -PdiscordApplicationId=1505538731791093820
```

The APK is produced at `android/app/build/outputs/apk/release/app-release.apk`.

## GitHub Actions

The workflow at `.github/workflows/android-app.yml` installs Node/Java, runs Expo prebuild, compiles the native Android project and uploads the APK as a workflow artifact.

The Discord application ID is supplied through `DISCORD_APPLICATION_ID` (repository variable/secret) and falls back to the AniVault development application ID when unset.
