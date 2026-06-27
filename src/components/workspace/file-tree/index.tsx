"use client";

import type { TreeNode } from "@/lib/file-tree";
import { TreeItem } from "./tree-item";

export function FileTree({
  nodes,
  sha,
  selected,
  wt,
  onSelect,
}: {
  nodes: TreeNode[];
  sha?: string;
  selected: string | null;
  wt?: boolean;
  // When provided, file rows call this instead of navigating (client switching).
  onSelect?: (path: string) => void;
}) {
  return (
    <div className="flex flex-col py-1 text-xs">
      {nodes.map((node) => (
        <TreeItem
          key={node.path}
          node={node}
          sha={sha}
          selected={selected}
          wt={wt}
          onSelect={onSelect}
          depth={0}
        />
      ))}
    </div>
  );
}
