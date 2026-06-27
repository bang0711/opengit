import { type LoaderFunctionArgs, useLoaderData } from "react-router-dom";
import type { CommitFile } from "@shared/types";
import { FullNotice } from "@/components/full-notice";
import { CommitDiffViewer } from "@/components/workspace/commit-diff-viewer";
import { WorkingTreeViewer } from "@/components/workspace/working-tree-viewer";
import { buildFileTree } from "@/lib/file-tree";

export async function diffLoader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const sha = url.searchParams.get("sha");
  const file = url.searchParams.get("file");
  const wt = url.searchParams.get("wt");

  if (wt) {
    const ws = await window.api.workspace();
    if ("error" in ws) return { kind: "error" as const, message: ws.error };
    const changed = ws.status.filter(
      (f) => f.staged || f.unstaged || f.untracked,
    );
    const sum = (a: number, b: number) => (a < 0 || b < 0 ? -1 : a + b);
    const files: CommitFile[] = changed.map((f) => ({
      path: f.path,
      status: f.untracked ? "?" : f.worktree !== " " ? f.worktree : f.index,
      additions: sum(f.stagedAdds, f.unstagedAdds),
      deletions: sum(f.stagedDels, f.unstagedDels),
    }));
    return {
      kind: "wt" as const,
      nodes: buildFileTree(files),
      fileCount: files.length,
      initialFile: file ?? files[0]?.path ?? null,
    };
  }

  if (!sha) return { kind: "error" as const, message: "Missing commit." };
  const detail = await window.api.commitDetail(sha);
  if ("error" in detail) return { kind: "error" as const, message: detail.error };

  const initialFile = file ?? detail.files[0]?.path ?? null;
  let initialDiff: string | null = null;
  if (initialFile) {
    const r = await window.api.commitFileDiff(sha, initialFile);
    initialDiff = "diff" in r ? r.diff : null;
  }
  return {
    kind: "commit" as const,
    sha,
    nodes: buildFileTree(detail.files),
    subject: detail.subject,
    shortSha: detail.shortSha,
    parentSha: detail.parents[0] ?? null,
    fileCount: detail.files.length,
    initialFile,
    initialDiff,
  };
}

export function Diff() {
  const d = useLoaderData() as Awaited<ReturnType<typeof diffLoader>>;
  if (d.kind === "error") return <FullNotice>{d.message}</FullNotice>;
  if (d.kind === "wt")
    return (
      <WorkingTreeViewer
        nodes={d.nodes}
        fileCount={d.fileCount}
        initialFile={d.initialFile}
      />
    );
  return (
    <CommitDiffViewer
      sha={d.sha}
      nodes={d.nodes}
      subject={d.subject}
      shortSha={d.shortSha}
      parentSha={d.parentSha}
      fileCount={d.fileCount}
      initialFile={d.initialFile}
      initialDiff={d.initialDiff}
    />
  );
}
