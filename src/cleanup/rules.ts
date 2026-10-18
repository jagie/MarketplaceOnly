import type { RouteClass } from '@/routes/classifyRoute';
import { AREA_IDS, type AreaId } from '@/settings/schema';
import { areaLinkSelectors } from './linkSelectors';

/**
 * Where a rule applies:
 * - "global": the top bar, which is the same on every page (including
 *   profiles and Marketplace).
 * - "page": everything else, only on general pages (see PAGE_CLEANUP_ROUTES).
 */
export type RuleScope = 'global' | 'page';

export interface CleanupRule {
  id: string;
  /** Plain-language name shown in the tray's status list. */
  label: string;
  area: AreaId;
  scope: RuleScope;
  /** Elements to hide. Most stable first: link targets, then roles, then labels. */
  selectors: string[];
  /** Page types where this rule should find something. Empty = never alarm. */
  expectedOn: RouteClass[];
  /**
   * Where the item would appear. If this is on the page but the item isn't,
   * Facebook simply isn't showing that item to this user (top bars differ
   * between people), so it's "Not on this page" rather than broken.
   */
  container?: string;
  /** Extra guards on top of GLOBAL_GUARDS. */
  neverMatchInside?: string[];
}

/** The top bar's list of area icons (Home, Reels, Groups, …). */
const TOP_BAR_ITEM = '[role="banner"] [role="navigation"] li';

/** Page types that show the top bar. Login and security pages don't. */
const TOP_BAR_ROUTES: RouteClass[] = [
  'marketplace',
  'profile-or-page',
  'other',
  'events',
  'pages',
  'friends',
  ...AREA_IDS,
];

/**
 * Page-scope rules run only here. Never on Marketplace, Messenger, or
 * profiles and Pages (untouched in v1), or on Events, Pages, and Friends
 * (allowed but untouched in v1).
 */
export const PAGE_CLEANUP_ROUTES: readonly RouteClass[] = ['other', ...AREA_IDS];

/**
 * Principle 1, enforced in CSS: a hidden element may never be inside, or
 * contain, anything people need to buy and sell.
 */
export const GLOBAL_GUARDS = {
  /** Never hide anything inside these. */
  inside: ['[role="main"]', '[role="dialog"][aria-label="Messenger"]'],
  /** Never hide an element that contains one of these. */
  contains: [
    'a[href^="/marketplace"]',
    'a[href*="facebook.com/marketplace"]',
    'a[href^="/messages"]',
    '[aria-label^="Messenger"]',
    '[role="combobox"]',
    'input[type="search"]',
    '[aria-label="Send seller a message"]',
    '[aria-label="Send message"]',
    '[aria-label="Message"]',
  ],
};

function topBarRule(area: AreaId, label: string): CleanupRule {
  const links = areaLinkSelectors(area).join(', ');
  return {
    id: `${area}-top-bar`,
    label,
    area,
    scope: 'global',
    selectors: [`${TOP_BAR_ITEM}:has(${links})`],
    expectedOn: TOP_BAR_ROUTES,
    container: `${TOP_BAR_ITEM}:has(a[href])`,
  };
}

function shortcutsRule(area: AreaId, label: string): CleanupRule {
  const links = areaLinkSelectors(area).join(', ');
  return {
    id: `${area}-shortcuts`,
    label,
    area,
    scope: 'page',
    // Left-side shortcut lists outside the top bar.
    selectors: [`[role="navigation"]:not([role="banner"] *) li:has(${links})`],
    // Shortcut lists are personal and often collapsed; their absence is
    // normal, so these never raise "Couldn't find it".
    expectedOn: [],
  };
}

/**
 * The registry: every cleanup rule lives here. To fix a broken rule, change
 * its selectors here and add a fixture test.
 */
export const RULES: readonly CleanupRule[] = [
  topBarRule('feed', 'Home icon in the top bar'),
  shortcutsRule('feed', 'Feeds shortcut'),

  topBarRule('video', 'Reels icon in the top bar'),
  shortcutsRule('video', 'Reels and video shortcuts'),

  topBarRule('groups', 'Groups icon in the top bar'),
  shortcutsRule('groups', 'Groups shortcuts'),

  topBarRule('gaming', 'Gaming icon in the top bar'),
  shortcutsRule('gaming', 'Gaming shortcuts'),

  {
    id: 'notifications-bell',
    label: 'Notifications bell and count',
    area: 'notifications',
    scope: 'global',
    // The bell is a button with no link, so this is the one rule that must
    // use an accessibility label (English only in v1). The guard keeps the
    // Messenger button, which sits right next to it, visible.
    selectors: [
      '[role="banner"] [role="navigation"] > div:has([role="button"][aria-label^="Notifications"]):not(:has([aria-label^="Messenger"]))',
    ],
    expectedOn: TOP_BAR_ROUTES,
  },
  {
    id: 'notifications-panel',
    label: 'Notifications pop-up',
    area: 'notifications',
    scope: 'global',
    // Backup in case the pop-up opens anyway (e.g. a keyboard shortcut).
    selectors: ['[role="dialog"][aria-label="Notifications"]'],
    expectedOn: [],
  },
];
