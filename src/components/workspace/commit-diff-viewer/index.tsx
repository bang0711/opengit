"use client";

import { RiArrowLeftLine, RiGitCommitLine } from "@remixicon/react";
import { isImagePath } from "@shared/image";
import { useEffect, useRef, useState } from "react";
import { commitFileDiff } from "@/app/actions";
import { Island } from "@/components/island";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { FileTree } from "@/components/workspace/file-tree";
import type { TreeNode } from "@/lib/file-tree";
import { DiffPane } from "./diff-pane";

/**
 * Commit inspector with client-side file switching. The commit detail (file
 * tree + meta) is loaded once on the server; clicking a file fetches only that
 * file's diff via a server action and swaps the pane — no route navigation, no
 * re-running getCommitDetail. Diffs are cached so re-clicks are instant.
 */
export function CommitDiffViewer({
  sha,
  nodes,
  subject,
  shortSha,
  parentSha,
  fileCount,
  initialFile,
  initialDiff,
}: {
  sha: string;
  nodes: TreeNode[];
  subject: string;
  shortSha: string;
  parentSha: string | null;
  fileCount: number;
  initialFile: string | null;
  initialDiff: string | null;
}) {
  const [selected, setSelected] = useState(initialFile);
  const [patch, setPatch] = useState<string | null>(initialDiff);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cache = useRef(
    new Map<string, string>(
      initialFile && initialDiff !== null ? [[initialFile, initialDiff]] : [],
    ),
  );

  useEffect(() => {
    if (!selected) return;
    // Images are fetched as blobs by DiffPane, not as a text patch.
    if (isImagePath(selected)) {
      setPatch(null);
      setError(null);
      return;
    }
    const cached = cache.current.get(selected);
    if (cached !== undefined) {
      setPatch(cached);
      setError(null);
      return;
    }
    let live = true;
    setPending(true);
    commitFileDiff(sha, selected)
      .then((r) => {
        if (!live) return;
        if ("error" in r) {
          setError(r.error);
          setPatch(null);
        } else {
          cache.current.set(selected, r.diff);
          setPatch(r.diff);
          setError(null);
        }
      })
      .finally(() => live && setPending(false));
    return () => {
      live = false;
    };
  }, [selected, sha]);

  const newLabel = `${subject} · ${shortSha}`;
  const oldLabel = parentSha
    ? `parent · ${parentSha.slice(0, 7)}`
    : "Added in this commit";

  return (
    <div className="bg-background flex h-screen flex-col">
      <header className="flex h-11 shrink-0 items-center gap-3 px-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.history.back()}
        >
          <RiArrowLeftLine />
          Back
        </Button>

        <div className="flex min-w-0 items-center gap-2 text-xs">
          <RiGitCommitLine className="text-muted-foreground size-4 shrink-0" />
          <span className="truncate font-medium">{subject}</span>
          <span className="text-muted-foreground shrink-0 font-mono">
            {shortSha}
          </span>
        </div>
        <span className="text-muted-foreground ml-auto shrink-0 text-xs">
          {fileCount} files changed
        </span>
      </header>

      <ResizablePanelGroup
        orientation="horizontal"
        className="flex-1 p-1.5 pt-0"
      >
        <ResizablePanel defaultSize="24%" minSize="15%" maxSize="45%">
          <Island>
            <FileTree
              className="bg-sidebar"
              nodes={nodes}
              selected={selected}
              onSelect={setSelected}
            />
          </Island>
        </ResizablePanel>

        <ResizableHandle className="bg-transparent" />

        <ResizablePanel defaultSize="76%">
          <Island>
            <div className="flex min-h-0 flex-1 flex-col">
              <DiffPane
                sha={sha}
                patch={patch}
                pending={pending}
                error={error}
                file={selected}
                oldLabel={oldLabel}
                newLabel={newLabel}
              />
            </div>
          </Island>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
