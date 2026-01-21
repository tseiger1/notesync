import { OllamaLLMClient } from './ollamaClient';
import { OpenAILLMClient } from './openaiClient';
import { LLMClient } from './types';

export type LLMProvider = 'openai' | 'ollama';

export interface LLMConfiguration {
  provider: LLMProvider;
  model: string;
  apiKey?: string;
  endpoint?: string;
}

export const createLLMClient = (config: LLMConfiguration): LLMClient => {
  if (config.provider === 'ollama') {
    return new OllamaLLMClient({ endpoint: config.endpoint, model: config.model });
  }

  return new OpenAILLMClient({
    apiKey: config.apiKey ?? '',
    model: config.model,
    baseUrl: config.endpoint,
  });
};

export * from './types';
