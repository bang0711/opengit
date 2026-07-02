import { RiArrowLeftLine, RiHistoryLine } from "@remixicon/react";
import type { ReflogEntry } from "@shared/types";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, useState } from "react";
import { useLoaderData, useNavigate } from "react-router-dom";
import { checkoutCommit, resetToCommit } from "@/app/actions";
import { Island } from "@/components/island";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { notify } from "@/lib/notify";

export async function reflogLoader() {
  const r = await window.api.reflog();
  if ("error" in r) return { entries: [] as ReflogEntry[], error: r.error };
  return { entries: r.entries, error: null as string | null };
}

function Row({ entry, onDone }: { entry: ReflogEntry; onDone: () => void }) {
  const [pending, setPending] = useState(false);
  const run = (fn: () => Promise<{ error?: string }>, success: string) => {
    if (pending) return;
    setPending(true);
    fn()
      .then((r) => {
        notify(r, success);
        if (!("error" in r)) onDone();
      })
      .finally(() => setPending(false));
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="flex items-center gap-3 border-b border-border/50 px-4 py-1.5 text-xs hover:bg-accent">
          <span className="w-28 shrink-0 truncate font-mono text-muted-foreground">
            {entry.selector}
          </span>
          <span className="w-16 shrink-0 truncate font-mono text-primary">
            {entry.short}
          </span>
          <span className="truncate">{entry.message}</span>
          <span className="ml-auto shrink-0 text-muted-foreground">
            {new Date(entry.date * 1000).toLocaleString()}
          </span>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem
          onSelect={() =>
            run(() => checkoutCommit(entry.sha), `Checked out ${entry.short}`)
          }
        >
          Checkout
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onSelect={() =>
            run(() => resetToCommit(entry.sha, "soft"), "Reset (soft)")
          }
        >
          Reset soft
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={() =>
            run(() => resetToCommit(entry.sha, "mixed"), "Reset (mixed)")
          }
        >
          Reset mixed
        </ContextMenuItem>
        <ContextMenuItem
          className="text-destructive"
          onSelect={() =>
            run(() => resetToCommit(entry.sha, "hard"), "Reset (hard)")
          }
        >
          Reset hard
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export function Reflog() {
  const { entries, error } = useLoaderData() as Awaited<
    ReturnType<typeof reflogLoader>
  >;
  const navigate = useNavigate();
  // After any reflog action the working state moved — go back to the repo view.
  const onDone = () => navigate("/");

  // Virtualize: reflogs run long and every row carries a Radix ContextMenu —
  // keep the DOM viewport-sized (same pattern as commit-graph).
  const scrollRef = useRef<HTMLDivElement>(null);
  const virt = useVirtualizer({
    count: entries.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 29, // py-1.5 + text-xs + border-b
    overscan: 12,
  });

  return (
    <div className="bg-background h-screen p-1.5">
      <Island>
        <header className="flex h-11 shrink-0 items-center gap-3 border-b border-border bg-card px-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.history.back()}
          >
            <RiArrowLeftLine />
            Back
          </Button>
          <div className="flex items-center gap-2 text-xs">
            <RiHistoryLine className="size-4 shrink-0 text-muted-foreground" />
            <span className="font-medium">Reflog</span>
            <span className="text-muted-foreground">HEAD history</span>
          </div>
        </header>

        {error ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            {error}
          </div>
        ) : (
          <ScrollArea className="min-h-0 flex-1" viewportRef={scrollRef}>
            <div style={{ height: virt.getTotalSize(), position: "relative" }}>
              {virt.getVirtualItems().map((vi) => (
                <div
                  key={entries[vi.index].selector}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${vi.start}px)`,
                  }}
                >
                  <Row entry={entries[vi.index]} onDone={onDone} />
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </Island>
    </div>
  );
}
