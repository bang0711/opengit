"use client";

// Sidebar list guard: repos with 1000+ tags/branches would mount every row (each
// a Radix trigger) at once. Small lists render plain — zero overhead, and outer
// section scrolling behaves exactly as before. Past the threshold the list gets
// its own capped-height virtualized viewport (VS Code-style nested scroll), which
// sidesteps scrollMargin bookkeeping against the shared, collapsible sections.
import { useVirtualizer } from "@tanstack/react-virtual";
import { type ReactNode, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

const THRESHOLD = 100;
const MAX_HEIGHT = 320;

export function MaybeVirtualList<T>({
  items,
  rowHeight,
  renderRow,
}: {
  items: T[];
  rowHeight: number;
  renderRow: (item: T) => ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const virt = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 12,
  });

  if (items.length <= THRESHOLD) return <>{items.map(renderRow)}</>;

  return (
    <ScrollArea
      viewportRef={scrollRef}
      style={{ height: Math.min(items.length * rowHeight, MAX_HEIGHT) }}
    >
      <div style={{ height: virt.getTotalSize(), position: "relative" }}>
        {virt.getVirtualItems().map((vi) => (
          <div
            key={vi.index}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${vi.start}px)`,
            }}
          >
            {renderRow(items[vi.index])}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
