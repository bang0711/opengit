"use client";

import {
  RiAddLine,
  RiHistoryLine,
  RiLoader4Line,
  RiSubtractLine,
} from "@remixicon/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { fileHunkDiffs, stageHunk, unstageHunk } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { splitDiffIntoHunks } from "@/lib/diff";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";

export function WorkingDiff({ file }: { file: string }) {
  const router = useRouter();
  const [data, setData] = useState<{ unstaged: string; staged: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [rev, setRev] = useState(0);
  const [pending, startTransition] = useTransition();

  // biome-ignore lint/correctness/useExhaustiveDependencies: `rev` is a manual refetch trigger
  useEffect(() => {
    startTransition(async () => {
      const r = await fileHunkDiffs(file);
      if ("error" in r) setError(r.error);
      else {
        setError(null);
        setData(r);
      }
    });
  }, [file, rev]);

  const act = (fn: () => Promise<{ error?: string }>, success: string) =>
    startTransition(async () => {
      const r = await fn();
      notify(r, success);
      if (!r?.error) {
        setRev((v) => v + 1);
        router.refresh();
      }
    });

  const staged = data ? splitDiffIntoHunks(data.staged).hunks : [];
  const unstaged = data ? splitDiffIntoHunks(data.unstaged).hunks : [];

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-border bg-card px-3 font-mono text-xs">
        <span className="truncate">{file}</span>
        {pending ? <RiLoader4Line className="size-3.5 animate-spin" /> : null}
        <Button asChild variant="ghost" size="xs" className="ml-auto">
          <Link href={{ pathname: "/blame", query: { file } }}>
            <RiHistoryLine /> Blame
          </Link>
        </Button>
      </div>

      {error ? (
        <p className="p-3 text-xs text-destructive">{error}</p>
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <Section
            title="Staged"
            empty="No staged changes."
            hunks={staged}
            actionLabel="Unstage"
            actionIcon={<RiSubtractLine />}
            pending={pending}
            onAction={(i) => act(() => unstageHunk(file, i), "Unstaged hunk")}
          />
          <Section
            title="Unstaged"
            empty="No unstaged changes."
            hunks={unstaged}
            actionLabel="Stage"
            actionIcon={<RiAddLine />}
            pending={pending}
            onAction={(i) => act(() => stageHunk(file, i), "Staged hunk")}
          />
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
    </div>
  );
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
