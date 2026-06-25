"use client";

import { useRef } from "react";
import { CopyButton } from "@/components/copy-button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { usePersistedState } from "@/hooks/use-persisted-state";
import type { DiffRow } from "@/lib/diff";
import { cn } from "@/lib/utils";

/**
 * Azure-style side-by-side diff with a draggable divider. Rows share one
 * vertical scroll and a single grid template, so the two sides stay aligned
 * while the split is resizable.
 */
export function SideBySideDiff({
  rows,
  oldLabel,
  newLabel,
  oldText,
  newText,
}: {
  rows: DiffRow[];
  oldLabel: string;
  newLabel: string;
  oldText: string;
  newText: string;
}) {
  const [leftPct, setLeftPct] = usePersistedState("opengit.diffSplit", 50);
  const wrapRef = useRef<HTMLDivElement>(null);
  const cols = { gridTemplateColumns: `${leftPct}% ${100 - leftPct}%` };

  const startDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    const move = (ev: PointerEvent) => {
      const rect = wrapRef.current?.getBoundingClientRect();
      if (!rect) return;
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setLeftPct(Math.min(80, Math.max(20, Math.round(pct))));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div className="flex h-full flex-col font-mono text-xs">
      <div
        className="bg-muted/40 text-muted-foreground sticky top-0 z-10 grid border-b border-border"
        style={cols}
      >
        <div className="flex items-center gap-1 border-border border-r px-3 py-0.5">
          <span className="truncate font-sans font-semibold" title={oldLabel}>
            {oldLabel}
          </span>
          <span className="ml-auto shrink-0">
            <CopyButton text={oldText} label="old version" />
          </span>
        </div>
        <div className="flex items-center gap-1 px-3 py-0.5">
          <span className="truncate font-sans font-semibold" title={newLabel}>
            {newLabel}
          </span>
          <span className="ml-auto shrink-0">
            <CopyButton text={newText} label="new version" />
          </span>
        </div>
      </div>

      <div ref={wrapRef} className="relative min-h-0 flex-1">
        <ScrollArea className="h-full">
          <div>
            <DiffRows rows={rows} cols={cols} />
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        {/* Draggable divider overlaying the viewport at the split position. */}
        <button
          type="button"
          aria-label="Resize diff columns"
          onPointerDown={startDrag}
          style={{ left: `${leftPct}%` }}
          className="absolute top-0 bottom-0 -ml-1 w-2 cursor-col-resize hover:bg-primary/30"
        />
      </div>
    </div>
  );
}

function DiffRows({
  rows,
  cols,
}: {
  rows: DiffRow[];
  cols: React.CSSProperties;
}) {
  // Manual key counter — rows are static and positional.
  const els: React.ReactNode[] = [];
  let k = 0;
  for (const row of rows) {
    els.push(<Row key={`r${k++}`} row={row} cols={cols} />);
  }
  return <>{els}</>;
}

function Row({ row, cols }: { row: DiffRow; cols: React.CSSProperties }) {
  if (row.type === "hunk") {
    return (
      <div className="bg-primary/10 text-primary border-border border-y px-3 py-0.5">
        {row.text}
      </div>
    );
  }
  return (
    <div className="grid" style={cols}>
      <Cell
        no={row.leftNo}
        text={row.leftText}
        tone={row.leftDel ? "del" : "ctx"}
        sign={row.leftDel ? "-" : " "}
        className="border-border border-r"
      />
      <Cell
        no={row.rightNo}
        text={row.rightText}
        tone={row.rightAdd ? "add" : "ctx"}
        sign={row.rightAdd ? "+" : " "}
      />
    </div>
  );
}

function Cell({
  no,
  text,
  tone,
  sign,
  className,
}: {
  no: number | null;
  text: string | null;
  tone: "add" | "del" | "ctx";
  sign: string;
  className?: string;
}) {
  const empty = text === null;
  return (
    <div
      className={cn(
        "flex min-w-0",
        empty && "bg-muted/30",
        tone === "add" && "bg-green-500/10",
        tone === "del" && "bg-red-500/10",
        className,
      )}
    >
      <span className="text-muted-foreground w-12 shrink-0 px-2 text-right select-none">
        {no ?? ""}
      </span>
      {!empty ? (
        <span
          className={cn(
            "w-full px-2 break-words whitespace-pre-wrap",
            tone === "add" && "text-green-300",
            tone === "del" && "text-red-300",
          )}
        >
          <span className="text-muted-foreground/60 select-none">{sign} </span>
          {text}
        </span>
      ) : null}
    </div>
  );
}
