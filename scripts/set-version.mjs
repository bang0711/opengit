// Write one version into all three version sources so they can never desync.
// The release tag is the single source of truth: CI runs this with the tag's
// version before building, so the installer is always stamped correctly.
//
//   node scripts/set-version.mjs 3.1.1
//
// (A desync — tag vX but files still on Y — ships an installer stamped Y, which
// makes the updater re-offer the same "update" forever and turns each update into
// a same-version reinstall. That was the 3.0.0/3.1.0 bug.)
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+/.test(version)) {
  console.error(`Usage: node scripts/set-version.mjs <x.y.z>  (got: ${version})`);
  process.exit(1);
}

const root = process.cwd();
const setJson = (rel) => {
  const p = join(root, rel);
  const j = JSON.parse(readFileSync(p, "utf8"));
  j.version = version;
  writeFileSync(p, `${JSON.stringify(j, null, 2)}\n`);
};

setJson("package.json");
setJson("src-tauri/tauri.conf.json");

// Cargo.toml: replace only the [package] version (the first `version = "..."`).
const cargoPath = join(root, "src-tauri/Cargo.toml");
const cargo = readFileSync(cargoPath, "utf8");
writeFileSync(
  cargoPath,
  cargo.replace(/^version = ".*"$/m, `version = "${version}"`),
);

console.log(`Set version ${version} in package.json, tauri.conf.json, Cargo.toml`);
