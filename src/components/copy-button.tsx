"use client";

import { RiCheckLine, RiFileCopyLine } from "@remixicon/react";
import { useState } from "react";
import { toast } from "sonner";
import { ActionTooltip } from "@/components/action-tooltip";
import { Button } from "@/components/ui/button";

export function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = () => {
    navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopied(true);
        toast.success(label ? `Copied ${label}` : "Copied");
        setTimeout(() => setCopied(false), 1200);
      })
      .catch(() => toast.error("Copy failed"));
  };

  return (
    <ActionTooltip label={label ? `Copy ${label}` : "Copy"}>
      <Button variant="ghost" size="icon-xs" onClick={onCopy}>
        {copied ? (
          <RiCheckLine className="text-green-500" />
        ) : (
          <RiFileCopyLine />
        )}
      </Button>
    </ActionTooltip>
  );
}
