# Chatty Buddy

A browser-based chat workspace for OpenAI-compatible, Anthropic Messages, and Ollama APIs. React 19, TypeScript 6, Zustand 5, Tailwind 4 and Vite 8 build a static site and installable PWA. There is no application server or application account system.

## Run locally

Use **Node 22.12 or newer** and **pnpm 9.15.9** (the package-manager version is pinned).

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Open the URL printed by Vite. Choose the API protocol and endpoint in API settings. OpenAI normally requires a key; local Ollama/custom services can be keyless. A local endpoint must allow requests from the app's browser origin (CORS). Provider API contracts and model capabilities still apply when a service claims compatibility.

```sh
pnpm typecheck       # TypeScript validation
pnpm lint            # TypeScript validation plus unused declaration/parameter checks
pnpm test            # Deterministic Vitest regression suite; no paid provider calls
pnpm test:watch      # Watch regression tests
pnpm check           # Lint, tests and production build
pnpm audit           # Dependency advisory scan
pnpm build           # Production assets in dist/
pnpm preview         # Locally inspect dist/
```

Pull requests run the same checks. Main-branch deployment also runs tests and the dependency gate before publishing. Tests cover protocol framing/Unicode/errors, tool permissions, import/backup validation, storage failure, model-cache recovery, usage estimates and UI commit/discard behavior. Live provider/Google account tests are intentionally separate.

## Features and limits

- Streaming chat, Markdown/code/math rendering, reasoning traces and expandable tool activity.
- Text/image messages, message editing/reordering, chat cloning, folders and search.
- Reusable prompts, English/Vietnamese UI, light/dark themes and configurable keyboard behavior.
- Per-chat sampling, input context budget, optional output limit and protocol-specific capabilities.
- Model discovery from the configured endpoint, with OpenRouter metadata and a bundled catalog fallback; custom model metadata can override defaults.
- Versioned JSON conversation backups and optional Google Drive snapshot backups.
- Token/cost **estimates**, not billing records. Unknown rates and image costs are explicitly unknown; partial totals do not pretend to cover all usage. Check provider billing for authoritative spend.

The application does not provide managed multi-user accounts, shared team authorization, payment processing, ShareGPT publishing, or a server proxy. Message up/down controls reorder messages; they are not a response-branch history browser.

## Privacy and credentials

API keys are stored in this browser's origin storage and transmitted to the endpoint you select. Chat content is sent to that endpoint. Anyone with access to the browser profile/origin storage can potentially read it. Use a trusted browser and provider; public HTTPS is required for API endpoints, while local/private HTTP is permitted for development/LAN services.

The optional **Fetch URLs** capability sends requested URLs to `r.jina.ai` and sends the returned page text to the model. It is disabled by default and enforced again at execution. Reading external content may incur provider/tool costs. Remote images can contact their image host. Public model metadata/fonts may also be fetched externally.

Google authorization requests the `drive.file` scope; the access token is held in memory rather than persisted. Cloud documents exclude the model API key. Earlier versions could include that key in an initial backup: account owners should review existing Drive files/history and decide whether to remove old backups or rotate affected credentials. Updating this app does not rewrite historical Drive files or rotate keys automatically.

**Production builds reject `VITE_OPENAI_API_KEY`.** Enter keys in the browser instead of bundling them into a public static site. No build-time variable with a `VITE_` prefix can act as a server secret.

## Configuration

Copy `.env.example` only if build/development defaults are needed. All entries are optional.

| Variable                      | Meaning                                                                                                                                        |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_DEFAULT_API_ENDPOINT`   | Default model API endpoint                                                                                                                     |
| `VITE_OPENAI_API_KEY`         | Development-server default key only; rejected by production build                                                                              |
| `VITE_DEFAULT_SYSTEM_MESSAGE` | Default system text; an explicit empty value intentionally creates a blank prompt                                                              |
| `VITE_GOOGLE_CLIENT_ID`       | Public OAuth web client ID enabling Drive; configure authorized browser origins in Google separately                                           |
| `VITE_BASE_PATH`              | Optional deployment path with leading/trailing slashes, such as `/chatty-buddy/`; defaults to repository name in GitHub Actions or `/` locally |

Changing build variables requires rebuilding. Regular provider settings are changed within the application. `VITE_CUSTOM_API_ENDPOINT` is obsolete and unused.

## Storage, backup and recovery

Browser-local state remains authoritative while Drive is enabled. Writes must succeed locally before the corresponding store mutation is committed; storage errors preserve the editor draft. The local persisted document is versioned and migrated at startup. Transient notifications/generation state are not durable data.

Drive uses immutable snapshot files rather than overwriting a shared mutable conversation file. This avoids destructive last-writer-wins updates between devices. Disconnection/logout leaves local conversations intact. Divergent remote/local conversations are retained rather than silently overwriting one another. A pending/failed sync does not mean the local write failed. Do not close the tab expecting an unfinished network upload to finish; reconnect to synchronize locally saved changes.

Snapshot history consumes Drive space. Automatic deletion of historical backups is intentionally avoided; review and remove obsolete snapshots in Drive after checking the backup you intend to retain. Cloud backup is not end-to-end encrypted and does not remove browser storage limits. Keep periodic downloaded backups for important conversations.

Use **Import / Export** for versioned JSON backup/restore. Per-chat downloads use the same format as bulk exports. Import validation is bounded and rejects malformed content/graphs before state mutation; legacy supported formats are normalized. Back up before migrations or storage cleanup. Repair/migration controls operate on validated documents rather than forcing a magic future version.

If storage is full, export conversations, remove unneeded data deliberately, and retry. Image count/size limits reduce quota pressure but do not guarantee available browser capacity. If model discovery fails, check the endpoint/CORS settings; corrupt catalog caches are discarded and network/bundled fallback is attempted.

## Architecture

```text
src/main.tsx → App.tsx → components + Zustand slices
                              ↓
                   useSubmit → protocol adapters → selected provider
                       ↓              ↓
                stable chat/message IDs + stream parser
                       ↓
              durable local storage → optional Drive snapshots
```

- `src/api/`: protocol request/response transformations and Drive HTTP operations.
- `src/hooks/useSubmit.ts`, `src/utils/generation.ts`: request lifetime, stable mutation targets, bounded tools, stream framing and cancellation.
- `src/store/`: state slices, persistence and migrations.
- `src/utils/import.ts`: validated conversation import/export contracts.
- `src/utils/modelCatalog.ts`, `modelReader.ts`, `endpointModels.ts`: guarded metadata/discovery.
- `src/components/`: chat workspace, navigation, settings, prompt library, shared dialogs/buttons.
- `src/main.css`: semantic theme/shape/elevation tokens; reuse these for UI changes.
- `public/locales/en-US`, `public/locales/vi-VN`: mirrored UI translations.
- `public/models.json`: authoritative bundled model snapshot.
- `tests/`, `src/**/*.test.*`: deterministic regression tests.

Input-history budget (`max_tokens`) and output limit (`output_tokens`) are different concepts. Tools are enforced against the capabilities captured at request start. Cancellation covers nested generation/title requests. Third-party API rejection and network interruption must remain visible as recoverable states.

## Deployment

### Static hosting / GitHub Pages

Build and serve `dist/`. The Pages workflow derives its path from the repository name. Set `VITE_BASE_PATH=/` for a custom-domain root or an explicit subpath for other hosting. Configure Google origins and browser CORS independently. Verify hosting security/cache headers, service-worker updates and offline behavior in the deployed environment.

### Docker

```sh
docker compose build
docker compose up -d
```

Browse `http://localhost:5173`. The multi-stage build retains only static assets in an unprivileged Nginx runtime on port 8080, with a `/healthz` check, compression, immutable hashed-asset caching and security headers. Base images are digest-pinned; refresh digests deliberately for security updates. Browser-facing secrets must not be passed as build arguments or bundled environment values.

The Docker runtime does not proxy model APIs. CORS and HTTPS/LAN constraints are still browser concerns. Docker daemon availability is required to build/test the image.

## Updating the model snapshot

```sh
node sortModelsJsonKeys.js
```

This fetches the public OpenRouter catalog, validates the response and writes sorted data directly to `public/models.json`. The root `models.json`, if present in an older working directory, is an ignored legacy download artifact, not a second authoritative catalog. Review the resulting diff and run checks. The updater does not bump package versions.

## Contribution and verification

Read `CLAUDE.md` for provider-specific behavior and local conventions. Persisted-schema changes require explicit migration/defaulting. Add a regression for bugs at the relevant boundary; do not use real API credentials in fixtures. UI changes should preserve shared primitives, keyboard access, visible labels, dark/light tokens and small-screen behavior.

`PROJECT_AUDIT.md` preserves the original audit evidence. `AUDIT_REMEDIATION.md` records the implemented corrections, verification and remaining external checks. Passing deterministic tests is not certification of Google OAuth configuration, every provider/model combination, screen-reader conformance or production infrastructure.

## License

A project-wide license has not been supplied in this repository. The earlier MIT badge did not link to an existing license and has been removed; the owner must establish the intended project license. `src/fonts/LICENSE.txt` applies to the bundled font material only.
