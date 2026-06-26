// Rasterize the app's browser icon (src/app/icon.svg — the favicon Next serves)
// into the desktop icons electron-builder uses: build/icon.png + build/icon.ico.
// Run after changing the SVG: `node scripts/generate-icons.mjs`.

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const root = process.cwd();
const src = join(root, "src", "app", "icon.svg");
const outDir = join(root, "build");
await mkdir(outDir, { recursive: true });

// PNG (used by mac/linux bundles + the Electron window icon).
await sharp(src).resize(256, 256, { fit: "contain" }).png().toFile(join(outDir, "icon.png"));

// Multi-size ICO for Windows. Vista+ .ico entries may be PNG-encoded, so we
// just pack one PNG per size into the ICO container.
const sizes = [16, 24, 32, 48, 64, 128, 256];
const pngs = await Promise.all(
  sizes.map((s) =>
    sharp(src).resize(s, s, { fit: "contain" }).png().toBuffer(),
  ),
);

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(sizes.length, 4); // image count

const entries = [];
let offset = 6 + sizes.length * 16;
for (let i = 0; i < sizes.length; i++) {
  const s = sizes[i];
  const png = pngs[i];
  const e = Buffer.alloc(16);
  e.writeUInt8(s >= 256 ? 0 : s, 0); // width (0 = 256)
  e.writeUInt8(s >= 256 ? 0 : s, 1); // height
  e.writeUInt8(0, 2); // palette
  e.writeUInt8(0, 3); // reserved
  e.writeUInt16LE(1, 4); // color planes
  e.writeUInt16LE(32, 6); // bits per pixel
  e.writeUInt32LE(png.length, 8); // image size
  e.writeUInt32LE(offset, 12); // image offset
  offset += png.length;
  entries.push(e);
}

await writeFile(
  join(outDir, "icon.ico"),
  Buffer.concat([header, ...entries, ...pngs]),
);

console.log("Icons written to build/icon.png + build/icon.ico");
