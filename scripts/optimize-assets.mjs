import { mkdir, readdir } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = join(root, "assets-source");
const output = join(root, "assets", "generated");

await mkdir(output, { recursive: true });
const files = new Set(await readdir(source));
const input = (name) => join(source, name);

async function webp(sourceName, outputName, width, options = {}) {
  await sharp(input(sourceName)).resize({ width, ...options }).webp({ quality: 82, effort: 6 }).toFile(join(output, outputName));
}

async function png(sourceName, outputName, width, options = {}) {
  await sharp(input(sourceName)).resize({ width, height: options.height || width, fit: options.fit || "cover", background: options.background }).png({ compressionLevel: 9, effort: 10 }).toFile(join(output, outputName));
}

if (!files.has("home-logo.jpg") || !files.has("black-cat-cover.jpg") || !files.has("black-cat-logo.png")) {
  throw new Error("assets-source is missing a required design source");
}

await Promise.all([
  webp("home-logo.jpg", "home-logo-96.webp", 96, { height: 96, fit: "cover" }),
  webp("home-logo.jpg", "home-logo-192.webp", 192, { height: 192, fit: "cover" }),
  webp("black-cat-logo.png", "black-cat-logo-112.webp", 112, { height: 112, fit: "contain" }),
  webp("black-cat-cover.jpg", "black-cat-cover-640.webp", 640, { height: 360, fit: "cover" }),
  webp("black-cat-cover.jpg", "black-cat-cover-1280.webp", 1280, { height: 720, fit: "cover" }),
  webp("weekend-complete-stamp.png", "weekend-complete-stamp-1x.webp", 48, { height: 48, fit: "contain" }),
  webp("weekend-complete-stamp.png", "weekend-complete-stamp-2x.webp", 96, { height: 96, fit: "contain" }),
  webp("food-wheel-icon.png", "food-wheel-icon-1x.webp", 48, { height: 48, fit: "cover" }),
  webp("food-wheel-icon.png", "food-wheel-icon-2x.webp", 96, { height: 96, fit: "cover" }),
  webp("anniversary-icon.jpg", "anniversary-icon-1x.webp", 48, { height: 48, fit: "cover" }),
  webp("anniversary-icon.jpg", "anniversary-icon-2x.webp", 96, { height: 96, fit: "cover" }),
  png("app-icon-512.png", "app-icon-32.png", 32),
  png("app-icon-512.png", "app-icon-180.png", 180),
  png("app-icon-512.png", "app-icon-192.png", 192),
  png("app-icon-512.png", "app-icon-512.png", 512),
  png("black-cat-logo.png", "maskable-512.png", 512, { fit: "contain", background: "#8ed653" }),
]);

console.log(`Optimized ${16} deterministic assets into ${output}`);
