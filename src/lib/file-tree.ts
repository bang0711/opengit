import type { CommitFile } from "@/lib/git";

export type TreeNode =
  | { type: "dir"; name: string; path: string; children: TreeNode[] }
  | { type: "file"; name: string; path: string; file: CommitFile };

type DirAcc = {
  dirs: Map<string, DirAcc>;
  files: CommitFile[];
};

/**
 * Build a folder/file tree from a flat list of changed files, collapsing
 * single-child directory chains (e.g. `src/app` → one node) like Azure DevOps.
 */
export function buildFileTree(files: CommitFile[]): TreeNode[] {
  const root: DirAcc = { dirs: new Map(), files: [] };

  for (const file of files) {
    const parts = file.path.split("/");
    let acc = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const seg = parts[i];
      let next = acc.dirs.get(seg);
      if (!next) {
        next = { dirs: new Map(), files: [] };
        acc.dirs.set(seg, next);
      }
      acc = next;
    }
    acc.files.push(file);
  }

  const convert = (acc: DirAcc, prefix: string): TreeNode[] => {
    const nodes: TreeNode[] = [];

    for (const [name, sub] of [...acc.dirs].sort((a, b) =>
      a[0].localeCompare(b[0]),
    )) {
      let dirName = name;
      let dirAcc = sub;
      let path = prefix ? `${prefix}/${name}` : name;
      // Collapse a chain of single-subdirectory, no-file folders.
      while (dirAcc.files.length === 0 && dirAcc.dirs.size === 1) {
        const [childName, childAcc] = [...dirAcc.dirs][0];
        dirName = `${dirName}/${childName}`;
        path = `${path}/${childName}`;
        dirAcc = childAcc;
      }
      nodes.push({
        type: "dir",
        name: dirName,
        path,
        children: convert(dirAcc, path),
      });
    }

    for (const file of acc.files.sort((a, b) => a.path.localeCompare(b.path))) {
      const name = file.path.split("/").pop() ?? file.path;
      nodes.push({ type: "file", name, path: file.path, file });
    }

    return nodes;
  };

  return convert(root, "");
}
