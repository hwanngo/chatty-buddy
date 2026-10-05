import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  if (command === 'build' && env.VITE_OPENAI_API_KEY?.trim()) {
    throw new Error(
      'Production builds must not embed VITE_OPENAI_API_KEY. Enter credentials in the browser instead.'
    );
  }
  const base =
    env.VITE_BASE_PATH ||
    (process.env.GITHUB_ACTIONS
      ? `/${process.env.GITHUB_REPOSITORY?.split('/')[1] || 'chatty-buddy'}/`
      : '/');
  if (
    !base.startsWith('/') ||
    !base.endsWith('/') ||
    base.includes('..') ||
    base.includes('//')
  ) {
    throw new Error(
      'VITE_BASE_PATH must be an absolute path with leading/trailing slashes.'
    );
  }
  return {
    plugins: [
      react(),
      wasm(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: null,
        manifest: {
          name: 'Chatty Buddy',
          short_name: 'Chatty Buddy',
          description:
            'A clean, lightweight chat interface for OpenAI- and Anthropic-compatible APIs.',
          theme_color: '#D97757',
          background_color: '#262624',
          display: 'standalone',
          id: '.',
          start_url: '.',
          scope: '.',
          icons: [
            {
              src: 'android-chrome-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'android-chrome-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,wasm,ico,png,svg,woff,woff2,json}'],
          maximumFileSizeToCacheInBytes: 3145728,
          navigateFallback: 'index.html',
        },
      }),
    ],
    resolve: {
      alias: {
        '@type/': new URL('./src/types/', import.meta.url).pathname,
        '@store/': new URL('./src/store/', import.meta.url).pathname,
        '@hooks/': new URL('./src/hooks/', import.meta.url).pathname,
        '@constants/': new URL('./src/constants/', import.meta.url).pathname,
        '@api/': new URL('./src/api/', import.meta.url).pathname,
        '@components/': new URL('./src/components/', import.meta.url).pathname,
        '@utils/': new URL('./src/utils/', import.meta.url).pathname,
        '@src/': new URL('./src/', import.meta.url).pathname,
      },
    },
    base,
  };
});
