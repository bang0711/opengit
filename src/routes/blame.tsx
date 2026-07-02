import { RiArrowLeftLine, RiFileTextLine } from "@remixicon/react";
import type { BlameLine } from "@shared/types";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import { type LoaderFunctionArgs, useLoaderData } from "react-router-dom";
import { BlameRow } from "@/app/blame/blame-row";
import { Island } from "@/components/island";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export async function blameLoader({ request }: LoaderFunctionArgs) {
  const file = new URL(request.url).searchParams.get("file");
  if (!file)
    return {
      file: null,
      lines: [] as BlameLine[],
      error: "No file specified.",
    };
  const r = await window.api.blameFile(file);
  if ("error" in r) return { file, lines: [] as BlameLine[], error: r.error };
  return { file, lines: r.lines, error: null as string | null };
}

export function Blame() {
  const { file, lines, error } = useLoaderData() as Awaited<
    ReturnType<typeof blameLoader>
  >;
  // Virtualize: one row per source line, unbounded file size — keep the DOM
  // viewport-sized (same pattern as commit-graph).
  const scrollRef = useRef<HTMLDivElement>(null);
  const virt = useVirtualizer({
    count: lines.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 20, // text-xs leading-5
    overscan: 20,
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
          <div className="flex min-w-0 items-center gap-2 text-xs">
            <RiFileTextLine className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate font-medium">{file}</span>
            <span className="shrink-0 text-muted-foreground">blame</span>
          </div>
        </header>

        {error ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            {error}
          </div>
        ) : (
          <ScrollArea className="min-h-0 flex-1" viewportRef={scrollRef}>
            <div
              className="font-mono text-xs leading-5"
              style={{ height: virt.getTotalSize(), position: "relative" }}
            >
              {/* No width:100% — rows keep their natural (min-w-max) width so long
                lines still create horizontal overflow for the ScrollBar. */}
              {virt.getVirtualItems().map((vi) => (
                <div
                  key={lines[vi.index].line}
                  className="min-w-max"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    transform: `translateY(${vi.start}px)`,
                  }}
                >
                  <BlameRow line={lines[vi.index]} />
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </Island>
    </div>
  );
}
