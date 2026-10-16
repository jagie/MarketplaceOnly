import { classifyRoute } from '@/routes/classifyRoute';
import type { Settings } from '@/settings/schema';
import { checkRedirectBudget } from './loopGuard';
import { MARKETPLACE_PATH, shouldRedirect } from './policy';

const BUDGET_KEY = 'marketplaceonly:redirects';

/** Used if sessionStorage is blocked; resets on reload, which is acceptable. */
let memoryBudget: number[] = [];

/**
 * Sends the tab to Marketplace if the current URL is a switched-off area.
 * Returns true if it redirected.
 */
export function redirectIfBlocked(settings: Settings, location: Location = window.location): boolean {
  if (!shouldRedirect(classifyRoute(location.href), settings)) return false;

  const budget = checkRedirectBudget(readBudget(), Date.now());
  writeBudget(budget.recent);
  if (!budget.allowed) {
    console.warn('[MarketplaceOnly] redirect skipped: too many in a row on this tab');
    return false;
  }
  // replace(), not assign(): the blocked page doesn't enter history, so the
  // back button returns to where the user was instead of looping.
  location.replace(MARKETPLACE_PATH);
  return true;
}

/**
 * Recent redirect times for this tab. sessionStorage is per tab and survives
 * the page reload that location.replace causes, which is what makes the cap
 * work across a loop.
 */
function readBudget(): number[] {
  try {
    const raw: unknown = JSON.parse(sessionStorage.getItem(BUDGET_KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((t): t is number => typeof t === 'number') : [];
  } catch {
    return memoryBudget;
  }
}

function writeBudget(recent: number[]): void {
  memoryBudget = recent;
  try {
    sessionStorage.setItem(BUDGET_KEY, JSON.stringify(recent));
  } catch {
    // Storage blocked: the in-memory copy still caps loops within this page.
  }
}
