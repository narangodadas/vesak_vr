# Vesak AR Lantern — World Anchor Update

## New behavior

1. User scans QR on the floor.
2. Lantern appears at a fixed pseudo-world location.
3. Phone movement/orientation changes viewing side.
4. Near = lantern looks bigger. Far = lantern looks smaller.
5. Reset Anchor lets user scan again.

## Important limitation

This is browser-only pseudo-world tracking, not true ARCore/ARKit SLAM. True physical tracking needs WebXR immersive AR support, which is not reliable across normal iOS Safari.

## QR values

```text
vesak-lantern-1
vesak-lantern-2
vesak-lantern-3
```

## Deploy

```bash
git add .
git commit -m "world anchor AR update"
git push
```

Vercel will auto-update your same live link.

## Test

Open Vercel HTTPS link on phone, tap Start Camera, allow camera/motion permission, scan QR, then move phone around. Drag up/down with one finger to manually simulate far/near movement if sensor distance is weak.
