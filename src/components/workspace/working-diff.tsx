"use client";

import {
  RiAddLine,
  RiHistoryLine,
  RiLayoutColumnLine,
  RiLayoutRowLine,
  RiLoader4Line,
  RiSubtractLine,
} from "@remixicon/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  fileHunkDiffs,
  stageHunk,
  unstageHunk,
  workingFileDiff,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { SideBySideDiff } from "@/components/workspace/side-by-side-diff";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { type DiffRow, parseUnifiedDiff, splitDiffIntoHunks } from "@/lib/diff";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";

type View = "split" | "unified";
type HunkData = { unstaged: string; staged: string };

export function WorkingDiff({ file }: { file: string }) {
  const router = useRouter();
  const [view, setView] = usePersistedState<View>(
    "opengit.workingDiffView",
    "split",
  );
  const [hunks, setHunks] = useState<HunkData | null>(null);
  const [patch, setPatch] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rev, setRev] = useState(0);
  const [pending, startTransition] = useTransition();

  // biome-ignore lint/correctness/useExhaustiveDependencies: `rev` is a manual refetch trigger
  useEffect(() => {
    startTransition(async () => {
      if (view === "unified") {
        const r = await fileHunkDiffs(file);
        if ("error" in r) setError(r.error);
        else {
          setError(null);
          setHunks(r);
        }
      } else {
        const r = await workingFileDiff(file);
        if ("error" in r) setError(r.error);
        else {
          setError(null);
          setPatch(r.diff);
        }
      }
    });
  }, [file, rev, view]);

  const act = (fn: () => Promise<{ error?: string }>, success: string) =>
    startTransition(async () => {
      const r = await fn();
      notify(r, success);
      if (!r?.error) {
        setRev((v) => v + 1);
        router.refresh();
      }
    });

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-border bg-card px-3 font-mono text-xs">
        <span className="truncate">{file}</span>
        {pending ? <RiLoader4Line className="size-3.5 animate-spin" /> : null}
        <div className="ml-auto flex items-center gap-1">
          <ViewToggle view={view} onChange={setView} />
          <Button asChild variant="ghost" size="xs">
            <Link href={{ pathname: "/blame", query: { file } }}>
              <RiHistoryLine /> Blame
            </Link>
          </Button>
        </div>
      </div>

      {error ? (
        <p className="p-3 text-xs text-destructive">{error}</p>
      ) : view === "split" ? (
        <SplitView patch={patch} />
      ) : (
        <UnifiedView
          hunks={hunks}
          pending={pending}
          onStage={(i) => act(() => stageHunk(file, i), "Staged hunk")}
          onUnstage={(i) => act(() => unstageHunk(file, i), "Unstaged hunk")}
        />
      )}
    </div>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: View;
  onChange: (v: View) => void;
}) {
  return (
    <div className="flex overflow-hidden rounded-md border border-border font-sans">
      <ToggleButton
        active={view === "split"}
        onClick={() => onChange("split")}
        title="Side-by-side"
      >
        <RiLayoutColumnLine /> Split
      </ToggleButton>
      <ToggleButton
        active={view === "unified"}
        onClick={() => onChange("unified")}
        title="Unified (stage by hunk)"
      >
        <RiLayoutRowLine /> Unified
      </ToggleButton>
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "flex items-center gap-1 px-2 py-0.5 text-[0.625rem] font-medium [&_svg]:size-3",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/50",
      )}
    >
      {children}
    </button>
  );
}

// HEAD-vs-working-tree comparison, rendered like the commit inspector.
function SplitView({ patch }: { patch: string | null }) {
  if (patch === null) return null;
  const parsed = parseUnifiedDiff(patch);
  if (parsed.rows.length === 0) {
    return (
      <FullNotice>
        {parsed.binary ? "Binary file — no textual diff." : "No changes."}
      </FullNotice>
    );
  }
  return (
    <SideBySideDiff
      rows={parsed.rows}
      oldLabel="HEAD"
      newLabel="Working tree"
      oldText={collect(parsed.rows, "left")}
      newText={collect(parsed.rows, "right")}
    />
  );
}

function UnifiedView({
  hunks,
  pending,
  onStage,
  onUnstage,
}: {
  hunks: HunkData | null;
  pending: boolean;
  onStage: (index: number) => void;
  onUnstage: (index: number) => void;
}) {
  const staged = hunks ? splitDiffIntoHunks(hunks.staged).hunks : [];
  const unstaged = hunks ? splitDiffIntoHunks(hunks.unstaged).hunks : [];
  return (
    <ScrollArea className="min-h-0 flex-1">
      <Section
        title="Staged"
        empty="No staged changes."
        hunks={staged}
        actionLabel="Unstage"
        actionIcon={<RiSubtractLine />}
        pending={pending}
        onAction={onUnstage}
      />
      <Section
        title="Unstaged"
        empty="No unstaged changes."
        hunks={unstaged}
        actionLabel="Stage"
        actionIcon={<RiAddLine />}
        pending={pending}
        onAction={onStage}
      />
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

// Reconstruct one side's visible text (for the side-by-side copy buttons).
function collect(rows: DiffRow[], side: "left" | "right"): string {
  return rows
    .flatMap((r) => {
      if (r.type !== "line") return [];
      const text = side === "left" ? r.leftText : r.rightText;
      return text !== null ? [text] : [];
    })
    .join("\n");
}

function Section({
  title,
  empty,
  hunks,
  actionLabel,
  actionIcon,
  pending,
  onAction,
}: {
  title: string;
  empty: string;
  hunks: string[];
  actionLabel: string;
  actionIcon: React.ReactNode;
  pending: boolean;
  onAction: (index: number) => void;
}) {
  return (
    <div>
      <div className="bg-muted/40 sticky top-0 z-10 border-b border-border px-3 py-1 text-xs font-semibold text-muted-foreground">
        {title} ({hunks.length})
      </div>
      {hunks.length === 0 ? (
        <p className="px-3 py-2 text-xs text-muted-foreground/60">{empty}</p>
      ) : (
        hunks.map((hunk, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: hunk index is the git apply target
          <div key={`${title}-${i}`} className="border-b border-border">
            <div className="flex items-center gap-2 bg-card/60 px-3 py-0.5">
              <span className="truncate font-mono text-[0.625rem] text-muted-foreground">
                {hunk.split("\n")[0]}
              </span>
              <Button
                size="xs"
                variant="outline"
                className="ml-auto"
                disabled={pending}
                onClick={() => onAction(i)}
              >
                {actionIcon}
                {actionLabel}
              </Button>
            </div>
            <HunkLines hunk={hunk} />
          </div>
        ))
      )}
    </div>
  );
}

function HunkLines({ hunk }: { hunk: string }) {
  const lines = hunk.split("\n").slice(1); // drop the @@ header (shown above)
  return (
    <pre className="w-max min-w-full font-mono text-xs leading-5">
      {lines.map((line, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: positional diff line
          key={i}
          className={cn(
            "px-3",
            line.startsWith("+") && "bg-green-500/10 text-green-300",
            line.startsWith("-") && "bg-red-500/10 text-red-300",
          )}
        >
          {line || " "}
        </div>
      ))}
    </pre>
  );
}

function FullNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
