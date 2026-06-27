import { RiArrowLeftLine, RiCheckboxCircleLine } from "@remixicon/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ConflictResolver } from "@/components/workspace/conflict-resolver";
import { getValidActiveRepoPath } from "@/lib/active-repo";
import { getMergeState } from "@/lib/git";
import { Notice } from "./notice";

export const dynamic = "force-dynamic";

export default async function ConflictsPage() {
  const repo = await getValidActiveRepoPath();
  if (!repo) {
    return <Notice>No repository is open.</Notice>;
  }

  const state = await getMergeState(repo);

  // Nothing to resolve and no merge in flight — show a friendly empty state.
  if (state.conflicted.length === 0 && !state.inMerge && !state.inRebase) {
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

  return (
    <ConflictResolver files={state.conflicted} inRebase={state.inRebase} />
  );
}
