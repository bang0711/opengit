import { RiArrowLeftLine, RiFileTextLine } from "@remixicon/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { getValidActiveRepoPath } from "@/lib/active-repo";
import { type BlameLine, getBlame } from "@/lib/git";
import { BlameRow } from "./blame-row";

export const dynamic = "force-dynamic";

export default async function BlamePage({
  searchParams,
}: {
  searchParams: Promise<{ file?: string }>;
}) {
  const { file } = await searchParams;
  const repo = await getValidActiveRepoPath();

  let lines: BlameLine[] = [];
  let error: string | null = null;
  if (!repo) error = "No repository is open.";
  else if (!file) error = "No file specified.";
  else {
    try {
      lines = await getBlame(repo, file);
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to blame file.";
    }
  }

  return (
    <div className="bg-background flex h-screen flex-col">
      <header className="border-border bg-card flex h-11 shrink-0 items-center gap-3 border-b px-3">
        <Button asChild variant="outline" size="sm">
          <Link href="/">
            <RiArrowLeftLine />
            Back to repository
          </Link>
        </Button>
        <div className="flex min-w-0 items-center gap-2 text-xs">
          <RiFileTextLine className="text-muted-foreground size-4 shrink-0" />
          <span className="truncate font-medium">{file}</span>
          <span className="text-muted-foreground shrink-0">blame</span>
        </div>
      </header>

      {error ? (
        <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
          {error}
        </div>
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="min-w-max font-mono text-xs leading-5">
            {lines.map((l) => (
              <BlameRow key={l.line} line={l} />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
    </div>
  );
}
