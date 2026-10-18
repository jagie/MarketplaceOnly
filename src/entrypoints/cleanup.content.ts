import { GET_STATUS, TOGGLE_TRAY, type StatusReport } from '@/cleanup/messages';
import { PageCleanup } from '@/cleanup/pageCleanup';
import { NAVIGATION_EVENT } from '@/redirect/navigationEvent';
import { FACEBOOK_MATCH_PATTERNS } from '@/routes/routeMap';
import { loadLocalState, loadSettings, watchLocalState, watchSettings } from '@/settings/store';
import { TrayController } from '@/tray/trayController';

/**
 * The cleanup layer and the tray. Separate from the redirect script on
 * purpose, so a problem here can never stop redirects (the backbone).
 */
export default defineContentScript({
  matches: FACEBOOK_MATCH_PATTERNS,
  runAt: 'document_start',
  async main(ctx) {
    const [settings, local] = await Promise.all([loadSettings(), loadLocalState()]);

    let tray: TrayController | undefined;
    const cleanup = new PageCleanup(settings, () => tray?.render());
    cleanup.start();

    // The tray is optional chrome: if it fails, cleanup keeps working.
    try {
      tray = new TrayController(settings, local, cleanup);
      tray.start();
    } catch (error) {
      console.error('[MarketplaceOnly] tray failed to start', error);
    }

    const onNavigate = () => {
      cleanup.onNavigate();
      tray?.render();
    };
    ctx.addEventListener(window, NAVIGATION_EVENT, onNavigate);
    ctx.addEventListener(window, 'popstate', onNavigate);

    const unwatchSettings = watchSettings((next) => {
      cleanup.updateSettings(next);
      tray?.onSettings(next);
    });
    const unwatchLocal = watchLocalState((next) => tray?.onLocalState(next));

    // Re-theme when Facebook switches light/dark, and re-attach the tray if
    // Facebook ever replaces the page's top-level children.
    const rootObserver = new MutationObserver(() => {
      tray?.ensureMounted();
      tray?.render();
    });
    rootObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'], childList: true });

    // Callback style (rather than returning a promise) works the same in
    // Chrome and Firefox.
    const onMessage = (
      message: unknown,
      _sender: unknown,
      sendResponse: (response: StatusReport | boolean) => void,
    ): undefined => {
      if (message === GET_STATUS) sendResponse(cleanup.report());
      if (message === TOGGLE_TRAY) {
        tray?.toggle();
        sendResponse(tray !== undefined);
      }
      return undefined;
    };
    browser.runtime.onMessage.addListener(onMessage);

    ctx.onInvalidated(() => {
      unwatchSettings();
      unwatchLocal();
      rootObserver.disconnect();
      browser.runtime.onMessage.removeListener(onMessage);
      tray?.stop();
      cleanup.stop();
    });
  },
});
