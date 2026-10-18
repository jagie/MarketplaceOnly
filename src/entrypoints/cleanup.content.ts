import { PageCleanup } from '@/cleanup/pageCleanup';
import { GET_STATUS, type StatusReport } from '@/cleanup/messages';
import { NAVIGATION_EVENT } from '@/redirect/navigationEvent';
import { FACEBOOK_MATCH_PATTERNS } from '@/routes/routeMap';
import { loadSettings, watchSettings } from '@/settings/store';

/**
 * The cleanup layer: hides switched-off areas with a stylesheet. Separate
 * from the redirect script on purpose, so a problem here can never stop
 * redirects (the backbone) from working.
 */
export default defineContentScript({
  matches: FACEBOOK_MATCH_PATTERNS,
  runAt: 'document_start',
  async main(ctx) {
    const cleanup = new PageCleanup(await loadSettings());
    cleanup.start();

    ctx.addEventListener(window, NAVIGATION_EVENT, () => cleanup.onNavigate());
    ctx.addEventListener(window, 'popstate', () => cleanup.onNavigate());
    const unwatch = watchSettings((settings) => cleanup.updateSettings(settings));

    // Callback style (rather than returning a promise) works the same in
    // Chrome and Firefox.
    const onMessage = (
      message: unknown,
      _sender: unknown,
      sendResponse: (report: StatusReport) => void,
    ): undefined => {
      if (message === GET_STATUS) sendResponse(cleanup.report());
      return undefined;
    };
    browser.runtime.onMessage.addListener(onMessage);

    ctx.onInvalidated(() => {
      unwatch();
      browser.runtime.onMessage.removeListener(onMessage);
      cleanup.stop();
    });
  },
});
