import { syncNetworkRules } from '@/background/networkRuleSync';
import { hasHostAccess } from '@/permissions/hostAccess';
import { initSettings, loadSettings, watchSettings } from '@/settings/store';

export default defineBackground(() => {
  // Keep redirect rules in step with settings, whether they change in the
  // popup, the tray, or on another synced device.
  watchSettings((settings) => void syncNetworkRules(settings));

  browser.runtime.onInstalled.addListener(({ reason }) => {
    // Bring stored settings up to the current schema on install and on every
    // update, so a newly shipped toggle gets its default and a "new" flag.
    void initSettings().then(async (settings) => {
      console.info(`[MarketplaceOnly] settings ready after ${reason}`, settings);
      await syncNetworkRules(settings);
      // Firefox doesn't grant facebook.com access at install; explain and ask.
      if (!(await hasHostAccess())) {
        await browser.tabs.create({ url: browser.runtime.getURL('/onboarding.html') });
      }
    });
  });

  // Dynamic rules persist across restarts, but rebuilding is cheap and
  // guarantees they match current settings.
  browser.runtime.onStartup.addListener(() => {
    void loadSettings().then(syncNetworkRules);
  });
});
