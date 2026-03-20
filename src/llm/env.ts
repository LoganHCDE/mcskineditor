export function openAiBaseUrl(): string {
  const v = import.meta.env.VITE_OPENAI_BASE_URL;
  const raw = typeof v === 'string' && v.trim() ? v.trim() : 'https://api.openai.com/v1';
  return raw.replace(/\/$/, '');
}

export function openRouterHttpReferer(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
}
