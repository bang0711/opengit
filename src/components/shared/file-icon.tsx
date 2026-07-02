import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

// material-file-icons bundles the whole Material Icon Theme (~1MB of svg data);
// load it lazily so it splits out of the main chunk — same pattern as the Prism
// grammars in lib/highlight.ts. Until it lands, render an empty (sized) span;
// subscribers re-render once ready. Loads in a few ms from local disk.
let getIcon: ((name: string) => { svg: string }) | null = null;
const listeners = new Set<() => void>();

void import("material-file-icons").then((m) => {
  getIcon = m.getIcon;
  for (const l of listeners) l();
});

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};
const ready = () => getIcon !== null;

/** Material Icon Theme file glyph (GitLens-style), resolved by filename/path. */
export function FileIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  useSyncExternalStore(subscribe, ready, ready);
  // svg is a static string from the trusted material-file-icons package; it
  // self-sizes to 100% so the wrapper controls dimensions.
  return (
    <span
      className={cn("inline-block size-3.5 shrink-0", className)}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted static svg
      dangerouslySetInnerHTML={{ __html: getIcon ? getIcon(name).svg : "" }}
    />
  );
}
