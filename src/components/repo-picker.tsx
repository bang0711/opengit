"use client";

import {
  RiDownloadCloud2Line,
  RiFolderOpenLine,
  RiGitRepositoryLine,
  RiLoader4Line,
} from "@remixicon/react";
import { useActionState, useState } from "react";
import { cloneRepo, openRepo } from "@/app/actions";
import { FolderPicker } from "@/components/folder-picker";
import { GitLogo } from "@/components/git-logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function RepoPicker({ recent }: { recent: string[] }) {
  const [openState, openAction, opening] = useActionState(openRepo, {});
  const [cloneState, cloneAction, cloning] = useActionState(cloneRepo, {});
  const [path, setPath] = useState("");
  const [directory, setDirectory] = useState("");

  return (
    <div className="flex flex-1 items-center justify-center bg-background p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GitLogo className="size-6 text-[#f05133]" />
            <CardTitle className="font-heading text-lg">OpenGit</CardTitle>
          </div>
          <CardDescription>
            Open a local repository or clone one from a URL to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="open">
            <TabsList className="w-full">
              <TabsTrigger value="open" className="flex-1">
                <RiFolderOpenLine /> Open local
              </TabsTrigger>
              <TabsTrigger value="clone" className="flex-1">
                <RiDownloadCloud2Line /> Clone
              </TabsTrigger>
            </TabsList>

            <TabsContent value="open" className="mt-4">
              <form action={openAction} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="open-path">Repository folder</Label>
                  <div className="flex gap-2">
                    <Input
                      id="open-path"
                      name="path"
                      value={path}
                      readOnly
                      placeholder="No folder selected"
                      className="font-mono text-xs"
                    />
                    <FolderPicker
                      mode="repo"
                      title="Open repository"
                      description="Browse to a folder that is a git repository."
                      onPick={setPath}
                    >
                      <Button type="button" variant="outline">
                        <RiFolderOpenLine /> Browse
                      </Button>
                    </FolderPicker>
                  </div>
                </div>
                {openState.error ? (
                  <p className="text-xs text-destructive">{openState.error}</p>
                ) : null}
                <Button type="submit" size="lg" disabled={opening || !path}>
                  {opening ? (
                    <RiLoader4Line className="animate-spin" />
                  ) : (
                    <RiFolderOpenLine />
                  )}
                  Open repository
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="clone" className="mt-4">
              <form action={cloneAction} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="clone-url">Remote URL</Label>
                  <Input
                    id="clone-url"
                    name="url"
                    placeholder="https://github.com/user/repo.git"
                    autoComplete="off"
                    spellCheck={false}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="clone-dir">Destination folder</Label>
                  <div className="flex gap-2">
                    <Input
                      id="clone-dir"
                      name="directory"
                      value={directory}
                      readOnly
                      placeholder="No folder selected"
                      className="font-mono text-xs"
                    />
                    <FolderPicker
                      mode="dir"
                      title="Choose destination"
                      description="The repository will be cloned into a sub-folder here."
                      onPick={setDirectory}
                    >
                      <Button type="button" variant="outline">
                        <RiFolderOpenLine /> Browse
                      </Button>
                    </FolderPicker>
                  </div>
                </div>
                {cloneState.error ? (
                  <p className="text-xs text-destructive">{cloneState.error}</p>
                ) : null}
                <Button
                  type="submit"
                  size="lg"
                  disabled={cloning || !directory}
                >
                  {cloning ? (
                    <RiLoader4Line className="animate-spin" />
                  ) : (
                    <RiDownloadCloud2Line />
                  )}
                  Clone repository
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {recent.length > 0 ? (
            <div className="mt-6">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Recent
              </p>
              <div className="flex flex-col gap-1">
                {recent.map((recentPath) => (
                  <form key={recentPath} action={openAction}>
                    <input type="hidden" name="path" value={recentPath} />
                    <button
                      type="submit"
                      className="flex w-full items-center gap-2 truncate rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <RiGitRepositoryLine className="size-3.5 shrink-0" />
                      <span className="truncate">{recentPath}</span>
                    </button>
                  </form>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
