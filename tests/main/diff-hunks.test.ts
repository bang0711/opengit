import { describe, expect, it } from "vitest";
import { splitDiffIntoHunks } from "@main/diff-hunks";

const HEADER = [
  "diff --git a/file.txt b/file.txt",
  "index 111..222 100644",
  "--- a/file.txt",
  "+++ b/file.txt",
].join("\n");

describe("splitDiffIntoHunks", () => {
  it("splits header from a single hunk", () => {
    const hunk = ["@@ -1,2 +1,2 @@", " ctx", "-old", "+new"].join("\n");
    const { header, hunks } = splitDiffIntoHunks(`${HEADER}\n${hunk}`);
    expect(header).toBe(HEADER);
    expect(hunks).toHaveLength(1);
    expect(hunks[0]).toBe(hunk);
  });

  it("separates multiple hunks at each @@ marker", () => {
    const h1 = ["@@ -1,1 +1,1 @@", "-a", "+b"].join("\n");
    const h2 = ["@@ -10,1 +10,1 @@", "-c", "+d"].join("\n");
    const { hunks } = splitDiffIntoHunks(`${HEADER}\n${h1}\n${h2}`);
    expect(hunks).toEqual([h1, h2]);
  });

  it("reassembles header + hunk into an appliable patch", () => {
    const hunk = ["@@ -1 +1 @@", "-x", "+y"].join("\n");
    const { header, hunks } = splitDiffIntoHunks(`${HEADER}\n${hunk}`);
    expect(`${header}\n${hunks[0]}`).toBe(`${HEADER}\n${hunk}`);
  });

  it("returns no hunks for a header-only diff", () => {
    const { header, hunks } = splitDiffIntoHunks(HEADER);
    expect(header).toBe(HEADER);
    expect(hunks).toEqual([]);
  });
});
