import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { HIDE_ATTRIBUTE, PAGE_ATTRIBUTE, buildStylesheet } from '../../src/cleanup/stylesheet';
import { AREA_IDS, type AreaId } from '../../src/settings/schema';

export const CAPTURES = {
  marketplace: { file: 'marketplace.html', url: 'https://www.facebook.com/marketplace/' },
  notificationsOpen: { file: 'marketplace-notifications-open.html', url: 'https://www.facebook.com/marketplace/' },
  listing: { file: 'listing.html', url: 'https://www.facebook.com/marketplace/item/1/' },
  listingChat: { file: 'listing-chat-open.html', url: 'https://www.facebook.com/marketplace/item/1/' },
  feed: { file: 'feed.html', url: 'https://www.facebook.com/' },
  profile: { file: 'profile.html', url: 'https://www.facebook.com/profile.php?id=1' },
} as const;

export type CaptureName = keyof typeof CAPTURES;

/**
 * Serves a sanitized capture at its real Facebook address, entirely from
 * disk. page.route answers every request, so nothing reaches Facebook.
 */
export async function openCapture(page: Page, name: CaptureName): Promise<void> {
  const { file, url } = CAPTURES[name];
  const html = readFileSync(`tests/fixtures/captures/${file}`, 'utf8');
  await page.route('**/*', (route) => route.fulfill({ contentType: 'text/html', body: html }));
  await page.goto(url);
  await page.addStyleTag({ content: buildStylesheet() });
}

/** Mirrors what the content script sets on <html>. */
export async function setCleanup(page: Page, hidden: readonly AreaId[], pageScope: boolean): Promise<void> {
  await page.evaluate(
    ({ hideAttr, pageAttr, value, pageScope }) => {
      document.documentElement.setAttribute(hideAttr, value);
      if (pageScope) document.documentElement.setAttribute(pageAttr, '');
      else document.documentElement.removeAttribute(pageAttr);
    },
    { hideAttr: HIDE_ATTRIBUTE, pageAttr: PAGE_ATTRIBUTE, value: hidden.join(' '), pageScope },
  );
}

export const ALL_AREAS: readonly AreaId[] = AREA_IDS;

/** Every on/off combination of the areas (2^5 = 32). */
export function allCombinations(): AreaId[][] {
  return Array.from({ length: 2 ** AREA_IDS.length }, (_, mask) =>
    AREA_IDS.filter((_, i) => mask & (1 << i)),
  );
}

/** Whether each matched element is actually rendered (no hidden ancestor). */
export async function visibility(page: Page, selector: string): Promise<boolean[]> {
  return page.$$eval(selector, (elements) => elements.map((el) => el.checkVisibility()));
}

/** Count of elements inside `scope` that our stylesheet has hidden. */
export async function hiddenCountInside(page: Page, scope: string): Promise<number> {
  return page.$$eval(`${scope} *`, (elements) =>
    elements.filter((el) => getComputedStyle(el).display === 'none').length,
  );
}
