import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { localizedHtml } from './scripts/localized-html';

/** Where the app is served; builds the absolute URLs in the landing's meta tags. */
const SITE_URL = process.env.VITE_SITE_URL ?? 'https://tymebox.web.app';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localizedHtml(SITE_URL)],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Rules tests need the database emulator: `yarn test:rules`.
    exclude: ['**/node_modules/**', 'src/test/rules/**'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx'],
    },
  },
});
