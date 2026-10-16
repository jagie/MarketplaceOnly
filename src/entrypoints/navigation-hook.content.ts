import { FACEBOOK_MATCH_PATTERNS } from '@/routes/routeMap';
import { NAVIGATION_EVENT } from '@/redirect/navigationEvent';

/**
 * Runs in Facebook's own page world (not the extension's isolated world),
 * because only there can we see Facebook's calls to history.pushState and
 * replaceState. It does nothing but announce URL changes; all decisions
 * happen in the isolated redirect script, which can read settings.
 *
 * Runs at document_start, before Facebook's scripts, so the hooks are in
 * place before Facebook first navigates.
 */
export default defineContentScript({
  matches: FACEBOOK_MATCH_PATTERNS,
  world: 'MAIN',
  runAt: 'document_start',
  main() {
    for (const method of ['pushState', 'replaceState'] as const) {
      const original = history[method];
      history[method] = function (this: History, ...args: Parameters<History['pushState']>) {
        const result = original.apply(this, args);
        // Fire after the original call so location.href is already updated.
        window.dispatchEvent(new Event(NAVIGATION_EVENT));
        return result;
      };
    }
  },
});
