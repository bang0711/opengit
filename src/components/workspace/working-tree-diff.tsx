import { WorkingTreeViewer } from "@/components/workspace/working-tree-viewer";
import { buildFileTree } from "@/lib/file-tree";
import { type CommitFile, getStatus } from "@/lib/git";

/** Server loader: builds the working-tree change list, hands it to the viewer. */
export async function WorkingTreeDiff({
  repo,
  file,
}: {
  repo: string;
  file: string | null;
}) {
  const status = await getStatus(repo);
  const changed = status.filter((f) => f.staged || f.unstaged || f.untracked);
  // Total change vs HEAD = staged (index vs HEAD) + unstaged (worktree vs
  // index). A -1 on either side means binary/unknown — keep it -1 (hidden).
  const sum = (a: number, b: number) => (a < 0 || b < 0 ? -1 : a + b);
  const files: CommitFile[] = changed.map((f) => ({
    path: f.path,
    status: f.untracked ? "?" : f.worktree !== " " ? f.worktree : f.index,
    additions: sum(f.stagedAdds, f.unstagedAdds),
    deletions: sum(f.stagedDels, f.unstagedDels),
  }));
  const nodes = buildFileTree(files);
  const initialFile = file ?? files[0]?.path ?? null;

  return (
    <WorkingTreeViewer
      nodes={nodes}
      fileCount={files.length}
      initialFile={initialFile}
    />
  );
}
