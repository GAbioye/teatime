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

## Budget first

The planner keeps the week within your budget first. For each day it tries every combination of recipes,
picks the one that best fits your targets within that day's share of the budget, then swaps the costliest
meals for cheaper ones if the week still comes out over.

## Nutrition targets

Calories and protein, plus optional carb limit, fat target and minimum fibre (Settings, 0 = off).
Every recipe and photo-logged meal tracks calories, protein, carbs, fat and fibre.

## Adding recipes from websites

Recipes → paste one or more recipe links (one per line), for example from beatthebudget.com. The phone opens
each page, reads its recipe data, and Claude turns it into a Teatime recipe with the site's own nutrition and
cost per portion where given. The recipe keeps a link back to the original page. For personal use.

## Low carb

Settings → Daily targets → **Carb limit** (grams per person per day, 0 for no limit). The planner keeps every
day under it as well as hitting your calorie and protein targets. Recipes → **Low carb** shows recipes with
20g of carbs or less a serving, and carb-heavy recipes link to their low-carb versions.

## Meal photos

Plan → **Snap a meal** takes a photo (or picks one from your gallery). Claude identifies each food,
estimates the portion and works out calories, protein, carbs and fat. You can change the portion or the
grams of any item before logging it. Photos stay on the phone as small thumbnails for three weeks; only
the estimate is kept after that.

## Order with Claude

Shopping → **Order with Claude** copies a ready-to-send request with your list and opens the Claude app.
Start a new chat, paste and send. Claude uses the built-in browser in the Claude desktop app on your
computer to fill your Tesco basket, then stops before checkout. Keep the desktop app open, and sign in to
Tesco in its browser once. You book the delivery slot and pay yourself.

## Data

Everything is stored on the phone. Settings → Backup saves a file you can restore later. Your API keys are
stored on the phone and are not included in backups.
