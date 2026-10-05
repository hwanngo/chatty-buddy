# Project Audit Report

## 1. Executive Summary

Chatty Buddy is a single-page, browser-only React chat client. It calls OpenAI-compatible, Anthropic-compatible, and Ollama endpoints directly from the browser, persists conversations and an API key in Zustand/localStorage, and offers optional Google Drive sync. There is no application server, database, tenant model, queue, or server-side authorization layer. The deployment target is static hosting (GitHub Pages); Docker also serves the compiled app.

**Revision scope:** This report audits the clean committed revision 7d3a922bde32727eb23852bc873ceed3314da909 as observed at the start. During final verification, another process changed many source/configuration files and added tests in the shared working tree. Those subsequent uncommitted changes were not part of this audit; findings may already be addressed there and require revalidation before assigning remediation work.

The immediate risks are concentrated in Drive sync and first use. Initial Drive file creation uploads the stored API key despite a separate update path attempting to remove it. New Drive files also use a different JSON shape from the shape expected by the sync storage adapter. First-run setup requires a nonempty API key even when the user selects a keyless local endpoint. These are code-confirmed findings, not inferred from file names.

The build succeeds, but there is no test, lint, or typecheck script beyond the TypeScript check embedded in build. The production dependency audit reports three transitive advisories whose known triggering inputs appear build-tool oriented; their practical exposure in this client is unproven. The generated entry JavaScript is large. The code does show deliberate endpoint validation, Markdown URL filtering, bounded tool rounds, a shared color-token system, and partial accessibility work.

**UI assessment limit:** Taste Skill was not installed or discoverable, and no browser control surface was available. The local Vite server returned HTTP 200, but no screen was rendered for inspection. This report makes no Taste Skill finding or visual-runtime claim. Source-confirmed interface defects and specific manual checks are recorded separately.

**Priority:** stop secret upload and repair Drive serialization first; then fix keyless onboarding and add regression tests for the chat, import, and sync paths.

## 2. Audit Scope & Methodology

### Engineering Audit Methodology

Inspected the tracked application layout, manifests, lockfile, README, environment template, Vite and TypeScript configuration, Docker and Compose files, GitHub Pages workflow, React entry points, Zustand slices, chat submit/stream parsing, provider adapters, URL and tool handling, imports, Drive sync, major UI components, and design tokens. Traced user input → chat state → provider request → stream/tool handling → persisted state → displayed response. Traced Drive login → file discovery/create → storage switch → rehydration/update. Searched for tests, unsafe DOM APIs, storage, credentials, TODOs, timers, object URLs, and alternative safeguards before reporting.

Commands: git status/branch/revision, rg inventory/searches, pnpm build, pnpm audit --prod --audit-level moderate, and curl -I against the local dev server. The repository was clean at the start. Subsequent concurrent working-tree changes were not analyzed or made by this auditor. The only intentional edit from this audit is this report.

### Security Audit Methodology

Reviewed the browser trust boundary, user-configured endpoint validation, provider request headers, imported data, Markdown/image handling, local secret persistence, OAuth/Drive calls, third-party page-reader tool, static deployment, CI permissions, and dependency scan applicability. Authentication/authorization findings are scoped to actual provider and Drive integration; this app has no local user accounts or protected application API. No live credentials or production services were used. Secret values are omitted.

### Taste Skill UI/UX Methodology

Taste Skill **unavailable**. It was absent from the session's installed-skill catalog and local skill search. Therefore it could not be loaded or followed. The requested Taste-based visual, responsive, and interaction review remains outstanding. Fallback review used only source and component behavior; it is labeled as such throughout. No finding below is attributed to Taste Skill.

### Runtime / Browser Inspection Performed

The repository's Vite development server started on 127.0.0.1:5173 and returned HTTP 200. The installed agent-browser skill was read, but its CLI was not installed (command not found). Computer-use returned no browser and a service-startup error. No visual screen, viewport, keyboard journey, OAuth session, provider request, or screen-reader session was inspected. Runtime UI findings: **none**.

## 3. Repository Overview

| Concern | Implementation |
|---|---|
| Purpose | Personal multi-provider AI chat client and PWA |
| Runtime | Browser JavaScript; Vite static assets |
| Frontend | React 19, TypeScript 6, Tailwind 4, CSS tokens |
| State | Zustand slices; persist middleware to localStorage |
| Provider APIs | Direct browser fetch to OpenAI-compatible, Anthropic-compatible, Ollama |
| Other integrations | OpenRouter model catalog, Jina page reader, Google OAuth/Drive, ShareGPT |
| Data | LocalStorage chat/settings; optional Drive JSON file; no app database |
| Tests | No tracked automated test suite or test script found |
| Deployment | GitHub Pages action; optional Docker static server |

The meaningful route is the single application shell at /. Screens are dialogs/panels within that route, not separate router paths.

## 4. System Architecture

main.tsx waits for i18n initialization, registers the service worker, and mounts App.tsx. App initializes a chat, handles legacy localStorage migration, tracks model-list readiness, and renders Menu plus Chat. The menu exposes chat history, settings, API setup, import/export, and optional Drive sync. ChatContent renders message history and the composer. EditView writes a user turn into the store; useSubmit adds an assistant placeholder, trims context with limitMessageTokens, calls the selected provider in src/api/api.ts, parses streaming data in src/api/helper.ts, writes each chunk to the Zustand store, optionally runs client-side fetch_url through Jina, then optionally generates a title. Store persistence writes the selected state to localStorage. GoogleSync can switch the persist storage adapter to a Drive file.

There are no controllers, middleware, migrations for a database, workers, cron jobs, or server-side REST endpoints in this repository. Provider API contracts and Drive API contracts are the significant APIs.

## 5. Architecture Assessment

Provider-specific transport is mostly centralized in src/api/api.ts, while shared state behavior is distributed across components and useSubmit. The biggest coupling is the global chat-array index: async generation, rendering, edits, deletion, and model fallback all address a mutable currentChatIndex. Several paths clone the entire chat collection with JSON serialization. This makes streaming cost grow with conversation history and makes cross-tab/local-cloud reconciliation difficult. The Drive persistence integration has no explicit versioned file contract or conflict policy. The source itself documents an import cycle around modelLoader.ts:137-149; it uses delayed initialization to make the cycle work, which increases maintenance risk.

## 6. Critical Findings

None confirmed. The Drive credential exposure is High because it sends a credential into the user's own Google Drive account, and the exact onward-access consequences depend on that account's sharing and connected apps.

## 7. High-Severity Findings

### AUDIT-SEC-001 — Initial Drive backup includes the model-provider API key

**Severity:** High. **Confidence:** High. **Category:** Security / Secrets. **Effort:** Small.

**Location:** src/store/store.ts:28-56; src/utils/google-api.ts:18-28; src/components/GoogleSync/GoogleSync.tsx:44-49,125-130; src/store/storage/GoogleCloudStorage.ts:45-49.

**Evidence and behavior:** createPartializedState includes apiKey. stateToFile serializes that entire object. Both first-file creation and the explicit “create” action call createDriveFile(stateToFile()). Only the later GoogleCloudStorage.setItem path strips apiKey. Thus a user who enables Drive sync with a configured API key creates a Drive JSON file containing that key. It can remain in the initial file until a successful sanitized update, and additional created files take the same unsafe path.

**Impact/scenario:** A model-provider credential is copied from browser storage into Drive, widening who or what can access it through file sharing, backups, or other Drive-authorized software. **Recommendation:** use one shared serializer that excludes apiKey for every create/update path; verify existing backups and provide users a way to replace exposed credentials. Never log or include the secret in diagnostics.

### AUDIT-DATA-001 — New Drive files do not match the persistence reader's data contract

**Severity:** High. **Confidence:** High. **Category:** Data integrity / Sync. **Effort:** Medium.

**Location:** src/utils/google-api.ts:18-28; src/store/store.ts:58-75; src/store/storage/GoogleCloudStorage.ts:23-33; src/components/GoogleSync/GoogleSync.tsx:60-64.

**Evidence and behavior:** Zustand persist storage expects a StorageValue envelope containing state and version. The adapter's setItem receives and uploads that envelope. stateToFile instead uploads only the raw partialized state object. The adapter's getItem casts a fetched file to StorageValue and passes it to persist.rehydrate without parsing or validating the envelope. Therefore a newly created file cannot be rehydrated through the same contract as an updated one.

**Impact/scenario:** First sync or switching to a newly created backup may appear to succeed while failing to restore chats/settings, and subsequent writes may overwrite a backup with unexpected data. **Recommendation:** define and validate a versioned Drive document schema, serialize create and update identically, add a migration for legacy raw-state files, and exercise create → reload → restore before release.

### AUDIT-LOGIC-001 — First-use setup blocks keyless local providers

**Severity:** High. **Confidence:** High. **Category:** Core workflow / Onboarding. **Effort:** Small.

**Location:** src/components/ApiMenu/FirstVisitApiSetup.tsx:13-23; src/components/ApiMenu/ApiMenu.tsx:45-58; src/hooks/useSubmit.ts:158-164; src/components/Chat/ChatContent/Message/View/EditView.tsx:243-251.

**Evidence and behavior:** The first-visit dialog opens when no API key exists. ApiMenu.handleSave rejects every empty key in firstRun mode, regardless of API type or endpoint. In contrast, the send path requires a key only for the official OpenAI endpoint and intentionally supports keyless local endpoints. A new Ollama/local-server user cannot save the valid configuration from onboarding; closing the dialog is the only escape.

**Impact/scenario:** A supported primary workflow is blocked at first use. **Recommendation:** validate the key according to selected endpoint/protocol, allow an empty key for local endpoints, and validate the endpoint before closing the dialog.

## 8. Medium-Severity Findings

### AUDIT-DATA-002 — Drive rehydration has no merge or conflict safeguard

**Severity:** Medium. **Confidence:** Medium. **Category:** Sync / Data integrity. **Effort:** Medium.

**Location:** src/components/GoogleSync/GoogleSync.tsx:37-64,171-179; src/store/storage/GoogleCloudStorage.ts:24-38; src/store/store.ts:58-75.

**Evidence:** On login the code selects an existing file (or creates one), switches the entire Zustand persistence storage to Drive, and immediately calls rehydrate. Selecting another file calls rehydrate again. There is no comparison with local chats, backup, conflict prompt, or revision check. **Impact:** a valid older cloud snapshot can replace newer local state in memory; edits from multiple tabs/devices can be last-writer-wins. **Recommendation:** snapshot local state before switching, show source dates/counts, offer merge/replace choices, and use revision or ETag checks for writes. Verify exact Zustand merge behavior with an integration test.

### AUDIT-SEC-002 — Persistent API key is readable by any same-origin script

**Severity:** Medium. **Confidence:** High. **Category:** Security / Data protection. **Effort:** Large.

**Location:** src/store/store.ts:28-32,58-75; src/store/auth-slice.ts:28-35; src/components/ApiMenu/ApiMenu.tsx:166-177.

**Evidence:** The API key is stored in the persistent Zustand state under localStorage. This is a documented product choice, but all same-origin JavaScript can read localStorage. The API settings input also uses type=text. **Impact:** any future same-origin script compromise or shared-browser access exposes the provider key. **Recommendation:** document the threat boundary prominently; offer session-only credential storage and a reveal/hide control. For a multi-user hosted product, move secret-bearing requests to a server-side credential boundary. This is not evidence of an existing XSS exploit.

### AUDIT-LOGIC-002 — Auto-title assumes the penultimate message is the user turn

**Severity:** Medium. **Confidence:** High. **Category:** Logic / Tool flow. **Effort:** Small.

**Location:** src/hooks/useSubmit.ts:621-657,675-704.

**Evidence:** A tool round stores assistant-with-tool-calls and tool messages before the final assistant answer. Auto-title then reads messages[length-2] as user_message. After a tool call, that item is a tool result. The title request omits the user's original question and can be dominated by fetched page content. A title request error is caught by the outer submit catch after the answer already completed. **Recommendation:** derive a title from the most recent user turn and final answer; handle title failure independently from chat completion.

### AUDIT-LOGIC-003 — Failed generation leaves an empty assistant turn

**Severity:** Medium. **Confidence:** High. **Category:** Reliability / Error UX. **Effort:** Small.

**Location:** src/hooks/useSubmit.ts:166-181,720-728; src/components/Chat/ChatContent/ChatContent.tsx:202-208.

**Evidence:** handleSubmit persists an empty assistant placeholder before network/token validation. On failure, catch sets a transient error and finally clears generating; it does not remove or mark the empty turn. **Impact:** history contains a response that never existed, and subsequent retries/context can include it. **Recommendation:** use a pending message status, then either commit a response or remove/mark the failed placeholder; offer retry beside the failed turn.

### AUDIT-API-001 — Provider requests have no application timeout

**Severity:** Medium. **Confidence:** High. **Category:** API / Resilience. **Effort:** Small.

**Location:** src/api/api.ts:22-34,210-228,273-314; src/hooks/useSubmit.ts:181-183,357-358; src/utils/endpointModels.ts:7-8,175-179.

**Evidence:** Chat requests use only the user-stop AbortSignal; no timeout or idle-stream deadline is applied. The model-list probe separately uses an eight-second timeout, showing that timeout behavior is available but not used for chat. **Impact:** a stalled provider can leave generation indefinitely busy until the user stops it. **Recommendation:** add configurable connect and idle timeouts with a clear retry state; preserve user abort semantics.

### AUDIT-DATA-003 — Imported conversations are only shallowly validated

**Severity:** Medium. **Confidence:** High. **Category:** Input validation / Data integrity. **Effort:** Medium.

**Location:** src/utils/import.ts:22-83,91-108; src/components/ImportExportChat/ImportChat.tsx:125-181,217-243; src/components/Menu/ChatHistoryList.tsx:52-57,89-92.

**Evidence:** validateMessage accepts any array for content without checking each block's type/shape or requiring a text part. validateAndFixChatConfig does not constrain numeric ranges and tests only type. validateFolders checks values but not that chat.folder points to an existing folder. The history list dereferences folders[chat.folder].name and can throw for an orphan reference. **Impact:** a syntactically valid import can crash rendering or produce malformed provider requests. **Recommendation:** validate nested content and cross-references before state mutation; reject or repair orphan folder IDs and impossible configuration ranges.

### AUDIT-PERF-001 — Every stream chunk serializes and persists the whole chat collection

**Severity:** Medium. **Confidence:** High. **Category:** Performance / State management. **Effort:** Medium.

**Location:** src/hooks/useSubmit.ts:55-66,477-486,564-574; src/store/store.ts:28-75.

**Evidence:** Each streamed text chunk calls JSON.stringify/parse on all chats, then setChats; Zustand persist writes the entire partialized state, including chats, on each state change. **Impact:** large histories and embedded images amplify CPU, allocation, localStorage writes, and main-thread jank as the answer streams. **Recommendation:** update by stable chat ID with localized immutable changes; buffer stream tokens and persist on a short cadence or at completion.

### AUDIT-PERF-002 — Large eagerly loaded startup assets

**Severity:** Medium. **Confidence:** High. **Category:** Performance / Build. **Effort:** Medium.

**Location:** src/main.tsx:1-9; src/utils/messageUtils.ts:12-23; package.json; build output.

**Evidence:** pnpm build emitted an entry JS chunk of 1,656.21 kB (501.86 kB gzip), a cl100k_base chunk of 1,090.82 kB (509.99 kB gzip), and a 1,073.36 kB WASM asset (409.92 kB gzip). The tokenizer JSON is loaded at module evaluation and the entry awaits KaTeX CSS and i18n before mount. Vite warns about chunks over 500 kB. **Impact:** slower first use on mobile/slow networks. **Recommendation:** measure route startup, then defer token counting, export, syntax highlighting, and other heavy features until needed.

### AUDIT-ACCESS-001 — Settings dialog lacks the modal behavior implemented elsewhere

**Severity:** Medium. **Confidence:** High. **Category:** Accessibility. **Effort:** Small.

**Location:** src/components/SettingsMenu/SettingsMenu.tsx:79-103; src/components/Dialog/Dialog.tsx:48-105.

**Evidence:** Settings renders a custom portal with backdrop and panel but no role=dialog, aria-modal, labeled dialog relationship, focus entry/return, Escape handling, or Tab containment. The shared Dialog implements those behaviors. **Impact:** keyboard and screen-reader users may move behind an open settings panel or lose context. **Recommendation:** render Settings through the shared Dialog or add equivalent semantics and focus management; verify with keyboard and a real screen reader.

### AUDIT-UX-001 — Sync can report success before restore is verified

**Severity:** Medium. **Confidence:** High. **Category:** Fallback UX / Feedback. **Effort:** Small.

**Location:** src/components/GoogleSync/GoogleSync.tsx:171-179; src/store/storage/GoogleCloudStorage.ts:24-38.

**Evidence:** The confirm action awaits rehydrate and then unconditionally shows a success toast and closes the dialog. The adapter catches getItem errors and returns null after displaying an error toast. Thus the UI can show both error and success, while state remains unsynced. This is source-confirmed fallback review, not a Taste Skill finding or browser observation. **Recommendation:** return a typed sync result, keep the dialog open on failure, and identify which file/source is active.

### AUDIT-TEST-001 — Critical workflows have no automated regression coverage

**Severity:** Medium. **Confidence:** High. **Category:** Testing. **Effort:** Medium.

**Location:** package.json scripts; repository file inventory; .github/workflows deployment workflow.

**Evidence:** No test or spec files and no test script were found. CI executes install and build only. The observed Drive serialization mismatch, onboarding condition, parser paths, import validation, and tool-round title logic have no repository tests. **Recommendation:** add focused tests for serialization round trips, keyless setup, import rejection, streaming/tool continuations, cancellation, and error-state cleanup; run them in CI.

## 9. Low-Severity Findings

### AUDIT-DEP-001 — Transitive dependency advisories need scoped upgrade

**Severity:** Low. **Confidence:** Medium. **Category:** Dependencies. **Effort:** Small.

**Location:** pnpm-lock.yaml; package.json dependency react-scroll-to-bottom.

**Evidence:** pnpm audit --prod --audit-level moderate returned two High advisories for browserslist 4.28.2 and one Moderate for baseline-browser-mapping 2.10.21 through react-scroll-to-bottom → Emotion → Babel. The described triggers involve Browserslist query/custom-stat processing or invalid mapping input; this audit did not establish a path from chat content to those APIs in the shipped browser client. **Recommendation:** update the transitive chain and rescan; do not present scanner severity as app severity without a reachable path.

### AUDIT-TECH-001 — Resize listener is never removed

**Severity:** Low. **Confidence:** High. **Category:** Resource management. **Effort:** Small.

**Location:** src/components/Menu/Menu.tsx:57-66.

**Evidence:** An anonymous resize listener is added in an effect without cleanup. StrictMode can run mount cleanup/re-mount during development, leaving duplicate listeners. **Recommendation:** give the handler a stable reference and remove it in effect cleanup.

### AUDIT-TECH-002 — Uploaded image object URLs are not revoked

**Severity:** Low. **Confidence:** High. **Category:** Memory management. **Effort:** Small.

**Location:** src/components/Chat/ChatContent/Message/View/EditView.tsx:111-136.

**Evidence:** createObjectURL is called for every selected image, then the blob URL is fetched and converted to base64; revokeObjectURL is never called. **Impact:** repeated uploads retain browser resources until the document closes. **Recommendation:** revoke each object URL in a finally block, or read File objects directly with FileReader.

### AUDIT-DOC-001 — README contains stale implementation and runtime guidance

**Severity:** Low. **Confidence:** High. **Category:** Documentation / DX. **Effort:** Small.

**Location:** README.md Tech Stack/Key Dependencies/Project Structure/Quick Start; package.json; Dockerfile.

**Evidence:** README lists jspdf and react-toastify as key dependencies although neither is in package.json, and refers to old component names/paths such as ChatInput, ApiPopup, PopupModal, and ShareGPT that do not appear in the current file inventory. Quick Start says Node 18+ while CI uses Node 22 and the current Vite/TypeScript toolchain should be documented against its tested runtime. **Recommendation:** regenerate dependency, tree, and supported-runtime guidance from the current repository.

## 10. Security Audit

### Authentication

There is no first-party account system. Provider authentication is an API key placed in Authorization or x-api-key headers (src/api/api.ts:173-181,324-329); Google uses browser OAuth access tokens (src/components/GoogleSync/GoogleSyncButton.tsx:19-31). Google tokens are kept out of the persisted cloud-auth partialization (src/store/cloud-auth-store.ts:18-23), a positive boundary. Token expiry is handled indirectly through API errors, not refresh. No password/MFA/reset paths exist here.

### Authorization

No first-party object or tenant authorization is applicable. Google Drive API authorization depends on the user's OAuth token and drive.file scope. The client cannot enforce access to files after Drive grants them. No IDOR/BOLA finding is justified for this static app. Drive list results are not filtered to this application's filename in src/api/google-api.ts:72-94; because drive.file scope limits visibility to app-created files, this is an integration question to verify, not a proven authorization bug.

### Input Validation

Endpoint URLs are restricted to HTTP(S), and public plaintext HTTP is refused in src/utils/url.ts:64-81. The fetch_url tool parses an absolute HTTP(S) URL, caps returned text at 20,000 characters, and caps tool rounds at three (src/utils/tools.ts:105-127,216-223; src/hooks/useSubmit.ts:12-18). Import validation remains shallow (AUDIT-DATA-003). File selection filters MIME prefix image/ but sets no size limit (EditView.tsx:111-136); large images can exhaust storage or memory. This warrants a size limit and failure-state test, though a severe exploit is not established.

### API Security

The only outgoing API groups are provider completions/models, Drive files, OpenRouter catalog, Jina reader, and ShareGPT. No own HTTP server or CORS/header policy exists in this repository. User-selected endpoints intentionally receive the configured key on send; the UI warns for a third-party OpenAI-compatible endpoint, but that warning uses substring checks (ApiMenu.tsx:131-163), so it is educational rather than an origin allowlist. src/api/api.ts:22-58 converts network/provider failures into user-facing text; request timeout is missing (AUDIT-API-001). ReactMarkdown uses its normal escaping and a URL transform (ContentView.tsx:188-219); no dangerouslySetInnerHTML use was found in source.

### Secrets

No committed live credential was identified in inspected configuration. .env.example contains blank placeholders and explicitly warns about VITE_OPENAI_API_KEY; Vite-prefixed values are public bundle content. LocalStorage API key persistence is an explicit product tradeoff (AUDIT-SEC-002). Initial Drive upload violates the later sanitization intent (AUDIT-SEC-001). This report prints no actual secret.

### Data Protection

Conversations and image data live in localStorage and optional Drive JSON. The app has no server-side retention/encryption policy. Jina fetch_url discloses requested URLs to a third party when enabled; the source documents the privacy tradeoff and ships it off by default (src/utils/tools.ts:12-24). Cloud restore/conflict handling is the main integrity gap.

### Infrastructure Security

GitHub Actions use explicit contents/read and Pages write/id-token permissions and commit-pinned actions. Docker switches to a non-root user. No CSP, security-header configuration, or static-host policy is defined in the repo; actual GitHub Pages headers need deployment inspection before assigning a defect. No Terraform/Kubernetes/cloud resource configuration is present.

## 11. Business Logic & Application Flow

**New chat:** App initializes a default chat; empty state offers suggestions; EditView or suggestion writes a user turn; useSubmit validates the official endpoint key, appends a placeholder, trims tokens, sends a provider request, parses a stream, then optionally titles. Failure leaves the placeholder (AUDIT-LOGIC-003). First-run setup conflicts with the keyless send policy (AUDIT-LOGIC-001).

**Tool call:** When fetch_url is enabled, OpenAI-compatible or Ollama model tool calls are accumulated, executed via Jina, stored as tool messages, and sent in another round. Rounds are capped. Subsequent auto-title uses the wrong turn after tools (AUDIT-LOGIC-002). The tool's source text is untrusted material returned to the model; no browser-side privileged action beyond the reader request is evident.

**Import/export:** FileReader parses JSON, detects format, validates/fixes some fields, and prepends imported chats. Quota failures attempt rollback. Missing nested/cross-reference validation can admit records that the UI assumes are well-formed (AUDIT-DATA-003).

**Drive:** OAuth token → file list → create/select → persist storage replacement → rehydrate → debounced writes. Initial create and subsequent update disagree on both secret filtering and envelope format (AUDIT-SEC-001, AUDIT-DATA-001), while selection has no conflict policy (AUDIT-DATA-002).

## 12. Backend Audit

No backend application exists in this repository. The browser is the API client, so backend-specific controller, middleware, database, job, transaction, rate-limit, and health-check assessments do not apply. Provider and Google service behavior is outside this audit. Docker's serve process only hosts static files.

## 13. Frontend Engineering Audit

Zustand slices create a reasonably clear preference/chat/auth separation. However, most conversation mutations clone whole arrays in components, global currentChatIndex is used by long-lived async work, and store persistence writes frequently. ChatContent also derives token-limited messages during render (ChatContent.tsx:59-63) and its effect can repeatedly warn about hidden messages as message references change (133-147). These are concrete state/performance maintenance risks; a browser performance trace is needed for impact sizing. The shared Dialog has focus containment, while Settings duplicates modal markup without it. Data fetching and model loading are centralized enough to locate but depend on module-level mutable tables and a documented import cycle.

## 14. Taste Skill UI/UX Audit

**Taste Skill status:** unavailable; no Taste evaluation or rating was performed. The following is a source-only fallback assessment. Visual hierarchy, actual color contrast, layout quality, motion, responsiveness, and overall polish remain unverified.

### Overall Product Experience

The product has a direct chat-first shell, example prompts, provider setup, and visible generation activity in source. The keyless onboarding blocker and misleading sync success state damage confidence in important journeys.

### Visual Hierarchy

Not visually inspected. Source shows explicit primary/neutral button variants and CSS color tokens; actual hierarchy at mobile/desktop sizes requires a Taste review.

### Navigation & Information Architecture

One route uses a persistent/resizable sidebar with chat search, folders, and footer actions (Menu.tsx, ChatHistoryList.tsx). Source alone cannot establish discoverability or density.

### Interaction Design

Chat actions, dialogs, edit modes, and confirmations exist. Google file rows use clickable divs for edit/delete/confirm (GoogleSync.tsx:294-335), creating a statically confirmed keyboard access defect and weak action semantics.

### Forms & Input UX

API type, endpoint, version, and key are in one dialog. Three visible labels are separate siblings rather than htmlFor-linked labels; the text inputs have no id or aria-label (ApiMenu.tsx:108-190). Error feedback is a toast rather than an inline field error. Keyless setup contradicts allowed configurations.

### Feedback & System Status

Streaming has a loader, timer, stop control, and caret; toasts announce errors. Sync confirmation can display success after a failed read (AUDIT-UX-001). No rendered timing/feedback quality was inspected.

### Empty / Loading / Error States

Empty chat suggestions and streaming status exist in source. A failed provider request leaves an empty assistant turn and a five-second toast (AUDIT-LOGIC-003), without a durable in-thread recovery action.

### Design-System Consistency

main.css defines light/dark color roles, type families, radii, shadows, and reduced-motion behavior. Shared Button, Dialog, Select, Toggle, and Icon primitives exist, but Settings duplicates Dialog and Google file actions use custom div controls. A visual consistency judgment requires Taste/runtime inspection.

### Responsive Experience

Source uses md breakpoint to switch a fixed sidebar into a mobile drawer (Chat.tsx:12-23; Menu.tsx:93-99) and a one/two-column empty-state grid (EmptyState.tsx:29-43). No mobile, tablet, normal, or wide viewport rendered. Overflow, touch targets, and modal fit are manual verification items.

### Product Polish

The code contains deliberate theme tokens, activity feedback, and localized content. Actual typography, spacing, perceived speed, and finish cannot be scored from source.

## 15. Screen-by-Screen Taste Review

These entries are **fallback source inspections**, not Taste Skill reviews and not runtime confirmations. All are on route /.

### Screen: First-use API setup

**Purpose:** connect a model endpoint. **Taste Skill findings:** none; skill unavailable. **Source-confirmed interaction:** keyless local configuration cannot be saved (AUDIT-LOGIC-001); input labels are not programmatically tied to fields (ApiMenu.tsx:108-190). **Responsive:** unverified. **Relevant implementation:** FirstVisitApiSetup.tsx, ApiMenu.tsx, Dialog.tsx. **Recommended change:** endpoint-aware validation and accessible field labels, then run desktop/mobile Taste review.

### Screen: Chat empty state and conversation

**Purpose:** begin and continue a chat. **Taste Skill findings:** none. **Source-confirmed interaction:** suggestions submit directly; failed generation leaves an empty assistant message (AUDIT-LOGIC-003). **Responsive:** grid and mobile drawer breakpoints exist; visual result unverified. **Relevant implementation:** EmptyState.tsx, ChatContent.tsx, EditView.tsx, useSubmit.ts. **Recommended change:** durable failed-turn state/retry and viewport/keyboard testing.

### Screen: Sidebar history and folders

**Purpose:** find, organize, switch, and delete chats. **Taste Skill findings:** none. **Source-confirmed interaction:** an imported chat with an orphan folder ID can break history rendering (ChatHistoryList.tsx:52-57). **Responsive:** overlay drawer is source-confirmed, behavior unverified. **Relevant implementation:** Menu.tsx, ChatHistoryList.tsx, ChatHistory.tsx, ChatFolder.tsx. **Recommended change:** validate folder references and test search/selection/mobile drawer.

### Screen: Settings

**Purpose:** adjust behavior, appearance, models, and destructive actions. **Taste Skill findings:** none. **Source-confirmed interaction/accessibility:** custom modal lacks shared Dialog's focus and semantics (AUDIT-ACCESS-001). **Responsive:** max-height scrolling exists in source; fit unverified. **Relevant implementation:** SettingsMenu.tsx, Dialog.tsx, main.css. **Recommended change:** use the shared modal contract and perform keyboard/mobile review.

### Screen: Import/export

**Purpose:** back up and restore chats. **Taste Skill findings:** none. **Source-confirmed interaction:** imported nested data can pass incomplete validation (AUDIT-DATA-003); quota rollback path exists. **Responsive:** unverified. **Relevant implementation:** ImportChat.tsx, ExportChat.tsx, import.ts. **Recommended change:** validate whole documents and test invalid/quota states.

### Screen: Google Drive sync

**Purpose:** select/create a cloud backup and sync. **Taste Skill findings:** none. **Source-confirmed interaction:** success may be shown despite failed read (AUDIT-UX-001); file actions are non-semantic divs (GoogleSync.tsx:294-335). **Responsive:** unverified. **Relevant implementation:** GoogleSync.tsx, GoogleSyncButton.tsx, GoogleCloudStorage.ts. **Recommended change:** honest result feedback, semantic controls, and explicit conflict resolution.

## 16. Critical User Journey Review

| Journey | Source-confirmed result | Taste/runtime status |
|---|---|---|
| First launch → choose Ollama/keyless endpoint → save → first chat | Save is blocked by mandatory firstRun key check | Not rendered |
| Compose → provider request → streamed answer → title | Normal transport implemented; failure leaves placeholder; tool round can title from tool result | Provider responses not exercised |
| Import backup → render history → open chat | Shallow validation can admit orphan folders/malformed content | No imported file exercised |
| Sign in to Drive → create/select file → sync/reload | Initial file includes API key and wrong envelope; restore conflict unhandled | OAuth not exercised |
| Open settings → change preference → close | Source supports preferences; custom modal lacks focus contract | Keyboard and visual behavior untested |

## 17. Accessibility Audit

**Statically confirmed:** Settings modal lacks dialog semantics/focus management (AUDIT-ACCESS-001). GoogleSync file actions are div click targets with no keyboard role/tabindex/labels (GoogleSync.tsx:294-335). ApiMenu input labels lack explicit association (ApiMenu.tsx:108-190). BaseButton uses md:invisible until group hover (BaseButton.tsx:13-18); verify whether keyboard focus makes those actions visible.

**Positive static evidence:** shared Dialog implements initial focus, focus return, Escape, and Tab wrapping (Dialog.tsx:48-90); Toast uses alert/live regions (Toast.tsx:37-69); reduced-motion CSS covers the loader, shimmer, and caret (main.css:69-90); some icon buttons have accessible names.

**Manual assistive-technology checks:** tab through all controls, inspect focus visibility on message actions, test Settings and Drive dialogs with VoiceOver/NVDA, confirm live-stream announcements are usable rather than overwhelming, and measure contrast. No WCAG conformance claim is made.

## 18. Database & Data Integrity

No database, ORM, schema, indexes, or migrations exist. LocalStorage and Google Drive JSON are the persistence layers. The meaningful integrity issues are the Drive document contract, cloud/local conflict policy, and imported nested/cross-reference validation. Zustand migrations exist for older local persisted state (src/store/migrate.ts:22-49), a useful safeguard, but cloud files lack a validated schema and migration contract.

## 19. API Design

The repository exposes no first-party API endpoints. Provider requests use POST completions/messages/chat; model discovery uses GET; Drive uses GET/POST/PATCH/DELETE. Provider response shapes are adapted within src/api/api.ts and src/api/helper.ts. Error shaping is partly centralized through safeFetch/cleanErrorText; Drive methods each throw status text and getDriveFile does not check response.ok before parsing JSON (src/api/google-api.ts:47-63). A failed Drive HTTP response can therefore be treated as a JSON document and fed to rehydrate; add status/content validation. No idempotency key or ETag protection is used for Drive create/update, which contributes to duplicate files and last-writer-wins behavior.

## 20. Performance

The largest measured costs are startup assets (AUDIT-PERF-002) and full-state cloning/persistence per streamed chunk (AUDIT-PERF-001). Chat history size display also reduces across all content including base64 image URL length when rebuilding folders (ChatHistoryList.tsx:52-111). No runtime performance trace was available, so no latency or frame-rate claim is made. Docker serves static files without an explicit compression/cache policy; GitHub Pages behavior depends on the hosting platform and must be measured on deployment.

## 21. Reliability & Error Handling

Provider fetch failures are wrapped in a readable network error. User-initiated abort is recognized. Tool fetch failures are returned as model-readable text rather than aborting the whole answer. Weaknesses: no chat request timeout (AUDIT-API-001), failed-generation placeholder (AUDIT-LOGIC-003), swallowed Drive get errors returning null followed by success UI (AUDIT-UX-001), and title errors sharing the outer submit catch. Model loader logs a warning and keeps the prior list after reload failure (modelLoader.ts:38-76), which is a sensible fallback.

## 22. Concurrency & Race Conditions

Generation is guarded by a global generating flag and an AbortController, which prevents ordinary double-submit in one tab. The app does not coordinate multiple browser tabs or devices. Drive writes are debounced by five seconds (src/api/google-api.ts:182-194) with no revision/ETag or merge; two devices can overwrite each other's changes. The exact loss scenario needs a two-client test. Async generation uses currentChatIndex captured at submit time, and the UI generally prevents switching chats while generating (ChatHistory.tsx:186), reducing but not eliminating stale-index risk from import/other state changes. No payment, inventory, billing, or quota subsystem exists.

## 23. Testing Assessment

No tracked unit, integration, E2E, security, or visual tests were found. pnpm has no test script. The existing build type-checks source but cannot validate Drive JSON round trips, OAuth error outcomes, token streaming boundaries, keyboard focus, or provider compatibility. The highest-value tests are serializer round trips without secrets, keyless onboarding, import invalid documents, stream cancellation/error cleanup, tool call history/title selection, and two-client Drive conflict behavior. No test suite was executed because none is defined.

## 24. Logging & Observability

This static client has no structured telemetry, request correlation, server log, trace, metric, or health endpoint. Production console calls are removed by Vite's drop option, limiting accidental console exposure but also making production diagnosis difficult (vite.config.ts:42-44). Errors are mainly ephemeral toasts. If telemetry is added, it should omit prompts, API keys, OAuth tokens, and Drive content by default. A privacy-preserving error boundary exists (src/components/ErrorBoundary).

## 25. Dependencies

pnpm-lock.yaml exists and CI installs with --frozen-lockfile. pnpm audit --prod --audit-level moderate exited 1 with three transitive advisories: two High in browserslist 4.28.2 and one Moderate in baseline-browser-mapping 2.10.21, through react-scroll-to-bottom/Emotion/Babel. AUDIT-DEP-001 scopes their app impact. The dependency set includes large Markdown, syntax, math, canvas, tokenization, and PWA packages; bundle analysis should drive cleanup. The README's dependency list is stale.

## 26. Build & Tooling

pnpm build (tsc && vite build) succeeded. Vite warned that @vitejs/plugin-react-swc specifies deprecated esbuild options and that output chunks exceed 500 kB. No lint, format-check, or standalone typecheck scripts are declared. TypeScript strict mode is enabled, but imports use several any-typed data formats and no runtime schema. Build generated dist; it is ignored and not a source change.

## 27. CI/CD & Deployment

.github/workflows deploys on main to GitHub Pages, uses frozen pnpm install, and pins action commits. It does not run tests, lint, dependency checks, preview smoke tests, or a deployment verification step. CI Node is 22; Docker uses node:20-alpine, creating toolchain drift. Docker installs dependencies and builds in the final runtime image rather than using a multi-stage static artifact, making it larger than necessary. It does run as an unprivileged user. Docker Compose exposes port 5173 on all interfaces by default; that is deployment configuration, not an application-server permission model. No Kubernetes/Terraform/Pulumi files were found.

## 28. Configuration & Secrets Management

All consumed VITE_ variables (default/custom endpoint, API key, system message, Google client ID) appear in .env.example and README. VITE_CUSTOM_API_ENDPOINT appears in the example/README but source search found no consumer; it is a documented-but-unused knob. All VITE_ values are compile-time public; the README warns about embedding a key. There is no runtime required-variable validation because most variables are optional. The Google OAuth client ID is appropriately public; it is not a secret. Do not put a real API key into VITE_OPENAI_API_KEY for a public build.

## 29. Documentation & Developer Experience

README covers setup, architecture, PWA, deployment, local endpoints, and privacy warnings in unusual detail. It also contains stale dependency/component references (AUDIT-DOC-001). New engineers can run pnpm dev and pnpm build, but cannot run a test suite or a documented browser smoke test. API/protocol contract fixtures and a Drive schema document are missing. CLAUDE.md was present but did not change the execution-path conclusions.

## 30. Dead Code & Technical Debt

No broad dead-code removal is recommended without a bundler/export reachability pass. Representative debt: the documented modelLoader import cycle and deferred kickoff (modelLoader.ts:137-149), repeated JSON deep clones in components, any-heavy import conversion, an unused ShowMoreButton definition in ChatHistoryList.tsx:245-250, and README references to removed components. TODO comments in modelReader.ts concern an OpenRouter workaround and should be revisited against current behavior. These are cleanup candidates after tests guard behavior.

## 31. Consistency Issues

The application has shared CSS tokens and primitives, but modal behavior differs between Dialog and Settings; API fields and some Drive actions use different accessibility semantics; provider errors are normalized while Drive errors are mostly raw status text; first-run key policy differs from send policy; and cloud create serialization differs from cloud update serialization. The latter two inconsistencies are root causes of the highest-priority findings.

## 32. Manual Verification Required

1. **Taste Skill:** install/locate the intended skill, load its full instructions, then review the first-use dialog, chat empty/stream/error states, history/folders, settings, import/export, and Drive sync at mobile, tablet, desktop, and wide widths. Record actual findings and screenshots.
2. **Drive round trip:** with disposable credentials and files, create a backup, reload another browser profile, select the file, and compare chats/settings. Inspect the Drive JSON schema without exposing a credential in logs. Check 401/403/network failures and whether success feedback appears.
3. **Two-client sync:** edit the same Drive file from two profiles to determine overwrite/conflict behavior and whether debounce loses writes.
4. **Provider stream fixtures:** exercise OpenAI SSE, Anthropic SSE, Ollama NDJSON, split UTF-8/event boundaries, midstream error, stop, and tool call. The code creates a fresh TextDecoder per chunk (useSubmit.ts:364,432,492), so split multibyte characters are a specific suspected corruption case requiring a fixture.
5. **Accessibility:** real keyboard and screen-reader pass for Settings, Google file actions, API inputs, message action visibility, toast announcements, image zoom, and focus after destructive actions.
6. **Deployment:** inspect actual GitHub Pages security headers, service-worker update/offline behavior, and performance on a slow mobile network. Browser tooling was unavailable in this audit.

## 33. Positive Findings

- Endpoint validation blocks non-HTTP(S) schemes and disallows public plaintext HTTP before sending credentials (src/utils/url.ts:64-81; src/api/api.ts:202-203,266-267).
- Google OAuth token is excluded from the persisted cloud-auth preference slice (src/store/cloud-auth-store.ts:18-23).
- Tool execution is disabled by default in product description, limited to three rounds, validates URL protocol, and truncates returned text (src/hooks/useSubmit.ts:12-18; src/utils/tools.ts:105-127,216-223).
- Shared Dialog implements several important focus behaviors; CSS includes reduced-motion handling; toasts expose alert/live semantics (Dialog.tsx:48-90; main.css:69-90; Toast.tsx:37-69).
- CI pins action revisions and freezes dependency resolution; Docker runs the app as a non-root user (.github/workflows; Dockerfile).
- Zustand has explicit persisted-state migrations and model reload keeps the prior catalog after failures (src/store/migrate.ts:22-49; src/constants/modelLoader.ts:38-76).

## 34. Remediation Roadmap

### Immediate

1. Fix AUDIT-SEC-001 with one secret-stripping Drive serializer. Assess already created Drive files and tell affected users how to remove the secret and rotate provider credentials.
2. Fix AUDIT-DATA-001 using a versioned envelope and migration. Add a create → restore regression test before re-enabling confidence in cloud backups.
3. Align first-run validation with the send path (AUDIT-LOGIC-001). Test official-key and keyless-local configurations.

### Short-term

Add focused tests and CI enforcement (AUDIT-TEST-001); validate imported documents and folder references (AUDIT-DATA-003); prevent empty failed turns and isolate title failures (AUDIT-LOGIC-002/003); make sync feedback reflect verified outcomes (AUDIT-UX-001); implement chat timeouts (AUDIT-API-001). These changes depend on a stable persistence schema and test fixtures.

### Medium-term

Define cloud conflict resolution (AUDIT-DATA-002), reduce per-chunk state writes (AUDIT-PERF-001), lazy-load heavy features (AUDIT-PERF-002), unify Settings/Dialog behavior, and complete a Taste Skill/browser review. Improve provider/Drive error contracts and privacy-preserving diagnostics.

### Long-term

If this becomes a shared hosted product, introduce a server-side credential and access-control boundary rather than relying on browser-stored API keys. Establish versioned data contracts and measured performance budgets before broadening provider and sync capabilities.

## 35. Prioritized Findings Table

| ID | Severity | Confidence | Category | Finding | Location/Route | Effort |
|----|----------|------------|----------|---------|----------------|--------|
| AUDIT-SEC-001 | High | High | Secrets | Initial Drive file includes API key | src/utils/google-api.ts:18-28 | Small |
| AUDIT-DATA-001 | High | High | Sync | New Drive file format differs from reader | src/store/storage/GoogleCloudStorage.ts:23-33 | Medium |
| AUDIT-LOGIC-001 | High | High | Onboarding | Keyless local setup blocked | /; ApiMenu.tsx:45-49 | Small |
| AUDIT-DATA-002 | Medium | Medium | Sync | Rehydration lacks conflict policy | GoogleSync.tsx:37-64 | Medium |
| AUDIT-SEC-002 | Medium | High | Secrets | Persistent browser-readable API key | store.ts:28-32 | Large |
| AUDIT-LOGIC-002 | Medium | High | Logic | Tool result used as title's user turn | useSubmit.ts:675-704 | Small |
| AUDIT-LOGIC-003 | Medium | High | Error state | Failed request leaves empty assistant turn | useSubmit.ts:166-181 | Small |
| AUDIT-API-001 | Medium | High | Resilience | No provider request timeout | api.ts:22-34 | Small |
| AUDIT-DATA-003 | Medium | High | Validation | Imports admit malformed nested data | import.ts:22-83 | Medium |
| AUDIT-PERF-001 | Medium | High | Performance | Whole-store clone/persist per chunk | useSubmit.ts:55-66 | Medium |
| AUDIT-PERF-002 | Medium | High | Performance | Large startup assets | build output; messageUtils.ts:12-23 | Medium |
| AUDIT-ACCESS-001 | Medium | High | Accessibility | Settings modal lacks modal contract | /; SettingsMenu.tsx:79-103 | Small |
| AUDIT-UX-001 | Medium | High | Fallback UX | Sync may show success after read failure | /; GoogleSync.tsx:171-179 | Small |
| AUDIT-TEST-001 | Medium | High | Testing | No automated regression suite | package.json | Medium |
| AUDIT-DEP-001 | Low | Medium | Dependencies | Transitive advisories, reachability unproven | pnpm-lock.yaml | Small |
| AUDIT-TECH-001 | Low | High | Resources | Resize listener lacks cleanup | Menu.tsx:57-66 | Small |
| AUDIT-TECH-002 | Low | High | Resources | Image object URLs not revoked | EditView.tsx:111-136 | Small |
| AUDIT-DOC-001 | Low | High | DX | Stale README dependency/tree details | README.md | Small |

**Counts:** Critical 0; High 3; Medium 11; Low 4; Informational 0. Positive observations are not counted as findings.

## 36. Final Assessment

The core single-page architecture is understandable and the build is healthy, but Drive sync cannot be treated as a reliable or secret-safe backup until its serializer and restore contract are repaired and tested. The keyless onboarding inconsistency blocks a supported use case. Missing tests allowed these cross-module contract errors to persist. Source suggests a thoughtful interface foundation, but no defensible Taste/visual quality conclusion can be made without the missing skill and a functioning browser session.

---

## Audit Metadata

- Audit type: Comprehensive repository audit
- Report file: PROJECT_AUDIT.md
- Repository revision: 7d3a922bde32727eb23852bc873ceed3314da909 (clean committed baseline at audit start; not the later modified working tree)
- Branch: main
- Audit date: 2026-09-29 (Asia/Ho_Chi_Minh)
- Taste Skill available: no
- Taste Skill used: no
- UI runtime inspection: no; Vite served HTTP 200 but browser CLI and computer-use browser were unavailable
- Routes/screens reviewed: / source-only: first-use API setup, chat, history/folders, settings, import/export, Drive sync; zero visually rendered
- Automated tests executed: no; no suite/script exists
- Build executed: yes; pnpm build succeeded with bundle and plugin warnings
- Static analysis executed: yes; TypeScript compilation via pnpm build; repository searches; no lint script
- Dependency/security scans executed: yes; pnpm audit --prod --audit-level moderate (exit 1, three transitive advisories)
- Limitations: no Taste Skill, browser, live provider/OAuth credentials, production deployment access, or screen-reader testing; Drive runtime effects are qualified where appropriate. Another process changed the shared working tree during final verification; those changes require a separate revalidation.
