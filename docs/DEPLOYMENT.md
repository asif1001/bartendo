# Deployment Guide

## 1. Web (GitHub Pages)

Hosted at https://asif1001.github.io/bartendo/ (a GitHub Pages
*project site*). Override it with `BASE_PATH=/` for custom domains or user
root pages. Full deployment recipes live in this file and
`.github/workflows/deploy.yml`.

```bash
# one-time local build with the correct base path
npm ci
BASE_PATH=/bartendo/ npm run build
```

### Recommended GitHub Actions workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - name: Generate icons
        if: hashFiles('public/icons/icon-512.png') == ''
        run: npm run icons
      - run: npm run build
        env:
          BASE_PATH: /bartendo/
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

**Repository settings:** Settings → Pages → Build and deployment → Source =
*GitHub Actions*.

### HTTPS requirement

Web Bluetooth requires `navigator.bluetooth` to run on pages served over
**HTTPS** (or `localhost`). GitHub Pages, Firebase Hosting, and Netlify all
satisfy this automatically — never host the web build over plain HTTP.

### What Web Bluetooth can and cannot do

| Capability | Chrome/Edge desktop | Android Chrome | iPhone Safari |
|---|---|---|---|
| Scan via chooser | ✅ | ✅ | ❌ no support |
| Connect + write | ✅ | ✅ | ❌ |
| Background reconnect | ❌ | ❌ | ❌ |

iPhone control requires the **Capacitor native app** (Section 3), because
iOS Safari does not implement Web Bluetooth.

## 2. Android (Capacitor Native, preferred transport on phones)

Prerequisites: JDK 21, Android Studio (SDK 34+), USB debugging enabled.

```bash
npm install
npm run build
npx cap add android        # first time only
npx cap sync               # after every web rebuild
npx cap open android       # opens Android Studio
```

In Android Studio: *Build → Generate Signed App Bundle / APK*.

Running a debug build straight to a device plugged in via USB:

```bash
cd android
.\gradlew.bat assembleDebug
adb install -r app\build\outputs\apk\debug\app-debug.apk
```

Runtime permissions (Android 12+): the app calls
`BleClient.requestPermissions()` on first scan, triggering the native
`BLUETOOTH_SCAN` / `BLUETOOTH_CONNECT` dialogs. Pre-12 devices request
`ACCESS_FINE_LOCATION`. The `AndroidManifest.xml` template lives in
`android/app/src/main/AndroidManifest.xml`; permissions required are listed in
README §9.

## 3. iPhone (Capacitor Native / CoreBluetooth)

Native iOS compilation **requires macOS with Xcode 16+ (iOS 18 SDK)**.

```bash
npm install
npm run build
npx cap add ios            # first time only
npx cap sync
npx cap open ios           # opens Xcode
```

Required in `ios/App/App/Info.plist` (the `npm run build` of the plugin ships
this in its pod, but double-check the app target):

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>Asif RGB Controller uses Bluetooth to connect to your ESP32 RGB LED.</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>Connects to your ESP32 RGB LED controller.</string>
```

Signing: select your Apple ID team in Xcode (free account works for personal
device installs; paid account required for TestFlight/App Store). Connect an
iPhone, trust the developer certificate on the phone
(*Settings → General → VPN & Device Management*), then *Run*.

## 4. Local HTTPS testing for Web Bluetooth

```bash
npx vite --host
# Serve over https where supported:
npx localtunnel --port 5173
```

Open the tunnel URL on an Android phone to test Web Bluetooth on a real
handset without installing anything.
