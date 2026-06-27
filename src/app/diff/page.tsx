import { FullNotice } from "@/components/full-notice";
import { CommitDiffViewer } from "@/components/workspace/commit-diff-viewer";
import { WorkingTreeDiff } from "@/components/workspace/working-tree-diff";
import { getValidActiveRepoPath } from "@/lib/active-repo";
import { buildFileTree } from "@/lib/file-tree";
import { getCommitDetail, getCommitFileDiff } from "@/lib/git";

export const dynamic = "force-dynamic";

export default async function DiffPage({
  searchParams,
}: {
  searchParams: Promise<{ sha?: string; file?: string; wt?: string }>;
}) {
  const { sha, file, wt } = await searchParams;
  const repo = await getValidActiveRepoPath();

  if (!repo) return <FullNotice>No repository is open.</FullNotice>;
  if (wt) return <WorkingTreeDiff repo={repo} file={file ?? null} />;
  if (!sha) return <FullNotice>Missing commit.</FullNotice>;

  let detail: Awaited<ReturnType<typeof getCommitDetail>> | null = null;
  try {
    detail = await getCommitDetail(repo, sha);
  } catch (e) {
    return (
      <FullNotice>
        {e instanceof Error ? e.message : "Failed to load commit."}
      </FullNotice>
    );
  }

  const nodes = buildFileTree(detail.files);
  const initialFile = file ?? detail.files[0]?.path ?? null;
  // Fetch the first file's diff on the server so there's no spinner on entry;
  // subsequent files are fetched client-side without a route navigation.
  const initialDiff = initialFile
    ? await getCommitFileDiff(repo, sha, initialFile).catch(() => null)
    : null;

  return (
    <CommitDiffViewer
      sha={sha}
      nodes={nodes}
      subject={detail.subject}
      shortSha={detail.shortSha}
      parentSha={detail.parents[0] ?? null}
      fileCount={detail.files.length}
      initialFile={initialFile}
      initialDiff={initialDiff}
    />
  );
}
