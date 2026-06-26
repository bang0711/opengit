import "server-only";

import { cookies } from "next/headers";
import { resolveRepoPath } from "@/lib/repo-registry";

// Active repo is identified by an opaque repoId, never a filesystem path. The
// id is resolved + authorized server-side (see repo-registry), so a tampered
// cookie can't point the app at an arbitrary directory or another user's repo.
const ACTIVE_COOKIE = "opengit.active";
// Recent is display-only: the last few paths shown in the picker. Reopening one
// re-runs registration + authorization, so it is not a trust boundary.
const RECENT_COOKIE = "opengit.recent";
const ONE_YEAR = 60 * 60 * 24 * 365;

/** The active repoId from the cookie, or null. */
export async function getActiveRepoId(): Promise<string | null> {
  const store = await cookies();
  const id = store.get(ACTIVE_COOKIE)?.value;
  return id?.trim() ? id : null;
}

/** Active repo resolved to a validated, authorized path — or null if invalid. */
export async function getValidActiveRepoPath(): Promise<string | null> {
  const id = await getActiveRepoId();
  if (!id) return null;
  try {
    return await resolveRepoPath(id);
  } catch {
    return null;
  }
}

/** Recent repo paths for the picker (display only). */
export async function getRecentRepos(): Promise<string[]> {
  const store = await cookies();
  const raw = store.get(RECENT_COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((p) => typeof p === "string")
      : [];
  } catch {
    return [];
  }
}

/** Mark `repoId` active and remember `path` in the recent list. */
export async function setActiveRepo(
  repoId: string,
  path: string,
): Promise<void> {
  const store = await cookies();
  store.set(ACTIVE_COOKIE, repoId, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
    httpOnly: true,
  });

  const recent = await getRecentRepos();
  const next = [path, ...recent.filter((p) => p !== path)].slice(0, 8);
  store.set(RECENT_COOKIE, JSON.stringify(next), {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
  });
}

/** Close the active repo (leaves recent list intact). */
export async function clearActiveRepo(): Promise<void> {
  const store = await cookies();
  store.delete(ACTIVE_COOKIE);
}
