# Budget Planner — Desktop App Implementation Plan (Tauri 2)

Wraps the existing React/Vite frontend in a native desktop shell. No changes to the core app logic, the Express/Supabase backend, or the data model — this is an additive platform, exactly like the Android build was.

---

## 0. What doesn't change

- Same `frontend/` React codebase, same components, same design system
- Same Express + Supabase backend on Render — the desktop app is just another HTTPS client
- Same auth flow (Supabase session, JWT)

## 1. Project structure

```
Budget-Planner/
├── frontend/          # existing Vite/React app — unchanged
├── backend/           # existing Express/Supabase backend — unchanged
└── desktop/           # new
    └── src-tauri/
        ├── Cargo.toml
        ├── tauri.conf.json
        ├── capabilities/
        ├── icons/
        └── src/
            └── main.rs
```

---

## 2. Phase 1 — Scaffold

**One-time machine setup:**
```bash
# Rust toolchain — required to compile the native shell, even though
# you won't write custom Rust logic for the features in this plan
curl https://sh.rustup.rs -sSf | sh   # macOS/Linux
# Windows: use rustup-init.exe from rustup.rs
```

**Project init:**
```bash
npm install --save-dev @tauri-apps/cli
npm run tauri init
```
When prompted:
| Prompt | Value |
|---|---|
| App name | Budget Planner |
| Window title | Budget Planner |
| Web assets location (`frontendDist`) | `../frontend/dist` |
| Dev server URL (`devUrl`) | `http://localhost:5173` |
| Frontend dev command | `npm run dev` (run in `frontend/`) |
| Frontend build command | `npm run build` (run in `frontend/`) |

**Verify:** `npm run tauri dev` should open a window loading your existing Vite dev server. If login/auth screens render correctly, the wrapper is working — nothing else needs to change for the app to function at a basic level.

---

## 3. Phase 2 — Backend compatibility (the one gotcha)

Tauri serves your frontend from its own internal origin (`tauri://localhost` or `http://tauri.localhost`, depending on OS). Your Express backend's CORS allow-list currently permits the web app's Vercel origin and Capacitor's mobile origin — **it will reject requests from the Tauri origin until you add it explicitly.**

In your backend's CORS config:
```js
const allowedOrigins = [
  'https://budget-planner-nine-rose.vercel.app',
  'capacitor://localhost',
  'http://tauri.localhost',   // add this
  'tauri://localhost',        // and this, for platforms that use it
];
```
Test this early — it's the kind of thing that works fine in `tauri dev` (which may proxy differently) and then silently breaks in a packaged build if missed.

Confirm your build-time environment variables (`VITE_API_URL`, Supabase keys) are present when `frontend/dist` is built for desktop, exactly as they are for the web/Android builds — Tauri just loads whatever static files exist in that folder.

---

## 4. Phase 3 — Native feature plugins

Every Tauri plugin needs one boilerplate registration line in `src-tauri/src/main.rs` — this is copy-paste, not custom Rust development:
```rust
tauri::Builder::default()
    .plugin(tauri_plugin_global_shortcut::init())
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_updater::init())
    .run(tauri::generate_context!())
```

| Feature | npm package | cargo crate |
|---|---|---|
| Global keyboard shortcut | `@tauri-apps/plugin-global-shortcut` | `tauri-plugin-global-shortcut` |
| Native notifications | `@tauri-apps/plugin-notification` | `tauri-plugin-notification` |
| Native Save-As dialogs | `@tauri-apps/plugin-dialog` | `tauri-plugin-dialog` |
| Auto-update | `@tauri-apps/plugin-updater` | `tauri-plugin-updater` |

**System tray** is configured mostly through `tauri.conf.json` (`trayIcon` key) plus the `@tauri-apps/api/tray` JS API for the menu — wiring the click handler typically needs a small Rust snippet in `main.rs`, the one piece in this plan that isn't pure boilerplate, but it's a handful of lines, not real feature logic.

### Notification adapter — one function, three backends

Your `lib/notifications.js` currently calls `@capacitor/local-notifications` directly. Wrap it so the rest of the app never needs to know which shell it's running in:
```js
import { Capacitor } from '@capacitor/core';

export async function notify({ title, body }) {
  if (Capacitor.isNativePlatform()) {
    // existing Capacitor LocalNotifications call
  } else if (window.__TAURI__) {
    const { sendNotification } = await import('@tauri-apps/plugin-notification');
    sendNotification({ title, body });
  } else {
    // web fallback — Notification API, or no-op
  }
}
```
Every existing call site (subscription reminders, debt-paid celebration, low-balance alert) switches to this one function instead of the Capacitor import directly.

### Tray menu (suggested)
- Quick Add Transaction
- Open Dashboard
- Show/Hide Window
- Quit

### Native Save-As for existing exports
Your PDF/CSV export currently triggers a browser download. On desktop, wrap the save step with `@tauri-apps/plugin-dialog`'s `save()` to get a real native file picker instead.

---

## 5. Phase 4 — Window chrome

Two options in `tauri.conf.json`'s `app.windows[0]`:
- `"decorations": true` — native OS title bar. **Recommended for the first working build** — simplest, zero extra CSS work.
- `"decorations": false` — fully custom frameless title bar matching your glassmorphic theme, with your own minimize/maximize/close buttons wired via `@tauri-apps/api/window`. Treat this as a Phase 6 polish item once the app is functionally complete, not a blocker to shipping v1.

---

## 6. Phase 5 — Icons

Reuse the same source asset from the earlier icon guide (`resources/logo.png`, ≥1024×1024, transparent). Tauri has its own generator:
```bash
npm run tauri icon path/to/logo.png
```
This produces every platform-specific icon size Tauri needs directly into `src-tauri/icons/` — same idea as `@capacitor/assets`, just Tauri's own tool.

---

## 7. Phase 6 — Packaging & CI

`tauri build` only produces a native package for the OS it runs on — you can't cross-compile a `.dmg` from Windows, for example. The practical path is a GitHub Actions matrix build using the official `tauri-apps/tauri-action`:

```yaml
# .github/workflows/desktop-release.yml
name: Desktop Release
on:
  push:
    tags: ['desktop-v*']
jobs:
  release:
    strategy:
      matrix:
        platform: [macos-latest, windows-latest, ubuntu-latest]
    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v4
      - uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_PRIVATE_KEY }}
        with:
          tagName: ${{ github.ref_name }}
          releaseName: 'Budget Planner ${{ github.ref_name }}'
```
This one workflow builds `.msi` (Windows), `.dmg`/`.app` (macOS), and `.deb`/`.AppImage` (Linux) in parallel and attaches them to a GitHub Release automatically.

**Signing note:** unsigned builds work fine for personal use but trigger a Windows SmartScreen warning and a macOS Gatekeeper block on first launch. Not a blocker — just expect to click through an "unknown publisher" warning unless you later pursue a code-signing certificate.

---

## 8. Phase 7 — Auto-update

1. Generate a signing keypair once: `npm run tauri signer generate` — keep the private key as a GitHub Actions secret (`TAURI_PRIVATE_KEY` above), put the public key in `tauri.conf.json`'s `plugins.updater.pubkey`.
2. `tauri-action` (from Phase 6) automatically generates and publishes the `latest.json` update manifest alongside each release's binaries.
3. On app launch, call the updater plugin's `check()` — if a newer version is published, prompt the user to download and restart.

---

## 9. Verification checklist

- [ ] `npm run tauri dev` opens a window and loads the app correctly
- [ ] Login/auth works (confirms Supabase calls succeed from the Tauri origin)
- [ ] Backend CORS updated to allow the Tauri origin — test a full packaged build, not just `tauri dev`
- [ ] Core flows work: log a transaction, view Dashboard, open Trips/Tasks/Calendar
- [ ] Tray icon appears with working menu items
- [ ] Global shortcut opens quick-add from outside the app window
- [ ] A notification fires correctly (test one of the existing triggers — subscription reminder, low balance)
- [ ] PDF/CSV export opens a native Save-As dialog
- [ ] `tauri build` succeeds on at least one platform end-to-end
- [ ] GitHub Actions matrix build produces all three platform artifacts
- [ ] Auto-updater detects a newer tagged release and prompts correctly

---

## 10. Suggested build order

1. Phase 1 (scaffold) → confirm the window opens at all
2. Phase 2 (CORS fix) → confirm real data loads, not just the login screen
3. Phase 3 (native plugins) → tray, shortcut, notifications, save dialogs
4. Phase 5 (icons) → quick, low-risk, do it as soon as the app is visually recognizable
5. Phase 6 (CI packaging) → get a real installable build in hand
6. Phase 7 (auto-update) → once you're actually distributing builds to more than just your own machine
7. Phase 4 (custom window chrome) → polish pass, last, once everything above is solid
