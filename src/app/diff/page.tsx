import { RiArrowLeftLine, RiGitCommitLine } from "@remixicon/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { FileTree } from "@/components/workspace/file-tree";
import { SideBySideDiff } from "@/components/workspace/side-by-side-diff";
import { WorkingDiff } from "@/components/workspace/working-diff";
import { getValidActiveRepoPath } from "@/lib/active-repo";
import { parseUnifiedDiff } from "@/lib/diff";
import { langFromPath } from "@/lib/highlight";
import { buildFileTree } from "@/lib/file-tree";
import {
  type CommitFile,
  getCommitDetail,
  getCommitFileDiff,
  getCommitSubject,
  getStatus,
} from "@/lib/git";

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

  const tree = buildFileTree(detail.files);
  const selected = file ?? detail.files[0]?.path ?? null;

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-11 shrink-0 items-center gap-3 border-b border-border bg-card px-3">
        <Button asChild variant="outline" size="sm">
          <Link href="/">
            <RiArrowLeftLine />
            Back to repository
          </Link>
        </Button>
        <div className="flex min-w-0 items-center gap-2 text-xs">
          <RiGitCommitLine className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate font-medium">{detail.subject}</span>
          <span className="shrink-0 font-mono text-muted-foreground">
            {detail.shortSha}
          </span>
        </div>
        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
          {detail.files.length} files changed
        </span>
      </header>

      <ResizablePanelGroup orientation="horizontal" className="flex-1">
        <ResizablePanel defaultSize="24%" minSize="15%" maxSize="45%">
          <ScrollArea className="h-full bg-sidebar">
            <FileTree nodes={tree} sha={sha} selected={selected} />
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize="76%">
          <DiffPane
            repo={repo}
            sha={sha}
            file={selected}
            subject={detail.subject}
            shortSha={detail.shortSha}
            parentSha={detail.parents[0] ?? null}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

async function WorkingTreeDiff({
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
  const tree = buildFileTree(files);
  const selected = file ?? files[0]?.path ?? null;

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-11 shrink-0 items-center gap-3 border-b border-border bg-card px-3">
        <Button asChild variant="outline" size="sm">
          <Link href="/">
            <RiArrowLeftLine />
            Back to repository
          </Link>
        </Button>
        <span className="text-xs font-medium">Working tree changes</span>
        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
          {files.length} files changed
        </span>
      </header>

      <ResizablePanelGroup orientation="horizontal" className="flex-1">
        <ResizablePanel defaultSize="24%" minSize="15%" maxSize="45%">
          <ScrollArea className="h-full bg-sidebar">
            <FileTree nodes={tree} selected={selected} wt />
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize="76%">
          {selected ? (
            <WorkingDiff file={selected} />
          ) : (
            <FullNotice>No changes in the working tree.</FullNotice>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

async function DiffPane({
  repo,
  sha,
  file,
  subject,
  shortSha,
  parentSha,
}: {
  repo: string;
  sha: string;
  file: string | null;
  subject: string;
  shortSha: string;
  parentSha: string | null;
}) {
  if (!file) return <FullNotice>Select a file to view changes.</FullNotice>;

  let parsed: ReturnType<typeof parseUnifiedDiff> | null = null;
  let error: string | null = null;
  try {
    parsed = parseUnifiedDiff(await getCommitFileDiff(repo, sha, file));
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load diff.";
  }

  const parentSubject = parentSha
    ? await getCommitSubject(repo, parentSha).catch(() => "")
    : "";
  const oldLabel = parentSha
    ? `${parentSubject || "parent"} · ${parentSha.slice(0, 7)}`
    : "Added in this commit";
  const newLabel = `${subject} · ${shortSha}`;

  // Reconstruct each version's visible text for the copy buttons.
  const collect = (side: "left" | "right") =>
    (parsed?.rows ?? [])
      .flatMap((r) =>
        r.type === "line"
          ? side === "left"
            ? r.leftText !== null
              ? [r.leftText]
              : []
            : r.rightText !== null
              ? [r.rightText]
              : []
          : [],
      )
      .join("\n");
  const oldText = collect("left");
  const newText = collect("right");

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-border bg-card px-3 font-mono text-xs">
        <span className="truncate">{file}</span>
      </div>
      {error ? (
        <FullNotice>{error}</FullNotice>
      ) : !parsed || parsed.rows.length === 0 ? (
        <FullNotice>
          {parsed?.binary ? "Binary file — no textual diff." : "No changes."}
        </FullNotice>
      ) : (
        <SideBySideDiff
          rows={parsed.rows}
          oldLabel={oldLabel}
          newLabel={newLabel}
          oldText={oldText}
          newText={newText}
          lang={langFromPath(file)}
        />
      )}
    </div>
  );
}

function FullNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
      {children}
    </div>
  );
}
