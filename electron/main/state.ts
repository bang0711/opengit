import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { app } from "electron";

// Active repo + recent list, persisted to a JSON file in userData. Replaces the
// cookie-based store used by the old Next server (no cookies in a desktop SPA).
type State = { activeRepoId: string | null; recent: string[] };

const file = () => join(app.getPath("userData"), "opengit-state.json");

function read(): State {
  try {
    const parsed = JSON.parse(readFileSync(file(), "utf8"));
    return {
      activeRepoId:
        typeof parsed.activeRepoId === "string" ? parsed.activeRepoId : null,
      recent: Array.isArray(parsed.recent)
        ? parsed.recent.filter((p: unknown) => typeof p === "string")
        : [],
    };
  } catch {
    return { activeRepoId: null, recent: [] };
  }
}

function write(s: State): void {
  try {
    writeFileSync(file(), JSON.stringify(s, null, 2), "utf8");
  } catch {}
}

export function getActiveRepoId(): string | null {
  return read().activeRepoId;
}

export function setActiveRepo(repoId: string, path: string): void {
  const s = read();
  s.activeRepoId = repoId;
  s.recent = [path, ...s.recent.filter((p) => p !== path)].slice(0, 8);
  write(s);
}

export function clearActiveRepo(): void {
  const s = read();
  s.activeRepoId = null;
  write(s);
}

export function getRecentRepos(): string[] {
  return read().recent;
}
