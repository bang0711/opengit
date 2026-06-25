"use client";

import {
  RiCornerUpLeftLine,
  RiFolder3Line,
  RiGitRepositoryLine,
  RiHome4Line,
  RiLoader4Line,
} from "@remixicon/react";
import { useState, useTransition } from "react";
import { type DirListing, listDirectory } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type Props = {
  /** "repo" only allows picking a git repository; "dir" allows any folder. */
  mode: "repo" | "dir";
  title: string;
  description: string;
  onPick: (path: string) => void;
  children: React.ReactNode; // trigger
};

export function FolderPicker({
  mode,
  title,
  description,
  onPick,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const [listing, setListing] = useState<DirListing | null>(null);
  const [pending, startTransition] = useTransition();

  const navigate = (path?: string) =>
    startTransition(async () => {
      setListing(await listDirectory(path));
    });

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && !listing) navigate();
  };

  const canSelect = mode === "dir" || (listing?.isRepo ?? false);

  const select = () => {
    if (listing && canSelect) {
      onPick(listing.path);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            title="Home"
            disabled={pending}
            onClick={() => navigate()}
          >
            <RiHome4Line />
          </Button>
          <Button
            variant="outline"
            size="icon"
            title="Up one level"
            disabled={pending || !listing?.parent}
            onClick={() => listing?.parent && navigate(listing.parent)}
          >
            <RiCornerUpLeftLine />
          </Button>
          <Input
            readOnly
            value={listing?.path ?? ""}
            className="font-mono text-xs"
          />
        </div>

        <ScrollArea className="h-72 rounded-md border border-border">
          {pending ? (
            <div className="flex h-72 items-center justify-center text-muted-foreground">
              <RiLoader4Line className="size-5 animate-spin" />
            </div>
          ) : listing?.error ? (
            <p className="p-4 text-xs text-destructive">{listing.error}</p>
          ) : listing && listing.entries.length === 0 ? (
            <p className="p-4 text-xs text-muted-foreground">
              No sub-folders here.
            </p>
          ) : (
            <div className="p-1">
              {listing?.entries.map((entry) => (
                <button
                  key={entry.path}
                  type="button"
                  onClick={() => navigate(entry.path)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted",
                  )}
                >
                  {entry.isRepo ? (
                    <RiGitRepositoryLine className="size-4 shrink-0 text-primary" />
                  ) : (
                    <RiFolder3Line className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate">{entry.name}</span>
                  {entry.isRepo ? (
                    <Badge variant="secondary" className="ml-auto">
                      repo
                    </Badge>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {mode === "repo"
              ? listing?.isRepo
                ? "This folder is a git repository."
                : "Open a folder that contains a .git directory."
              : "Pick where the repository will be cloned."}
          </p>
          <Button disabled={pending || !canSelect} onClick={select}>
            {mode === "repo" ? "Open repository" : "Select folder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
