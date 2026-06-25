import { RiArrowLeftLine, RiFileTextLine } from "@remixicon/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { getValidActiveRepoPath } from "@/lib/active-repo";
import { type BlameLine, getBlame } from "@/lib/git";

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
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-11 shrink-0 items-center gap-3 border-b border-border bg-card px-3">
        <Button asChild variant="outline" size="sm">
          <Link href="/">
            <RiArrowLeftLine />
            Back to repository
          </Link>
        </Button>
        <div className="flex min-w-0 items-center gap-2 text-xs">
          <RiFileTextLine className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate font-medium">{file}</span>
          <span className="shrink-0 text-muted-foreground">blame</span>
        </div>
      </header>

      {error ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          {error}
        </div>
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="min-w-max font-mono text-xs leading-5">
            {lines.map((l) => (
              <Row key={l.line} line={l} />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
    </div>
  );
}

function Row({ line }: { line: BlameLine }) {
  return (
    <div className="flex hover:bg-muted/40">
      <div
        className="flex w-64 shrink-0 items-center gap-2 border-r border-border bg-card/50 px-2 text-muted-foreground"
        title={line.sha}
      >
        <span className="shrink-0 text-amber-500">{line.short}</span>
        <span className="w-28 truncate">{line.author}</span>
        <span className="ml-auto shrink-0 text-[0.625rem]">
          {line.date
            ? new Date(line.date * 1000).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : ""}
        </span>
      </div>
      <span className="w-12 shrink-0 px-2 text-right text-muted-foreground/60 select-none">
        {line.line}
      </span>
      <span className="px-2 whitespace-pre">{line.code || " "}</span>
    </div>
  );
}
