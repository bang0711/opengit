import { RiArrowLeftLine, RiCheckboxCircleLine } from "@remixicon/react";
import { useLoaderData } from "react-router-dom";
import type { MergeState } from "@shared/types";
import { Notice } from "@/app/conflicts/notice";
import { Button } from "@/components/ui/button";
import { ConflictResolver } from "@/components/workspace/conflict-resolver";
import Link from "@/lib/link";

export async function conflictsLoader() {
  const ws = await window.api.workspace();
  if ("error" in ws) return { merge: null as MergeState | null };
  return { merge: ws.merge };
}

export function Conflicts() {
  const { merge } = useLoaderData() as Awaited<
    ReturnType<typeof conflictsLoader>
  >;

  if (!merge) return <Notice>No repository is open.</Notice>;

  if (merge.conflicted.length === 0 && !merge.inMerge && !merge.inRebase) {
    return (
      <Notice>
        <RiCheckboxCircleLine className="size-6 text-green-500" />
        <span>No conflicts to resolve.</span>
        <Button asChild size="sm" variant="outline">
          <Link href="/">
            <RiArrowLeftLine />
            Back to repository
          </Link>
        </Button>
      </Notice>
    );
  }

  return <ConflictResolver files={merge.conflicted} inRebase={merge.inRebase} />;
}
