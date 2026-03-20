# Minecraft Skin Maker

React + Vite app with a **fully client-side** AI skin assistant. The browser calls each LLM provider’s REST API directly (`fetch`). There is no Node/Express backend.

## AI chat (models and API keys)

Run the app with `npm run dev`. Build static files with `npm run build` and host `dist/` on any static host.

For **GitHub Pages** at `https://loganhcde.github.io/mcskineditor/`, Vite is configured with `base: '/mcskineditor/'` so JS/CSS resolve under that path. Pushes to `main` trigger [`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml); set the repo’s **Settings → Pages → Source** to **GitHub Actions** so the workflow can publish. If you rename the repo, update `base` in `vite.config.ts` to match.

In the chat panel you can pick **provider** (OpenAI, OpenRouter, Claude / Anthropic, Google Gemini), **model**, and **API keys**. For OpenAI, Claude, and Google, the model list is **loaded from the provider API** when a key is set; without a key you still get a **built-in preset list** so you can choose an ID before pasting a key. OpenRouter uses a **custom model slug only** (no preset list). Keys you enter are saved only in **localStorage** in your browser and are **required** for API calls (nothing is read from a server).

### CORS and browser limits

Some providers do not send CORS headers that allow `fetch` from every website origin. If the model list or chat fails with a network/CORS error in the browser, that is a provider/origin limitation—not something this repo can fix without a separate backend or proxy. Troubleshooting is provider-specific (try another provider, another browser, or a host origin the provider allows, if any).

Optional: set **`VITE_OPENAI_BASE_URL`** at build time (see [`.env.example`](./.env.example)) to point OpenAI-style requests at another OpenAI-compatible base URL.

## LLM context and how edits are applied

Each chat turn is a **single completion** (not streaming) built in `src/llm/chatSkinEdit.ts` and `src/llm/completeJsonSkinEdit.ts`.

### What the model sees

- **System prompt** (`src/llm/skinEditPrompt.ts`): role, strict JSON output shape, operation semantics (`set_pixels`, `set_region`, `fill_area`, `set_model_type`), Steve vs Alex **UV layout** for every body-part face, and rules such as a cap on how many operations to return.
- **User message**: a **JSON string** from `buildSkinLlmPayload` (`src/llm/buildSkinLlmPayload.ts`) with `schemaVersion`, the user’s natural-language **instruction**, `modelType`, and the **entire current skin** as **`pixelsRgbaBase64`** (64×64 RGBA, row-major, base64 — on the order of tens of thousands of characters of text).
- **Chat history**: the last **8** text turns (user/assistant) are forwarded as prior messages; they are **not** paired with past skin snapshots, only with the **latest** skin payload on the current request.
- **Vision (optional)**: for providers/models that **likely** support images (`src/llm/visionModel.ts`), a **64×64 PNG** data URL is attached **in addition** to the base64-in-JSON encoding, so the model can align UV language with a real image. Text-only models get JSON only.

OpenAI/OpenRouter use `response_format: { type: 'json_object' }` where supported; Anthropic and Gemini use their own JSON modes. If the model still wraps output in fences or prose, `extractJsonFromLlmText` (`src/llm/extractLlmJson.ts`) tries to recover a JSON object before parsing.

### How edits become pixels

The model must return `{ "message", "operations" }`. Operations are **validated** (`src/types/aiEdits.ts`) then executed **entirely in the browser** (`src/utils/aiEditExecutor.ts`): pixels are clipped to the skin, invalid areas for Steve/Alex are skipped, `fill_area` fills a **whole UV face** from one sample pixel (not a color flood-fill), and there is a safety limit on how many pixels may change in one apply. Failed validation or oversize edits surface as errors to the user. On parse/validation failure, the client **retries once** with a stricter system suffix (`SKIN_EDIT_RETRY_SYSTEM_SUFFIX`).

### Possible improvements

- **Smaller or smarter skin context**: sending full RGBA every turn is simple but token-heavy. Alternatives include region crops for localized edits, diffs from a previous turn, or leaning on **vision-only** input for multimodal models and dropping redundant base64 text where provider APIs allow.
- **Richer memory**: history is short and **text-only**; the model never sees earlier skin states explicitly. Storing or summarizing “what changed” per turn, or attaching a **thumbnail / hash** of the last applied state, could help multi-step refinement and “undo that” style requests.
- **Structured output**: where available, provider-native **JSON schema** or tool/function calling could reduce malformed JSON compared to free-form `json_object` + extraction.
- **Vision heuristics**: OpenRouter model IDs are matched with patterns; wrong guesses either omit a helpful image or send one to a text-only model. A manual “attach skin image” toggle or capability flags from the provider would be more reliable.
- **Streaming and UX**: responses are waited on in one block; streaming partial JSON would need careful parsing or a different protocol.
- **Server or proxy**: a small backend could cache the skin server-side, shrink payloads, enforce quotas, and avoid **CORS** limits for some providers — at the cost of no longer being purely static hosting.

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other options...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

If you want to add React-specific lint rules, see [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom):

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
