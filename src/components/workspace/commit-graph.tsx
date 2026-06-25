"use client";

import {
  RiArrowGoBackLine,
  RiFileCopyLine,
  RiGitBranchLine,
  RiGitCommitLine,
  RiGitMergeLine,
  RiHistoryLine,
  RiPriceTag3Line,
  RiScissorsCutLine,
  RiSearchLine,
} from "@remixicon/react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  type ActionState,
  checkoutCommit,
  cherryPick,
  createBranchAt,
  createTagAt,
  resetToCommit,
  revertCommit,
} from "@/app/actions";
import { NameDialog } from "@/components/name-dialog";
import { Badge } from "@/components/ui/badge";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { RebaseDialog } from "@/components/workspace/rebase-dialog";
import type { Commit } from "@/lib/git";
import { buildGraph, type GraphRow, laneColor } from "@/lib/graph";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";

type CreateTarget = { kind: "branch" | "tag"; sha: string };

const ROW_H = 32;
const GAP = 16;
const PAD = 14;
const DOT_R = 4.5;
const laneX = (i: number) => PAD + i * GAP;

export function CommitGraph({
  commits,
  selected,
  onSelect,
}: {
  commits: Commit[];
  selected: string | null;
  onSelect: (sha: string) => void;
}) {
  const [create, setCreate] = useState<CreateTarget | null>(null);
  const [rebaseBase, setRebaseBase] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [, startTransition] = useTransition();

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commits;
    return commits.filter(
      (c) =>
        c.subject.toLowerCase().includes(q) ||
        c.authorName.toLowerCase().includes(q) ||
        c.sha.toLowerCase().includes(q),
    );
  }, [commits, query]);

  const { rows, width } = useMemo(() => buildGraph(shown), [shown]);
  const graphWidth = laneX(Math.max(width, 1));

  const onCreateSubmit = (name: string) => {
    if (!create) return;
    const action =
      create.kind === "branch"
        ? () => createBranchAt(name, create.sha)
        : () => createTagAt(name, create.sha);
    startTransition(async () => {
      notify(await action(), `Created ${create.kind} ${name}`);
    });
  };

  return (
    <div className="bg-background flex h-full flex-col">
      <div className="border-border text-muted-foreground flex h-8 shrink-0 items-center gap-2 border-b px-3 text-xs font-semibold">
        History
        <span className="font-normal">{shown.length} commits</span>
        <div className="relative ml-auto">
          <RiSearchLine className="absolute top-1/2 left-2 size-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commits…"
            className="h-6 w-48 pl-6 text-xs"
          />
        </div>
      </div>

      {commits.length === 0 ? (
        <div className="text-muted-foreground flex flex-1 items-center justify-center text-xs">
          No commits yet.
        </div>
      ) : shown.length === 0 ? (
        <div className="text-muted-foreground flex flex-1 items-center justify-center text-xs">
          No commits match “{query}”.
        </div>
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div>
            {rows.map((row) => (
              <CommitRow
                key={row.commit.sha}
                row={row}
                graphWidth={graphWidth}
                selected={selected === row.commit.sha}
                onSelect={() => onSelect(row.commit.sha)}
                onCreate={(kind, sha) => setCreate({ kind, sha })}
                onRebase={(sha) => setRebaseBase(sha)}
              />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}

      <NameDialog
        open={!!create}
        onOpenChange={(o) => !o && setCreate(null)}
        title={create?.kind === "tag" ? "Create tag" : "Create branch"}
        label={create?.kind === "tag" ? "Tag name" : "Branch name"}
        placeholder={create?.kind === "tag" ? "v1.0.0" : "feature/x"}
        onSubmit={onCreateSubmit}
      />

      <RebaseDialog base={rebaseBase} onClose={() => setRebaseBase(null)} />
    </div>
  );
}

function CommitRow({
  row,
  graphWidth,
  selected,
  onSelect,
  onCreate,
  onRebase,
}: {
  row: GraphRow;
  graphWidth: number;
  selected: boolean;
  onSelect: () => void;
  onCreate: (kind: "branch" | "tag", sha: string) => void;
  onRebase: (sha: string) => void;
}) {
  const { commit } = row;
  const [pending, startTransition] = useTransition();
  const short = commit.shortSha;

  const run = (action: () => Promise<ActionState>, success: string) =>
    startTransition(async () => {
      notify(await action(), success);
    });

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          type="button"
          onClick={onSelect}
          className={cn(
            "border-border/40 hover:bg-muted/40 flex min-w-full cursor-pointer items-center border-b text-left text-xs",
            selected &&
              "bg-primary/10 shadow-[inset_2px_0_0_0_var(--primary)] hover:bg-primary/10",
            pending && "opacity-60",
          )}
          style={{ height: ROW_H }}
        >
          <GraphCell row={row} width={graphWidth} />
          <div className="flex min-w-0 flex-1 items-center gap-2 pr-3">
            <div className="flex shrink-0 gap-1">
              {commit.refs.map((ref) => (
                <RefBadge key={ref} refName={ref} />
              ))}
            </div>
            <span className="text-foreground truncate">{commit.subject}</span>
            <span className="text-muted-foreground ml-auto shrink-0 truncate">
              {commit.authorName}
            </span>
            <span className="text-muted-foreground shrink-0 font-mono text-[0.625rem]">
              {short}
            </span>
            <span className="text-muted-foreground shrink-0 text-right text-[0.625rem] whitespace-nowrap">
              {formatDate(commit.date)} ({relativeTime(commit.date)})
            </span>
          </div>
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-60">
        <ContextMenuItem
          onSelect={() =>
            run(() => checkoutCommit(commit.sha), `Checked out ${short}`)
          }
        >
          <RiGitCommitLine className="mr-2 size-3.5" />
          Checkout commit {short}
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={() =>
            run(() => cherryPick(commit.sha), `Cherry-picked ${short}`)
          }
        >
          <RiScissorsCutLine className="mr-2 size-3.5" />
          Cherry-pick
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={() =>
            run(() => revertCommit(commit.sha), `Reverted ${short}`)
          }
        >
          <RiArrowGoBackLine className="mr-2 size-3.5" />
          Revert commit
        </ContextMenuItem>

        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <RiHistoryLine className="mr-2 size-3.5" />
            Reset {row.commit.refs.length ? "branch " : ""}to here
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem
              onSelect={() =>
                run(
                  () => resetToCommit(commit.sha, "soft"),
                  `Soft reset to ${short}`,
                )
              }
            >
              Soft — keep changes staged
            </ContextMenuItem>
            <ContextMenuItem
              onSelect={() =>
                run(
                  () => resetToCommit(commit.sha, "mixed"),
                  `Mixed reset to ${short}`,
                )
              }
            >
              Mixed — keep changes unstaged
            </ContextMenuItem>
            <ContextMenuItem
              className="text-destructive"
              onSelect={() =>
                run(
                  () => resetToCommit(commit.sha, "hard"),
                  `Hard reset to ${short}`,
                )
              }
            >
              Hard — discard changes
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuItem onSelect={() => onRebase(commit.sha)}>
          <RiGitMergeLine className="mr-2 size-3.5" />
          Rebase commits after this…
        </ContextMenuItem>

        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => onCreate("branch", commit.sha)}>
          <RiGitBranchLine className="mr-2 size-3.5" />
          Create branch here…
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => onCreate("tag", commit.sha)}>
          <RiPriceTag3Line className="mr-2 size-3.5" />
          Create tag here…
        </ContextMenuItem>

        <ContextMenuSeparator />
        <ContextMenuItem
          onSelect={() => {
            navigator.clipboard?.writeText(commit.sha);
            toast.success("Copied commit SHA");
          }}
        >
          <RiFileCopyLine className="mr-2 size-3.5" />
          Copy commit SHA
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function GraphCell({ row, width }: { row: GraphRow; width: number }) {
  const mid = ROW_H / 2;
  const edges: React.ReactNode[] = [];
  let k = 0; // manual key counter — render position is the edge's identity

  // Top half: lanes above connecting down to the commit / passing through.
  for (let i = 0; i < row.lanesBefore.length; i++) {
    const sha = row.lanesBefore[i];
    if (sha === null) continue;
    const stroke = laneColor(row.colorsBefore[i]);
    edges.push(
      sha === row.commit.sha ? (
        <path
          key={`e${k++}`}
          d={curve(laneX(i), 0, laneX(row.col), mid)}
          stroke={stroke}
          fill="none"
          strokeWidth={1.75}
        />
      ) : (
        <line
          key={`e${k++}`}
          x1={laneX(i)}
          y1={0}
          x2={laneX(i)}
          y2={mid}
          stroke={stroke}
          strokeWidth={1.75}
        />
      ),
    );
  }

  // Bottom half: commit routing to its parents / lanes passing through.
  for (let j = 0; j < row.lanesAfter.length; j++) {
    const sha = row.lanesAfter[j];
    if (sha === null) continue;
    const stroke = laneColor(row.colorsAfter[j]);
    edges.push(
      row.parentCols.includes(j) ? (
        <path
          key={`e${k++}`}
          d={curve(laneX(row.col), mid, laneX(j), ROW_H)}
          stroke={stroke}
          fill="none"
          strokeWidth={1.75}
        />
      ) : (
        <line
          key={`e${k++}`}
          x1={laneX(j)}
          y1={mid}
          x2={laneX(j)}
          y2={ROW_H}
          stroke={stroke}
          strokeWidth={1.75}
        />
      ),
    );
  }

  return (
    <svg
      width={width}
      height={ROW_H}
      className="shrink-0"
      style={{ minWidth: width }}
      aria-hidden="true"
    >
      <title>commit graph</title>
      {edges}
      <circle
        cx={laneX(row.col)}
        cy={mid}
        r={DOT_R}
        fill={laneColor(row.color)}
        stroke="var(--background)"
        strokeWidth={1.5}
      />
    </svg>
  );
}

/** A vertical-ish edge that bends near the destination for a smooth join. */
function curve(x1: number, y1: number, x2: number, y2: number): string {
  if (x1 === x2) return `M ${x1} ${y1} L ${x2} ${y2}`;
  const my = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;
}

function RefBadge({ refName }: { refName: string }) {
  const isTag = refName.startsWith("tag: ");
  const isHead = refName.startsWith("HEAD ->") || refName === "HEAD";
  const label = refName.replace(/^tag: /, "").replace(/^HEAD -> /, "");

  return (
    <Badge
      variant={isHead ? "default" : "secondary"}
      className={cn(
        "gap-0.5 px-1 py-px font-medium",
        isTag &&
          "bg-amber-500/15 text-amber-600 hover:bg-amber-500/15 dark:text-amber-400",
      )}
    >
      {isTag ? (
        <RiPriceTag3Line className="size-2.5" />
      ) : (
        <RiGitBranchLine className="size-2.5" />
      )}
      {label}
    </Badge>
  );
}

function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function relativeTime(unixSeconds: number): string {
  const diff = Date.now() / 1000 - unixSeconds;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)}mo`;
  return `${Math.floor(diff / 31536000)}y`;
}
