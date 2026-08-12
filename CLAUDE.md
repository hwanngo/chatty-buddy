# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # start dev server at localhost:5173
pnpm build        # tsc + vite build
pnpm preview      # preview production build
```

No test suite is configured.

## Architecture

**Stack**: React 19 + TypeScript 6 + Vite 8 + Zustand 5 + Tailwind CSS. Runs as a web app (GitHub Pages/Vercel) and is installable as a PWA (`vite-plugin-pwa`, service worker registered in `src/main.tsx`).

**State management**: Single Zustand store (`src/store/store.ts`) composed of slices — `chat-slice`, `input-slice`, `auth-slice`, `config-slice`, `prompt-slice`, `toast-slice`, `custom-models-slice`, `cloud-auth-slice`. State is persisted to `localStorage` under the key `chatty-buddy` with a schema version (currently v2, set in `store.ts`). Schema migrations live in `src/store/migrate.ts` — every schema change requires a new migration step. The `auth-slice` holds `apiType: 'openai' | 'anthropic'` (persisted) alongside `apiKey`, `apiEndpoint`, and `apiVersion`.

Not all store state is persisted. `createPartializedState` in `store.ts` is the allowlist: anything absent from it is runtime-only and needs **no** migration when added or changed. `generating` and `generatingStartedAt` are the current examples — request-scoped flags that would be meaningless (or actively wrong) if restored from a previous session.

**Path aliases** (defined in `vite.config.ts` and `tsconfig.json`):
- `@components/` → `src/components/`
- `@store/` → `src/store/`
- `@type/` → `src/types/`
- `@constants/` → `src/constants/`
- `@api/` → `src/api/`
- `@utils/` → `src/utils/`
- `@hooks/` → `src/hooks/`
- `@icon/` → `src/assets/icons/`
- `@src/` → `src/`

**API layer**: `src/api/api.ts` handles both OpenAI-compatible and Anthropic-compatible requests. OpenAI functions: `getChatCompletion`, `getChatCompletionStream`. Anthropic functions: `getAnthropicChatCompletion`, `getAnthropicChatCompletionStream`, `convertMessagesForAnthropic` (extracts system prompt, converts image blocks to Anthropic format). `src/api/helper.ts` parses SSE streams for both protocols (`parseEventSource` for OpenAI, `parseAnthropicEventSource` for Anthropic). `src/api/google-api.ts` handles Google Drive sync.

**Types**: `src/types/chat.ts` defines the core data model (`MessageInterface`, `ChatInterface`, `ConfigInterface`, `ContentInterface`, `ImageContentInterface`). Messages use a content array (not a plain string) to support mixed text/image content. `src/types/api.ts` contains Anthropic response types: `AnthropicMessage`, `AnthropicTextBlock`, `AnthropicStreamContentBlockDelta`.

**Models**: Model metadata is sourced from `public/models.json` (OpenRouter format). To update models: download from `https://openrouter.ai/api/v1/models`, save as `models.json` in root, run `node sortModelsJsonKeys.js`, then move to `public/`.

**i18n**: `react-i18next` with locale files in `public/locales/<lang>/`. Supported locales: `en-US` (English) and `vi-VN` (Vietnamese). Namespaces: `main`, `model`, `api`, `about`, `import`, `migration`, `drive` (drive loaded only when `VITE_GOOGLE_CLIENT_ID` is set). The `api` namespace includes `apiType.*` keys for the API format selector.

**Constants**: `src/constants/auth.ts` exports `officialAPIEndpoint` (OpenAI), `defaultAPIEndpoint` (env-overridable), `anthropicAPIEndpoint` (`https://api.anthropic.com/v1/messages`), and `availableEndpoints` (preset OpenAI dropdown options).

**Styling & design tokens**: All color lives in CSS custom properties defined once in `src/main.css` — light values on `:root`, dark values on `.dark`. Components reference them as `bg-[var(--bg-card)]`, `text-[var(--fg-2)]` and so on, so **no `dark:` pairing is needed for color** and the whole app rethemes from one block. Prefer an existing token over a new one; add raw hex to a component only if no token fits (and then consider adding the token instead). Shape and elevation are tokenized too: `--radius-btn|field|card`, `--shadow-whisper|ring|float`.

**Agent-activity primitives** (`src/components/AgentActivity/`): UI for the window where a request is in flight. `PixelGridLoader` renders the 3×3 pixel-grid loader, a shimmering label, and a live elapsed timer; it is shown by `ContentView` when `generating` is true and the streamed message is still empty, then yields to the streaming text plus a blinking caret. Structure and timing are ported from [beautifului.dev](https://www.beautifului.dev/); every color is resolved from the tokens above, so the port is palette-neutral by construction.

The shared keyframes — `pixel-on`, `shimmer-text`, `caret-blink` — live near the top of `src/main.css`. Two things to know before editing them:
- The per-cell stagger must be an **inline** `animation` (each cell differs only by delay), so anything that needs to override it — the `prefers-reduced-motion` block in particular — requires `!important` to beat the inline declaration.
- The loader's `role="status"`/`aria-live` region must announce the *label* only. The elapsed timer is `aria-hidden` on purpose: it changes ten times a second, and letting it into the live region turns a screen reader into a stopwatch.

**PWA**: `vite-plugin-pwa` (Workbox) generates the service worker and `manifest.webmanifest`. The SW is registered in `src/main.tsx` via `registerSW` from `virtual:pwa-register` (`registerType: 'autoUpdate'`). The web build uses an absolute `base` (`/chatty-buddy/` on GitHub Pages, `/` otherwise) because a service worker requires it. `workbox-window` is a direct devDependency (pnpm strict-resolution requirement).

## Adding New Settings

When adding a new user-configurable setting, touch all of these:
1. `src/types/chat.ts` — add field to relevant interface
2. `src/store/config-slice.ts` — add to slice state and actions
3. `src/store/store.ts` — add to `createPartializedState`
4. `src/store/migrate.ts` — add migration from previous schema version, bump version in `store.ts`
5. `src/constants/chat.ts` — add default value
6. `src/components/ConfigMenu/ConfigMenu.tsx` or `src/components/ChatConfigMenu/ChatConfigMenu.tsx` — add UI control
7. `public/locales/en-US/main.json` or `model.json` — add i18n key (mirror to `vi-VN/` as well)

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
