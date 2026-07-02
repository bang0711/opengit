import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * "Islands" chrome: a panel that floats as a rounded surface on the deep canvas,
 * separated from its neighbours by the surrounding padding. Inspired by the
 * "Dark Islands" VS Code theme. Put islands on a `bg-background` (canvas) parent.
 */
export function Island({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="h-full min-h-0 p-1.5">
      <div
        className={cn(
          "border-border bg-card flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border shadow-[0_2px_12px_rgb(0_0_0/0.35)]",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
