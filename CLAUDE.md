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

**API layer**: `src/api/api.ts` handles OpenAI-compatible, Anthropic-compatible and ollama-native requests. OpenAI functions: `getChatCompletion`, `getChatCompletionStream`. Anthropic functions: `getAnthropicChatCompletion`, `getAnthropicChatCompletionStream`, `convertMessagesForAnthropic` (extracts system prompt, converts image blocks to Anthropic format). `src/api/helper.ts` parses SSE streams for both protocols (`parseEventSource` for OpenAI, `parseAnthropicEventSource` for Anthropic). `src/api/google-api.ts` handles Google Drive sync.

**Types**: `src/types/chat.ts` defines the core data model (`MessageInterface`, `ChatInterface`, `ConfigInterface`, `ContentInterface`, `ImageContentInterface`). Messages use a content array (not a plain string) to support mixed text/image content. `src/types/api.ts` contains Anthropic response types: `AnthropicMessage`, `AnthropicTextBlock`, `AnthropicStreamContentBlockDelta`.

**Models**: Model metadata is sourced from `public/models.json` (OpenRouter format). To update models: download from `https://openrouter.ai/api/v1/models`, save as `models.json` in root, run `node sortModelsJsonKeys.js`, then move to `public/`.

**i18n**: `react-i18next` with locale files in `public/locales/<lang>/`. Supported locales: `en-US` (English) and `vi-VN` (Vietnamese). Namespaces: `main`, `model`, `api`, `about`, `import`, `migration`, `drive` (drive loaded only when `VITE_GOOGLE_CLIENT_ID` is set). The `api` namespace includes `apiType.*` keys for the API format selector.

**Ollama native protocol** (`apiType: 'ollama'`): targets ollama's own `/api/chat` instead of its OpenAI-compatible shim. The reason is concrete and measured — the shim silently drops unknown parameters, so `think`, `enable_thinking`, `chat_template_kwargs`, `reasoning_effort` and `options.think` all had **zero** effect on reasoning, while native `think: false` suppressed it completely. Anything beyond the OpenAI surface is unreachable through the shim, so this is the seam for every future ollama capability.

What differs from the OpenAI path, all of it simpler:
- **NDJSON, not SSE** — one complete JSON object per line, no `data:` prefix and no `[DONE]` sentinel. `parseOllamaStream` takes whole lines only; the caller holds back a trailing partial line.
- **Tool calls arrive complete**, with `arguments` as an **object**. `useSubmit` serialises them to a JSON string when building `ToolCallInterface`, which keeps `executeToolCall` protocol-agnostic — nothing downstream knows which wire format produced a call.
- **Reasoning is `message.thinking`**, folded into the content as `<think>…</think>` so it takes the same path as every other provider and `splitThinking` renders it unchanged.
- **Messages convert** via `toOllamaMessages`: content flattens to a string, images ride in a sibling `images` array as bare base64, and a tool result identifies itself with `tool_name` rather than `tool_call_id`.
- **Sampling lives under `options`**, not at the top level. `max_tokens` is deliberately not mapped to `num_predict` — the OpenAI path doesn't send it either (it's the context budget for `limitMessageTokens`, not an output cap).
- One endpoint is configured and the rest are derived: `ollamaChatUrl` strips a known suffix to get the base, so a pasted `…/v1/chat/completions` still resolves to `/api/chat`, and the model list reuses `/v1/models`.

The `think` config field only reaches the model here, which is why its toggle is hidden on other protocols — showing it would promise something they cannot deliver.

**Reasoning controls are per-protocol, and each is hidden where it does nothing.** There is no single "reasoning off" switch, because no two protocols spell it the same way. Measured against llama-server:

| Protocol | Off switch | Result |
|---|---|---|
| ollama native | `think: false` | reasoning suppressed |
| OpenAI | `reasoning_effort: 'none'` | reasoning suppressed |
| OpenAI | `reasoning_effort: 'low'`, or field omitted | still reasons |
| Anthropic | `thinking: {type: 'disabled'}` | still reasons — ignored by the server |
| Anthropic | no parameter | still reasons |

So `ReasoningEffort` includes `'none'` as a real value, and `null` is a *different* state meaning "send no field at all". They are not interchangeable: `api.ts` guards with `reasoningEffort ? {…} : {}`, so a `null` labelled "none" would silently send nothing and leave reasoning on — which is exactly the bug that shipped before. The chips read **Default → None → Low → Medium → High**, and `'none'` being truthy is what carries it to the wire. Widening the union needs no migration: every previously stored value is still valid.

The Anthropic row is why no reasoning control is offered there at all. Nothing the client can send switches it off, so the only remedy is server-side (`--reasoning-budget 0`), and a control that cannot deliver is worse than an absent one.

**Provider-hosted tools**: the web-search toggle sends `tools: [{type: 'web_search_preview'}]`, which is an *OpenAI-hosted* tool — it has no `function` block because the provider is meant to run it server-side. `api.ts` gates it behind `supportsOpenAIHostedTools` (`@utils/api`, host-exact match on `api.openai.com`) because advertising it to a gateway that can't invoke it is actively harmful, not merely ignored: given a prompt that obviously calls for search, such as a URL to summarise, the model can reason toward that unreachable tool until generation dies — no content, no finish reason, a UI that looks hung. Any new provider-hosted tool needs the same gate.

**Client-executed tools** (`src/utils/tools.ts`, loop in `useSubmit.ts`): the `fetch_url` tool lets the model pull a web page into the conversation. Unlike `web_search_preview` it is an ordinary function tool — *this app* performs the work — which is the only shape that works against a local runtime.

Things that are load-bearing:
- **Tool calls stream in fragments.** `id` and `name` arrive once, `arguments` dribbles across many chunks. They're merged by `index` and executed only after the stream closes; concatenating `arguments` (and *not* `name`) is the whole trick.
- **`toApiMessages` in `api.ts` is required, not cosmetic.** A `tool` message's `content` must be a plain string — internally every message holds a content-parts array — and `tool_name` is ours for the chip, so sending it would put an unknown field in the body.
- **`limitMessageTokens` drops leading orphan `tool` messages.** Trimming walks backwards and can cut between an assistant's `tool_calls` and its result; providers reject a result with nothing to attach to.
- **`MAX_TOOL_ROUNDS` (3)** bounds the loop. Each round is a round-trip plus a page fetch on the user's clock; hitting the cap writes a note into the transcript rather than silently returning a half-answer.
- Tool results are **persisted** so follow-up questions can still see the page, and surfaced as a row in `AgentTimeline` that opens the raw text in a dialog.
- Anthropic is excluded end-to-end: no tools in its payload, and `convertMessagesForAnthropic` filters `tool` messages so a chat started on OpenAI can't emit an invalid role after switching.

The page is fetched through `r.jina.ai`, which is a requirement rather than a convenience — a browser can't fetch arbitrary sites, because almost nothing serves the necessary CORS headers. It is also the only thing in the app that discloses anything to a third party, which is why `fetchUrl` defaults off.

**Math rendering** (`src/utils/latex.ts`): `$` is both a math delimiter and a currency symbol, so with single-dollar math enabled "costs $5 and shipping is $10" parses `5 and shipping is ` as an equation. `preprocessLaTeX` discriminates on whitespace against the delimiter — real inline math is tight (`$O(1)$`), currency pairs leave a space against one end — and escapes the currency case. It skips fenced blocks and inline code spans, so a `` `$5` `` in code is never rewritten. This is what made it safe to turn `inlineLatex` on by default (schema v3 migrates existing users, who would otherwise keep the old `false`).

**Constants**: `src/constants/auth.ts` exports `officialAPIEndpoint` (OpenAI), `defaultAPIEndpoint` (env-overridable), `anthropicAPIEndpoint` (`https://api.anthropic.com/v1/messages`), and `availableEndpoints` (preset OpenAI dropdown options).

**Styling & design tokens**: All color lives in CSS custom properties defined once in `src/main.css` — light values on `:root`, dark values on `.dark`. Components reference them as `bg-[var(--bg-card)]`, `text-[var(--fg-2)]` and so on, so **no `dark:` pairing is needed for color** and the whole app rethemes from one block. Prefer an existing token over a new one; add raw hex to a component only if no token fits (and then consider adding the token instead). Shape and elevation are tokenized too: `--radius-btn|field|card`, `--shadow-whisper|ring|float`.

**Agent-activity primitives** (`src/components/AgentActivity/`): UI for the window where a request is in flight. `PixelGridLoader` renders the 3×3 pixel-grid loader, a shimmering label, and a live elapsed timer; it is shown by `ContentView` when `generating` is true and *nothing at all* has arrived yet, then yields to the streaming text plus a blinking caret. `AgentTimeline` renders everything the assistant did before answering as one collapsible line. Structure and timing are ported from [beautifului.dev](https://www.beautifului.dev/) (Loading State and Thinking); every color is resolved from the tokens above, so the port is palette-neutral by construction.

**One turn, one block.** A tool round is stored as several messages — the assistant's request, each tool result, then the answer — and rendering them one-per-block gave three panes of chrome for one exchange, two of them empty shells. `ChatContent` builds `displayRows`, folding the intermediate messages into `TimelineStep`s passed to the answer as `priorSteps` (through `Message` → `MessageContent` → `ContentView`, which appends its own `<think>` reasoning last). Points worth keeping:
- The regrouping is **display-only**. `messages` is untouched and rows keep their real index, so edit, delete and reorder still address the right message.
- Fetched page text opens in a **`Dialog`, not inline** — a page runs to tens of thousands of characters and would bury the conversation it was fetched to support.
- Tool output and reasoning are rendered as **plain text, never markdown**: reasoning is often truncated mid-token while streaming, and a fetched page could otherwise inject headings and links into the transcript.
- The header follows the thinking state on its **edges** (expand on start, collapse on end) so a manual toggle in between survives.

**Inline reasoning (`<think>`) handling**: Local runtimes (llama.cpp, MLX, Ollama in its default mode) don't return a thinking model's reasoning in a separate field — they emit it inline in the message content wrapped in `<think>…</think>`. Nothing downstream treats that as markup (there is no `rehype-raw`), so untouched it renders as literal angle-bracketed text welded to the answer.

`splitThinking` in `src/utils/thinking.ts` partitions the text at render time; `ContentView` feeds the reasoning into `AgentTimeline` (after any `priorSteps`) and the remainder to the markdown renderer. Things to preserve when touching this:
- It is a **display** transform. `content` still holds the original text, so editing, export, token counting, and re-sending are unaffected and **no store migration is involved**. Copy is the deliberate exception — it copies the answer, since pasting `<think>` tags into a document is the same bug in a different destination.
- Applied to **assistant messages only**. A user quoting a `<think>` tag means it literally.
- An unterminated block (still streaming, or a generation stopped mid-thought) must stay *reasoning* rather than leaking into the answer — that's why it's a scan and not a `String.replace`.
- `AgentTimeline` follows the thinking state on its **edges** (expand when thinking starts, collapse when it ends) so a reader's manual toggle survives in between.

Providers that stream reasoning in a *separate* field — `delta.reasoning` (OpenRouter) and `delta.reasoning_content` (DeepSeek, Qwen via vLLM) — are folded into the **same** representation: `useSubmit.ts` opens a `<think>` on the first reasoning delta and closes it when real content starts, so reasoning has one shape regardless of provider and `splitThinking` renders both. A stream that ends mid-thought gets its block closed after the read loop, so nothing is stored with a dangling tag. Because the reasoning lands inside `content`, this still needs **no** `MessageInterface` field and **no** migration.

Anthropic `thinking_delta` blocks fold into the same `<think>` representation. The app still never sends the `thinking` *parameter*, so Anthropic proper won't emit them — but an Anthropic-compatible local server (llama.cpp's `/v1/messages`, and the proxies in front of it) emits reasoning unasked, which is exactly the case that was silently dropped before. `signature_delta` and `input_json_delta` are deliberately still discarded: a signature over the reasoning and a tool-argument fragment are not content to display.

The non-streaming Anthropic path had the same blind spot in a worse form. It read `content[0].text`, and a reasoning model puts its thinking block *first*, so it didn't merely lose the reasoning — it threw "failed to retrieve data" on a perfectly good response. `foldAnthropicContent` in `helper.ts` walks the whole block array instead. Title generation deliberately does **not** use it: it takes the first `text` block only, because a chat named after the model's reasoning is its own bug.

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
