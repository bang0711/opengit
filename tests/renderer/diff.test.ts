import { describe, expect, it } from "vitest";
import { parseUnifiedDiff, splitDiffIntoHunks } from "@/lib/diff";

const PATCH = `diff --git a/file.txt b/file.txt
index abc..def 100644
--- a/file.txt
+++ b/file.txt
@@ -1,3 +1,3 @@
 context
-old line
+new line
 tail
`;

describe("parseUnifiedDiff", () => {
  it("pairs a replacement and counts adds/dels", () => {
    const { rows, additions, deletions, binary } = parseUnifiedDiff(PATCH);
    expect(binary).toBe(false);
    expect(additions).toBe(1);
    expect(deletions).toBe(1);

    expect(rows[0]).toMatchObject({ type: "hunk" });

    const changed = rows.find(
      (r) => r.type === "line" && r.leftDel && r.rightAdd,
    );
    expect(changed).toMatchObject({
      type: "line",
      leftText: "old line",
      leftDel: true,
      rightText: "new line",
      rightAdd: true,
    });
  });

  it("emits context lines on both sides", () => {
    const { rows } = parseUnifiedDiff(PATCH);
    const ctx = rows.find(
      (r) => r.type === "line" && r.leftText === "context",
    );
    expect(ctx).toMatchObject({
      leftText: "context",
      rightText: "context",
      leftDel: false,
      rightAdd: false,
    });
  });

  it("skips the diff preamble (no rows before the first hunk)", () => {
    const { rows } = parseUnifiedDiff(PATCH);
    expect(rows.filter((r) => r.type === "hunk")).toHaveLength(1);
    // First row is the hunk, not a "diff --git" / "index" line.
    expect(rows[0].type).toBe("hunk");
  });

  it("flags binary diffs", () => {
    const { binary, rows } = parseUnifiedDiff(
      "Binary files a/img.png and b/img.png differ\n",
    );
    expect(binary).toBe(true);
    expect(rows).toHaveLength(0);
  });

  it("handles an empty patch", () => {
    const { rows, additions, deletions } = parseUnifiedDiff("");
    expect(rows).toHaveLength(0);
    expect(additions).toBe(0);
    expect(deletions).toBe(0);
  });
});

describe("splitDiffIntoHunks", () => {
  it("separates header from hunks", () => {
    const { header, hunks } = splitDiffIntoHunks(PATCH);
    expect(header).toContain("diff --git");
    expect(header).not.toContain("@@");
    expect(hunks).toHaveLength(1);
    expect(hunks[0].startsWith("@@")).toBe(true);
  });

  it("returns no hunks for a header-only patch", () => {
    const { hunks } = splitDiffIntoHunks("diff --git a/x b/x\nindex 1..2\n");
    expect(hunks).toHaveLength(0);
  });
});
