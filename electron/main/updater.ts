import { BrowserWindow, ipcMain } from "electron";
import { autoUpdater } from "electron-updater";

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
