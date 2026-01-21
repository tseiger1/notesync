import path from 'path';
import type { NoteConverter } from './types';

export class ConverterRegistry {
  private converters: NoteConverter[] = [];

  constructor(converters: NoteConverter[] = []) {
    this.converters = converters;
  }

  register(converter: NoteConverter) {
    this.converters.push(converter);
  }

  getConverterForFile(filePath: string) {
    const ext = path.extname(filePath).toLowerCase().replace('.', '');
    return this.converters.find((converter) =>
      converter.supportedExtensions.includes(ext)
    );
  }

  getSupportedExtensions() {
    const extensions = new Set<string>();
    this.converters.forEach((converter) =>
      converter.supportedExtensions.forEach((ext) => extensions.add(ext))
    );
    return Array.from(extensions.values());
  }
}
