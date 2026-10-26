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
    // Failed writes are meant to surface as unhandled rejections (SaveErrorToast
    // shows them). A test that plays one marks its error "[expected]"; any
    // other unhandled error still fails the run.
    onUnhandledError: (error) => !String(error?.message ?? '').includes('[expected]'),
    // A made-up Firebase config, so modules that set Firebase up on import
    // (auth, database) load without mocks. Nothing here reaches the network.
    env: {
      VITE_FIREBASE_API_KEY: 'test-api-key',
      VITE_FIREBASE_AUTH_DOMAIN: 'demo-tymebox.firebaseapp.com',
      VITE_FIREBASE_DATABASE_URL: 'http://127.0.0.1:9000?ns=demo-tymebox-default-rtdb',
      VITE_FIREBASE_PROJECT_ID: 'demo-tymebox',
      VITE_FIREBASE_APP_ID: 'test-app-id',
    },
    // Rules tests need the database emulator: `yarn test:rules`.
    exclude: ['**/node_modules/**', 'src/test/rules/**'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov', 'json', 'json-summary', 'html'],
      clean: true,
      include: ['src/**/*.{ts,tsx}'],
      // Only what has no runtime code: tests and their helpers, the entry
      // point, and files that only declare types.
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
        'src/main.tsx',
        'src/**/*.d.ts',
        'src/features/legal/content/types.ts',
      ],
      // A ratchet on the way to 100%: each run that does better raises these
      // numbers in this file, and a run that does worse fails. See
      // docs/testing.md.
      thresholds: {
        autoUpdate: true,
        lines: 91.63,
        statements: 91.54,
        functions: 92.41,
        branches: 89.08,
      },
    },
  },
});
