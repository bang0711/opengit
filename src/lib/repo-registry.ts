import "server-only";

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { isGitRepo } from "@/lib/git";

// ── Identity seam ────────────────────────────────────────────────────────────
// SECURITY: this is the ONE place that decides "who is this request". Every
// ownership check downstream trusts the id it returns. For local single-user
// use it returns a fixed id. BEFORE HOSTING, replace the body with real auth —
// look up the verified session/JWT (e.g. via next/headers cookies) and return
// the authenticated user id. Until then, all repos belong to one user.
export async function getSessionUserId(): Promise<string> {
  return process.env.OPENGIT_USER?.trim() || "local";
}

// ── Storage ──────────────────────────────────────────────────────────────────
type RepoRecord = { id: string; ownerId: string; path: string };

const DATA_DIR =
  process.env.OPENGIT_DATA_DIR?.trim() || join(homedir(), ".opengit");
const STORE = join(DATA_DIR, "repos.json");

// Confinement root. When set, every repo path MUST live under it — this is what
// stops a user pointing the app at `/etc` or another tenant's directory. Unset
// = no confinement (local dev convenience). SET OPENGIT_REPO_ROOT WHEN HOSTING.
const REPO_ROOT = process.env.OPENGIT_REPO_ROOT?.trim() || null;

function repoIdFor(ownerId: string, path: string): string {
  // Deterministic so re-opening the same repo is idempotent (no dupes).
  return createHash("sha256")
    .update(`${ownerId}\0${resolve(path)}`)
    .digest("hex")
    .slice(0, 16);
}

/** True if `child` is `parent` or sits underneath it (after path resolution). */
function isContained(child: string, parent: string): boolean {
  const c = resolve(child);
  const p = resolve(parent);
  return c === p || c.startsWith(p.endsWith(sep) ? p : p + sep);
}

async function readStore(): Promise<RepoRecord[]> {
  try {
    const parsed = JSON.parse(await readFile(STORE, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeStore(records: RepoRecord[]): Promise<void> {
  await mkdir(dirname(STORE), { recursive: true });
  await writeFile(STORE, JSON.stringify(records, null, 2), "utf8");
}

// ── API ──────────────────────────────────────────────────────────────────────

/** Register a repo path for the current user; returns its stable repoId. */
export async function registerRepo(path: string): Promise<string> {
  if (REPO_ROOT && !isContained(path, REPO_ROOT)) {
    throw new Error("Repository is outside the allowed root.");
  }
  const ownerId = await getSessionUserId();
  const id = repoIdFor(ownerId, path);
  const records = await readStore();
  if (!records.some((r) => r.id === id)) {
    records.push({ id, ownerId, path: resolve(path) });
    await writeStore(records);
  }
  return id;
}

/**
 * Resolve an active repoId to a validated, authorized absolute path.
 * Throws if the repo is unknown, owned by someone else, escaped the root, or no
 * longer a git repo. This is the gate every git command passes through.
 */
export async function resolveRepoPath(repoId: string): Promise<string> {
  const rec = (await readStore()).find((r) => r.id === repoId);
  if (!rec) throw new Error("Unknown repository.");

  const ownerId = await getSessionUserId();
  if (rec.ownerId !== ownerId) {
    throw new Error("Not authorized for this repository.");
  }
  if (REPO_ROOT && !isContained(rec.path, REPO_ROOT)) {
    throw new Error("Repository is outside the allowed root.");
  }
  if (!(await isGitRepo(rec.path))) {
    throw new Error("No longer a git repository.");
  }
  return rec.path;
}

/** Forget a repo registration (does not touch the working tree). */
export async function removeRepo(repoId: string): Promise<void> {
  const records = await readStore();
  await writeStore(records.filter((r) => r.id !== repoId));
}
