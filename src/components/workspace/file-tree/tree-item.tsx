"use client";

import {
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiFolder3Line,
} from "@remixicon/react";
import { FileIcon } from "@/components/shared/file-icon";
import type { TreeNode } from "@/lib/file-tree";
import Link from "@/lib/link";
import { cn } from "@/lib/utils";
import { Stat } from "./stat";

/** One flat tree row (dir or file); the tree itself is flattened and
 *  virtualized by FileTree, which owns expansion state. */
export function TreeItem({
  node,
  sha,
  selected,
  wt,
  depth,
  open,
  onToggle,
  onSelect,
}: {
  node: TreeNode;
  sha?: string;
  selected: string | null;
  wt?: boolean;
  depth: number;
  open: boolean;
  onToggle: (path: string) => void;
  onSelect?: (path: string) => void;
}) {
  const pad = { paddingLeft: 8 + depth * 12 };

  if (node.type === "dir") {
    return (
      <button
        type="button"
        onClick={() => onToggle(node.path)}
        style={pad}
        className="hover:bg-muted/60 flex w-full items-center gap-1 py-0.5 pr-2 text-left"
      >
        {open ? (
          <RiArrowDownSLine className="text-muted-foreground size-3.5 shrink-0" />
        ) : (
          <RiArrowRightSLine className="text-muted-foreground size-3.5 shrink-0" />
        )}
        <RiFolder3Line className="text-muted-foreground size-3.5 shrink-0" />
        <span className="truncate">{node.name}</span>
      </button>
    );
  }

  const active = node.path === selected;
  const leafPad = { paddingLeft: 8 + depth * 12 + 18 };
  const className = cn(
    "flex w-full items-center gap-1.5 py-0.5 pr-2 text-left",
    active
      ? "bg-primary/15 text-foreground"
      : "hover:bg-muted/60 text-muted-foreground",
  );
  const inner = (
    <>
      <FileIcon name={node.name} />
      <span className="truncate">{node.name}</span>
      <Stat file={node.file} />
    </>
  );

  // Client-switching mode: select without navigating.
  if (onSelect) {
    return (
      <button
        type="button"
        onClick={() => onSelect(node.path)}
        style={leafPad}
        className={className}
      >
        {inner}
      </button>
    );
  }

  const query = wt
    ? { wt: "1", file: node.path }
    : { sha: sha ?? "", file: node.path };
  return (
    <Link
      href={{ pathname: "/diff", query }}
      style={leafPad}
      className={className}
    >
      {inner}
    </Link>
  );
}
