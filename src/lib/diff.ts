// Parse a unified diff (git patch) into aligned side-by-side rows, the way
// Azure DevOps shows them: deletions on the left, additions on the right,
// replacements paired on the same row.

export type DiffRow =
  | { type: "hunk"; text: string }
  | {
      type: "line";
      leftNo: number | null;
      leftText: string | null; // null = empty cell
      leftDel: boolean;
      rightNo: number | null;
      rightText: string | null;
      rightAdd: boolean;
    };

export type ParsedDiff = {
  rows: DiffRow[];
  additions: number;
  deletions: number;
  binary: boolean;
};

export function parseUnifiedDiff(patch: string): ParsedDiff {
  const lines = patch.split("\n");
  const rows: DiffRow[] = [];
  let additions = 0;
  let deletions = 0;
  let binary = false;

  let oldLine = 0;
  let newLine = 0;
  let inHunk = false;

  // Pending deletion/addition runs, flushed (paired) at the next context/hunk.
  let dels: { no: number; text: string }[] = [];
  let adds: { no: number; text: string }[] = [];

  const flush = () => {
    const n = Math.max(dels.length, adds.length);
    for (let i = 0; i < n; i++) {
      const d = dels[i];
      const a = adds[i];
      rows.push({
        type: "line",
        leftNo: d ? d.no : null,
        leftText: d ? d.text : null,
        leftDel: !!d,
        rightNo: a ? a.no : null,
        rightText: a ? a.text : null,
        rightAdd: !!a,
      });
    }
    dels = [];
    adds = [];
  };

  for (const line of lines) {
    if (
      line.startsWith("Binary files") ||
      line.startsWith("GIT binary patch")
    ) {
      binary = true;
      continue;
    }
    const hunk = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)$/.exec(line);
    if (hunk) {
      flush();
      oldLine = Number(hunk[1]);
      newLine = Number(hunk[2]);
      inHunk = true;
      rows.push({
        type: "hunk",
        text: `@@ -${hunk[1]} +${hunk[2]} @@${hunk[3]}`,
      });
      continue;
    }
    if (!inHunk) continue; // skip "diff --git", "index", "---", "+++" preamble
    if (line.startsWith("\\")) continue; // "\ No newline at end of file"

    const marker = line[0];
    const text = line.slice(1);
    if (marker === "+") {
      adds.push({ no: newLine++, text });
      additions++;
    } else if (marker === "-") {
      dels.push({ no: oldLine++, text });
      deletions++;
    } else {
      // context line — flush any pending change block, then emit on both sides
      flush();
      rows.push({
        type: "line",
        leftNo: oldLine++,
        leftText: text,
        leftDel: false,
        rightNo: newLine++,
        rightText: text,
        rightAdd: false,
      });
    }
  }
  flush();

  return { rows, additions, deletions, binary };
}

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
