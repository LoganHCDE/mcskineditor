export type ChatTurn = { role: 'user' | 'assistant'; content: string };

export type ListModelsDynamicProvider = 'openai' | 'anthropic' | 'google';

export type ListModelsResult = {
  models: { id: string; label: string }[];
  source: 'static' | 'live';
  hint?: string;
  warning?: string;
};
