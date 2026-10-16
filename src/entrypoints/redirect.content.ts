import { FACEBOOK_MATCH_PATTERNS } from '@/routes/routeMap';
import { NAVIGATION_EVENT } from '@/redirect/navigationEvent';
import { redirectIfBlocked } from '@/redirect/inPageRedirect';
import type { Settings } from '@/settings/schema';
import { loadSettings, watchSettings } from '@/settings/store';

/**
 * The in-app half of the redirect backbone. Network rules catch full page
 * loads; this catches Facebook's in-app navigation (URL changes without a
 * page load), plus anything the network rules missed.
 */
export default defineContentScript({
  matches: FACEBOOK_MATCH_PATTERNS,
  runAt: 'document_start',
  async main(ctx) {
    let settings: Settings = await loadSettings();
    const check = () => redirectIfBlocked(settings);

    // On load: covers URLs network rules can't see, like /%67roups/.
    check();

    // In-app clicks (pushState/replaceState) and back/forward (popstate).
    ctx.addEventListener(window, NAVIGATION_EVENT, check);
    ctx.addEventListener(window, 'popstate', check);

    // Settings changes apply live: switching Groups off while viewing a
    // group sends you to Marketplace without a reload.
    const unwatch = watchSettings((next) => {
      settings = next;
      check();
    });
    ctx.onInvalidated(unwatch);
  },
});
