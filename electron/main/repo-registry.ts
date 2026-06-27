import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { isGitRepo } from "./git";

// Single local user — desktop app. (Hosting would replace this with real auth.)
function getOwnerId(): string {
  return process.env.OPENGIT_USER?.trim() || "local";
}

type RepoRecord = { id: string; ownerId: string; path: string };

const DATA_DIR =
  process.env.OPENGIT_DATA_DIR?.trim() || join(homedir(), ".opengit");
const STORE = join(DATA_DIR, "repos.json");
const REPO_ROOT = process.env.OPENGIT_REPO_ROOT?.trim() || null;

export function repoIdFor(path: string): string {
  return createHash("sha256")
    .update(`${getOwnerId()}\0${resolve(path)}`)
    .digest("hex")
    .slice(0, 16);
}

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

export async function registerRepo(path: string): Promise<string> {
  if (REPO_ROOT && !isContained(path, REPO_ROOT)) {
    throw new Error("Repository is outside the allowed root.");
  }
  const ownerId = getOwnerId();
  const id = repoIdFor(path);
  const records = await readStore();
  if (!records.some((r) => r.id === id)) {
    records.push({ id, ownerId, path: resolve(path) });
    await writeStore(records);
  }
  return id;
}

export async function resolveRepoPath(repoId: string): Promise<string> {
  const rec = (await readStore()).find((r) => r.id === repoId);
  if (!rec) throw new Error("Unknown repository.");
  if (rec.ownerId !== getOwnerId()) {
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

export async function removeRepo(repoId: string): Promise<void> {
  const records = await readStore();
  await writeStore(records.filter((r) => r.id !== repoId));
}
