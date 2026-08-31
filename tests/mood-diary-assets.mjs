import assert from "node:assert/strict";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const assetDir = join(root, "public", "assets", "mood-diary");
const moods = ["tired", "angry", "excited", "annoyed", "heart", "calm", "sad", "happy"];
const variants = ["circle", "square"];
const expected = moods.flatMap((mood) => variants.map((variant) => `${mood}-${variant}.png`)).sort();

assert.deepEqual((await readdir(assetDir)).sort(), expected, "mood-diary assets must use the exact production file set");

for (const file of expected) {
  const path = join(assetDir, file);
  const metadata = await sharp(path).metadata();
  assert.equal(metadata.format, "png", `${file} must be PNG`);
  assert.equal(metadata.width, 512, `${file} must be 512px wide`);
  assert.equal(metadata.height, 512, `${file} must be 512px high`);
  assert.equal(metadata.hasAlpha, true, `${file} must contain a real alpha channel`);
  assert.ok((await stat(path)).size <= 200_000, `${file} exceeds the 200 KB asset budget`);

  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let transparentPixels = 0;
  let solidPixels = 0;
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * info.channels + 3];
      if (alpha <= 4) transparentPixels += 1;
      if (alpha >= 200) solidPixels += 1;
      if (alpha > 16) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  const pixelCount = info.width * info.height;
  assert.ok(transparentPixels / pixelCount >= 0.1, `${file} must retain transparent breathing room`);
  assert.ok(solidPixels / pixelCount >= 0.2, `${file} artwork is unexpectedly faint or empty`);
  assert.ok(minX >= 24 && minY >= 24, `${file} clips the top or left safe area`);
  assert.ok(maxX <= 487 && maxY <= 487, `${file} clips the bottom or right safe area`);
}

console.log("Mood diary asset contract passed for 16 transparent PNGs");
