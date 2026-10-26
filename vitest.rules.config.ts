import { defineConfig } from 'vitest/config';

// Security-rules tests (src/test/rules) and the repositories against the real
// rules (src/test/integration). They talk to the Auth and Realtime Database
// emulators, so run them through `yarn test:rules`, which starts both
// (needs Java 21+).
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/test/rules/**/*.test.ts', 'src/test/integration/**/*.test.ts'],
    // The app's own Firebase code, pointed at the emulators (as .env.emulators).
    env: {
      VITE_USE_EMULATORS: '1',
      VITE_FIREBASE_API_KEY: 'demo-key',
      VITE_FIREBASE_AUTH_DOMAIN: 'localhost',
      VITE_FIREBASE_DATABASE_URL: 'http://127.0.0.1:9000?ns=demo-tymebox-default-rtdb',
      VITE_FIREBASE_PROJECT_ID: 'demo-tymebox',
      VITE_FIREBASE_APP_ID: 'demo-app',
    },
    testTimeout: 20000,
    hookTimeout: 30000,
    // One emulator database: run files one after another.
    fileParallelism: false,
  },
});
