import { EncodedImage, LLMClient, LLMGenerationContext } from './types';

interface OpenAIConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
}

const DEFAULT_OPENAI_URL = 'https://api.openai.com/v1';

export class OpenAILLMClient implements LLMClient {
  constructor(private readonly config: OpenAIConfig) {}

  async generateMarkdown(images: EncodedImage[], context: LLMGenerationContext) {
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key missing');
    }

    const prompt =
      context.promptPrefix ??
      'Extract the handwritten note content, structure it with Markdown headings when appropriate, and keep bullet/numbered lists intact.';

    const content = [
      {
        type: 'text',
        text: `${prompt}\nFile name: ${context.fileName}`,
      },
      ...images.map((image) => ({
        type: 'image_url',
        image_url: {
          url: `data:${image.mediaType};base64,${image.data}`,
        },
      })),
    ];

    const body = {
      model: this.config.model || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You convert handwritten note images to clean Markdown. Preserve equations and transcribe diagrams descriptively when possible.',
        },
        {
          role: 'user',
          content,
        },
      ],
      temperature: 0.2,
    };

    const response = await fetch(`${this.config.baseUrl ?? DEFAULT_OPENAI_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`OpenAI request failed: ${response.status} ${message}`);
    }

    const payload = await response.json();
    const choice = payload.choices?.[0]?.message?.content;
    if (Array.isArray(choice)) {
      return choice
        .map((piece: { type?: string; text?: string }) => piece.text ?? '')
        .join('\n')
        .trim();
    }
    return (choice ?? '').trim();
  }
}
