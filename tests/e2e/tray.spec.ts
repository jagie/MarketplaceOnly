import { expect, test, type BrowserContext, type Page, type Worker } from '@playwright/test';
import { HIDE_ATTRIBUTE } from '../../src/cleanup/stylesheet';
import { launchWithExtension } from './extensionContext';

let context: BrowserContext;
let worker: Worker;

// A fresh install for every test, since several test first-run behavior.
test.beforeEach(async () => {
  ({ context, worker } = await launchWithExtension());
});
test.afterEach(async () => {
  await context.close();
});

const tray = (page: Page) => ({
  tab: page.locator('marketplaceonly-tray .tab'),
  dot: page.locator('marketplaceonly-tray .dot'),
  panel: page.locator('marketplaceonly-tray .panel'),
  close: page.getByRole('button', { name: 'Close', exact: true }),
  master: page.getByRole('switch', { name: 'Marketplace only' }),
  area: (name: string) => page.getByRole('switch', { name }),
  status: (area: string) => page.locator(`marketplaceonly-tray #mo-status-${area}`),
});

async function openMarketplace(): Promise<Page> {
  const page = await context.newPage();
  await page.goto('https://www.facebook.com/marketplace/');
  return page;
}

test('opens by itself on first install, then remembers being closed', async () => {
  const page = await openMarketplace();
  const t = tray(page);
  await expect(t.panel).toBeVisible();
  await expect(t.tab).toBeHidden();

  await t.close.click();
  await expect(t.panel).toBeHidden();
  await expect(t.tab).toBeVisible();

  await page.reload();
  await expect(t.tab).toBeVisible();
  await expect(t.panel).toBeHidden();
});

test('a switch shows the area instantly and the status follows', async () => {
  const page = await openMarketplace();
  const t = tray(page);
  const groupsIcon = page.locator('[role="banner"] li:has(a[href="/groups/"])');

  await expect(t.status('groups')).toHaveText('Hidden');
  await expect(groupsIcon).toBeHidden();

  await t.area('Groups').click();
  await expect(t.area('Groups')).toHaveAttribute('aria-checked', 'true');
  await expect(groupsIcon).toBeVisible();
  await expect(page.locator('html')).not.toHaveAttribute(HIDE_ATTRIBUTE, /groups/);
  await expect(t.status('groups')).toHaveText('Showing');

  await t.area('Groups').click();
  await expect(groupsIcon).toBeHidden();
});

test('the master switch pauses everything and the side tab stays', async () => {
  const page = await openMarketplace();
  const t = tray(page);
  await t.master.click();
  await expect(page.locator('html')).toHaveAttribute(HIDE_ATTRIBUTE, '');
  await expect(page.locator('[role="banner"] li:has(a[href="/groups/"])')).toBeVisible();
  await expect(t.area('Groups')).toBeDisabled();
  await t.close.click();
  await expect(t.tab).toBeVisible();
});

test('works from the keyboard: tab, Enter, focus moves in, Esc closes', async () => {
  const page = await openMarketplace();
  const t = tray(page);
  await t.close.click();

  await t.tab.focus();
  await page.keyboard.press('Enter');
  await expect(t.panel).toBeVisible();
  await expect(t.close).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(t.master).toBeFocused();
  await page.keyboard.press('Space');
  await expect(t.master).toHaveAttribute('aria-checked', 'false');

  await page.keyboard.press('Escape');
  await expect(t.panel).toBeHidden();
  await expect(t.tab).toBeFocused();
});

test('every control has an accessible name', async () => {
  const page = await openMarketplace();
  for (const name of ['Marketplace only', 'Feed', 'Video (Reels & Watch)', 'Groups', 'Gaming', 'Notifications']) {
    await expect(page.getByRole('switch', { name })).toBeVisible();
  }
  await expect(page.getByRole('dialog', { name: 'MarketplaceOnly' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Show the side tab' })).toBeVisible();
});

test('reset asks first, then restores defaults', async () => {
  const page = await openMarketplace();
  const t = tray(page);
  await t.area('Groups').click();
  await expect(t.area('Groups')).toHaveAttribute('aria-checked', 'true');

  await page.getByRole('button', { name: 'Reset to defaults' }).click();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(t.area('Groups')).toHaveAttribute('aria-checked', 'true');

  await page.getByRole('button', { name: 'Reset to defaults' }).click();
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(t.area('Groups')).toHaveAttribute('aria-checked', 'false');
  await expect(t.panel).toBeVisible();
});

test('the side tab can be hidden entirely', async () => {
  const page = await openMarketplace();
  const t = tray(page);
  await page.getByRole('checkbox', { name: 'Show the side tab' }).uncheck();
  await t.close.click();
  await expect(t.panel).toBeHidden();
  await expect(t.tab).toBeHidden();
});

test('report opens a prefilled GitHub issue with no personal data', async () => {
  const page = await openMarketplace();
  const [issue] = await Promise.all([
    context.waitForEvent('page'),
    page.getByRole('button', { name: 'Report a problem' }).click(),
  ]);
  const url = new URL(issue.url());
  expect(url.origin + url.pathname).toBe('https://github.com/jagie/MarketplaceOnly/issues/new');
  expect(url.searchParams.get('template')).toBe('problem.yml');
  expect(url.searchParams.get('page_type')).toBe('Marketplace');
  expect(url.searchParams.get('browser')).toMatch(/^Chrome /);
  expect(url.search).not.toContain('facebook.com');
});

test('follows Facebook dark mode', async () => {
  const page = await openMarketplace();
  const host = page.locator('marketplaceonly-tray');
  await expect(host).toHaveAttribute('data-theme', 'light');
  await page.evaluate(() => document.documentElement.classList.add('__fb-dark-mode'));
  await expect(host).toHaveAttribute('data-theme', 'dark');
});

test('opens once for a new breakage and shows a dot until it is fixed', async () => {
  test.setTimeout(90_000);
  const first = await openMarketplace();
  await tray(first).close.click();
  await first.close();

  const brokenCount = () =>
    worker.evaluate(async () => {
      const { chrome } = globalThis as unknown as {
        chrome: { storage: { local: { get(key: string): Promise<Record<string, unknown>> } } };
      };
      const { state } = (await chrome.storage.local.get('state')) as {
        state?: { breakageHistory: Record<string, { brokenSince: number | null }> };
      };
      return Object.values(state?.breakageHistory ?? {}).filter((e) => e.brokenSince !== null).length;
    });

  let page: Page | undefined;
  for (let load = 1; load <= 3; load++) {
    await page?.close();
    page = await context.newPage();
    await page.goto(`https://www.facebook.com/marketplace/redesigned/${load}/`);
    if (load < 3) await page.waitForTimeout(7000);
  }
  if (!page) throw new Error('no page');
  const t = tray(page);
  await expect.poll(brokenCount, { timeout: 15_000 }).toBeGreaterThan(0);
  await expect(t.panel).toBeVisible({ timeout: 5_000 });
  await expect(t.status('groups')).toHaveText("Couldn't find it");

  // Closing sticks: the same breakage doesn't reopen it.
  await t.close.click();
  await expect(t.dot).toBeVisible();
  await page.goto('https://www.facebook.com/marketplace/redesigned/4/');
  await page.waitForTimeout(7000);
  await expect(t.panel).toBeHidden();
  await expect(t.dot).toBeVisible();
});
