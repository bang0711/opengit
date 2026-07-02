"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useRef, useState } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { TreeNode } from "@/lib/file-tree";
import { cn } from "@/lib/utils";
import { TreeItem } from "./tree-item";

// Expansion state, persisted per-directory under the same keys the old
// per-node usePersistedState used (`opengit.tree:<path>`, default open).
function isOpen(path: string): boolean {
  try {
    const raw = localStorage.getItem(`opengit.tree:${path}`);
    return raw == null ? true : (JSON.parse(raw) as boolean);
  } catch {
    return true;
  }
}

type FlatRow = { node: TreeNode; depth: number; open: boolean };

/** Flatten only the visible (expanded) nodes — what the virtualizer renders. */
function flatten(nodes: TreeNode[], depth: number, out: FlatRow[]): FlatRow[] {
  for (const node of nodes) {
    if (node.type === "dir") {
      const open = isOpen(node.path);
      out.push({ node, depth, open });
      if (open) flatten(node.children, depth + 1, out);
    } else {
      out.push({ node, depth, open: false });
    }
  }
  return out;
}

export function FileTree({
  nodes,
  sha,
  selected,
  wt,
  onSelect,
  className,
}: {
  nodes: TreeNode[];
  sha?: string;
  selected: string | null;
  wt?: boolean;
  // When provided, file rows call this instead of navigating (client switching).
  onSelect?: (path: string) => void;
  className?: string;
}) {
  // Bumped on expand/collapse so the flat list recomputes.
  const [treeVersion, setTreeVersion] = useState(0);
  const rows = useMemo(() => {
    // Expansion state lives in localStorage; treeVersion invalidates the reads.
    void treeVersion;
    return flatten(nodes, 0, []);
  }, [nodes, treeVersion]);

  const toggle = (path: string) => {
    try {
      localStorage.setItem(
        `opengit.tree:${path}`,
        JSON.stringify(!isOpen(path)),
      );
    } catch {
      // ignore blocked storage
    }
    setTreeVersion((v) => v + 1);
  };

  // Virtualize the flat list: monorepo commits can hold thousands of files.
  const scrollRef = useRef<HTMLDivElement>(null);
  const virt = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 24, // py-0.5 + text-xs rows
    overscan: 12,
  });

  return (
    <ScrollArea className={cn("h-full", className)} viewportRef={scrollRef}>
      <div
        className="py-1 pt-0 text-xs"
        style={{ height: virt.getTotalSize(), position: "relative" }}
      >
        {virt.getVirtualItems().map((vi) => {
          const row = rows[vi.index];
          return (
            <div
              key={row.node.path}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${vi.start}px)`,
              }}
            >
              <TreeItem
                node={row.node}
                depth={row.depth}
                open={row.open}
                onToggle={toggle}
                sha={sha}
                selected={selected}
                wt={wt}
                onSelect={onSelect}
              />
            </div>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
