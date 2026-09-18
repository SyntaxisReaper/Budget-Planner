# Adding New Icons — Mobile App + Website

Covers the Android app (Capacitor), the installable PWA, and the browser tab/favicon — all three read from the same source files, so this is one pass, not three separate jobs.

---

## 1. Why the current setup falls short

`logo.jpg` is currently reused for both the 192px and 512px "maskable" PWA icon slots. Two problems with that:
- **JPEG has no transparency**, so any non-square logo gets a visible white/colored box behind it instead of blending into the launcher.
- **A "maskable" icon needs padding built in.** Android crops maskable icons to circles, squircles, or rounded squares depending on the launcher — content sitting near the edge gets clipped. A maskable source needs the actual logo confined to the inner ~66% "safe zone," with the outer ring left as flat background color.

The fix is a proper source-asset set, run through Capacitor's own generator so Android, PWA, and favicon all come from the same place and never drift out of sync with each other.

---

## 2. Source assets you need to provide

Use the tool's **Easy Mode** — one logo file (plus an optional dark-mode variant) and two background colors is enough for a consistent app icon, adaptive icon, splash screen, and PWA manifest in one command.

Create a `resources/` folder at the project root:
```
resources/
├── logo.png        # your icon, ≥1024×1024, transparent background
└── logo-dark.png    # optional — used for dark-mode variants where supported
```

**Requirements for `logo.png`:**
- PNG, not JPEG (needs transparency)
- At least 1024×1024px, square
- The mark/symbol only — no padding baked in, no background fill. The tool adds background color and safe-zone padding itself based on the flags below, so a source with its own padding gets double-padded and looks off-center.

If you don't have a transparent high-res version of the current logo, that's the one thing to produce first — everything else in this doc assumes you have it.

---

## 3. Generate everything in one command

```bash
npm install --save-dev @capacitor/assets

npx capacitor-assets generate \
  --iconBackgroundColor '#0f172a' \
  --iconBackgroundColorDark '#0f172a' \
  --splashBackgroundColor '#0f172a' \
  --splashBackgroundColorDark '#0f172a' \
  --android --pwa
```
(Replace `#0f172a` with your actual theme background color — keep it consistent with the dark theme already used across the app so the launcher icon and splash screen don't clash with the UI the moment it opens.)

This single command:
- Generates the full Android adaptive-icon set (foreground + background layers at every density: mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi) and drops them into `android/app/src/main/res/mipmap-*/`
- Generates the round-icon variant Android launchers use
- Generates the splash screen resources for the native app
- Generates PWA icon files (standard `any`-purpose and padded `maskable`-purpose, at the sizes a manifest needs)

You don't need `--ios` yet since there's no iOS project in this repo currently — add it later the same way if that ever gets built.

---

## 4. Wiring the generated PWA icons into `vite.config`

The command above outputs icon files but doesn't touch your `vite-plugin-pwa` manifest config — that still needs the file list and `purpose` fields set by hand:

```js
VitePWA({
  manifest: {
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/maskable-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
})
```
Copy the generated PWA output files into `frontend/public/icons/` (or wherever the tool places them relative to your project) so the paths above resolve correctly, then confirm the `any` and `maskable` icons are listed as **separate entries** — a single icon can't correctly serve both purposes at once, which is the exact problem `logo.jpg` had.

---

## 5. Favicon + browser tab

Two small additions to `index.html`, since the generator focuses on app/PWA icons rather than legacy browser favicon formats:
```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
```
`favicon.svg` already exists in the repo — keep it as the primary favicon (scales cleanly at any size, no generation needed). The `apple-touch-icon` is a plain 180×180 PNG with no transparency (iOS ignores alpha and shows black where it's missing) — export one from the same source logo, on the same background color used above, since this is what shows if someone bookmarks the site to their iPhone home screen.

---

## 6. One thing to plan for now, if local notifications ever ship

Android notification icons follow a different rule than app icons: they must be a **flat white silhouette on a transparent background**, no color, no gradient — Android tints it automatically to match the notification shade. This isn't generated by the command above and needs its own small asset (`ic_stat_notify.png`, simplified single-color version of the logo) placed in `android/app/src/main/res/drawable/` if/when notifications get built. Not urgent today, just worth not forgetting later since it's a different asset from everything else in this doc.

---

## 7. Apply to the native project + verify

```bash
npx cap sync android
```
This copies the newly generated native resources into the actual Android project so a rebuild picks them up.

**Checklist:**
- [ ] `resources/logo.png` exists, ≥1024×1024, transparent background
- [ ] `npx capacitor-assets generate` run with your real theme color
- [ ] Android: app icon and splash screen show the new logo after `npx cap sync android` + rebuild
- [ ] PWA manifest icons updated in `vite.config`, both `any` and `maskable` purposes present
- [ ] Install the PWA on an Android phone and check the home-screen icon isn't cropped oddly (tests the maskable safe zone)
- [ ] `apple-touch-icon` added to `index.html` and confirmed with a real 180×180 PNG
- [ ] Old `logo.jpg`-only references removed once everything above is confirmed working, so nothing's still pointing at the JPEG
