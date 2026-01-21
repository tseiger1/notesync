export interface EncodedImage {
  data: string;
  mediaType: string;
  page: number;
}

export interface LLMGenerationContext {
  fileName: string;
  promptPrefix?: string;
}

export interface LLMClient {
  generateMarkdown(
    images: EncodedImage[],
    context: LLMGenerationContext
  ): Promise<string>;
}
