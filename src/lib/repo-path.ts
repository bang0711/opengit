/**
 * Split a repository path into its display name (last segment) and location
 * (the parent path). Handles both Windows `\` and POSIX `/` separators.
 */
export function splitRepoPath(path: string): { name: string; location: string } {
  const parts = path.split(/[/\\]/).filter(Boolean);
  return {
    name: parts.at(-1) ?? path,
    location: parts.slice(0, -1).join("/") || path,
  };
}
