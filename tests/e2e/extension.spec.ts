import { readFileSync } from 'node:fs';
import path from 'node:path';
import { chromium, expect, test, type BrowserContext } from '@playwright/test';
import { HIDE_ATTRIBUTE } from '../../src/cleanup/stylesheet';

/**
 * Runs the real built Chrome extension (npm run build first) against the
 * sanitized captures. Every request is answered locally by context.route,
 * so the extension sees facebook.com addresses but nothing reaches Facebook.
 */
const EXTENSION = path.resolve('.output/chrome-mv3');
const capture = (file: string) => readFileSync(`tests/fixtures/captures/${file}`, 'utf8');

let context: BrowserContext;

test.beforeAll(async () => {
  context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    args: [`--disable-extensions-except=${EXTENSION}`, `--load-extension=${EXTENSION}`],
  });
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    const file = url.pathname.startsWith('/marketplace/item/') ? 'listing-chat-open.html' : 'marketplace.html';
    let body = capture(file);
    // Simulates Facebook redesigning its top bar: our rules can't find it.
    if (url.pathname.includes('/redesigned/')) body = body.replace('role="banner"', 'role="none"');
    return route.fulfill({ contentType: 'text/html', body });
  });
  // Wait for the background to install its rules.
  if (context.serviceWorkers().length === 0) await context.waitForEvent('serviceworker');
});

test.afterAll(async () => {
  await context.close();
});

test('cleans up the top bar on Marketplace with default settings', async () => {
  const page = await context.newPage();
  await page.goto('https://www.facebook.com/marketplace/');
  await expect(page.locator('html')).toHaveAttribute(HIDE_ATTRIBUTE, 'feed video groups gaming notifications');
  await expect(page.locator('[role="banner"] li:has(a[href="/groups/"])')).toBeHidden();
  await expect(page.locator('[role="banner"] li:has(a[href^="/marketplace"])')).toBeVisible();
  await page.close();
});

test('redirects a full page load of /groups/ to Marketplace', async () => {
  const page = await context.newPage();
  await page.goto('https://www.facebook.com/groups/123/');
  await expect(page).toHaveURL('https://www.facebook.com/marketplace/');
  await page.close();
});

test('redirects in-app navigation to a switched-off area', async () => {
  const page = await context.newPage();
  await page.goto('https://www.facebook.com/marketplace/');
  await expect(page.locator('html')).toHaveAttribute(HIDE_ATTRIBUTE, /groups/);
  await page.evaluate(() => history.pushState({}, '', '/reel/42/'));
  await expect(page).toHaveURL('https://www.facebook.com/marketplace/');
  await page.close();
});

test('leaves listings and the Message Seller button alone', async () => {
  const page = await context.newPage();
  await page.goto('https://www.facebook.com/marketplace/item/1/');
  await expect(page).toHaveURL('https://www.facebook.com/marketplace/item/1/');
  await expect(page.locator('html')).toHaveAttribute(HIDE_ATTRIBUTE, /groups/);
  await expect(page.locator('[aria-label="Send seller a message"]').first()).toBeVisible();
  await page.close();
});

test('flags rules as broken only after 3 page loads where they could not find anything', async () => {
  test.setTimeout(90_000);
  const [worker] = context.serviceWorkers();
  if (!worker) throw new Error('no service worker');
  const brokenRules = () =>
    worker.evaluate(async () => {
      // Runs inside the extension's service worker, where `chrome` exists.
      const { chrome } = globalThis as unknown as {
        chrome: { storage: { local: { get(key: string): Promise<Record<string, unknown>> } } };
      };
      const { state } = (await chrome.storage.local.get('state')) as {
        state?: { breakageHistory: Record<string, { misses: number; brokenSince: number | null }> };
      };
      const history = state?.breakageHistory ?? {};
      return {
        misses: history['groups-top-bar']?.misses ?? 0,
        broken: Object.keys(history).filter((id) => history[id]?.brokenSince !== null).sort(),
      };
    });

  for (let load = 1; load <= 3; load++) {
    const page = await context.newPage();
    await page.goto(`https://www.facebook.com/marketplace/redesigned/${load}/`);
    // Rules are judged about 6 seconds after the page loads.
    await expect.poll(async () => (await brokenRules()).misses, { timeout: 15_000 }).toBe(load);
    if (load < 3) expect((await brokenRules()).broken).toEqual([]);
    await page.close();
  }
  expect((await brokenRules()).broken).toEqual([
    'feed-top-bar',
    'gaming-top-bar',
    'groups-top-bar',
    'notifications-bell',
    'video-top-bar',
  ]);

  // One normal page load later, everything is working again.
  const page = await context.newPage();
  await page.goto('https://www.facebook.com/marketplace/');
  await expect.poll(async () => (await brokenRules()).broken, { timeout: 15_000 }).toEqual([]);
  await page.close();
});
