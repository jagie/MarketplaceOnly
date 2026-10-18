import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';

export default defineConfig({
  // WxtVitest wires up the fake `browser` API so storage code can be tested
  // without a real browser.
  plugins: [WxtVitest()],
  // Browser tests in tests/e2e run under Playwright (npm run test:e2e).
  test: { include: ['src/**/*.test.ts'] },
});
