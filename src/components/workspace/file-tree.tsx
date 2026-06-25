"use client";

import {
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiFileLine,
  RiFolder3Line,
} from "@remixicon/react";
import Link from "next/link";
import { usePersistedState } from "@/hooks/use-persisted-state";
import type { TreeNode } from "@/lib/file-tree";
import type { CommitFile } from "@/lib/git";
import { cn } from "@/lib/utils";

const STATUS_COLOR: Record<string, string> = {
  A: "text-green-500",
  M: "text-amber-500",
  D: "text-red-500",
  R: "text-blue-500",
  C: "text-blue-500",
};

export function FileTree({
  nodes,
  sha,
  selected,
  wt,
}: {
  nodes: TreeNode[];
  sha?: string;
  selected: string | null;
  wt?: boolean;
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
          depth={0}
        />
      ))}
    </div>
  );
}

function TreeItem({
  node,
  sha,
  selected,
  wt,
  depth,
}: {
  node: TreeNode;
  sha?: string;
  selected: string | null;
  wt?: boolean;
  depth: number;
}) {
  const [open, setOpen] = usePersistedState(`opengit.tree:${node.path}`, true);
  const pad = { paddingLeft: 8 + depth * 12 };

  if (node.type === "dir") {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          style={pad}
          className="hover:bg-muted/60 flex w-full items-center gap-1 py-0.5 pr-2 text-left"
        >
          {open ? (
            <RiArrowDownSLine className="size-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <RiArrowRightSLine className="size-3.5 shrink-0 text-muted-foreground" />
          )}
          <RiFolder3Line className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{node.name}</span>
        </button>
        {open ? (
          <div>
            {node.children.map((child) => (
              <TreeItem
                key={child.path}
                node={child}
                sha={sha}
                selected={selected}
                wt={wt}
                depth={depth + 1}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  const active = node.path === selected;
  const query = wt
    ? { wt: "1", file: node.path }
    : { sha: sha ?? "", file: node.path };
  return (
    <Link
      href={{ pathname: "/diff", query }}
      style={{ paddingLeft: 8 + depth * 12 + 18 }}
      className={cn(
        "flex items-center gap-1.5 py-0.5 pr-2",
        active
          ? "bg-primary/15 text-foreground"
          : "hover:bg-muted/60 text-muted-foreground",
      )}
    >
      <RiFileLine className="size-3.5 shrink-0 opacity-70" />
      <span className="truncate">{node.name}</span>
      <Stat file={node.file} />
    </Link>
  );
}

function Stat({ file }: { file: CommitFile }) {
  return (
    <span className="ml-auto flex shrink-0 items-center gap-1 font-mono text-[0.625rem]">
      <span className={cn("font-bold", STATUS_COLOR[file.status])}>
        {file.status}
      </span>
      {file.additions >= 0 ? (
        <span className="text-green-500">+{file.additions}</span>
      ) : null}
      {file.deletions >= 0 ? (
        <span className="text-red-500">−{file.deletions}</span>
      ) : null}
    </span>
  );
}
