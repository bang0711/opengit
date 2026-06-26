// Finish the Next standalone bundle for packaging.
//
// `next build` (output: "standalone") emits .next/standalone/server.js but does
// NOT copy static assets or public/ into it. Merge them in so electron-builder
// can ship .next/standalone as a single self-contained server (resources/app).
// Electron supplies the Node runtime, so no Node binary is bundled here.

import { existsSync } from "node:fs";
import { cp, rm } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const standalone = join(root, ".next", "standalone");

if (!existsSync(standalone)) {
  console.error(
    "Missing .next/standalone — run `next build` with output:'standalone' first.",
  );
  process.exit(1);
}

// Static assets Next serves at runtime.
await cp(join(root, ".next", "static"), join(standalone, ".next", "static"), {
  recursive: true,
});

// public/ (favicons, etc.)
if (existsSync(join(root, "public"))) {
  await cp(join(root, "public"), join(standalone, "public"), {
    recursive: true,
  });
}

// Strip sharp + libvips (@img/*) — LGPL-3.0. With images.unoptimized the app
// never loads them at runtime, but Next may still copy them into standalone.
// Deleting here guarantees the shipped bundle stays permissive-only.
const nm = join(standalone, "node_modules");
for (const dep of ["sharp", "@img"]) {
  await rm(join(nm, dep), { recursive: true, force: true });
}

console.log("Standalone bundle ready at .next/standalone (sharp/@img removed)");
