import { getIcon } from "material-file-icons";
import { cn } from "@/lib/utils";

/** Material Icon Theme file glyph (GitLens-style), resolved by filename/path. */
export function FileIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  // svg is a static string from the trusted material-file-icons package; it
  // self-sizes to 100% so the wrapper controls dimensions.
  const icon = getIcon(name);
  return (
    <span
      className={cn("inline-block size-3.5 shrink-0", className)}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted static svg
      dangerouslySetInnerHTML={{ __html: icon.svg }}
    />
  );
}
