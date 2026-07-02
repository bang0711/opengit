import { useEffect } from "react";
import { useRevalidator } from "react-router-dom";

/**
 * Re-fetch route data when the active repo changes. The main process watches
 * the repo and pushes a debounced "repo:changed" over IPC; we revalidate on it,
 * plus on window focus as a cheap fallback. Both sources feed one trailing
 * debounce — editing a file externally then alt-tabbing back fires them ms
 * apart, and one loader run covers both.
 */
export function useAutoRefresh(_repoPath?: string) {
  const { revalidate } = useRevalidator();
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const kick = () => {
      clearTimeout(t);
      t = setTimeout(revalidate, 300);
    };
    const off = window.api.onRepoChange(kick);
    window.addEventListener("focus", kick);
    return () => {
      clearTimeout(t);
      off();
      window.removeEventListener("focus", kick);
    };
  }, [revalidate]);
}
