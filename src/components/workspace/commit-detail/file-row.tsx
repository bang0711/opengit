import Link from "@/lib/link";
import { FileIcon } from "@/components/shared/file-icon";
import { statusColor } from "@/components/shared/file-status";
import type { CommitFile } from "@/lib/git";
import { cn } from "@/lib/utils";

export function FileRow({ file, sha }: { file: CommitFile; sha: string }) {
  // GitLens-style: filename first, dimmed parent folder beside it.
  const name = file.path.split("/").pop() ?? file.path;
  const dir = file.path.slice(0, file.path.length - name.length - 1);
  return (
    <Link
      href={{ pathname: "/diff", query: { sha, file: file.path } }}
      title="View changes"
      className="hover:bg-muted/50 flex w-full items-center gap-2 rounded-md px-1.5 py-0.5 text-left text-xs"
    >
      <span
        className={cn(
          "w-3 shrink-0 text-center font-mono font-bold",
          statusColor(file.status),
        )}
      >
        {file.status}
      </span>
      <FileIcon name={file.path} />
      <span className="flex min-w-0 items-baseline gap-1.5" title={file.path}>
        <span className="truncate">{name}</span>
        {dir ? (
          <span className="truncate text-[0.625rem] text-muted-foreground">
            {dir}
          </span>
        ) : null}
      </span>
      <span className="ml-auto shrink-0 font-mono text-[0.625rem]">
        {file.additions >= 0 ? (
          <span className="text-green-500">+{file.additions}</span>
        ) : null}{" "}
        {file.deletions >= 0 ? (
          <span className="text-red-500">−{file.deletions}</span>
        ) : (
          <span className="text-muted-foreground">binary</span>
        )}
      </span>
    </Link>
  );
}
