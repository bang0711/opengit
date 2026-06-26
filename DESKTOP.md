# opengit desktop (Electron)

opengit ships as a desktop app via **Electron**. The app is a full
Next.js server (App Router, server actions + server components that shell out to
`git`), so it is **not** static-exported. Electron runs the Next server and
loads a window onto it.

- **dev** — `next dev` on :3000; Electron loads it (retries until ready).
- **prod** — Electron spawns the bundled `.next/standalone/server.js` as a Node
  child (Electron's own binary via `ELECTRON_RUN_AS_NODE`) on a free port, then
  loads `http://127.0.0.1:<port>`. The child is killed on quit.

No Node install required on the user's machine — Electron provides the runtime.

## Run in development

```
bun run electron:dev
```

Runs `next dev` and `electron .` together (via `concurrently`). The Electron
window opens and loads localhost:3000; DevTools open detached.

## Build a distributable (Windows .exe installer)

```
bun run electron:build
```

Runs icons → `next build` → `scripts/prepare-standalone.mjs` (merges
`.next/static` + `public/` into `.next/standalone`) → `electron-builder`.
Output lands in `release/`:

- `opengit-Setup-<version>.exe` — the installer (share this).

### Installer behavior (DBeaver-style, no admin)

The NSIS config (`package.json` → `build.nsis`) makes the installer:

- **per-user** (`perMachine: false`) → installs to
  `%LOCALAPPDATA%\Programs\opengit`, **no administrator rights needed**;
- **assisted** (`oneClick: false`, `allowToChangeInstallationDirectory`) → the
  user can pick the folder;
- create a **Start-menu** + **desktop** shortcut → the app is then findable via
  Windows Search ("opengit").

Uninstall via Settings → Apps, or the Start-menu uninstaller.

### First build downloads

electron-builder fetches NSIS + helper binaries on the first run (needs
network). macOS → `.dmg`, Linux → `.AppImage` if you build there.

### Code signing (optional but recommended)

The .exe is **unsigned**, so Windows SmartScreen shows "Windows protected your
PC" on first run — users click **More info → Run anyway**. To remove that, sign
with a code-signing certificate: set `CSC_LINK` (path to .pfx) + `CSC_KEY_PASSWORD`
env vars before `electron:build`, and electron-builder signs automatically.

## Pieces

- `next.config.ts` — `output: "standalone"`.
- `electron/main.cjs` — the Electron main process (dev/prod server handling).
- `scripts/prepare-standalone.mjs` — completes the standalone bundle.
- `package.json` `build` — electron-builder config; ships `.next/standalone` as
  `resources/app`.
- `build/icon.{png,ico}` — app icons (placeholders; replace with your own).

## Notes

- `runGit` disables git hooks (`core.hooksPath`) — a leftover from the abandoned
  hosted design. For a desktop client users may expect their hooks to run;
  revisit `src/lib/git.ts` if so.
- First `electron:dev` after a dependency change can hit a stale `.next` cache
  (the "global-error in Client Manifest" error) — clear `.next` and relaunch.
