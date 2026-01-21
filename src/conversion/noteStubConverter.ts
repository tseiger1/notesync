import { NoteConverter, ConvertedImage, ConversionContext } from './types';

export class NoteStubConverter implements NoteConverter {
  readonly supportedExtensions = ['note'];

  async convert(filePath: string, context: ConversionContext): Promise<ConvertedImage[]> {
    context.logger(`.note conversion not implemented yet for ${filePath}`);
    return [];
  }
}
