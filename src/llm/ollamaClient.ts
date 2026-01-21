import { EncodedImage, LLMClient, LLMGenerationContext } from './types';

interface OllamaConfig {
  endpoint?: string;
  model: string;
}

const DEFAULT_OLLAMA_URL = 'http://localhost:11434';

export class OllamaLLMClient implements LLMClient {
  constructor(private readonly config: OllamaConfig) {}

  async generateMarkdown(images: EncodedImage[], context: LLMGenerationContext): Promise<string> {
    const endpoint = (this.config.endpoint || DEFAULT_OLLAMA_URL).replace(/\/$/, '');
    const promptInstruction =
      context.promptPrefix ??
      'Transcribe and summarize the handwritten content into Markdown. Keep the note structure intact.';

    const payload = {
      model: this.config.model || 'llama3.2-vision',
      prompt: `${promptInstruction}\nFile name: ${context.fileName}`,
      images: images.map((image) => image.data),
      stream: false,
    };

    const response = await fetch(`${endpoint}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Ollama request failed: ${response.status} ${message}`);
    }

    const data = await response.json();
    return (data.response ?? '').trim();
  }
}
