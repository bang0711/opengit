// Whether the docked terminal is open. Shared so the workspace can render/size
// its panel while the topbar button, Ctrl+J, and the terminal's own controls all
// flip the same state.
import { useSyncExternalStore } from "react";

let open = false;
const subs = new Set<() => void>();

export function getTerminalOpen(): boolean {
  return open;
}

export function setTerminalOpen(v: boolean): void {
  if (open === v) return;
  open = v;
  subs.forEach((f) => f());
}

/** Toggle the terminal from anywhere (topbar, Ctrl+J, xterm key handler). */
export function toggleTerminal(): void {
  setTerminalOpen(!open);
}

function subscribe(cb: () => void): () => void {
  subs.add(cb);
  return () => subs.delete(cb);
}

export function useTerminalOpen(): boolean {
  return useSyncExternalStore(subscribe, getTerminalOpen, getTerminalOpen);
}
