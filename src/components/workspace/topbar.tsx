"use client";

import {
  RiArrowDownLine,
  RiArrowDownSLine,
  RiArrowUpLine,
  RiCheckLine,
  RiCloseLine,
  RiDownloadCloud2Line,
  RiGitBranchLine,
  RiGitCommitLine,
  RiGitMergeLine,
  RiLoader4Line,
} from "@remixicon/react";
import { useEffect, useState, useTransition } from "react";
import {
  type ActionState,
  closeRepo,
  gitFetch,
  gitPull,
  gitPush,
  gitPushForce,
  gitPushSetUpstream,
  mergeBranch,
  type PullMode,
} from "@/app/actions";
import { GitLogo } from "@/components/git-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Branch, RepoInfo } from "@/lib/git";
import { notify } from "@/lib/notify";

type Props = {
  repo: RepoInfo;
  current: Branch | null;
  branches: Branch[];
};

export function Topbar({ repo, current, branches }: Props) {
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<ActionState>, success: string) => {
    startTransition(async () => {
      notify(await action(), success);
    });
  };

  const close = () => startTransition(() => closeRepo());

  const ahead = current?.ahead ?? 0;
  const behind = current?.behind ?? 0;

  return (
    <header className="border-border bg-card flex h-11 shrink-0 items-center gap-2 border-b px-3">
      <div className="flex items-center gap-2">
        <GitLogo className="size-4 text-[#f05133]" />
        <span className="font-heading text-sm font-semibold">{repo.name}</span>
      </div>

      <Separator orientation="vertical" className="mx-1 !h-5" />

      <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <RiGitBranchLine className="size-3.5" />
        <span className="text-foreground font-medium">
          {repo.detached ? `detached @ ${repo.commit}` : repo.head}
        </span>
        {behind > 0 ? (
          <span className="flex items-center gap-0.5">
            <RiArrowDownLine className="size-3" />
            {behind}
          </span>
        ) : null}
        {ahead > 0 ? (
          <span className="flex items-center gap-0.5">
            <RiArrowUpLine className="size-3" />
            {ahead}
          </span>
        ) : null}
      </div>

      <div className="ml-auto flex items-center gap-1">
        <ToolButton
          label="Fetch all remotes"
          icon={<RiDownloadCloud2Line />}
          pending={pending}
          onClick={() => run(gitFetch, "Fetched from remotes")}
        >
          Fetch
        </ToolButton>
        <PullButton
          pending={pending}
          behind={behind}
          onPull={(mode) => run(() => gitPull(mode), "Pulled")}
        />
        <PushButton
          pending={pending}
          ahead={ahead}
          hasUpstream={!!current?.upstream}
          onPush={() => run(gitPush, "Pushed to upstream")}
          onSetUpstream={() =>
            run(gitPushSetUpstream, "Pushed and set upstream")
          }
          onForce={() => run(gitPushForce, "Force-pushed")}
        />

        <MergeMenu
          current={current}
          branches={branches}
          pending={pending}
          onMerge={(name) =>
            run(() => mergeBranch(name), `Merged ${name} into ${current?.name}`)
          }
        />

        <Separator orientation="vertical" className="mx-1 !h-5" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={close}>
              <RiCloseLine />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Close repository</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}

function ToolButton({
  label,
  icon,
  children,
  pending,
  onClick,
  badge,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  pending: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={onClick}
        >
          {pending ? <RiLoader4Line className="animate-spin" /> : icon}
          {children}
          {badge ? (
            <Badge variant="secondary" className="ml-0.5">
              {badge}
            </Badge>
          ) : null}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

const PULL_OPTIONS: {
  mode: PullMode;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    mode: "ff-or-merge",
    label: "Fast-forward if possible",
    description: "Fast-forward, or merge when histories diverged",
    icon: <RiGitMergeLine className="size-3.5" />,
  },
  {
    mode: "ff",
    label: "Fast-forward only",
    description: "Fail if a merge would be required",
    icon: <RiArrowDownLine className="size-3.5" />,
  },
  {
    mode: "rebase",
    label: "Pull with rebase",
    description: "Replay your local commits on top of upstream",
    icon: <RiGitCommitLine className="size-3.5" />,
  },
];

const PULL_PREF_KEY = "opengit.pullMode";
const DEFAULT_PULL: PullMode = "ff-or-merge";

function PullButton({
  pending,
  behind,
  onPull,
}: {
  pending: boolean;
  behind: number;
  onPull: (mode: PullMode) => void;
}) {
  const [defaultMode, setDefaultMode] = useState<PullMode>(DEFAULT_PULL);

  // Restore the saved default after mount (avoids SSR/client mismatch).
  useEffect(() => {
    const saved = localStorage.getItem(PULL_PREF_KEY) as PullMode | null;
    if (saved && PULL_OPTIONS.some((o) => o.mode === saved)) {
      setDefaultMode(saved);
    }
  }, []);

  // Selecting an option both runs it and makes it the new default action.
  const choose = (mode: PullMode) => {
    setDefaultMode(mode);
    localStorage.setItem(PULL_PREF_KEY, mode);
    onPull(mode);
  };

  const current =
    PULL_OPTIONS.find((o) => o.mode === defaultMode) ?? PULL_OPTIONS[0];

  return (
    <div className="flex items-center">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => onPull(defaultMode)}
            className="rounded-r-none pr-1.5"
          >
            {pending ? (
              <RiLoader4Line className="animate-spin" />
            ) : (
              <RiArrowDownLine />
            )}
            Pull
            {behind ? (
              <Badge variant="secondary" className="ml-0.5">
                {behind}
              </Badge>
            ) : null}
          </Button>
        </TooltipTrigger>
        <TooltipContent>Pull — {current.label}</TooltipContent>
      </Tooltip>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={pending}
            title="Pull options"
            className="rounded-l-none"
          >
            <RiArrowDownSLine />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel>Pull behaviour (sets default)</DropdownMenuLabel>
          {PULL_OPTIONS.map((opt) => (
            <DropdownMenuItem
              key={opt.mode}
              onSelect={() => choose(opt.mode)}
              className="items-start gap-2"
            >
              <span className="mt-0.5">{opt.icon}</span>
              <span className="flex flex-1 flex-col">
                <span>{opt.label}</span>
                <span className="text-muted-foreground text-[0.625rem]">
                  {opt.description}
                </span>
              </span>
              {opt.mode === defaultMode ? (
                <RiCheckLine className="text-primary mt-0.5 size-3.5" />
              ) : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function MergeMenu({
  current,
  branches,
  pending,
  onMerge,
}: {
  current: Branch | null;
  branches: Branch[];
  pending: boolean;
  onMerge: (name: string) => void;
}) {
  // Everything except the branch we're currently on.
  const others = branches.filter((b) => !b.isCurrent);
  const local = others.filter((b) => !b.isRemote);
  const remote = others.filter((b) => b.isRemote);
  const disabled = pending || !current || others.length === 0;

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={disabled}>
              <RiGitMergeLine />
              Merge
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>
          {current
            ? `Merge a branch into ${current.name}`
            : "No current branch"}
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        align="end"
        className="max-h-80 w-56 overflow-y-auto"
      >
        <DropdownMenuLabel>
          Merge a branch into{" "}
          <span className="text-foreground font-semibold">{current?.name}</span>
        </DropdownMenuLabel>
        {local.map((b) => (
          <DropdownMenuItem key={b.fullName} onSelect={() => onMerge(b.name)}>
            <RiGitMergeLine className="mr-2 size-3.5" />
            <MergeLabel source={b.name} target={current?.name} />
          </DropdownMenuItem>
        ))}
        {remote.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-muted-foreground">
              Remotes
            </DropdownMenuLabel>
            {remote.map((b) => (
              <DropdownMenuItem
                key={b.fullName}
                onSelect={() => onMerge(b.name)}
              >
                <RiGitMergeLine className="mr-2 size-3.5" />
                <MergeLabel source={b.name} target={current?.name} />
              </DropdownMenuItem>
            ))}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MergeLabel({ source, target }: { source: string; target?: string }) {
  return (
    <span className="truncate">
      Merge <span className="font-semibold">{source}</span> into{" "}
      <span className="font-semibold">{target}</span>
    </span>
  );
}

function PushButton({
  pending,
  ahead,
  hasUpstream,
  onPush,
  onSetUpstream,
  onForce,
}: {
  pending: boolean;
  ahead: number;
  hasUpstream: boolean;
  onPush: () => void;
  onSetUpstream: () => void;
  onForce: () => void;
}) {
  return (
    <div className="flex items-center">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={hasUpstream ? onPush : onSetUpstream}
            className="rounded-r-none pr-1.5"
          >
            {pending ? (
              <RiLoader4Line className="animate-spin" />
            ) : (
              <RiArrowUpLine />
            )}
            Push
            {ahead ? (
              <Badge variant="secondary" className="ml-0.5">
                {ahead}
              </Badge>
            ) : null}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {hasUpstream ? "Push to upstream" : "Push and set upstream"}
        </TooltipContent>
      </Tooltip>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={pending}
            title="Push options"
            className="rounded-l-none border-l-0"
          >
            <RiArrowDownSLine />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel>Push options</DropdownMenuLabel>
          <DropdownMenuItem onSelect={onPush}>
            <RiArrowUpLine className="mr-2 size-3.5" />
            Push
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onSetUpstream}>
            <RiGitBranchLine className="mr-2 size-3.5" />
            Push &amp; set upstream (origin)
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive" onSelect={onForce}>
            <RiArrowUpLine className="mr-2 size-3.5" />
            Force push (--force-with-lease)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
