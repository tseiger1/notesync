import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

export async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function scaleImageFile(filePath: string, maxWidth?: number) {
  if (!maxWidth || maxWidth <= 0) {
    return;
  }

  const metadata = await sharp(filePath).metadata();
  if (!metadata.width || metadata.width <= maxWidth) {
    return;
  }

  const tempPath = buildTempPath(filePath);
  await sharp(filePath)
    .resize({ width: maxWidth, withoutEnlargement: true })
    .toFile(tempPath);
  await fs.rename(tempPath, filePath);
}

function buildTempPath(originalPath: string) {
  const dir = path.dirname(originalPath);
  const base = path.basename(originalPath);
  return path.join(dir, `.tmp-${base}`);
}
