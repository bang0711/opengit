"use client";

import { RiAlertLine } from "@remixicon/react";
import { useEffect } from "react";
import { Island } from "@/components/island";
import { TerminalPanel } from "@/components/terminal-panel";
import { toggleTerminal, useTerminalOpen } from "@/lib/terminal-open";
import Link from "@/lib/link";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";
import { usePersistedState } from "@/hooks/use-persisted-state";
import type {
  Branch,
  Commit,
  FileStatus,
  MergeState,
  Remote,
  RepoInfo,
  Stash,
  Tag,
} from "@/lib/git";
import { ChangesPanel } from "./changes-panel";
import { CommitDetailPane } from "./commit-detail";
import { CommitGraph } from "./commit-graph";
import { SidebarPanel } from "./sidebar-panel";
import { Topbar } from "./topbar";

export type WorkspaceData = {
  repo: RepoInfo;
  branches: Branch[];
  remotes: Remote[];
  tags: Tag[];
  stashes: Stash[];
  commits: Commit[];
  status: FileStatus[];
  merge: MergeState;
};

export function Workspace(data: WorkspaceData) {
  useAutoRefresh(data.repo.path);
  const current = data.branches.find((b) => b.isCurrent) ?? null;
  const [selected, setSelected] = usePersistedState<string | null>(
    `opengit.commit:${data.repo.path}`,
    null,
  );
  const conflicts = data.merge.conflicted.length;
  const termOpen = useTerminalOpen();

  // Ctrl+J (Cmd+J) toggles the docked terminal, like VS Code.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        !e.shiftKey &&
        !e.altKey &&
        e.code === "KeyJ"
      ) {
        e.preventDefault();
        toggleTerminal();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="bg-background flex h-screen flex-col">
      <Topbar repo={data.repo} current={current} branches={data.branches} />

      {conflicts > 0 ? (
        <div className="flex h-9 shrink-0 items-center gap-2 border-b border-destructive/40 bg-destructive/10 px-3 text-xs text-destructive">
          <RiAlertLine className="size-4" />
          <span className="font-medium">
            {conflicts} conflicted file{conflicts > 1 ? "s" : ""} —{" "}
            {data.merge.inRebase ? "rebase" : "merge"} in progress
          </span>
          <Button asChild size="sm" variant="destructive" className="ml-auto">
            <Link href="/conflicts">Resolve conflicts</Link>
          </Button>
        </div>
      ) : null}

      <ResizablePanelGroup orientation="horizontal" className="flex-1 p-1.5">
        <ResizablePanel defaultSize="20%" minSize="14%" maxSize="32%">
          <Island>
            <SidebarPanel
              branches={data.branches}
              remotes={data.remotes}
              tags={data.tags}
              stashes={data.stashes}
            />
          </Island>
        </ResizablePanel>
        <ResizableHandle className="bg-transparent" />

        <ResizablePanel defaultSize="55%" minSize="30%">
          <ResizablePanelGroup
            key={termOpen ? "with-terminal" : "no-terminal"}
            orientation="vertical"
          >
            <ResizablePanel defaultSize={termOpen ? "45%" : "60%"} minSize="20%">
              <Island>
                <CommitGraph
                  commits={data.commits}
                  selected={selected}
                  onSelect={setSelected}
                />
              </Island>
            </ResizablePanel>
            <ResizableHandle className="bg-transparent" />
            <ResizablePanel defaultSize={termOpen ? "25%" : "40%"} minSize="15%">
              <Island>
                <CommitDetailPane sha={selected} />
              </Island>
            </ResizablePanel>

            {termOpen ? (
              <>
                <ResizableHandle className="bg-transparent" />
                <ResizablePanel defaultSize="30%" minSize="12%">
                  <Island>
                    <TerminalPanel />
                  </Island>
                </ResizablePanel>
              </>
            ) : null}
          </ResizablePanelGroup>
        </ResizablePanel>

        <ResizableHandle className="bg-transparent" />

        <ResizablePanel defaultSize="25%" minSize="18%" maxSize="40%">
          <Island>
            <ChangesPanel files={data.status} />
          </Island>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
