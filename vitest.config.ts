import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';

export default defineConfig({
  // WxtVitest wires up the fake `browser` API so storage code can be tested
  // without a real browser.
  plugins: [WxtVitest()],
});
