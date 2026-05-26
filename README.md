# Vesak AR Lantern — Distance Fixed Version

## Fixes

- Lantern no longer stays too large.
- Close distance = lantern becomes large.
- Far distance = lantern becomes small.
- Added visible Distance HUD.
- Added Closer / Farther buttons.
- One finger vertical drag changes distance:
  - Drag down = closer / bigger
  - Drag up = farther / smaller

## Why buttons/drag are included

Normal mobile browser camera access does not provide true ARCore/ARKit position tracking.
So the app cannot reliably know if the user physically walked backward.

This version uses stable virtual distance controls to give the correct real-life distance effect.

## Run

Deploy to Vercel, or locally:

```bash
npx http-server -p 5000
```

Use HTTPS on mobile.

## QR values

```text
vesak-lantern-1
vesak-lantern-2
vesak-lantern-3
```
