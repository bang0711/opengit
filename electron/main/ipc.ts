import { ipcMain } from "electron";
import { API_CHANNELS } from "@shared/channels";
import * as handlers from "./handlers";
import { rewatch } from "./watch";

// Channels that change which repo is active → the file watcher must re-target.
const REWATCH = new Set(["openRepo", "cloneRepo", "closeRepo"]);

export function registerIpc(): void {
  const table = handlers as unknown as Record<
    string,
    (...args: unknown[]) => unknown
  >;
  for (const name of API_CHANNELS) {
    const fn = table[name];
    ipcMain.handle(`api:${name}`, async (_e, ...args) => {
      const result = await fn(...args);
      if (REWATCH.has(name)) void rewatch();
      return result;
    });
  }
}
