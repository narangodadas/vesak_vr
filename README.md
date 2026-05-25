# Vesak AR QR Lantern Web App

A mobile-browser AR-style web app for a Vesak festival competition.

## What this app does

1. Opens the phone camera after permission.
2. Continuously scans the camera feed for any QR code using `jsQR`.
3. When a QR code is detected, a procedural 3D Sri Lankan Vesak lantern appears over the live camera feed.
4. The lantern slowly rotates, glows, flickers, and can be resized/rotated with touch gestures.
5. The user can take a screenshot for the competition.

## Important limitation

This implementation uses camera + Three.js overlay tracking. It is the most compatible browser-only solution for iOS Safari and Android Chrome.

True markerless world tracking / SLAM and QR-as-a-real-world-anchor is not fully reliable in iOS Safari because iPhone Safari does not currently support normal WebXR `immersive-ar` sessions. AR.js supports marker/image tracking, but using an ordinary QR code directly as a stable image marker is not as robust as a trained AR marker/pattern.

## File structure

```text
vesak-ar-qr-app/
├── index.html
├── style.css
├── main.js
├── qr-scanner.js
├── lantern.js
├── screenshot.js
└── README.md
```

## How to run locally

Camera access requires HTTPS on mobile browsers.

### Option 1: Quick desktop test

```bash
cd vesak-ar-qr-app
npx http-server -p 8080
```

Open:

```text
http://localhost:8080
```

Desktop localhost can access camera without HTTPS in most browsers.

### Option 2: Mobile test with HTTPS

Install http-server if needed:

```bash
npm install -g http-server
```

Run HTTPS server:

```bash
cd vesak-ar-qr-app
npx http-server -S -C cert.pem -K key.pem -p 8080
```

If you do not have certificates, generate local test certificates:

```bash
openssl req -newkey rsa:2048 -new -nodes -x509 -days 365 -keyout key.pem -out cert.pem
```

Then open this URL on your phone using your computer LAN IP:

```text
https://YOUR_COMPUTER_IP:8080
```

You may need to accept the local certificate warning.

### Option 3: Mobile test using ngrok

```bash
cd vesak-ar-qr-app
npx http-server -p 8080
ngrok http 8080
```

Open the HTTPS ngrok URL on your phone.

## QR code for testing

Any QR code works. Use text like:

```text
vesak2026
```

Generate a QR code from any free QR generator, or use this browser URL:

```text
https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=vesak2026
```

Print it or show it on another screen, then scan it with the app.

## How to use the app

1. Open the app URL on a mobile phone.
2. Allow camera permission.
3. Point the camera at the QR code.
4. After detection, the Vesak lantern appears.
5. Move the phone slightly while keeping the QR visible for best tracking.
6. Use one finger to rotate the lantern.
7. Use two fingers to pinch zoom.
8. Tap **Screenshot** to save or download the AR image.

## Production notes

For real deployment:

- Host on HTTPS.
- Download Three.js r128 and jsQR locally instead of CDN links if you need fully offline/static hosting.
- For stronger marker anchoring, use a trained AR.js image marker or Hiro/custom pattern marker instead of a normal QR code.
- For iOS native AR Quick Look, use `.usdz` models, but screenshot/control inside the browser will be limited.
"# vesak_vr" 
