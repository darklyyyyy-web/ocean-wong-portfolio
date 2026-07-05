import { createRequire } from "module";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(root, "public", "images", "projects");
const outputRoot = path.join(root, "public", "images", "projects-optimized");
const require = createRequire(import.meta.url);
const sharp = require(path.join(root, "node_modules", ".pnpm", "sharp@0.34.5", "node_modules", "sharp"));
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);

async function listFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;

    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(entryPath));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}

async function optimizeImage(sourcePath, outputPath) {
  const extension = path.extname(sourcePath).toLowerCase();
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  if (!imageExtensions.has(extension)) {
    await fs.copyFile(sourcePath, outputPath);
    return;
  }

  let pipeline = sharp(sourcePath)
    .rotate()
    .resize({
      width: 1800,
      height: 1800,
      fit: "inside",
      withoutEnlargement: true
    });

  if (extension === ".png") {
    pipeline = pipeline.png({ compressionLevel: 9, quality: 82 });
  } else if (extension === ".webp") {
    pipeline = pipeline.webp({ quality: 74 });
  } else {
    pipeline = pipeline.jpeg({ quality: 74, mozjpeg: true });
  }

  await pipeline.toFile(outputPath);
}

const files = await listFiles(sourceRoot);
let completed = 0;

await fs.mkdir(outputRoot, { recursive: true });

for (const sourcePath of files) {
  const relativePath = path.relative(sourceRoot, sourcePath);
  const outputPath = path.join(outputRoot, relativePath);
  await optimizeImage(sourcePath, outputPath);
  completed += 1;

  if (completed % 100 === 0 || completed === files.length) {
    console.log(`Optimized ${completed}/${files.length}`);
  }
}
