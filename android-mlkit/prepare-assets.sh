#!/usr/bin/env bash
# Run this from the repo root before building the APK in Android Studio.
# It builds the React app and copies the output into the Gradle project.
set -e
cd "$(dirname "$0")/.."

echo "Building React app..."
npm run build

echo "Copying web assets..."
rm -rf android-mlkit/app/src/main/assets/www
mkdir -p android-mlkit/app/src/main/assets/www/assets
cp dist/index.html android-mlkit/app/src/main/assets/www/
cp dist/assets/*   android-mlkit/app/src/main/assets/www/assets/

echo "Copying Tesseract offline engine (fallback for non-Android)..."
if [ -d android-build/assets/www/tesseract ]; then
  cp -r android-build/assets/www/tesseract \
        android-mlkit/app/src/main/assets/www/tesseract
fi

echo "Copying keystore..."
cp android-build/debug.keystore android-mlkit/app/debug.keystore

echo "Done. Open android-mlkit/ in Android Studio and click Build > Build APK."
