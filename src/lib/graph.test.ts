import { describe, expect, it } from "vitest";
import type { Commit } from "@shared/types";
import { buildGraph, laneColor, LANE_COLORS } from "./graph";

const c = (sha: string, parents: string[]): Commit => ({
  sha,
  shortSha: sha.slice(0, 7),
  parents,
  authorName: "t",
  authorEmail: "t@t",
  date: 0,
  subject: sha,
  refs: [],
});

describe("buildGraph", () => {
  it("keeps a linear history in a single lane", () => {
    const { rows, width } = buildGraph([
      c("a", ["b"]),
      c("b", ["c"]),
      c("c", []),
    ]);
    expect(width).toBe(1);
    expect(rows.map((r) => r.col)).toEqual([0, 0, 0]);
    // Root commit ends its lane.
    expect(rows[2].parentCols).toEqual([]);
  });

  it("opens a second lane for a merge's other parents", () => {
    // m merges a and b; both descend from base.
    const { rows, width } = buildGraph([
      c("m", ["a", "b"]),
      c("a", ["base"]),
      c("b", ["base"]),
      c("base", []),
    ]);
    expect(width).toBeGreaterThanOrEqual(2);
    const m = rows[0];
    expect(m.col).toBe(0);
    expect(m.parentCols).toHaveLength(2); // routes to two lanes
  });

  it("returns empty for no commits", () => {
    expect(buildGraph([])).toEqual({ rows: [], width: 0 });
  });
});

describe("laneColor", () => {
  it("cycles the palette by index", () => {
    expect(laneColor(0)).toBe(LANE_COLORS[0]);
    expect(laneColor(LANE_COLORS.length)).toBe(LANE_COLORS[0]);
    expect(laneColor(LANE_COLORS.length + 1)).toBe(LANE_COLORS[1]);
  });
});
