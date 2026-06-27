"use client";

import {
  RiAddLine,
  RiArrowGoBackLine,
  RiFileCopyLine,
  RiFileTextLine,
  RiSubtractLine,
} from "@remixicon/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ActionTooltip } from "@/components/action-tooltip";
import { DiffStat } from "@/components/shared/diff-stat";
import { FileIcon } from "@/components/shared/file-icon";
import { StatusBadge } from "@/components/shared/file-status";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { FileStatus } from "@/lib/git";

export function FileRow({
  file,
  staged,
  pending,
  onPrimary,
  onDiscard,
}: {
  file: FileStatus;
  staged?: boolean;
  pending: boolean;
  onPrimary: () => void;
  onDiscard?: () => void;
}) {
  const router = useRouter();
  const code = file.untracked ? "?" : staged ? file.index : file.worktree;
  const diffHref = `/diff?wt=1&file=${encodeURIComponent(file.path)}`;
  // GitLens-style: filename first, dimmed parent folder beside it.
  const name = file.path.split("/").pop() ?? file.path;
  const dir = file.path.slice(0, file.path.length - name.length - 1);
  const copyPath = () => {
    navigator.clipboard?.writeText(file.path);
    toast.success("Copied path");
  };
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="group flex items-center gap-1.5 px-3 py-0.5 text-xs hover:bg-muted/50">
          <StatusBadge code={code} />
          <FileIcon name={file.path} className="size-3.5" />
          <Link
            href={{ pathname: "/diff", query: { wt: "1", file: file.path } }}
            className="flex min-w-0 flex-1 items-baseline gap-1.5"
            title={`View changes in ${file.path}`}
          >
            <span className="truncate hover:underline">{name}</span>
            {dir ? (
              <span className="truncate text-[0.6875rem] text-muted-foreground">
                {dir}
              </span>
            ) : null}
          </Link>
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <DiffStat
              adds={staged ? file.stagedAdds : file.unstagedAdds}
              dels={staged ? file.stagedDels : file.unstagedDels}
            />
            <div className="flex items-center opacity-0 group-hover:opacity-100">
              {onDiscard ? (
                <ActionTooltip label="Discard changes">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    disabled={pending}
                    onClick={onDiscard}
                  >
                    <RiArrowGoBackLine />
                  </Button>
                </ActionTooltip>
              ) : null}
              <ActionTooltip label={staged ? "Unstage" : "Stage"}>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  disabled={pending}
                  onClick={onPrimary}
                >
                  {staged ? <RiSubtractLine /> : <RiAddLine />}
                </Button>
              </ActionTooltip>
            </div>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onSelect={() => router.push(diffHref)}>
          <RiFileTextLine />
          View changes
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem disabled={pending} onSelect={onPrimary}>
          {staged ? <RiSubtractLine /> : <RiAddLine />}
          {staged ? "Unstage changes" : "Stage changes"}
        </ContextMenuItem>
        {onDiscard ? (
          <ContextMenuItem
            variant="destructive"
            disabled={pending}
            onSelect={onDiscard}
          >
            <RiArrowGoBackLine />
            Discard changes
          </ContextMenuItem>
        ) : null}
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={copyPath}>
          <RiFileCopyLine />
          Copy path
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
