# chatty-buddy

> Play and chat smarter with chatty-buddy — an amazing open-source web app with a chatty-buddy API!

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![Zustand](https://img.shields.io/badge/Zustand-5.0-FF9900)](https://github.com/pmndrs/zustand)
[![Electron](https://img.shields.io/badge/Electron-41-47848F?logo=electron)](https://www.electronjs.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A powerful, privacy-focused ChatGPT client that runs in your browser or as a desktop application. Built with modern web technologies and designed for both casual users and power users.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Development](#development)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
  - [State Management](#state-management)
  - [API Layer](#api-layer)
  - [Data Persistence](#data-persistence)
  - [Internationalization](#internationalization)
- [Desktop App (Electron)](#desktop-app-electron)
- [Building for Production](#building-for-production)
- [Deployment](#deployment)
- [Adding New Settings](#adding-new-settings)
- [Updating Models](#updating-models)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Features

### Core Chat Experience
- **Multi-model support** — Chat with hundreds of AI models via OpenRouter, OpenAI, Azure OpenAI, or any custom OpenAI-compatible or Anthropic-compatible endpoint
- **Dual API protocol** — Switch between OpenAI-compatible and Anthropic Messages API format; supports Anthropic, Kimi, MiniMax, GLM, and any provider implementing either protocol
- **Streaming responses** — Real-time token streaming for a fluid conversation experience
- **Rich message content** — Support for text and images in conversations
- **Markdown rendering** — Full GitHub-flavored Markdown with syntax highlighting, tables, and LaTeX math
- **Code blocks** — Syntax highlighting for 30+ programming languages with copy-to-clipboard
- **Message editing** — Edit any message in the conversation and regenerate responses
- **Conversation branching** — Navigate between different response variations with up/down buttons
- **Chat cloning** — Duplicate existing conversations to iterate on prompts

### Organization & Productivity
- **Folder management** — Organize chats into collapsible, color-coded folders
- **Chat search** — Full-text search across all conversation titles
- **Prompt library** — Save, import, and export reusable system prompts
- **Auto-title generation** — Automatically generate descriptive chat titles
- **Token counting** — Real-time token usage and cost estimation per model
- **Chat size display** — Optional display of conversation token count

### Customization & Settings
- **Dark & light themes** — Warm, carefully crafted color palette inspired by Anthropic's design language
- **Per-chat configuration** — Customize model, temperature, max tokens, and penalties per conversation via the ChatConfigMenu
- **Reasoning effort** — Set reasoning effort level (low / medium / high) for supported o1/o3-style models
- **Web search toggle** — Enable web search on models that support it
- **Image detail selection** — Choose image resolution (low / high / auto) globally or per chat
- **Advanced mode** — Toggle between simple and advanced configuration UI
- **Custom models** — Add your own models with custom pricing and context lengths
- **System message customization** — Configure default system instructions
- **Auto-scroll toggle** — Control automatic scrolling during streaming
- **Enter-to-submit** — Optional Enter key behavior configuration

### Data & Sync
- **Import / Export** — Backup and restore chats as JSON
- **Google Drive sync** — Optional cloud synchronization via Google OAuth
- **ShareGPT integration** — Share conversations publicly with one click
- **Chat download** — Export conversations as images or text
- **Persistent state** — All data saved locally in the browser

### Desktop App
- **Cross-platform** — Native desktop builds for macOS (DMG), Windows (NSIS), and Linux (AppImage/Tar)
- **System tray** — Minimize to tray for quick access
- **Auto-updater** — Built-in automatic update checking
- **Context menus** — Native right-click menus with spell checking
- **Single instance** — Prevents multiple app instances

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | React 19 (Functional Components + Hooks) |
| **Language** | TypeScript 6.0 (Strict mode) |
| **Build Tool** | Vite 8 with SWC for fast compilation |
| **Styling** | Tailwind CSS 3.4 + Custom design tokens |
| **Typography** | `@tailwindcss/typography` plugin |
| **State** | Zustand 5 with persist middleware |
| **Markdown** | `react-markdown` + `remark-gfm` + `rehype-highlight` + `rehype-katex` |
| **Icons** | Custom SVG icon components |
| **i18n** | `react-i18next` with HTTP backend (en-US, vi-VN) |
| **Desktop** | Electron 41 + `electron-builder` |
| **Package Manager** | pnpm 9.15 |

### Key Dependencies
- **@dqbd/tiktoken** — Token counting for OpenAI models
- **html2canvas** — Chat screenshot generation
- **jspdf** — PDF export functionality
- **papaparse** — CSV data parsing
- **uuid** — Unique chat/message identifiers
- **lodash** — Utility functions
- **react-toastify** — Notification system

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ (LTS recommended)
- [pnpm](https://pnpm.io/) 9.15+ (`npm install -g pnpm`)

### Installation

```bash
# 1. Clone the repository
git clone <repository-url>
cd chatty-buddy

# 2. Install dependencies
pnpm install

# 3. Start the development server
pnpm dev
```

The app will be available at `http://localhost:5173`.

---

## Development

### Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `pnpm dev` | Start Vite dev server on port 5173 |
| `build` | `pnpm build` | Type-check and build for production |
| `preview` | `pnpm preview` | Preview the production build locally |
| `electron` | `pnpm electron` | Run as Electron desktop app (dev mode) |
| `make` | `pnpm make` | Build and package desktop app for distribution |
| `pack` | `pnpm pack` | Build desktop app without packaging |
| `debug` | `pnpm debug` | Run Electron with Node.js inspector on port 5858 |

### Development Workflow

```bash
# Web development (recommended for UI work)
pnpm dev

# Desktop development (for Electron-specific features)
pnpm electron
```

When running in Electron dev mode:
- The Vite dev server runs on port 5173
- Electron waits for the server via `wait-on`
- DevTools open automatically in detached mode

---

## Environment Variables

Create a `.env` file in the project root. All variables are prefixed with `VITE_` and are optional.

```bash
# .env

# Custom default API endpoint (overrides built-in default)
VITE_CUSTOM_API_ENDPOINT=https://api.openai.com/v1/chat/completions

# Default API endpoint for new users
VITE_DEFAULT_API_ENDPOINT=https://api.openai.com/v1/chat/completions

# ⚠️ DANGER: Embedding an API key bundles it as plaintext in the compiled JS.
# Anyone with access to the deployed site can extract it.
# ONLY use this for single-user LOCAL installations.
VITE_OPENAI_API_KEY=sk-...

# Default system message (overrides the built-in default)
VITE_DEFAULT_SYSTEM_MESSAGE=You are a helpful assistant.

# Google OAuth Client ID for Google Drive sync
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

### Security Warning

**Never commit `.env` files containing real API keys.** The `.env.example` file is safe to commit as a template. If you deploy to a public host, always instruct users to enter their own API keys in the UI.

---

## Project Structure

```
chatty-buddy/
├── .env.example              # Environment variable template
├── .env                      # Local environment variables (gitignored)
├── index.html                # HTML entry point
├── package.json              # Dependencies & scripts
├── tailwind.config.cjs       # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
├── vite.config.ts            # Vite build configuration
│
├── electron/
│   └── index.cjs             # Electron main process entry
│
├── public/
│   ├── locales/              # i18n translation files
│   │   ├── en-US/            # English (US) translations
│   │   └── vi-VN/            # Vietnamese translations
│   ├── models.json           # OpenRouter model catalog
│   └── *.png / *.svg         # Favicons and static assets
│
└── src/
    ├── main.tsx              # React application entry point
    ├── App.tsx               # Root application component
    ├── i18n.ts               # i18next initialization
    │
    ├── api/                  # API layer
    │   ├── api.ts            # OpenAI-compatible + Anthropic-compatible chat completions
    │   ├── google-api.ts     # Google Drive sync operations
    │   └── helper.ts         # SSE stream parsing (OpenAI + Anthropic)
    │
    ├── components/           # React components
    │   ├── AboutMenu/        # About dialog
    │   ├── ApiMenu/          # API configuration panel
    │   ├── ApiPopup/         # API key popup
    │   ├── Chat/             # Main chat interface
    │   │   ├── ChatContent/  # Message list & rendering
    │   │   └── ChatInput.tsx # Message input bar
    │   ├── ConfigMenu/       # Chat configuration panel
    │   ├── ChatConfigMenu/   # Per-chat settings
    │   ├── GoogleSync/       # Google Drive sync UI
    │   ├── ImportExportChat/ # Import/export dialogs
    │   ├── LanguageSelector/ # Language switcher
    │   ├── Menu/             # Sidebar navigation
    │   │   ├── ChatHistoryList.tsx
    │   │   ├── ChatHistory.tsx
    │   │   ├── ChatFolder.tsx
    │   │   ├── NewChat.tsx
    │   │   ├── NewFolder.tsx
    │   │   └── MenuOptions/  # Menu action buttons
    │   ├── PopupModal/       # Reusable modal component
    │   ├── PromptLibraryMenu/# Prompt management
    │   ├── SettingsMenu/     # Application settings
    │   ├── ShareGPT/         # ShareGPT integration
    │   └── Toast/            # Toast notifications
    │
    ├── constants/            # Application constants
    │   └── chat.ts           # Defaults, system messages, code languages
    │
    ├── hooks/                # Custom React hooks
    │   └── useInitialiseNewChat.ts
    │
    ├── store/                # Zustand state management
    │   ├── store.ts          # Main store composition
    │   ├── chat-slice.ts     # Chat state & actions
    │   ├── input-slice.ts    # Input state
    │   ├── auth-slice.ts     # API key & auth state
    │   ├── config-slice.ts   # User preferences
    │   ├── prompt-slice.ts   # Prompt library state
    │   ├── toast-slice.ts    # Toast notifications
    │   ├── custom-models-slice.ts # User-defined models
    │   └── migrate.ts        # localStorage schema migrations
    │
    ├── types/                # TypeScript type definitions
    │   ├── chat.ts           # Core chat data models
    │   ├── api.ts            # API types (OpenAI + Anthropic request/response)
    │   ├── theme.ts          # Theme type definitions
    │   └── prompt.ts         # Prompt type definitions
    │
    ├── utils/                # Utility functions
    │   ├── api.ts            # API helpers (Azure detection, etc.)
    │   ├── modelReader.ts    # Model catalog parser
    │   └── ...               # Other utilities
    │
    └── assets/
        └── icons/            # Custom SVG icon components
```

---

## Architecture

### State Management

The application uses **Zustand** with a **slice pattern** for modular state management.

```
StoreState = ChatSlice + InputSlice + AuthSlice + ConfigSlice +
             PromptSlice + ToastSlice + CustomModelsSlice + CloudAuthSlice
```

Each slice owns a domain of state and its corresponding actions. The store is composed in `src/store/store.ts`.

**Persistence**: The store is automatically persisted to `localStorage` under the key `chatty-buddy`. A `partialize` function controls exactly which fields are saved. The current schema version is **1**.

**Migration Strategy**: When the schema changes, a migration function must be added to `src/store/migrate.ts`, and the version in `store.ts` must be incremented. The migration pipeline runs automatically on app launch.

### API Layer

The API layer (`src/api/api.ts`) supports two protocols selected by the user via the **API Format** setting:

**OpenAI-compatible** (`apiType: 'openai'`):
- `getChatCompletion` — Standard request/response
- `getChatCompletionStream` — SSE streaming (`data: [DONE]` terminator)

**Anthropic-compatible** (`apiType: 'anthropic'`):
- `getAnthropicChatCompletion` — Non-streaming, returns `content[0].text`
- `getAnthropicChatCompletionStream` — SSE streaming with named events (`content_block_delta` / `message_stop`)
- `convertMessagesForAnthropic` — Converts the internal message array: extracts `role: "system"` into a top-level `system` param, converts `image_url` blocks to Anthropic image source format

SSE stream parsing lives in `src/api/helper.ts`: `parseEventSource` for OpenAI, `parseAnthropicEventSource` for Anthropic.

**Supported Endpoints**:
- **OpenAI** — `/v1/chat/completions` (default: `https://api.openai.com/v1/chat/completions`)
- **Azure OpenAI** — Auto-detected; handles model name mapping and API versioning
- **Anthropic** — `/v1/messages` (default: `https://api.anthropic.com/v1/messages`)
- **Custom** — Any OpenAI-compatible or Anthropic-compatible endpoint

**Authentication**:
- OpenAI / custom: `Authorization: Bearer <apiKey>`
- Azure: `api-key: <apiKey>`
- Anthropic-compatible: `x-api-key: <apiKey>` + `anthropic-version: 2023-06-01`

### Data Persistence

All user data is stored locally in the browser:

| Storage | Key | Contents |
|---------|-----|----------|
| `localStorage` | `chatty-buddy` | Zustand persisted state (chats, settings, API keys) |

**Privacy note**: Your API key and chat history never leave your device unless you explicitly enable Google Drive sync.

### Internationalization

The app supports multiple languages via `react-i18next`:

- **Namespaces**: `main`, `model`, `api`, `about`, `import`, `migration`, `drive` (drive only when `VITE_GOOGLE_CLIENT_ID` is set)
- **Languages**: English (`en-US`), Vietnamese (`vi-VN`)
- **Fallback**: English (`en-US`)

Translation files live in `public/locales/<lang>/` and are loaded dynamically at runtime.

---

## Desktop App (Electron)

chatty-buddy can be packaged as a cross-platform desktop application.

### Development

```bash
# Run in Electron with live reload
pnpm electron

# Debug with Node.js inspector
pnpm debug
```

### Production Builds

```bash
# Build and package for current platform
pnpm make

# Output directory: release/
```

### Platform Targets

| Platform | Format | Notes |
|----------|--------|-------|
| macOS | `.dmg` (Universal) | Requires macOS for building |
| Windows | `.exe` (NSIS) | Can be built from any OS |
| Linux | `.tar.gz`, `.AppImage` | Category: Chat |

### Electron Features

- **Auto-updater** — Checks for updates on launch via `electron-updater`
- **System tray** — Minimize to tray, restore on click
- **Context menu** — Right-click with spell checking, link handling, search
- **Security** — Internal HTTP server binds to loopback only (`127.0.0.1`); path traversal protection on file serving
- **Single instance** — Only one app instance allowed; second launch focuses existing window

---

## Building for Production

### Web Build

```bash
pnpm build
```

Outputs to `dist/`:
- Static HTML, CSS, JS assets
- Suitable for deployment to GitHub Pages, Vercel, Netlify, or any static host

### Desktop Build

```bash
# Build web assets + package Electron app
pnpm make
```

Outputs to `release/`:
- Platform-specific installers and packages

---

## Deployment

### Static Hosting (Recommended)

The web build produces static files suitable for any static host:

1. Run `pnpm build`
2. Upload the `dist/` folder to your hosting provider

**Supported platforms**:
- [GitHub Pages](https://pages.github.com/)
- [Vercel](https://vercel.com/)
- [Netlify](https://www.netlify.com/)
- [Cloudflare Pages](https://pages.cloudflare.com/)

### Environment for Deployment

For public deployments, set these environment variables at build time:

```bash
VITE_DEFAULT_API_ENDPOINT=https://api.openai.com/v1/chat/completions
```

**Do not** set `VITE_OPENAI_API_KEY` on public deployments.

---

## Adding New Settings

When adding a new user-configurable setting, touch **all** of these files:

1. **`src/types/chat.ts`** — Add field to the relevant interface (`ConfigInterface` for chat config, or `LocalStorageInterface` for global settings)
2. **`src/store/config-slice.ts`** — Add to slice state and actions
3. **`src/store/store.ts`** — Add to `createPartializedState`
4. **`src/store/migrate.ts`** — Add migration from previous schema version; bump version in `store.ts`
5. **`src/constants/chat.ts`** — Add default value
6. **`src/components/ConfigMenu/ConfigMenu.tsx`** or **`src/components/ChatConfigMenu/ChatConfigMenu.tsx`** — Add UI control
7. **`public/locales/en-US/main.json`** or **`model.json`** — Add i18n key

---

## Updating Models

Model metadata is sourced from `public/models.json` (OpenRouter format).

To update the model catalog:

1. Download the latest models from OpenRouter:
   ```bash
   curl https://openrouter.ai/api/v1/models > models.json
   ```
2. Normalize the JSON keys:
   ```bash
   node sortModelsJsonKeys.js
   ```
3. Move to the public folder:
   ```bash
   mv models.json public/
   ```
4. Commit and redeploy.

**Custom models** can also be added at runtime via the Settings menu.

---

## Contributing

We welcome contributions! Please follow these guidelines:

### Code Style
- **TypeScript strict mode** is enforced — no `any` types without justification
- **Functional components** with hooks preferred
- **Tailwind CSS** for all styling; avoid inline styles
- **Path aliases** must be used for all imports (e.g., `@components/`, `@store/`)

### Commit Messages
Use clear, descriptive commit messages:
```
feat: add auto-scroll toggle
fix: resolve token count overflow
refactor: simplify chat slice logic
docs: update README with Electron instructions
```

### Before Submitting
1. Ensure `pnpm build` passes without TypeScript errors
2. Test both web and Electron builds if applicable
3. Update translations if you add new user-facing text
4. Add a migration if you modify the localStorage schema

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| `Cannot find module '@components/...'` | Ensure path aliases are configured in both `tsconfig.json` and `vite.config.ts` |
| API returns 404 | Check that your endpoint URL includes `/v1/chat/completions` if required by your provider |
| Azure model not found | Azure maps `gpt-3.5-turbo` → `gpt-35-turbo` automatically; verify your deployment name |
| Rate limited (429) | Reduce request frequency or switch API keys/endpoints |
| Insufficient quota | Check your OpenAI/Azure billing dashboard |
| Electron blank screen | Ensure the Vite dev server is running on port 5173 before Electron loads |
| localStorage data lost | Check browser console for migration errors; schema migrations may fail silently |

### Getting Help

1. Check the browser/Electron DevTools console for error messages
2. Verify your API key and endpoint in the API settings panel
3. Test your endpoint with a simple `curl` request outside the app
4. File an issue with reproduction steps and environment details

---

## License

This project is open-source. See the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- Built with [React](https://react.dev/), [Vite](https://vitejs.dev/), and [Tailwind CSS](https://tailwindcss.com/)
- Model data powered by [OpenRouter](https://openrouter.ai/)
- Token counting via [@dqbd/tiktoken](https://github.com/dqbd/tiktoken)
- Desktop builds powered by [Electron](https://www.electronjs.org/)
- Fonts: DM Sans, Lora, DM Mono (served via Google Fonts)

---

<p align="center">
  Made with care by <strong>Hwan</strong>
</p>
