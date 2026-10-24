import { defineConfig } from 'vitest/config';

// Security-rules tests. They talk to the Realtime Database emulator, so run them
// through `yarn test:rules`, which starts it (needs Java 21+).
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/test/rules/**/*.test.ts'],
    testTimeout: 20000,
    hookTimeout: 30000,
    // One emulator database: run files one after another.
    fileParallelism: false,
  },
});
