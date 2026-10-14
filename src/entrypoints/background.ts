import { initSettings } from '@/settings/store';

export default defineBackground(() => {
  // Bring stored settings up to the current schema on install and on every
  // update, so a newly shipped toggle gets its default and a "new" flag.
  browser.runtime.onInstalled.addListener(({ reason }) => {
    void initSettings().then((settings) => {
      console.info(`[MarketplaceOnly] settings ready after ${reason}`, settings);
    });
  });
});
