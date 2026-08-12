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

**State management**: Single Zustand store (`src/store/store.ts`) composed of slices — `chat-slice`, `input-slice`, `auth-slice`, `config-slice`, `prompt-slice`, `toast-slice`, `custom-models-slice`, `cloud-auth-slice`. State is persisted to `localStorage` under the key `chatty-buddy` with a schema version (currently v3, set in `store.ts`). Schema migrations live in `src/store/migrate.ts` — every schema change requires a new migration step. The `auth-slice` holds `apiType: 'openai' | 'anthropic'` (persisted) alongside `apiKey`, `apiEndpoint`, and `apiVersion`.

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

**Provider-hosted tools**: the web-search toggle sends `tools: [{type: 'web_search_preview'}]`, which is an *OpenAI-hosted* tool — it has no `function` block because the provider is meant to run it server-side. `api.ts` gates it behind `supportsOpenAIHostedTools` (`@utils/api`, host-exact match on `api.openai.com`) because advertising it to a gateway that can't invoke it is actively harmful, not merely ignored: given a prompt that obviously calls for search, such as a URL to summarise, the model can reason toward that unreachable tool until generation dies — no content, no finish reason, a UI that looks hung. Any new provider-hosted tool needs the same gate.

**Client-executed tools** (`src/utils/tools.ts`, loop in `useSubmit.ts`): the `fetch_url` tool lets the model pull a web page into the conversation. Unlike `web_search_preview` it is an ordinary function tool — *this app* performs the work — which is the only shape that works against a local runtime.

Things that are load-bearing:
- **Tool calls stream in fragments.** `id` and `name` arrive once, `arguments` dribbles across many chunks. They're merged by `index` and executed only after the stream closes; concatenating `arguments` (and *not* `name`) is the whole trick.
- **`toApiMessages` in `api.ts` is required, not cosmetic.** A `tool` message's `content` must be a plain string — internally every message holds a content-parts array — and `tool_name` is ours for the chip, so sending it would put an unknown field in the body.
- **`limitMessageTokens` drops leading orphan `tool` messages.** Trimming walks backwards and can cut between an assistant's `tool_calls` and its result; providers reject a result with nothing to attach to.
- **`MAX_TOOL_ROUNDS` (3)** bounds the loop. Each round is a round-trip plus a page fetch on the user's clock; hitting the cap writes a note into the transcript rather than silently returning a half-answer.
- Tool results are **persisted** so follow-up questions can still see the page, and rendered as a collapsed `ToolChip` — never as markdown, since that would let a fetched page inject headings into the transcript.
- Anthropic is excluded end-to-end: no tools in its payload, and `convertMessagesForAnthropic` filters `tool` messages so a chat started on OpenAI can't emit an invalid role after switching.

The page is fetched through `r.jina.ai`, which is a requirement rather than a convenience — a browser can't fetch arbitrary sites, because almost nothing serves the necessary CORS headers. It is also the only thing in the app that discloses anything to a third party, which is why `fetchUrl` defaults off.

**Math rendering** (`src/utils/latex.ts`): `$` is both a math delimiter and a currency symbol, so with single-dollar math enabled "costs $5 and shipping is $10" parses `5 and shipping is ` as an equation. `preprocessLaTeX` discriminates on whitespace against the delimiter — real inline math is tight (`$O(1)$`), currency pairs leave a space against one end — and escapes the currency case. It skips fenced blocks and inline code spans, so a `` `$5` `` in code is never rewritten. This is what made it safe to turn `inlineLatex` on by default (schema v3 migrates existing users, who would otherwise keep the old `false`).

**Constants**: `src/constants/auth.ts` exports `officialAPIEndpoint` (OpenAI), `defaultAPIEndpoint` (env-overridable), `anthropicAPIEndpoint` (`https://api.anthropic.com/v1/messages`), and `availableEndpoints` (preset OpenAI dropdown options).

**Styling & design tokens**: All color lives in CSS custom properties defined once in `src/main.css` — light values on `:root`, dark values on `.dark`. Components reference them as `bg-[var(--bg-card)]`, `text-[var(--fg-2)]` and so on, so **no `dark:` pairing is needed for color** and the whole app rethemes from one block. Prefer an existing token over a new one; add raw hex to a component only if no token fits (and then consider adding the token instead). Shape and elevation are tokenized too: `--radius-btn|field|card`, `--shadow-whisper|ring|float`.

**Agent-activity primitives** (`src/components/AgentActivity/`): UI for the window where a request is in flight. `PixelGridLoader` renders the 3×3 pixel-grid loader, a shimmering label, and a live elapsed timer; it is shown by `ContentView` when `generating` is true and *nothing at all* has arrived yet, then yields to the streaming text plus a blinking caret. `ThinkingBlock` renders the collapsible reasoning trace. Structure and timing are ported from [beautifului.dev](https://www.beautifului.dev/); every color is resolved from the tokens above, so the port is palette-neutral by construction.

**Inline reasoning (`<think>`) handling**: Local runtimes (llama.cpp, MLX, Ollama in its default mode) don't return a thinking model's reasoning in a separate field — they emit it inline in the message content wrapped in `<think>…</think>`. Nothing downstream treats that as markup (there is no `rehype-raw`), so untouched it renders as literal angle-bracketed text welded to the answer.

`splitThinking` in `src/utils/thinking.ts` partitions the text at render time; `ContentView` feeds the reasoning to `ThinkingBlock` and the remainder to the markdown renderer. Things to preserve when touching this:
- It is a **display** transform. `content` still holds the original text, so editing, export, token counting, and re-sending are unaffected and **no store migration is involved**. Copy is the deliberate exception — it copies the answer, since pasting `<think>` tags into a document is the same bug in a different destination.
- Applied to **assistant messages only**. A user quoting a `<think>` tag means it literally.
- An unterminated block (still streaming, or a generation stopped mid-thought) must stay *reasoning* rather than leaking into the answer — that's why it's a scan and not a `String.replace`.
- `ThinkingBlock` follows the thinking state on its **edges** (expand when thinking starts, collapse when it ends) so a reader's manual toggle survives in between.

Providers that stream reasoning in a *separate* field — `delta.reasoning` (OpenRouter) and `delta.reasoning_content` (DeepSeek, Qwen via vLLM) — are folded into the **same** representation: `useSubmit.ts` opens a `<think>` on the first reasoning delta and closes it when real content starts, so reasoning has one shape regardless of provider and `splitThinking` renders both. A stream that ends mid-thought gets its block closed after the read loop, so nothing is stored with a dangling tag. Because the reasoning lands inside `content`, this still needs **no** `MessageInterface` field and **no** migration.

Still not covered: Anthropic `thinking_delta` blocks — `helper.ts` keeps only `text_delta`. Untested rather than merely unwritten: the app never sends the `thinking` parameter, so Anthropic won't emit those blocks in the first place. Enabling it means an API-layer change on both sides.

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
