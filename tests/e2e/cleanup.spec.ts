import { expect, test } from '@playwright/test';
import { RULES } from '../../src/cleanup/rules';
import { ruleSelector } from '../../src/cleanup/stylesheet';
import {
  ALL_AREAS,
  allCombinations,
  hiddenCountInside,
  openCapture,
  setCleanup,
  visibility,
} from './fixtures';

const TOP_BAR = '[role="banner"] [role="navigation"] li';

async function topBarItem(page: import('@playwright/test').Page, href: string) {
  return visibility(page, `${TOP_BAR}:has(a[href^="${href}"])`);
}

test.describe('top bar', () => {
  test('hides Home, Reels, Groups, and Gaming; keeps Marketplace, Messenger, search, and the logo', async ({
    page,
  }) => {
    await openCapture(page, 'marketplace');
    await setCleanup(page, ALL_AREAS, false);

    expect(await visibility(page, `${TOP_BAR}:has(a[href="/"])`)).toEqual([false]);
    expect(await topBarItem(page, '/reel')).toEqual([false]);
    expect(await topBarItem(page, '/groups')).toEqual([false]);
    expect(await topBarItem(page, '/gaming')).toEqual([false]);

    expect(await topBarItem(page, '/marketplace')).toEqual([true]);
    expect(await visibility(page, '[role="banner"] [role="button"][aria-label="Messenger"]:not([aria-hidden])')).toEqual([true]);
    expect(await visibility(page, '[aria-label="Search Facebook"]')).toEqual([true]);
    expect(await visibility(page, '[role="banner"] a[aria-label="Facebook"]')).toEqual([true]);
  });

  test('hides the notifications bell but keeps the Messenger button beside it', async ({ page }) => {
    await openCapture(page, 'marketplace');
    await setCleanup(page, ['notifications'], false);
    expect(await visibility(page, '[role="banner"] [role="button"][aria-label="Notifications"]:not([aria-hidden])')).toEqual([false]);
    expect(await visibility(page, '[role="banner"] [role="button"][aria-label="Messenger"]:not([aria-hidden])')).toEqual([true]);
    expect(await visibility(page, '[role="button"][aria-label="Your profile"]')).toEqual([true]);
  });

  test('hides the notifications pop-up if it is open', async ({ page }) => {
    await openCapture(page, 'notificationsOpen');
    await setCleanup(page, ['notifications'], false);
    expect(await visibility(page, '[role="dialog"][aria-label="Notifications"]')).toEqual([false]);
  });

  test('turning an area back on shows it instantly', async ({ page }) => {
    await openCapture(page, 'marketplace');
    await setCleanup(page, ['groups'], false);
    expect(await topBarItem(page, '/groups')).toEqual([false]);
    await setCleanup(page, [], false);
    expect(await topBarItem(page, '/groups')).toEqual([true]);
  });

  test('the same top bar is cleaned up on profiles', async ({ page }) => {
    await openCapture(page, 'profile');
    await setCleanup(page, ALL_AREAS, false);
    expect(await topBarItem(page, '/groups')).toEqual([false]);
    expect(await topBarItem(page, '/marketplace')).toEqual([true]);
  });
});

test.describe('shortcuts (general pages only)', () => {
  test('hides shortcuts to switched-off areas and keeps Marketplace and Messenger', async ({ page }) => {
    await openCapture(page, 'feed');
    await setCleanup(page, ['video', 'groups', 'gaming'], true);
    const leftRail = '[role="navigation"]:not([role="banner"] *) li';
    expect(await visibility(page, `${leftRail}:has(a[href^="/groups/"])`)).toEqual([false]);
    expect(await visibility(page, `${leftRail}:has(a[href^="/reel/"])`)).toEqual([false]);
    expect((await visibility(page, `${leftRail}:has(a[href^="/gaming/"])`)).every((v) => !v)).toBe(true);
    expect(await visibility(page, `${leftRail}:has(a[href^="/marketplace/"])`)).toEqual([true]);
    expect(await visibility(page, `${leftRail}:has(a[href^="/messages/"])`)).toEqual([true]);
    expect(await visibility(page, `${leftRail}:has(a[href^="/events"])`)).toEqual([true, true]);
  });

  test('do not run without the page-scope flag (e.g. on profiles)', async ({ page }) => {
    await openCapture(page, 'feed');
    await setCleanup(page, ['groups'], false);
    const leftRail = '[role="navigation"]:not([role="banner"] *) li';
    expect(await visibility(page, `${leftRail}:has(a[href^="/groups/"])`)).toEqual([true]);
  });
});

test.describe('guardrails: never hide what buyers need, in any settings combination', () => {
  for (const name of ['marketplace', 'listing', 'listingChat', 'notificationsOpen', 'profile', 'feed'] as const) {
    test(`${name}: nothing inside the main content is ever hidden`, async ({ page }) => {
      await openCapture(page, name);
      for (const hidden of allCombinations()) {
        for (const pageScope of [false, true]) {
          await setCleanup(page, hidden, pageScope);
          expect({ hidden, pageScope, count: await hiddenCountInside(page, '[role="main"]') }).toEqual({
            hidden,
            pageScope,
            count: 0,
          });
        }
      }
    });
  }

  test('listing: Message Seller, Send, listing links, search, and Messenger stay visible', async ({ page }) => {
    await openCapture(page, 'listingChat');
    const mustStayVisible = [
      '[aria-label="Send seller a message"]',
      '[aria-label="Send message"]',
      '[aria-label="Message"]',
      'a[href^="/marketplace/item/"]',
      '[aria-label="Search Marketplace"]',
      '[role="banner"] [role="button"][aria-label="Messenger"]:not([aria-hidden])',
      '[role="banner"] a[href^="/marketplace"]',
    ];
    for (const hidden of allCombinations()) {
      await setCleanup(page, hidden, true);
      for (const selector of mustStayVisible) {
        const visible = await visibility(page, selector);
        expect(visible.length, `${selector} should exist in the fixture`).toBeGreaterThan(0);
        expect({ hidden, selector, visible }).toEqual({ hidden, selector, visible: visible.map(() => true) });
      }
    }
  });
});

test.describe('status detection on real page structure', () => {
  test('every top-bar rule and the bell find their target on Marketplace', async ({ page }) => {
    await openCapture(page, 'marketplace');
    for (const rule of RULES.filter((r) => r.scope === 'global' && r.expectedOn.length > 0)) {
      const found = await page.$$eval(ruleSelector(rule), (els) => els.length);
      expect({ rule: rule.id, found: found > 0 }).toEqual({ rule: rule.id, found: true });
    }
  });

  test('top-bar rules find their target on profiles too', async ({ page }) => {
    await openCapture(page, 'profile');
    for (const id of ['feed-top-bar', 'video-top-bar', 'groups-top-bar', 'gaming-top-bar', 'notifications-bell']) {
      const rule = RULES.find((r) => r.id === id);
      if (!rule) throw new Error(id);
      expect({ id, found: (await page.$$eval(ruleSelector(rule), (els) => els.length)) > 0 }).toEqual({ id, found: true });
    }
  });
});
