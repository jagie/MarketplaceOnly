import type { RouteClass } from '@/routes/classifyRoute';
import type { RuleBreakage, Settings } from '@/settings/schema';
import { PAGE_CLEANUP_ROUTES, type CleanupRule } from './rules';

export type RuleStatus = 'hidden' | 'not-on-page' | 'not-found' | 'off';

/** What a page offers each rule: did it match, and is its container there? */
export interface RuleProbe {
  matched: boolean;
  containerPresent: boolean;
}

/** A rule is broken after this many page loads in a row where it should have worked. */
export const BREAKAGE_THRESHOLD = 3;

export function isRuleActive(rule: CleanupRule, settings: Settings, route: RouteClass): boolean {
  if (!settings.enabled || settings.areas[rule.area]) return false;
  return rule.scope === 'global' || PAGE_CLEANUP_ROUTES.includes(route);
}

/**
 * Status shown in the tray:
 * - "hidden": found and hidden
 * - "not-on-page": nothing to hide here, and that's expected
 * - "not-found": expected here but missing ("Couldn't find it")
 * - "off": the area is on, or the master switch is off
 */
export function ruleStatus(
  rule: CleanupRule,
  settings: Settings,
  route: RouteClass,
  probe: RuleProbe,
): RuleStatus {
  if (!isRuleActive(rule, settings, route)) return 'off';
  if (probe.matched) return 'hidden';
  if (!rule.expectedOn.includes(route)) return 'not-on-page';
  // The container is there but this item isn't: Facebook isn't showing it
  // to this person, which is normal (e.g. no Gaming icon in their top bar).
  if (rule.container && probe.containerPresent) return 'not-on-page';
  return 'not-found';
}

/**
 * Updates one rule's breakage history after a page load. Only a run of
 * BREAKAGE_THRESHOLD misses counts as broken, so one slow page or an
 * unusual layout can't raise a false alarm.
 */
export function recordPageResult(
  previous: RuleBreakage | undefined,
  status: RuleStatus,
  now: number,
): RuleBreakage | undefined {
  if (status === 'hidden') {
    // Working again: forget past misses, ready to announce a future breakage.
    return undefined;
  }
  if (status !== 'not-found') return previous; // no evidence either way

  const misses = (previous?.misses ?? 0) + 1;
  const brokenSince =
    previous?.brokenSince ?? (misses >= BREAKAGE_THRESHOLD ? now : null);
  return { misses, brokenSince, announced: previous?.announced ?? false };
}
