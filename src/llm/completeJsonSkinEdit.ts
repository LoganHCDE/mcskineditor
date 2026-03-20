import { openAiBaseUrl, openRouterHttpReferer } from './env';
import type { ChatTurn } from './types';

const MAX_MODEL_ID_LEN = 256;

export type LlmProviderId = 'openai' | 'openrouter' | 'anthropic' | 'google';

export type CompleteJsonSkinEditOptions = {
  /** PNG data URL (`data:image/png;base64,...`). Shown to vision-capable models alongside JSON text. */
  skinPngDataUrl?: string;
};

export function isValidProvider(provider: unknown): provider is LlmProviderId {
  return (
    provider === 'openai' ||
    provider === 'openrouter' ||
    provider === 'anthropic' ||
    provider === 'google'
  );
}

export function normalizeLlmModel(model: unknown): string {
  if (typeof model !== 'string') return '';
  const t = model.trim();
  if (!t || t.length > MAX_MODEL_ID_LEN) return '';
  return t;
}

function mergeAdjacentSameRole(history: ChatTurn[]): ChatTurn[] {
  const out: ChatTurn[] = [];
  for (const m of history) {
    const last = out[out.length - 1];
    if (last && last.role === m.role) {
      last.content = `${last.content}\n\n${m.content}`;
    } else {
      out.push({ role: m.role, content: m.content });
    }
  }
  return out;
}

function parsePngDataUrl(dataUrl: string): { mimeType: string; base64: string } {
  const m = /^data:([^;]+);base64,(\S+)$/i.exec(dataUrl.trim());
  if (!m) throw new Error('Invalid PNG data URL for LLM image.');
  return { mimeType: m[1].trim() || 'image/png', base64: m[2].trim() };
}

type AnthropicContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };

function anthropicMessages(
  trimmedHistory: ChatTurn[],
  finalUserText: string,
  skinPngDataUrl?: string
): { role: 'user' | 'assistant'; content: string | AnthropicContentBlock[] }[] {
  const merged = mergeAdjacentSameRole(trimmedHistory);
  let lastUser: AnthropicContentBlock[] | string = finalUserText;
  if (skinPngDataUrl) {
    const { mimeType, base64 } = parsePngDataUrl(skinPngDataUrl);
    lastUser = [
      {
        type: 'image',
        source: { type: 'base64', media_type: mimeType, data: base64 },
      },
      { type: 'text', text: finalUserText },
    ];
  }
  return [...merged, { role: 'user', content: lastUser }];
}

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

type GeminiContent = { role: string; parts: GeminiPart[] };

function geminiContents(
  trimmedHistory: ChatTurn[],
  finalUserText: string,
  skinPngDataUrl?: string
): GeminiContent[] {
  const contents: GeminiContent[] = [];
  for (const m of trimmedHistory) {
    const role = m.role === 'assistant' ? 'model' : 'user';
    if (contents.length && contents[contents.length - 1].role === role) {
      const last = contents[contents.length - 1];
      const first = last.parts[0];
      if ('text' in first && first.text !== undefined) {
        first.text = `${first.text}\n\n${m.content}`;
      }
    } else {
      contents.push({ role, parts: [{ text: m.content }] });
    }
  }

  const lastRole = contents.length ? contents[contents.length - 1].role : null;

  if (skinPngDataUrl) {
    const { mimeType, base64 } = parsePngDataUrl(skinPngDataUrl);
    contents.push({
      role: 'user',
      parts: [{ inlineData: { mimeType, data: base64 } }, { text: finalUserText }],
    });
    return contents;
  }

  if (lastRole === 'user') {
    const last = contents[contents.length - 1];
    const first = last.parts[0];
    if ('text' in first && first.text !== undefined) {
      first.text += `\n\n${finalUserText}`;
    } else {
      last.parts.push({ text: finalUserText });
    }
  } else {
    contents.push({ role: 'user', parts: [{ text: finalUserText }] });
  }
  return contents;
}

type OpenAiUserContent =
  | string
  | ({ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } })[];

function buildOpenAiFinalUserContent(finalUserText: string, skinPngDataUrl?: string): OpenAiUserContent {
  if (!skinPngDataUrl) return finalUserText;
  parsePngDataUrl(skinPngDataUrl);
  return [
    {
      type: 'text',
      text: `${finalUserText}\n\n(Attached: 64×64 Minecraft skin texture PNG; UV coordinates in the JSON match this image.)`,
    },
    { type: 'image_url', image_url: { url: skinPngDataUrl } },
  ];
}

async function openAiCompatibleChat(
  apiKey: string,
  baseUrl: string,
  model: string,
  systemPrompt: string,
  trimmedHistory: ChatTurn[],
  finalUserText: string,
  skinPngDataUrl?: string
): Promise<string> {
  const root = baseUrl.replace(/\/$/, '');
  const userContent = buildOpenAiFinalUserContent(finalUserText, skinPngDataUrl);
  const response = await fetch(`${root}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        ...trimmedHistory,
        { role: 'user', content: userContent },
      ],
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LLM API error: ${response.status} ${text.slice(0, 500)}`);
  }
  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('LLM returned an empty response.');
  }
  return content;
}

async function anthropicChat(
  apiKey: string,
  model: string,
  systemPrompt: string,
  trimmedHistory: ChatTurn[],
  finalUserText: string,
  skinPngDataUrl?: string
): Promise<string> {
  const messages = anthropicMessages(trimmedHistory, finalUserText, skinPngDataUrl);
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      temperature: 0.2,
      system: systemPrompt,
      messages,
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LLM API error: ${response.status} ${text.slice(0, 500)}`);
  }
  const data = (await response.json()) as { content?: { type?: string; text?: string }[] };
  const blocks = data?.content;
  if (!Array.isArray(blocks)) {
    throw new Error('LLM returned an empty response.');
  }
  const textParts = blocks.filter((b) => b?.type === 'text').map((b) => b.text ?? '');
  const content = textParts.join('\n').trim();
  if (!content) {
    throw new Error('LLM returned an empty response.');
  }
  return content;
}

function geminiModelPath(modelId: string): string {
  let m = modelId.trim();
  if (m.startsWith('models/')) m = m.slice('models/'.length);
  if (m.includes(':')) m = m.split(':')[0] ?? m;
  return m;
}

async function geminiChat(
  apiKey: string,
  model: string,
  systemPrompt: string,
  trimmedHistory: ChatTurn[],
  finalUserText: string,
  skinPngDataUrl?: string
): Promise<string> {
  const modelPath = geminiModelPath(model);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelPath)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const contents = geminiContents(trimmedHistory, finalUserText, skinPngDataUrl);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LLM API error: ${response.status} ${text.slice(0, 500)}`);
  }
  const data = (await response.json()) as { candidates?: { content?: { parts?: GeminiPart[] } }[] };
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    throw new Error('LLM returned an empty response.');
  }
  const text = parts
    .filter((p): p is { text: string } => typeof (p as { text?: string }).text === 'string')
    .map((p) => p.text)
    .join('\n')
    .trim();
  if (!text) {
    throw new Error('LLM returned an empty response.');
  }
  return text;
}

export async function completeJsonSkinEdit(
  provider: LlmProviderId,
  apiKey: string,
  llmModel: string,
  systemPrompt: string,
  trimmedHistory: ChatTurn[],
  finalUserContent: string,
  options?: CompleteJsonSkinEditOptions
): Promise<string> {
  const skinPngDataUrl = options?.skinPngDataUrl?.trim() || undefined;

  if (provider === 'openai') {
    return openAiCompatibleChat(
      apiKey,
      openAiBaseUrl(),
      llmModel,
      systemPrompt,
      trimmedHistory,
      finalUserContent,
      skinPngDataUrl
    );
  }
  if (provider === 'openrouter') {
    const baseUrl = 'https://openrouter.ai/api/v1';
    const referer = openRouterHttpReferer();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'X-Title': 'Minecraft Skin Maker',
    };
    if (referer) {
      headers['HTTP-Referer'] = referer;
    }
    const userContent = buildOpenAiFinalUserContent(finalUserContent, skinPngDataUrl);
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: llmModel,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          ...trimmedHistory,
          { role: 'user', content: userContent },
        ],
      }),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`LLM API error: ${response.status} ${text.slice(0, 500)}`);
    }
    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new Error('LLM returned an empty response.');
    }
    return content;
  }
  if (provider === 'anthropic') {
    return anthropicChat(apiKey, llmModel, systemPrompt, trimmedHistory, finalUserContent, skinPngDataUrl);
  }
  if (provider === 'google') {
    return geminiChat(apiKey, llmModel, systemPrompt, trimmedHistory, finalUserContent, skinPngDataUrl);
  }
  throw new Error('Unknown provider.');
}
