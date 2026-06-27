import { contextBridge, ipcRenderer } from "electron";
import { API_CHANNELS } from "@shared/channels";

// Build window.api from the shared channel list — each method invokes its IPC
// handler. Plus event subscriptions (repo changes, updater).
const api: Record<string, unknown> = {};
for (const name of API_CHANNELS) {
  api[name] = (...args: unknown[]) => ipcRenderer.invoke(`api:${name}`, ...args);
}
api.onRepoChange = (cb: () => void) => {
  const handler = () => cb();
  ipcRenderer.on("repo:changed", handler);
  return () => ipcRenderer.removeListener("repo:changed", handler);
};

const updater = {
  check: () => ipcRenderer.invoke("updater:check"),
  download: () => ipcRenderer.invoke("updater:download"),
  install: () => ipcRenderer.invoke("updater:install"),
  onEvent: (cb: (e: unknown) => void) => {
    const handler = (_e: unknown, payload: unknown) => cb(payload);
    ipcRenderer.on("updater:event", handler);
    return () => ipcRenderer.removeListener("updater:event", handler);
  },
};

contextBridge.exposeInMainWorld("api", api);
contextBridge.exposeInMainWorld("updater", updater);
