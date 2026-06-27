import { watch, type FSWatcher } from "chokidar";
import type { BrowserWindow } from "electron";
import { activeRepoPath } from "./handlers";

// Watches the active repo's working tree and pushes a debounced "repo:changed"
// to the renderer, which re-fetches. Replaces the old SSE /api/watch route.
let watcher: FSWatcher | null = null;
let win: BrowserWindow | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

const IGNORED = [/(^|[/\\])node_modules([/\\]|$)/, /\.git[/\\](objects|lfs)/];

export function initWatch(w: BrowserWindow): void {
  win = w;
  void rewatch();
}

export async function rewatch(): Promise<void> {
  if (watcher) {
    await watcher.close().catch(() => {});
    watcher = null;
  }
  const repo = await activeRepoPath();
  if (!repo) return;

  watcher = watch(repo, {
    ignored: IGNORED,
    ignoreInitial: true,
    persistent: true,
    depth: 20,
  });
  watcher.on("all", () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      if (win && !win.isDestroyed()) win.webContents.send("repo:changed");
    }, 500);
  });
}
