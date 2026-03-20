/**
 * Pulls a JSON object/array from model output that may be wrapped in markdown fences or prose.
 */
export function extractJsonFromLlmText(text: string): string {
  const t = text.trim();
  if (!t) throw new Error('Empty LLM response.');

  const fence = /^```(?:json)?\s*([\s\S]*?)```/im.exec(t);
  if (fence?.[1]) {
    return fence[1].trim();
  }

  const objStart = t.indexOf('{');
  const arrStart = t.indexOf('[');
  let start = -1;
  if (objStart >= 0 && (arrStart < 0 || objStart < arrStart)) {
    start = objStart;
  } else if (arrStart >= 0) {
    start = arrStart;
  }
  if (start < 0) return t;

  const openChar = t[start];
  const closeChar = openChar === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < t.length; i++) {
    const c = t[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (c === '\\') {
        escape = true;
      } else if (c === '"') {
        inString = false;
      }
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === openChar) depth++;
    else if (c === closeChar) {
      depth--;
      if (depth === 0) {
        return t.slice(start, i + 1);
      }
    }
  }

  return t.slice(start);
}
