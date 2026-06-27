"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Keep the page's server-component data in sync with on-disk repo state:
 * re-fetch on window focus / tab-visible, and poll while the window is in the
 * foreground. The page is `force-dynamic`, so router.refresh() re-runs git.
 *
 * ponytail: poll + focus, not a filesystem watcher — covers the edit-then-
 * review flow with zero deps. Upgrade path if you want true push: a chokidar
 * watcher on the repo streaming over SSE to trigger refresh().
 */
export function useAutoRefresh(intervalMs = 4000) {
  const router = useRouter();
  useEffect(() => {
    const visible = () => document.visibilityState === "visible";
    const refresh = () => visible() && router.refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    const id = setInterval(refresh, intervalMs);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      clearInterval(id);
    };
  }, [router, intervalMs]);
}
