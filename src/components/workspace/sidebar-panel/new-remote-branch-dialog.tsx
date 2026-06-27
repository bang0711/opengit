"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function NewRemoteBranchDialog({
  open,
  onOpenChange,
  remotes,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  remotes: string[];
  onSubmit: (name: string, remote: string, mode: "remote" | "both") => void;
}) {
  const [name, setName] = useState("");
  const [remote, setRemote] = useState(remotes[0] ?? "");
  const [mode, setMode] = useState<"remote" | "both">("both");

  useEffect(() => {
    if (open) {
      setName("");
      setRemote(remotes[0] ?? "");
      setMode("both");
    }
  }, [open, remotes]);

  const submit = () => {
    const v = name.trim();
    if (!v || !remote) return;
    onOpenChange(false);
    onSubmit(v, remote, mode);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New remote branch</DialogTitle>
          <DialogDescription>
            Creates a branch from the current HEAD on the remote.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex flex-col gap-3"
        >
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium">Branch name</span>
            <Input
              autoFocus
              value={name}
              placeholder="feature/my-branch"
              spellCheck={false}
              autoComplete="off"
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {remotes.length > 1 ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium">Remote</span>
              <Select value={remote} onValueChange={setRemote}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {remotes.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-xs font-medium">Create</legend>
            <RadioGroup
              value={mode}
              onValueChange={(v) => setMode(v as "remote" | "both")}
              className="gap-1.5"
            >
              <label
                htmlFor="mode-both"
                className="flex cursor-pointer items-start gap-2 rounded-md p-1.5 hover:bg-muted/50"
              >
                <RadioGroupItem id="mode-both" value="both" className="mt-0.5" />
                <span className="flex flex-col">
                  <span className="text-xs font-medium">Remote + local</span>
                  <span className="text-[0.625rem] text-muted-foreground">
                    Branch locally, switch to it, and push with tracking
                  </span>
                </span>
              </label>
              <label
                htmlFor="mode-remote"
                className="flex cursor-pointer items-start gap-2 rounded-md p-1.5 hover:bg-muted/50"
              >
                <RadioGroupItem
                  id="mode-remote"
                  value="remote"
                  className="mt-0.5"
                />
                <span className="flex flex-col">
                  <span className="text-xs font-medium">Remote only</span>
                  <span className="text-[0.625rem] text-muted-foreground">
                    Push a new branch to the remote; stay on the current branch
                  </span>
                </span>
              </label>
            </RadioGroup>
          </fieldset>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || !remote}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
