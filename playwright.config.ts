import { defineConfig } from '@playwright/test';

/**
 * Browser tests run against local HTML fixtures only. Requests to Facebook
 * addresses are answered by the tests themselves (page.route), so nothing
 * ever reaches the live site and no login is ever automated.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  use: { browserName: 'chromium', headless: true },
});
