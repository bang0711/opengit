// Terminal session list, held outside the panel so it survives the panel being
// unmounted (e.g. toggling the terminal off/on, which docks/undocks it). Closing
// a tab removes it for good; toggling keeps whatever tabs you had.
//
// Note: the backend PTYs are killed when their view unmounts (on toggle-off) and
// re-spawned for the same tabs on toggle-on — the tab list persists, live
// scrollback does not.
import { useSyncExternalStore } from "react";
import { setTerminalOpen } from "./terminal-open";

export type TermSession = { id: string; name: string };

let sessions: TermSession[] = [];
let activeId: string | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `t-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

export function addSession(): void {
  const id = uuid();
  sessions = [...sessions, { id, name: `Terminal ${sessions.length + 1}` }];
  activeId = id;
  emit();
}

export function closeSession(id: string): void {
  sessions = sessions.filter((s) => s.id !== id);
  if (activeId === id) activeId = sessions.at(-1)?.id ?? null;
  if (sessions.length === 0) setTerminalOpen(false);
  emit();
}

export function renameSession(id: string, name: string): void {
  const n = name.trim();
  if (!n) return;
  sessions = sessions.map((s) => (s.id === id ? { ...s, name: n } : s));
  emit();
}

export function setActiveSession(id: string): void {
  if (activeId === id) return;
  activeId = id;
  emit();
}

/** Create a first session if there are none (called when the panel mounts). */
export function ensureSession(): void {
  if (sessions.length === 0) addSession();
}

const subscribe = (cb: () => void) => {
  subs.add(cb);
  return () => subs.delete(cb);
};

export function useSessions(): TermSession[] {
  return useSyncExternalStore(
    subscribe,
    () => sessions,
    () => sessions,
  );
}

export function useActiveSession(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => activeId,
    () => activeId,
  );
}
