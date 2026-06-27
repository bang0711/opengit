import { useEffect } from "react";
import { useRevalidator } from "react-router-dom";

/**
 * Re-fetch route data when the active repo changes. The main process watches
 * the repo (chokidar) and pushes a debounced "repo:changed" over IPC; we
 * revalidate on it, plus on window focus as a cheap fallback.
 */
export function useAutoRefresh(_repoPath?: string) {
  const { revalidate } = useRevalidator();
  useEffect(() => {
    const off = window.api.onRepoChange(() => revalidate());
    const onFocus = () => revalidate();
    window.addEventListener("focus", onFocus);
    return () => {
      off();
      window.removeEventListener("focus", onFocus);
    };
  }, [revalidate]);
}
