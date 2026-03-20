import { listModelsForProvider, listStaticMultimodalModels } from './listModels';
import type { ListModelsDynamicProvider, ListModelsResult } from './types';

export async function fetchModelList(
  provider: ListModelsDynamicProvider,
  apiKey: string
): Promise<ListModelsResult> {
  const trimmed = apiKey.trim();
  const staticModels = listStaticMultimodalModels(provider);

  if (!trimmed) {
    return {
      models: staticModels,
      source: 'static',
      hint: 'Add an API key to load the live model list from the provider.',
    };
  }

  try {
    const models = await listModelsForProvider(provider, trimmed);
    if (models.length === 0) {
      return {
        models: staticModels,
        source: 'static',
        warning:
          'Provider returned no multimodal chat models matching filters; showing built-in presets.',
      };
    }
    return { models, source: 'live' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Provider request failed.';
    return {
      models: staticModels,
      source: 'static',
      warning: `Could not load live list from provider; showing built-in presets. ${msg.slice(0, 280)}`,
    };
  }
}
