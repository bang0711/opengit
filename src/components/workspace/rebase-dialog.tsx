"use client";

import { RiLoader4Line } from "@remixicon/react";
import { useRouter } from "@/lib/router";
import { useEffect, useState, useTransition } from "react";
import { interactiveRebase, type RebaseOp, rebaseCommits } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RebaseCommit } from "@/lib/git";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";

const OPS: RebaseOp[] = ["pick", "squash", "fixup", "drop"];

export function RebaseDialog({
  base,
  onClose,
}: {
  base: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [commits, setCommits] = useState<RebaseCommit[]>([]);
  const [ops, setOps] = useState<Record<string, RebaseOp>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoad] = useTransition();
  const [applying, startApply] = useTransition();

  useEffect(() => {
    if (!base) return;
    setError(null);
    setOps({});
    startLoad(async () => {
      const r = await rebaseCommits(base);
      if ("error" in r) setError(r.error);
      else setCommits(r.commits);
    });
  }, [base]);

  const apply = () => {
    if (!base) return;
    startApply(async () => {
      const r = await interactiveRebase(base, ops);
      notify(r, "Rebase complete");
      if (!r?.error) {
        onClose();
        router.refresh();
      }
    });
  };

  return (
    <Dialog open={!!base} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Interactive rebase</DialogTitle>
          <DialogDescription>
            Reorder is kept as-is; choose what to do with each commit (newest at
            the bottom). Conflicts open the resolver.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            <RiLoader4Line className="size-5 animate-spin" />
          </div>
        ) : error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : commits.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No commits after this one to rebase.
          </p>
        ) : (
          <ScrollArea className="max-h-72">
            <div className="flex flex-col gap-1 pr-2">
              {commits.map((c) => {
                const op = ops[c.sha] ?? "pick";
                return (
                  <div
                    key={c.sha}
                    className={cn(
                      "flex items-center gap-2 rounded-md border border-border px-2 py-1 text-xs",
                      op === "drop" && "opacity-50",
                    )}
                  >
                    <span className="shrink-0 font-mono text-muted-foreground">
                      {c.short}
                    </span>
                    <span className="truncate">{c.subject}</span>
                    <Select
                      value={op}
                      onValueChange={(v) =>
                        setOps((m) => ({ ...m, [c.sha]: v as RebaseOp }))
                      }
                    >
                      <SelectTrigger className="ml-auto h-6">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OPS.map((o) => (
                          <SelectItem key={o} value={o}>
                            {o}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={applying || loading || commits.length === 0}
            onClick={apply}
          >
            {applying ? <RiLoader4Line className="animate-spin" /> : null}
            Start rebase
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
