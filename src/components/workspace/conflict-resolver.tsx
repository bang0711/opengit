"use client";

import {
  RiArrowLeftLine,
  RiCheckLine,
  RiCloseCircleLine,
  RiGitMergeLine,
  RiLoader4Line,
  RiSave3Line,
} from "@remixicon/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  type ActionState,
  abortMerge,
  conflictVersions,
  continueMerge,
  resolveOurs,
  resolveTheirs,
  saveResolution,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type { ConflictVersions } from "@/lib/git";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";

export function ConflictResolver({
  files,
  inRebase,
}: {
  files: string[];
  inRebase: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(files[0] ?? null);
  const [pending, startTransition] = useTransition();

  // Keep a valid selection as files get resolved out of the list.
  useEffect(() => {
    if (selected && files.includes(selected)) return;
    setSelected(files[0] ?? null);
  }, [files, selected]);

  const run = (action: () => Promise<ActionState>, success: string) =>
    startTransition(async () => {
      const r = await action();
      notify(r, success);
      if (!r?.error) router.refresh();
    });

  const finish = (action: () => Promise<ActionState>, success: string) =>
    startTransition(async () => {
      const r = await action();
      notify(r, success);
      if (!r?.error) router.push("/");
    });

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-11 shrink-0 items-center gap-3 border-b border-border bg-card px-3">
        <Button asChild variant="outline" size="sm">
          <Link href="/">
            <RiArrowLeftLine />
            Back
          </Link>
        </Button>
        <div className="flex items-center gap-2 text-xs">
          <RiGitMergeLine className="size-4 text-amber-500" />
          <span className="font-medium">
            Resolve conflicts · {inRebase ? "rebase" : "merge"}
          </span>
          <span className="text-muted-foreground">
            {files.length} remaining
          </span>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <Button
            variant="destructive"
            size="sm"
            disabled={pending}
            onClick={() => finish(abortMerge, "Aborted")}
          >
            <RiCloseCircleLine />
            Abort
          </Button>
          <Button
            size="sm"
            disabled={pending || files.length > 0}
            onClick={() => finish(continueMerge, "Merge completed")}
          >
            {pending ? (
              <RiLoader4Line className="animate-spin" />
            ) : (
              <RiCheckLine />
            )}
            Continue
          </Button>
        </div>
      </header>

      {files.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          All conflicts resolved — click <b className="mx-1">Continue</b> to
          finish.
        </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          <aside className="w-64 shrink-0 border-r border-border bg-sidebar">
            <ScrollArea className="h-full">
              <div className="py-1 text-xs">
                {files.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setSelected(f)}
                    title={f}
                    className={cn(
                      "flex w-full items-center gap-1.5 px-3 py-1 text-left",
                      f === selected
                        ? "bg-primary/15 text-foreground"
                        : "text-muted-foreground hover:bg-muted/60",
                    )}
                  >
                    <RiGitMergeLine className="size-3.5 shrink-0 text-amber-500" />
                    <span className="truncate">{f}</span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </aside>

          {selected ? (
            <FilePane
              key={selected}
              file={selected}
              pending={pending}
              onOurs={() =>
                run(
                  () => resolveOurs(selected),
                  `Took your version of ${selected}`,
                )
              }
              onTheirs={() =>
                run(
                  () => resolveTheirs(selected),
                  `Took incoming version of ${selected}`,
                )
              }
              onSave={(content) =>
                run(
                  () => saveResolution(selected, content),
                  `Resolved ${selected}`,
                )
              }
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

function FilePane({
  file,
  pending,
  onOurs,
  onTheirs,
  onSave,
}: {
  file: string;
  pending: boolean;
  onOurs: () => void;
  onTheirs: () => void;
  onSave: (content: string) => void;
}) {
  const [data, setData] = useState<ConflictVersions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, startLoad] = useTransition();

  useEffect(() => {
    startLoad(async () => {
      const r = await conflictVersions(file);
      if ("error" in r) {
        setError(r.error);
      } else {
        setError(null);
        setData(r);
        setDraft(r.working);
      }
    });
  }, [file]);

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border bg-card px-3">
        <span className="truncate font-mono text-xs">{file}</span>
        <div className="ml-auto flex gap-1.5">
          <Button
            size="xs"
            variant="outline"
            disabled={pending}
            onClick={onOurs}
          >
            Use ours
          </Button>
          <Button
            size="xs"
            variant="outline"
            disabled={pending}
            onClick={onTheirs}
          >
            Use theirs
          </Button>
        </div>
      </div>

      {error ? (
        <p className="p-3 text-xs text-destructive">{error}</p>
      ) : loading && !data ? (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <RiLoader4Line className="size-5 animate-spin" />
        </div>
      ) : (
        <ResizablePanelGroup orientation="vertical" className="min-h-0 flex-1">
          <ResizablePanel defaultSize="60%" minSize="20%">
            <ResizablePanelGroup orientation="horizontal" className="h-full">
              <ResizablePanel defaultSize="50%" minSize="20%">
                <Side title="Current (ours)" text={data?.ours} />
              </ResizablePanel>
              <ResizableHandle />
              <ResizablePanel defaultSize="50%" minSize="20%">
                <Side title="Incoming (theirs)" text={data?.theirs} />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize="40%" minSize="15%">
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex h-7 shrink-0 items-center gap-2 border-y border-border bg-card px-3 text-xs font-semibold text-muted-foreground">
                Resolved result (edit, then save)
                <Button
                  size="xs"
                  className="ml-auto"
                  disabled={pending}
                  onClick={() => onSave(draft)}
                >
                  <RiSave3Line />
                  Save resolution
                </Button>
              </div>
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                spellCheck={false}
                className="min-h-0 flex-1 resize-none rounded-none border-0 font-mono text-xs focus-visible:ring-0"
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </div>
  );
}

function Side({
  title,
  text,
}: {
  title: string;
  text: string | null | undefined;
}) {
  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="flex h-7 shrink-0 items-center border-b border-border bg-card px-3 text-xs font-semibold">
        {title}
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <pre className="w-max min-w-full px-3 py-1 font-mono text-xs leading-5">
          {text ?? "(file not present on this side)"}
        </pre>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
