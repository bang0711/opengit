import { execFileSync, spawn } from "node:child_process";
import { chmodSync, copyFileSync, createWriteStream } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { app, BrowserWindow, ipcMain, shell } from "electron";
import { autoUpdater } from "electron-updater";
import type { Release } from "@shared/types";

const REPO = "bang0711/OpenGit";

const relaunchThenQuit = (cmd: string, args: string[]) => {
  spawn(cmd, args, { detached: true, stdio: "ignore" }).unref();
  setTimeout(() => app.quit(), 800);
};

/** Install the downloaded file for the current OS, then relaunch where we can. */
async function installDownloaded(
  file: string,
  emit: (p: unknown) => void,
): Promise<void> {
  if (process.platform === "win32") {
    // NSIS installer: run it; quit so it can replace the running files.
    const err = await shell.openPath(file);
    if (err) throw new Error(err);
    emit({ type: "picker-launched" });
    setTimeout(() => app.quit(), 1500);
    return;
  }

  if (process.platform === "linux") {
    const target = process.env.APPIMAGE; // path of the running AppImage
    if (target) {
      copyFileSync(file, target); // overwrite the installed AppImage in place
      chmodSync(target, 0o755);
      emit({ type: "picker-launched" });
      relaunchThenQuit(target, []);
    } else {
      chmodSync(file, 0o755);
      const err = await shell.openPath(file);
      if (err) throw new Error(err);
      emit({ type: "picker-launched" });
    }
    return;
  }

  // macOS: mount the dmg, swap the running .app bundle, relaunch.
  // Only in the packaged app — in dev process.execPath is Electron's own bundle.
  if (!app.isPackaged) {
    await shell.openPath(file);
    emit({ type: "picker-launched" });
    return;
  }
  // process.execPath = …/OpenGit.app/Contents/MacOS/OpenGit
  const appPath = process.execPath.split("/Contents/")[0];
  try {
    const out = execFileSync("hdiutil", [
      "attach",
      "-nobrowse",
      "-noautoopen",
      file,
    ]).toString();
    const mount = out.trim().split("\n").pop()?.split("\t").pop()?.trim();
    if (!mount) throw new Error("Could not mount the disk image.");
    try {
      const src = execFileSync("sh", ["-c", `ls -d "${mount}"/*.app`])
        .toString()
        .trim();
      execFileSync("rm", ["-rf", appPath]);
      execFileSync("cp", ["-R", src, appPath]);
      // Drop the quarantine flag so Gatekeeper lets the new copy launch.
      try {
        execFileSync("xattr", ["-dr", "com.apple.quarantine", appPath]);
      } catch {}
    } finally {
      try {
        execFileSync("hdiutil", ["detach", mount]);
      } catch {}
    }
    emit({ type: "picker-launched" });
    relaunchThenQuit("open", [appPath]);
  } catch {
    // No write access (e.g. needs admin) — fall back to opening the dmg.
    await shell.openPath(file);
    emit({ type: "picker-launched" });
  }
}

// Download an installer asset to a temp file (streaming progress) and launch it:
//   win  → runs Setup.exe (NSIS installs over the running app)
//   mac  → opens the .dmg in Finder
//   linux→ marks the AppImage executable and runs it
async function downloadAndRun(
  url: string,
  emit: (payload: unknown) => void,
): Promise<void> {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Download failed (${res.status})`);
  const total = Number(res.headers.get("content-length")) || 0;
  const name = url.split("/").pop() || "OpenGit-installer";
  const file = join(tmpdir(), name);
  const out = createWriteStream(file);

  const reader = res.body.getReader();
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    out.write(Buffer.from(value));
    received += value.length;
    if (total) {
      emit({ type: "picker-progress", percent: Math.round((received / total) * 100) });
    }
  }
  await new Promise<void>((resolve) => out.end(resolve));
  await installDownloaded(file, emit);
}

// List published releases with the installer asset for THIS OS. Used by the
// "install a specific version" picker (works in dev too — just opens a browser).
async function listReleases(): Promise<Release[]> {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/releases?per_page=30`,
    { headers: { "User-Agent": "OpenGit", Accept: "application/vnd.github+json" } },
  );
  if (!res.ok) return [];
  const data = (await res.json()) as Array<{
    tag_name: string;
    html_url: string;
    draft: boolean;
    prerelease: boolean;
    assets: Array<{ name: string; browser_download_url: string }>;
  }>;
  const re =
    process.platform === "win32"
      ? /Setup.*\.exe$/i
      : process.platform === "darwin"
        ? /\.dmg$/i
        : /\.AppImage$/i;
  const current = app.getVersion();
  return data
    .filter((d) => !d.draft)
    .map((d) => {
      const version = String(d.tag_name || "").replace(/^v/, "");
      const asset = (d.assets || []).find((a) => re.test(a.name));
      return {
        version,
        tag: d.tag_name,
        assetUrl: asset?.browser_download_url ?? null,
        pageUrl: d.html_url,
        prerelease: !!d.prerelease,
        current: version === current,
      };
    });
}

// Auto-update driven from the renderer over IPC (window.updater). Handlers are
// always registered so the renderer never hits "no handler"; the real update
// logic only runs in the packaged app.
let wired = false;

export function wireUpdater(isDev: boolean, log: (...a: unknown[]) => void): void {
  if (wired) return;
  wired = true;

  const emit = (payload: unknown) => {
    for (const w of BrowserWindow.getAllWindows()) {
      if (!w.isDestroyed()) w.webContents.send("updater:event", payload);
    }
  };

  ipcMain.handle("updater:check", async () => {
    if (isDev) return emit({ type: "not-available" });
    try {
      await autoUpdater.checkForUpdates();
    } catch (e) {
      emit({ type: "error", message: (e as Error).message });
    }
  });
  ipcMain.handle("updater:download", () => {
    if (isDev) return;
    autoUpdater
      .downloadUpdate()
      .catch((e) => emit({ type: "error", message: e.message }));
  });
  ipcMain.handle("updater:install", () => {
    if (!isDev) autoUpdater.quitAndInstall();
  });

  // Version picker — available in dev + prod (just lists/opens browser).
  ipcMain.handle("updater:releases", async () => {
    try {
      return await listReleases();
    } catch (e) {
      log("listReleases failed:", (e as Error).message);
      return [];
    }
  });
  ipcMain.handle("updater:openDownload", (_e, url: string) =>
    shell.openExternal(url),
  );
  ipcMain.handle("updater:downloadVersion", async (_e, url: string) => {
    try {
      await downloadAndRun(url, emit);
    } catch (e) {
      emit({ type: "picker-error", message: (e as Error).message });
    }
  });

  if (isDev) return;

  autoUpdater.autoDownload = false;
  autoUpdater.logger = { info: log, warn: log, error: log, debug: () => {} };
  autoUpdater.on("update-available", (i) =>
    emit({ type: "available", version: i.version }),
  );
  autoUpdater.on("update-not-available", () => emit({ type: "not-available" }));
  autoUpdater.on("download-progress", (p) =>
    emit({ type: "progress", percent: Math.round(p.percent) }),
  );
  autoUpdater.on("update-downloaded", (i) =>
    emit({ type: "downloaded", version: i.version }),
  );
  autoUpdater.on("error", (e) =>
    emit({ type: "error", message: e?.message || String(e) }),
  );
  // Quiet launch check; missing latest.yml on an old release is benign.
  autoUpdater.checkForUpdates().catch(() => {});
}
