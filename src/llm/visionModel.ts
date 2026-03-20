import { filterOpenAiMultimodalChatModels } from './listModels';

/**
 * Heuristic: whether to attach a skin PNG for vision-capable chat models.
 * OpenRouter slugs are matched loosely (e.g. gpt-4o, anthropic/claude-3).
 */
export function modelLikelySupportsSkinImage(
  provider: 'openai' | 'openrouter' | 'anthropic' | 'google',
  modelId: string
): boolean {
  const id = modelId.trim();
  if (!id) return false;

  if (provider === 'google') {
    const i = id.toLowerCase();
    return i.startsWith('gemini-');
  }

  if (provider === 'anthropic') {
    const i = id.toLowerCase();
    return i.startsWith('claude-');
  }

  if (provider === 'openai') {
    const hit = filterOpenAiMultimodalChatModels([{ id }]);
    return hit.length > 0;
  }

  // openrouter: common vision chat patterns
  const i = id.toLowerCase();
  if (/^anthropic\/claude/.test(i)) return true;
  if (/^openai\/(gpt-4o|gpt-4\.1|gpt-5|o\d)/.test(i)) return true;
  if (/^google\/gemini/.test(i)) return true;
  if (/gpt-4o|gpt-4\.1|gpt-5|claude-3|claude-sonnet|claude-opus|gemini|\/vision/i.test(i)) return true;
  return false;
}
