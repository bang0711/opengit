import type { BlameLine } from "@/lib/git";

/** One source line in the blame view: commit/author gutter + line + code. */
export function BlameRow({ line }: { line: BlameLine }) {
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
