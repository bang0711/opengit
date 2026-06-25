import type { Commit } from "@/lib/git";

/**
 * One rendered row of the commit graph. `lanesBefore`/`lanesAfter` are the
 * lane occupancy snapshots above and below the commit dot, used to draw the
 * connecting edges. Lane values are the sha each lane is routing toward, or
 * null for a free lane.
 */
export type GraphRow = {
  commit: Commit;
  col: number; // lane index of this commit's dot
  color: number; // color index of the commit's lane
  lanesBefore: (string | null)[];
  lanesAfter: (string | null)[];
  colorsBefore: number[];
  colorsAfter: number[];
  parentCols: number[]; // lane indices the commit's parents route into
};

/**
 * Assign each commit to a lane and track edges between rows. Commits must be
 * supplied in display order (newest first), which `git log --date-order`
 * provides. This is the standard incremental lane-allocation walk.
 */
export function buildGraph(commits: Commit[]): {
  rows: GraphRow[];
  width: number;
} {
  const lanes: (string | null)[] = []; // sha each lane awaits
  const colors: number[] = []; // color index per lane
  let nextColor = 0;
  let maxLanes = 0;
  const rows: GraphRow[] = [];

  const alloc = (sha: string | null): number => {
    let i = lanes.indexOf(null);
    if (i === -1) i = lanes.length;
    lanes[i] = sha;
    if (colors[i] === undefined) colors[i] = nextColor++;
    return i;
  };

  for (const commit of commits) {
    const lanesBefore = lanes.slice();
    const colorsBefore = colors.slice();

    let col = lanes.indexOf(commit.sha);
    if (col === -1) col = alloc(commit.sha);
    const color = colors[col];

    // Other lanes awaiting this same commit merge into `col` and free up.
    for (let i = 0; i < lanes.length; i++) {
      if (i !== col && lanes[i] === commit.sha) lanes[i] = null;
    }

    const parentCols: number[] = [];
    if (commit.parents.length === 0) {
      lanes[col] = null; // root commit — lane ends here
    } else {
      lanes[col] = commit.parents[0]; // first parent stays on this lane
      parentCols.push(col);
      for (let p = 1; p < commit.parents.length; p++) {
        const existing = lanes.indexOf(commit.parents[p]);
        if (existing !== -1) {
          parentCols.push(existing);
        } else {
          const nl = alloc(commit.parents[p]);
          colors[nl] = nextColor++; // fresh color for a diverging branch
          parentCols.push(nl);
        }
      }
    }

    // Trim trailing free lanes to keep the graph narrow.
    while (lanes.length && lanes[lanes.length - 1] === null) {
      lanes.pop();
      colors.pop();
    }

    maxLanes = Math.max(maxLanes, lanesBefore.length, lanes.length, col + 1);
    rows.push({
      commit,
      col,
      color,
      lanesBefore,
      lanesAfter: lanes.slice(),
      colorsBefore,
      colorsAfter: colors.slice(),
      parentCols,
    });
  }

  return { rows, width: maxLanes };
}

/** Lane colors — a fixed palette cycled by color index. */
export const LANE_COLORS = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#a855f7", // purple
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#84cc16", // lime
];

export const laneColor = (i: number) =>
  LANE_COLORS[
    ((i % LANE_COLORS.length) + LANE_COLORS.length) % LANE_COLORS.length
  ];
