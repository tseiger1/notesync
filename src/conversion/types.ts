import type { Logger } from '../logger';

export interface ConversionContext {
  /** Absolute input directory path */
  inputDir: string;
  /** Absolute output directory path */
  outputDir: string;
  /** Directory for intermediate assets */
  cacheDir: string;
  maxImageWidth?: number;
  logger: Logger;
}

export interface ConvertedImage {
  /** Absolute path to the generated PNG file */
  path: string;
  /** Page index starting at 1 */
  page: number;
  /** Optional note for display */
  label?: string;
}

export interface NoteConverter {
  readonly supportedExtensions: string[];
  convert(filePath: string, context: ConversionContext): Promise<ConvertedImage[]>;
}
