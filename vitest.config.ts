import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const aliases = {
  '@type/': 'types',
  '@store/': 'store',
  '@hooks/': 'hooks',
  '@constants/': 'constants',
  '@api/': 'api',
  '@components/': 'components',
  '@utils/': 'utils',
  '@src/': '',
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: Object.fromEntries(
      Object.entries(aliases).map(([alias, directory]) => [
        alias,
        new URL(`./src/${directory ? `${directory}/` : ''}`, import.meta.url)
          .pathname,
      ])
    ),
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
    setupFiles: ['./tests/setup.ts'],
    restoreMocks: true,
    clearMocks: true,
    testTimeout: 10000,
  },
});
