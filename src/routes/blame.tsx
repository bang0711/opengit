import { RiArrowLeftLine, RiFileTextLine } from "@remixicon/react";
import { type LoaderFunctionArgs, useLoaderData } from "react-router-dom";
import type { BlameLine } from "@shared/types";
import { BlameRow } from "@/app/blame/blame-row";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import Link from "@/lib/link";

export async function blameLoader({ request }: LoaderFunctionArgs) {
  const file = new URL(request.url).searchParams.get("file");
  if (!file)
    return { file: null, lines: [] as BlameLine[], error: "No file specified." };
  const r = await window.api.blameFile(file);
  if ("error" in r) return { file, lines: [] as BlameLine[], error: r.error };
  return { file, lines: r.lines, error: null as string | null };
}

export function Blame() {
  const { file, lines, error } = useLoaderData() as Awaited<
    ReturnType<typeof blameLoader>
  >;
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
              <BlameRow key={l.line} line={l} />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
    </div>
  );
}
