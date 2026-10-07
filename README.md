# Teatime

A personal weekly meal planner for Android: breakfast, lunch, dinner and snacks planned to
daily calorie and protein targets, live Tesco prices, an aisle-sorted shopping list, and
calorie estimates from photos of what you actually ate.

## Install on your phone

1. On your Android phone, open this repository's **Releases** page on GitHub and tap the newest `Teatime-1.0.N.apk`.
2. When Android asks, allow your browser to install unknown apps.
3. Open **Teatime** from your home screen.

Each new build installs over the previous one and keeps your data.

## How it's built

- `src/` holds the app (HTML, CSS and JavaScript). `scripts/build-web.mjs` bundles it into `www/`.
- Capacitor wraps `www/` in the Android project in `android/`.
- `.github/workflows/build-apk.yml` builds a signed APK on every push to `main` and attaches it to a GitHub Release.

## Signing key

`android/app/teatime-release.jks` and `android/app/keystore.properties` sign every build with the same key,
so updates install over the top. Keep this repository **private**. If you lose this key, uninstall the app
(back up your data first in Settings → Backup) before installing a build signed with a new key.

## Meal photos

Plan → **Snap a meal** takes a photo (or picks one from your gallery). Claude identifies each food,
estimates the portion and works out calories, protein, carbs and fat. You can change the portion or the
grams of any item before logging it. Photos stay on the phone as small thumbnails for three weeks; only
the estimate is kept after that.

## Data

Everything is stored on the phone. Settings → Backup saves a file you can restore later. Your API keys are
stored on the phone and are not included in backups.
