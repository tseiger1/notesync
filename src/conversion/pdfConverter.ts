import path from 'path';
import sharp from 'sharp';
import type { ConvertedImage, NoteConverter } from './types';
import type { ConversionContext } from './types';
import { ensureDir, scaleImageFile } from './utils';

export class PdfConverter implements NoteConverter {
  readonly supportedExtensions = ['pdf'];

  async convert(filePath: string, context: ConversionContext): Promise<ConvertedImage[]> {
    const metadata = await sharp(filePath, { pages: 1 }).metadata();
    const pages = metadata.pages ?? 1;

    if (!pages || pages < 1) {
      throw new Error('PDF has no pages');
    }

    const relPath = path.relative(context.inputDir, filePath);
    const relDir = path.dirname(relPath);
    const baseName = path.basename(filePath, path.extname(filePath));
    const outputDir = path.join(context.cacheDir, relDir);
    await ensureDir(outputDir);

    const images: ConvertedImage[] = [];

    for (let page = 0; page < pages; page += 1) {
      const pngPath = path.join(outputDir, `${baseName}-page-${page + 1}.png`);
      await sharp(filePath, { page, density: 240 }).png().toFile(pngPath);
      await scaleImageFile(pngPath, context.maxImageWidth);
      images.push({ path: pngPath, page: page + 1 });
    }

    context.logger(`PDF converted to ${images.length} PNG file(s)`);
    return images;
  }
}
