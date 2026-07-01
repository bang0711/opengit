"use client";

import { RiArrowLeftLine } from "@remixicon/react";
import { useEffect, useState } from "react";
import { useRevalidator } from "react-router-dom";
import { Island } from "@/components/island";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { FileTree } from "@/components/workspace/file-tree";
import { WorkingDiff } from "@/components/workspace/working-diff";
import type { TreeNode } from "@/lib/file-tree";

/**
 * Working-tree diff with client-side file switching. The file tree is loaded
 * once on the server; selecting a file just changes WorkingDiff's `file` prop,
 * which refetches that one diff — no route navigation, no re-running getStatus.
 */
export function WorkingTreeViewer({
  nodes,
  fileCount,
  initialFile,
}: {
  nodes: TreeNode[];
  fileCount: number;
  initialFile: string | null;
}) {
  const [selected, setSelected] = useState(initialFile);
  const { revalidate } = useRevalidator();

  // Re-run the loader on any working-tree change so the file tree picks up
  // newly created/deleted files and folders (not just edits to the open file).
  useEffect(() => window.api.onRepoChange(() => revalidate()), [revalidate]);

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

        <span className="text-xs font-medium">Working tree changes</span>
        <span className="text-muted-foreground ml-auto shrink-0 text-xs">
          {fileCount} files changed
        </span>
      </header>

      <ResizablePanelGroup orientation="horizontal" className="flex-1 p-1.5 pt-0">
        <ResizablePanel defaultSize="24%" minSize="15%" maxSize="45%">
          <Island>
            <ScrollArea className="bg-sidebar h-full">
              <FileTree
                nodes={nodes}
                selected={selected}
                wt
                onSelect={setSelected}
              />
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </Island>
        </ResizablePanel>

        <ResizableHandle className="bg-transparent" />

        <ResizablePanel defaultSize="76%">
          <Island>
            {selected ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <WorkingDiff file={selected} />
              </div>
            ) : (
              <div className="text-muted-foreground flex h-full flex-1 items-center justify-center text-sm">
                No changes in the working tree.
              </div>
            )}
          </Island>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
