// Renderer-side type re-exports. The actual git logic lives in the main process
// (electron/main/git.ts); components only need the data shapes.
export type {
  BlameLine,
  Branch,
  Commit,
  CommitDetail,
  CommitFile,
  ConflictVersions,
  FileStatus,
  GitResult,
  MergeState,
  RebaseCommit,
  Remote,
  RepoInfo,
  Stash,
  Tag,
} from "@shared/types";
