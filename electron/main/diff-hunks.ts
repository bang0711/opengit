/**
 * Split a file's unified diff into its header (diff/index/---/+++ lines) and
 * individual hunks. A single hunk can be re-applied as `header + hunk`.
 */
export function splitDiffIntoHunks(patch: string): {
  header: string;
  hunks: string[];
} {
  const lines = patch.split("\n");
  const header: string[] = [];
  const hunks: string[] = [];
  let cur: string[] | null = null;

  for (const line of lines) {
    if (line.startsWith("@@")) {
      if (cur) hunks.push(cur.join("\n"));
      cur = [line];
    } else if (cur) {
      cur.push(line);
    } else {
      header.push(line);
    }
  }
  if (cur) hunks.push(cur.join("\n"));
  return { header: header.join("\n"), hunks };
}
