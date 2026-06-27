import { describe, expect, it } from "vitest";
import type { CommitFile } from "@shared/types";
import { buildFileTree, type TreeNode } from "./file-tree";

const f = (path: string): CommitFile => ({
  path,
  status: "M",
  additions: 1,
  deletions: 0,
});

const names = (nodes: TreeNode[]) => nodes.map((n) => n.name);

describe("buildFileTree", () => {
  it("nests files under directories", () => {
    const tree = buildFileTree([f("src/a.ts"), f("src/b.ts")]);
    expect(tree).toHaveLength(1);
    const dir = tree[0];
    expect(dir).toMatchObject({ type: "dir", name: "src" });
    if (dir.type === "dir") expect(names(dir.children)).toEqual(["a.ts", "b.ts"]);
  });

  it("collapses single-child directory chains", () => {
    const tree = buildFileTree([f("src/app/page.tsx")]);
    expect(tree[0]).toMatchObject({ type: "dir", name: "src/app" });
  });

  it("does not collapse a directory that also holds files", () => {
    const tree = buildFileTree([f("src/x.ts"), f("src/app/page.tsx")]);
    const src = tree[0];
    expect(src).toMatchObject({ type: "dir", name: "src" });
    if (src.type === "dir") {
      // children: the nested "app" dir + the "x.ts" file
      expect(names(src.children)).toContain("app");
      expect(names(src.children)).toContain("x.ts");
    }
  });

  it("sorts directories before files, alphabetically", () => {
    const tree = buildFileTree([f("z.ts"), f("a/b.ts")]);
    expect(tree[0].type).toBe("dir"); // "a" dir first
    expect(tree[1]).toMatchObject({ type: "file", name: "z.ts" });
  });

  it("keeps a root-level file as a file node", () => {
    const tree = buildFileTree([f("README.md")]);
    expect(tree[0]).toMatchObject({
      type: "file",
      name: "README.md",
      path: "README.md",
    });
  });
});
