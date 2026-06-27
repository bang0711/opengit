// Domain + IPC contract types shared by the main process (producer) and the
// renderer (consumer). No runtime code here — types only.

export type GitResult = { stdout: string; stderr: string };

export type RepoInfo = {
  path: string;
  name: string;
  head: string | null;
  detached: boolean;
  commit: string | null;
};

export type Branch = {
  name: string;
  fullName: string;
  isRemote: boolean;
  isCurrent: boolean;
  upstream: string | null;
  ahead: number;
  behind: number;
  sha: string;
  subject: string;
};

export type Remote = { name: string; url: string };
export type Tag = { name: string; sha: string };
export type Stash = { ref: string; message: string };

export type FileStatus = {
  path: string;
  index: string;
  worktree: string;
  staged: boolean;
  unstaged: boolean;
  untracked: boolean;
  stagedAdds: number;
  stagedDels: number;
  unstagedAdds: number;
  unstagedDels: number;
};

export type Commit = {
  sha: string;
  shortSha: string;
  parents: string[];
  authorName: string;
  authorEmail: string;
  date: number;
  subject: string;
  refs: string[];
};

export type CommitFile = {
  path: string;
  status: string;
  additions: number;
  deletions: number;
};

export type CommitDetail = {
  sha: string;
  shortSha: string;
  parents: string[];
  authorName: string;
  authorEmail: string;
  date: number;
  subject: string;
  body: string;
  files: CommitFile[];
};

export type MergeState = {
  conflicted: string[];
  inMerge: boolean;
  inRebase: boolean;
};

export type ConflictVersions = {
  ours: string | null;
  theirs: string | null;
  working: string;
};

export type BlameLine = {
  sha: string;
  short: string;
  author: string;
  date: number;
  line: number;
  code: string;
};

export type RebaseCommit = { sha: string; short: string; subject: string };

// ── Action / IPC result shapes ──────────────────────────────────────────────

export type ActionState = { error?: string };
export type DirEntry = { name: string; path: string; isRepo: boolean };
export type DirListing = {
  path: string;
  parent: string | null;
  isRepo: boolean;
  entries: DirEntry[];
  error?: string;
};

export type PullMode = "ff" | "ff-or-merge" | "rebase";
export type ResetMode = "soft" | "mixed" | "hard";
export type RebaseOp = "pick" | "squash" | "fixup" | "drop";

export type HunkData = { unstaged: string; staged: string };
export type DiffResult = { diff: string };

/** Everything the workspace screen needs in one round-trip. */
export type WorkspaceData = {
  repo: RepoInfo;
  branches: Branch[];
  remotes: Remote[];
  tags: Tag[];
  stashes: Stash[];
  commits: Commit[];
  status: FileStatus[];
  merge: MergeState;
};

export type UpdaterEvent =
  | { type: "available"; version: string }
  | { type: "not-available" }
  | { type: "progress"; percent: number }
  | { type: "downloaded"; version: string }
  | { type: "error"; message: string };

type Diff = { diff: string };
type Err = { error: string };

/** The IPC surface exposed on window.api (everything async over the bridge). */
export interface Api {
  listDirectory(path?: string): Promise<DirListing>;
  recentRepos(): Promise<string[]>;
  openRepo(path: string): Promise<ActionState>;
  cloneRepo(url: string, directory: string): Promise<ActionState>;
  closeRepo(): Promise<ActionState>;
  workspace(): Promise<WorkspaceData | Err>;
  commitDetail(sha: string): Promise<CommitDetail | Err>;
  commitFileDiff(sha: string, file: string): Promise<Diff | Err>;
  workingFileDiff(file: string): Promise<Diff | Err>;
  fileHunkDiffs(file: string): Promise<HunkData | Err>;
  conflictVersions(file: string): Promise<ConflictVersions | Err>;
  blameFile(file: string): Promise<{ lines: BlameLine[] } | Err>;
  rebaseCommits(base: string): Promise<{ commits: RebaseCommit[] } | Err>;
  gitFetch(): Promise<ActionState>;
  gitPush(): Promise<ActionState>;
  gitPushSetUpstream(): Promise<ActionState>;
  gitPushForce(): Promise<ActionState>;
  gitPull(mode?: PullMode): Promise<ActionState>;
  stageFile(file: string): Promise<ActionState>;
  stageAll(): Promise<ActionState>;
  unstageFile(file: string): Promise<ActionState>;
  unstageAll(): Promise<ActionState>;
  discardFile(file: string, untracked?: boolean): Promise<ActionState>;
  discardAll(): Promise<ActionState>;
  commit(message: string): Promise<ActionState>;
  amendCommit(message?: string): Promise<ActionState>;
  checkoutBranch(name: string): Promise<ActionState>;
  checkoutCommit(sha: string): Promise<ActionState>;
  mergeBranch(name: string): Promise<ActionState>;
  deleteBranch(name: string): Promise<ActionState>;
  renameBranch(oldName: string, newName: string): Promise<ActionState>;
  deleteRemoteBranch(remote: string, branch: string): Promise<ActionState>;
  createBranch(name: string): Promise<ActionState>;
  createBranchAt(name: string, sha: string): Promise<ActionState>;
  createRemoteBranch(remote: string, name: string): Promise<ActionState>;
  publishBranch(remote: string, name: string): Promise<ActionState>;
  cherryPick(sha: string): Promise<ActionState>;
  revertCommit(sha: string): Promise<ActionState>;
  resetToCommit(sha: string, mode: ResetMode): Promise<ActionState>;
  createTagAt(name: string, sha: string): Promise<ActionState>;
  deleteTag(name: string): Promise<ActionState>;
  deleteRemoteTag(name: string): Promise<ActionState>;
  fetchTags(): Promise<ActionState>;
  resolveOurs(file: string): Promise<ActionState>;
  resolveTheirs(file: string): Promise<ActionState>;
  saveResolution(file: string, content: string): Promise<ActionState>;
  markResolved(file: string): Promise<ActionState>;
  abortMerge(): Promise<ActionState>;
  continueMerge(): Promise<ActionState>;
  stashPush(message?: string): Promise<ActionState>;
  stashApply(ref: string): Promise<ActionState>;
  stashPop(ref: string): Promise<ActionState>;
  stashDrop(ref: string): Promise<ActionState>;
  stageHunk(file: string, index: number): Promise<ActionState>;
  unstageHunk(file: string, index: number): Promise<ActionState>;
  interactiveRebase(
    base: string,
    ops: Record<string, RebaseOp>,
  ): Promise<ActionState>;
  /** Fired when the active repo's files change on disk (debounced). */
  onRepoChange(cb: () => void): () => void;
}

export interface Updater {
  check(): Promise<void>;
  download(): Promise<void>;
  install(): Promise<void>;
  onEvent(cb: (e: UpdaterEvent) => void): () => void;
}
