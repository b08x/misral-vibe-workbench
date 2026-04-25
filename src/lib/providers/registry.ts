import { createAnthropic } from '@ai-sdk/anthropic';
import { createMistral } from '@ai-sdk/mistral';
import { createOpenAI } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, LanguageModel } from 'ai';
import { ModelInfo, GenerationPrompt, GenerationResult } from '../../types';

export abstract class ModelProvider {
  abstract id: string;
  abstract name: string;
  abstract supportsDirectBrowser: boolean;

  abstract getModel(modelId: string, apiKey: string): LanguageModel;
  abstract listModels(): ModelInfo[];
  abstract fetchAvailableModels(apiKey: string): Promise<ModelInfo[]>;

  async generate(
    prompt: GenerationPrompt, 
    modelId: string, 
    apiKey: string,
    options: { temperature?: number; maxTokens?: number } = {}
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    const model = this.getModel(modelId, apiKey);
    
    const maxTokens = Math.min(options.maxTokens ?? 4096, 32768); // Strict cap to avoid credit issues
    
    const { text, usage } = await generateText({
      model,
      system: prompt.system,
      prompt: prompt.user,
      temperature: options.temperature ?? 0.2,
      max_tokens: maxTokens,
      maxRetries: 5,
    } as any);

    return {
      content: text,
      model: modelId,
      provider: this.id,
      tokens_used: usage.totalTokens,
      generation_time: Date.now() - startTime,
    };
  }
}

export class AnthropicProvider extends ModelProvider {
  id = 'anthropic';
  name = 'Anthropic';
  supportsDirectBrowser = false;

  getModel(modelId: string, apiKey: string) {
    const client = createAnthropic({ apiKey });
    return client(modelId);
  }

  listModels(): ModelInfo[] {
    return [
      { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet', context_window: 200000, supports_streaming: true, supports_json_mode: true },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', context_window: 200000, supports_streaming: true, supports_json_mode: true },
    ];
  }

  async fetchAvailableModels(apiKey: string): Promise<ModelInfo[]> {
    const res = await fetch('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      }
    });
    if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`);
    const data = await res.json();
    return data.data.map((m: any) => ({
      id: m.id,
      name: m.display_name ?? m.id,
      context_window: m.context_window ?? 200000,
      supports_streaming: true,
      supports_json_mode: true
    }));
  }
}

export class MistralProvider extends ModelProvider {
  id = 'mistral';
  name = 'Mistral';
  supportsDirectBrowser = false;

  getModel(modelId: string, apiKey: string) {
    const client = createMistral({ apiKey });
    return client(modelId);
  }

  listModels(): ModelInfo[] {
    return [
      { id: 'mistral-large-latest', name: 'Mistral Large', context_window: 128000, supports_streaming: true, supports_json_mode: true },
      { id: 'mistral-medium-latest', name: 'Mistral Medium', context_window: 32000, supports_streaming: true, supports_json_mode: true },
    ];
  }

  async fetchAvailableModels(apiKey: string): Promise<ModelInfo[]> {
    const res = await fetch('https://api.mistral.ai/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    if (!res.ok) throw new Error(`Mistral API error: ${res.status}`);
    const data = await res.json();
    return data.data.map((m: any) => ({
      id: m.id,
      name: m.id,
      context_window: m.max_context_length ?? 32000,
      supports_streaming: true,
      supports_json_mode: true
    }));
  }
}

export class OpenRouterProvider extends ModelProvider {
  id = 'openrouter';
  name = 'OpenRouter';
  supportsDirectBrowser = true;

  getModel(modelId: string, apiKey: string) {
    const client = createOpenRouter({ 
      apiKey,
      headers: {
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://mistral-vibe-workbench.internal',
        'X-Title': 'Mistral-Vibe Workbench'
      }
    });
    return client(modelId);
  }

  listModels(): ModelInfo[] {
    return [
      { id: 'mistralai/mistral-large-2411', name: 'Mistral Large 2', context_window: 128000, supports_streaming: true, supports_json_mode: true },
      { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet (OR)', context_window: 200000, supports_streaming: true, supports_json_mode: true },
      { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5 (OR)', context_window: 1000000, supports_streaming: true, supports_json_mode: true },
    ];
  }

  async fetchAvailableModels(apiKey: string): Promise<ModelInfo[]> {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    if (!res.ok) throw new Error(`OpenRouter API error: ${res.status}`);
    const data = await res.json();
    return data.data.map((m: any) => ({
      id: m.id,
      name: m.name ?? m.id,
      context_window: m.context_length ?? 8000,
      supports_streaming: true,
      supports_json_mode: true
    }));
  }
}

export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private providers: Map<string, ModelProvider> = new Map();

  private constructor() {
    this.register(new AnthropicProvider());
    this.register(new MistralProvider());
    this.register(new OpenRouterProvider());
  }

  static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  register(provider: ModelProvider) {
    this.providers.set(provider.id, provider);
  }

  get(id: string): ModelProvider | undefined {
    return this.providers.get(id);
  }

  list(): ModelProvider[] {
    return Array.from(this.providers.values());
  }

  async validateAndFetch(
    providerId: string,
    apiKey: string
  ): Promise<{ status: 'valid' | 'invalid' | 'cors-error'; models: ModelInfo[]; error?: string }> {
    const provider = this.get(providerId);
    if (!provider) return { status: 'invalid', models: [], error: 'Provider not registered' };
    try {
      const rawModels = await provider.fetchAvailableModels(apiKey);
      // Deduplicate by ID
      const seen = new Set<string>();
      const models = rawModels.filter(m => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });
      return { status: models.length > 0 ? 'valid' : 'invalid', models };
    } catch (err: any) {
      const isCors = err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError');
      return {
        status: isCors ? 'cors-error' : 'invalid',
        models: [],
        error: err.message
      };
    }
  }
}
