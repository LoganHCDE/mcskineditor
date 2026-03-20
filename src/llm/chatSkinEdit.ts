import type { ModelType } from '../store/useSkinStore';
import { validateAiEditResponse } from '../types/aiEdits';
import type { LlmProvider } from '../utils/aiProviderSettings';
import { imageDataToDataURL } from '../utils/textureUtils';
import { buildSkinLlmPayload } from './buildSkinLlmPayload';
import { completeJsonSkinEdit, isValidProvider, normalizeLlmModel } from './completeJsonSkinEdit';
import { extractJsonFromLlmText } from './extractLlmJson';
import { SKIN_EDIT_RETRY_SYSTEM_SUFFIX, SKIN_EDIT_SYSTEM_PROMPT } from './skinEditPrompt';
import type { ChatTurn } from './types';
import { modelLikelySupportsSkinImage } from './visionModel';

export interface ChatSkinEditInput {
  message: string;
  modelType: ModelType;
  skinImage: ImageData;
  history: ChatTurn[];
  llmProvider: LlmProvider;
  llmModel: string;
  apiKey: string;
  /**
   * When true (default), attach a 64×64 PNG for providers/models that likely support vision,
   * in addition to pixelsRgbaBase64 in the JSON.
   */
  includeSkinPngForVision?: boolean;
}

function parseAndValidateSkinEdit(content: string): unknown {
  const extracted = extractJsonFromLlmText(content);
  const parsed: unknown = JSON.parse(extracted);
  validateAiEditResponse(parsed);
  return parsed;
}

export async function chatSkinEdit(input: ChatSkinEditInput): Promise<unknown> {
  const message = input.message;
  if (typeof message !== 'string' || !message.trim()) {
    throw new Error('message is required.');
  }
  if (input.modelType !== 'steve' && input.modelType !== 'alex') {
    throw new Error('modelType must be steve or alex.');
  }
  if (!input.skinImage || input.skinImage.width !== 64 || input.skinImage.height !== 64) {
    throw new Error('skinImage must be 64×64 ImageData.');
  }

  if (!isValidProvider(input.llmProvider)) {
    throw new Error('llmProvider must be openai, openrouter, anthropic, or google.');
  }
  const llmProvider = input.llmProvider;

  let llmModel =
    typeof input.llmModel === 'string' && input.llmModel.trim() ? normalizeLlmModel(input.llmModel) : '';
  if (!llmModel && llmProvider === 'openai') {
    llmModel = normalizeLlmModel('gpt-4o-mini');
  }
  if (!llmModel) {
    throw new Error('llmModel is required.');
  }

  const apiKey = typeof input.apiKey === 'string' ? input.apiKey.trim() : '';
  if (!apiKey) {
    throw new Error('No API key: add your provider key in the chat panel (stored in this browser only).');
  }

  const chatHistory = Array.isArray(input.history) ? input.history : [];
  const trimmedHistory = chatHistory
    .filter(
      (m) =>
        m &&
        typeof m === 'object' &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string'
    )
    .slice(-8);

  const userPayload = buildSkinLlmPayload({
    instruction: message,
    modelType: input.modelType,
    imageData: input.skinImage,
  });
  const finalUserContent = JSON.stringify(userPayload);

  const includePng = input.includeSkinPngForVision !== false;
  const skinPngDataUrl =
    includePng && modelLikelySupportsSkinImage(llmProvider, llmModel)
      ? imageDataToDataURL(input.skinImage)
      : undefined;

  const runComplete = (systemPrompt: string) =>
    completeJsonSkinEdit(llmProvider, apiKey, llmModel, systemPrompt, trimmedHistory, finalUserContent, {
      skinPngDataUrl,
    });

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const systemPrompt =
      attempt === 0 ? SKIN_EDIT_SYSTEM_PROMPT : `${SKIN_EDIT_SYSTEM_PROMPT}\n\n${SKIN_EDIT_RETRY_SYSTEM_SUFFIX}`;
    try {
      const content = await runComplete(systemPrompt);
      return parseAndValidateSkinEdit(content);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
