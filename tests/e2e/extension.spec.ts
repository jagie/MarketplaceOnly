import { expect, test, type BrowserContext } from '@playwright/test';
import { HIDE_ATTRIBUTE } from '../../src/cleanup/stylesheet';
import { launchWithExtension } from './extensionContext';

let context: BrowserContext;

test.beforeAll(async () => {
  ({ context } = await launchWithExtension());
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
