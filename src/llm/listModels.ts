import { openAiBaseUrl } from './env';
import type { ListModelsDynamicProvider } from './types';

const STATIC_MULTIMODAL_PRESETS: Record<
  ListModelsDynamicProvider,
  { id: string; label: string }[]
> = {
  anthropic: [
    { id: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
    { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
    { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
    { id: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5' },
    { id: 'claude-opus-4-5-20251101', label: 'Claude Opus 4.5' },
    { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
    { id: 'claude-opus-4-20250514', label: 'Claude Opus 4' },
    { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
  ],
  openai: [
    { id: 'gpt-5.4', label: 'GPT-5.4' },
    { id: 'gpt-5.4-mini', label: 'GPT-5.4 mini' },
    { id: 'gpt-5.4-nano', label: 'GPT-5.4 nano' },
    { id: 'gpt-4o', label: 'GPT-4o' },
    { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
    { id: 'gpt-4.1', label: 'GPT-4.1' },
    { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
    { id: 'gpt-4.1-nano', label: 'GPT-4.1 nano' },
    { id: 'o4-mini', label: 'o4-mini' },
  ],
  google: [
    { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro (preview)' },
    { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash (preview)' },
    { id: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash-Lite (preview)' },
    { id: 'gemini-3.1-pro-preview-customtools', label: 'Gemini 3.1 Pro — custom tools (preview)' },
  ],
};

export function listStaticMultimodalModels(provider: ListModelsDynamicProvider): { id: string; label: string }[] {
  return STATIC_MULTIMODAL_PRESETS[provider].map((m) => ({ ...m }));
}

export function filterOpenAiMultimodalChatModels(items: { id: string }[]): { id: string }[] {
  return items.filter(({ id }) => {
    if (typeof id !== 'string') return false;
    const i = id.toLowerCase();
    if (
      /embedding|whisper|tts|moderation|dall-e|davinci|babbage|realtime|transcrib|omni-moderation|text-embedding|audio|search|instruct-ft|ft:/.test(
        i
      )
    ) {
      return false;
    }
    if (!/^(gpt-|o\d|chatgpt-)/i.test(id)) return false;
    return (
      /gpt-4o/.test(i) ||
      /gpt-4-turbo/.test(i) ||
      /gpt-4\.1/.test(i) ||
      /gpt-4\.5/.test(i) ||
      /^gpt-5/.test(i) ||
      /chatgpt-4o/.test(i) ||
      /^o\d/.test(i) ||
      (/^gpt-4-/.test(i) && /turbo|vision|1106|0125|preview|vision-preview/.test(i))
    );
  });
}

export async function listOpenAiModels(apiKey: string): Promise<{ id: string; label: string }[]> {
  const base = openAiBaseUrl();
  const response = await fetch(`${base}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI models error: ${response.status} ${text.slice(0, 300)}`);
  }
  const data = (await response.json()) as { data?: { id: string }[] };
  const raw = Array.isArray(data?.data) ? data.data : [];
  const filtered = filterOpenAiMultimodalChatModels(raw);
  filtered.sort((a, b) => (a.id || '').localeCompare(b.id || ''));
  return filtered.map((m) => ({
    id: m.id,
    label: m.id,
  }));
}

function anthropicMultimodalForSkinTask(m: Record<string, unknown>): boolean {
  const c = m?.capabilities;
  if (c && typeof c === 'object' && c !== null && Object.keys(c).length > 0) {
    const cap = c as Record<string, { supported?: boolean }>;
    const img = cap.image_input?.supported === true;
    const pdf = cap.pdf_input?.supported === true;
    return img || pdf;
  }
  return typeof m?.id === 'string' && m.id.startsWith('claude-');
}

export async function listAnthropicModels(apiKey: string): Promise<{ id: string; label: string }[]> {
  const all: Record<string, unknown>[] = [];
  let afterId: string | undefined;
  for (let page = 0; page < 20; page++) {
    const url = new URL('https://api.anthropic.com/v1/models');
    url.searchParams.set('limit', '1000');
    if (afterId) url.searchParams.set('after_id', afterId);
    const response = await fetch(url.toString(), {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Anthropic models error: ${response.status} ${text.slice(0, 300)}`);
    }
    const data = (await response.json()) as {
      data?: Record<string, unknown>[];
      has_more?: boolean;
      last_id?: string;
    };
    const batch = Array.isArray(data?.data) ? data.data : [];
    all.push(...batch);
    if (!data?.has_more || batch.length === 0) break;
    afterId = data.last_id;
  }
  const filtered = all.filter(anthropicMultimodalForSkinTask);
  filtered.sort((a, b) => String(a.id || '').localeCompare(String(b.id || '')));
  return filtered.map((m) => ({
    id: String(m.id),
    label: typeof m.display_name === 'string' ? m.display_name : String(m.id),
  }));
}

function googleMultimodalGenerateContent(m: Record<string, unknown>): boolean {
  const methods = m.supportedGenerationMethods || m.supportedActions || [];
  const list = Array.isArray(methods) ? methods : [];
  if (!list.map(String).some((x) => x.toLowerCase() === 'generatecontent')) return false;
  const name = `${m.name || ''}${m.baseModelId || ''}`.toLowerCase();
  if (/embedding|bison|gecko|aqa|imagen|robotics|learnlm|gemma-|text-embedding|embedding-/.test(name)) {
    return false;
  }
  const modalities = m.supportedInputModalities;
  if (Array.isArray(modalities) && modalities.length > 0) {
    const upper = modalities.map((x) => String(x).toUpperCase());
    const hasImage = upper.includes('IMAGE');
    const hasText = upper.includes('TEXT');
    if (hasText && !hasImage) return false;
  }
  return true;
}

export function isGemini30Or31ChatModelId(id: string): boolean {
  const i = id.trim().toLowerCase();
  if (!i.startsWith('gemini-')) return false;
  if (i.startsWith('gemini-1') || i.startsWith('gemini-2')) return false;
  if (/^gemini-3\.1-/.test(i)) return !/-image-|imagen|veo/i.test(i);
  if (/^gemini-3-[a-z]/i.test(i)) return !/-image-|imagen|veo/i.test(i);
  return false;
}

export async function listGoogleModels(apiKey: string): Promise<{ id: string; label: string }[]> {
  const all: Record<string, unknown>[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 20; page++) {
    const url = new URL('https://generativelanguage.googleapis.com/v1beta/models');
    url.searchParams.set('pageSize', '1000');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    url.searchParams.set('key', apiKey);
    const response = await fetch(url.toString());
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Google models error: ${response.status} ${text.slice(0, 300)}`);
    }
    const data = (await response.json()) as { models?: Record<string, unknown>[]; nextPageToken?: string };
    const batch = Array.isArray(data?.models) ? data.models : [];
    all.push(...batch);
    pageToken = data?.nextPageToken;
    if (!pageToken) break;
  }
  const filtered = all.filter(googleMultimodalGenerateContent);
  const seen = new Set<string>();
  const out: { id: string; label: string }[] = [];
  for (const m of filtered) {
    let id = typeof m.baseModelId === 'string' ? m.baseModelId : '';
    if (!id && typeof m.name === 'string' && m.name.startsWith('models/')) {
      id = m.name.slice('models/'.length);
    }
    if (!id || seen.has(id) || !isGemini30Or31ChatModelId(id)) continue;
    seen.add(id);
    out.push({
      id,
      label: typeof m.displayName === 'string' ? m.displayName : id,
    });
  }
  out.sort((a, b) => a.id.localeCompare(b.id));

  const presets = listStaticMultimodalModels('google');
  const presetKeys = new Set(presets.map((p) => p.id.toLowerCase()));
  const extras = out.filter(
    (m) => isGemini30Or31ChatModelId(m.id) && !presetKeys.has(m.id.toLowerCase())
  );
  const merged = [...presets, ...extras];
  return merged.filter((m) => isGemini30Or31ChatModelId(m.id));
}

export async function listModelsForProvider(
  provider: ListModelsDynamicProvider,
  apiKey: string
): Promise<{ id: string; label: string }[]> {
  if (provider === 'openai') return listOpenAiModels(apiKey);
  if (provider === 'anthropic') return listAnthropicModels(apiKey);
  if (provider === 'google') return listGoogleModels(apiKey);
  throw new Error('Unsupported provider for listing.');
}
