import type { Browser } from 'wxt/browser';
import { TOGGLE_TRAY } from '@/cleanup/messages';
import { hasHostAccess } from '@/permissions/hostAccess';
import { FACEBOOK_HOSTS } from '@/routes/routeMap';

const MARKETPLACE_URL = 'https://www.facebook.com/marketplace/';

/**
 * Toolbar icon: on a Facebook tab it opens or closes the tray; anywhere
 * else it opens Marketplace in a new tab, so the current page is kept.
 */
export async function onToolbarClick(tab: Browser.tabs.Tab): Promise<void> {
  // Without facebook.com access nothing can run there; explain and ask.
  if (!(await hasHostAccess())) {
    await browser.tabs.create({ url: browser.runtime.getURL('/onboarding.html') });
    return;
  }
  // We can only read the address of Facebook tabs (no "tabs" permission),
  // so a missing URL already means "not Facebook".
  if (tab.id !== undefined && tab.url && isFacebook(tab.url)) {
    try {
      if (await browser.tabs.sendMessage(tab.id, TOGGLE_TRAY)) return;
    } catch {
      // The tab was opened before the extension loaded: fall through.
    }
  }
  await browser.tabs.create({ url: MARKETPLACE_URL });
}

function isFacebook(url: string): boolean {
  try {
    return FACEBOOK_HOSTS.includes(new URL(url).hostname);
  } catch {
    return false;
  }
}
