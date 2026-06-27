import type * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Standard hover tooltip for icon/action buttons. Use this instead of the
 * native `title` attribute on shadcn Buttons. Relies on the app-level
 * <TooltipProvider> (see layout.tsx).
 */
export function ActionTooltip({
  label,
  side,
  children,
}: {
  label: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  );
}
