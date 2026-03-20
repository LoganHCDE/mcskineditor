# Minecraft Skin Maker

React + Vite app with a **fully client-side** AI skin assistant. The browser calls each LLM provider’s REST API directly (`fetch`). There is no Node/Express backend.

## AI chat (models and API keys)

Run the app with `npm run dev`. Build static files with `npm run build` and host `dist/` on any static host.

In the chat panel you can pick **provider** (OpenAI, OpenRouter, Claude / Anthropic, Google Gemini), **model**, and **API keys**. For OpenAI, Claude, and Google, the model list is **loaded from the provider API** when a key is set; without a key you still get a **built-in preset list** so you can choose an ID before pasting a key. OpenRouter uses a **custom model slug only** (no preset list). Keys you enter are saved only in **localStorage** in your browser and are **required** for API calls (nothing is read from a server).

### CORS and browser limits

Some providers do not send CORS headers that allow `fetch` from every website origin. If the model list or chat fails with a network/CORS error in the browser, that is a provider/origin limitation—not something this repo can fix without a separate backend or proxy. Troubleshooting is provider-specific (try another provider, another browser, or a host origin the provider allows, if any).

Optional: set **`VITE_OPENAI_BASE_URL`** at build time (see [`.env.example`](./.env.example)) to point OpenAI-style requests at another OpenAI-compatible base URL.

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
