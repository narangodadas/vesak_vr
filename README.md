# Vesak AR Lantern — Location Fixed, No Distance Version

This version removes the distance feature but keeps the location-fixed lantern idea.

## Behavior

1. User taps Start Camera.
2. User scans a QR code placed on the floor/ground.
3. Lantern appears at the QR location in pseudo-world space.
4. Lantern is NOT fixed to the phone screen center.
5. Rotating the phone changes the viewing angle.
6. Lantern size stays constant.
7. Distance / near-far scaling is removed.
8. Reset Anchor lets user scan again.
9. Screenshot captures camera + lantern.

## Important note

This is browser-only pseudo-world anchoring.
True AR world tracking needs WebXR immersive AR / ARCore / ARKit support.

## QR values

Use QR codes with:

```text
vesak-lantern-1
vesak-lantern-2
vesak-lantern-3
```

## Deploy to Vercel

```bash
git add .
git commit -m "location fixed no distance update"
git push
```

Vercel will automatically update the same live link.
