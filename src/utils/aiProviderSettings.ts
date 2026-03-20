import type { ListModelsDynamicProvider } from '../llm/types';

export type LlmProvider = 'openai' | 'openrouter' | 'anthropic' | 'google';

export const CUSTOM_MODEL_VALUE = '__custom__';

const PREFIX = 'msm-ai';

const K_PROVIDER = `${PREFIX}-provider`;
const K_MODEL = (p: LlmProvider) => `${PREFIX}-model-${p}`;
const K_CUSTOM_MODEL = (p: LlmProvider) => `${PREFIX}-custom-model-${p}`;
const K_API_KEY = (p: LlmProvider) => `${PREFIX}-api-key-${p}`;

export function isDynamicModelProvider(p: LlmProvider): p is ListModelsDynamicProvider {
  return p === 'openai' || p === 'anthropic' || p === 'google';
}

export function loadProvider(): LlmProvider {
  try {
    const v = localStorage.getItem(K_PROVIDER);
    if (v === 'openai' || v === 'openrouter' || v === 'anthropic' || v === 'google') return v;
  } catch {
    /* ignore */
  }
  return 'openai';
}

export function saveProvider(p: LlmProvider) {
  try {
    localStorage.setItem(K_PROVIDER, p);
  } catch {
    /* ignore */
  }
}

export function loadModelChoice(provider: LlmProvider): string {
  if (provider === 'openrouter') {
    return CUSTOM_MODEL_VALUE;
  }
  try {
    const v = localStorage.getItem(K_MODEL(provider));
    if (v && typeof v === 'string') return v;
  } catch {
    /* ignore */
  }
  return '';
}

export function saveModelChoice(provider: LlmProvider, value: string) {
  try {
    localStorage.setItem(K_MODEL(provider), value);
  } catch {
    /* ignore */
  }
}

export function loadCustomModelId(provider: LlmProvider): string {
  try {
    return localStorage.getItem(K_CUSTOM_MODEL(provider)) ?? '';
  } catch {
    return '';
  }
}

export function saveCustomModelId(provider: LlmProvider, id: string) {
  try {
    localStorage.setItem(K_CUSTOM_MODEL(provider), id);
  } catch {
    /* ignore */
  }
}

export function loadApiKey(provider: LlmProvider): string {
  try {
    return localStorage.getItem(K_API_KEY(provider)) ?? '';
  } catch {
    return '';
  }
}

export function saveApiKey(provider: LlmProvider, key: string) {
  try {
    localStorage.setItem(K_API_KEY(provider), key);
  } catch {
    /* ignore */
  }
}

export function resolveLlmModelId(modelChoice: string, customModelId: string): string {
  if (modelChoice === CUSTOM_MODEL_VALUE) {
    return customModelId.trim();
  }
  return modelChoice;
}

export function providerLabel(p: LlmProvider): string {
  switch (p) {
    case 'openai':
      return 'OpenAI';
    case 'openrouter':
      return 'OpenRouter';
    case 'anthropic':
      return 'Claude';
    case 'google':
      return 'Google';
    default:
      return p;
  }
}
