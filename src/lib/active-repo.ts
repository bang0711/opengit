import "server-only";

import { cookies } from "next/headers";
import { isGitRepo } from "@/lib/git";

const ACTIVE_COOKIE = "opengit.active";
const RECENT_COOKIE = "opengit.recent";
const ONE_YEAR = 60 * 60 * 24 * 365;

/** Absolute path of the repo currently open, or null. */
export async function getActiveRepoPath(): Promise<string | null> {
  const store = await cookies();
  const path = store.get(ACTIVE_COOKIE)?.value;
  return path?.trim() ? path : null;
}

/** Active repo path, but only if it still points at a real git repo. */
export async function getValidActiveRepoPath(): Promise<string | null> {
  const path = await getActiveRepoPath();
  if (!path) return null;
  return (await isGitRepo(path)) ? path : null;
}

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

export async function setActiveRepoPath(path: string | null): Promise<void> {
  const store = await cookies();
  if (!path) {
    store.delete(ACTIVE_COOKIE);
    return;
  }
  store.set(ACTIVE_COOKIE, path, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
  });

  const recent = await getRecentRepos();
  const next = [path, ...recent.filter((p) => p !== path)].slice(0, 8);
  store.set(RECENT_COOKIE, JSON.stringify(next), {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
  });
}
