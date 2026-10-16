import type { Browser } from 'wxt/browser';
import { buildNetworkRules } from '@/redirect/networkRules';
import type { Settings } from '@/settings/schema';

let pending: Promise<void> = Promise.resolve();

/**
 * Replaces all of our dynamic network rules with ones built from `settings`.
 * Calls are queued so two quick toggles can't interleave and leave a mix of
 * old and new rules behind.
 */
export function syncNetworkRules(settings: Settings): Promise<void> {
  pending = pending.then(() => replaceRules(settings)).catch((error: unknown) => {
    console.error('[MarketplaceOnly] could not update redirect rules', error);
  });
  return pending;
}

async function replaceRules(settings: Settings): Promise<void> {
  const existing = await browser.declarativeNetRequest.getDynamicRules();
  await browser.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map((rule) => rule.id),
    // Our rule type uses plain strings ("redirect", "main_frame") where the
    // browser typings use enums; the values are identical at runtime.
    addRules: buildNetworkRules(settings) as unknown as Browser.declarativeNetRequest.Rule[],
  });
}
