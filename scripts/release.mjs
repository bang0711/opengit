// Cut a release: tag the current commit `v<version>` and push it. That tag push
// triggers .github/workflows/release.yml, which builds Windows/macOS/Linux
// installers and publishes them to a GitHub Release. No local build needed.
//
// Usage:
//   bun run release           bump "version" in package.json + commit first
//   bun run release --force    re-release the SAME version (deletes the old tag
//                              locally + on the remote, then re-pushes → CI re-runs)

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const force = process.argv.includes("--force");
const { version } = JSON.parse(
  readFileSync(join(process.cwd(), "package.json"), "utf8"),
);
const tag = `v${version}`;

const git = (args) =>
  execFileSync("git", args, { stdio: ["ignore", "pipe", "pipe"] })
    .toString()
    .trim();

// Tag must point at a commit that already has this version — so the tree must
// be clean (version bump committed). Otherwise CI would build the wrong version.
if (git(["status", "--porcelain"])) {
  console.error(
    "Working tree has uncommitted changes. Commit them (including the\n" +
      "package.json version bump) before releasing — the tag is cut from HEAD.",
  );
  process.exit(1);
}

const hasLocal = (() => {
  try {
    git(["rev-parse", "-q", "--verify", `refs/tags/${tag}`]);
    return true;
  } catch {
    return false;
  }
})();
const hasRemote =
  git(["ls-remote", "--tags", "origin", `refs/tags/${tag}`]).length > 0;

if ((hasLocal || hasRemote) && !force) {
  const where = hasRemote ? "the remote" : "locally";
  console.error(
    `Tag ${tag} already exists on ${where}.\n` +
      'Bump "version" in package.json and commit, or re-release this exact\n' +
      "version with:  bun run release --force",
  );
  process.exit(1);
}

if (force) {
  if (hasLocal) git(["tag", "-d", tag]);
  if (hasRemote) {
    console.log(`Deleting existing remote tag ${tag}…`);
    git(["push", "origin", `:refs/tags/${tag}`]);
  }
}

console.log(`Tagging ${tag} and pushing — CI builds all OSes and publishes.`);
git(["tag", tag]);
git(["push", "origin", tag]);

console.log(`Pushed ${tag}.`);
console.log("  Progress: https://github.com/bang0711/OpenGit/actions");
console.log(
  "  The release is created as a draft, then auto-published once all OSes succeed.",
);
