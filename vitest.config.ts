import { defineConfig } from 'vitest/config';

// The Kiro-built application is tested here (test/unit/*.test.ts).
// The pre-existing Codex reference tests (test/*.test.mjs) run under Node's
// own runner (`node --test test/*.test.mjs`) and are intentionally excluded.
export default defineConfig({
  test: {
    include: ['test/unit/**/*.test.ts'],
  },
});
