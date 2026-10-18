import type { AreaId } from '@/settings/schema';

/**
 * The single table that says what every Facebook URL is. Both the network
 * redirect rules and the in-app navigation watcher read from here (via
 * classifyRoute), so they can never disagree.
 *
 * Patterns are matched against whole, lowercased, decoded path segments,
 * never raw prefixes: `/groups/123` is Groups but `/groupsforgood` is a
 * username. Keep entries declarative (strings, simple regexes) so Milestone 2
 * can turn them into declarativeNetRequest rules.
 *
 * Confidence notes: these were written without access to live Facebook.
 * "verified" = long-standing, well-known URL. "check" = please confirm by hand.
 */

/** Areas that are reachable in v1 but not toggles yet. */
export const ALLOWED_AREA_IDS = ['events', 'pages', 'friends'] as const;
export type AllowedAreaId = (typeof ALLOWED_AREA_IDS)[number];

export type RouteKind =
  | 'toggleable-area'
  | 'allowed-area'
  | 'marketplace'
  | 'messenger'
  | 'always-allowed';

/** One path segment: an exact string or a regex for the whole segment. */
export type SegmentPattern = string | RegExp;
/** Matches when the URL's path starts with these segments. */
export type PathPattern = readonly SegmentPattern[];

interface BaseEntry {
  /** Path prefixes: the URL's segments must start with one of these. */
  prefixes?: readonly PathPattern[];
  /** Whole paths: the URL's segments must equal one of these exactly. */
  exact?: readonly PathPattern[];
  /**
   * Query params that exempt a URL from this entry (it then falls through to
   * later entries, usually "other"). Used for single items shared in chats.
   */
  exceptWithQueryParam?: readonly string[];
}

export type RouteEntry =
  | (BaseEntry & { kind: 'toggleable-area'; id: AreaId })
  | (BaseEntry & { kind: 'allowed-area'; id: AllowedAreaId })
  | (BaseEntry & { kind: 'marketplace' | 'messenger' | 'always-allowed'; id: string });

/** Facebook hosts we act on. m.facebook.com is out of scope for v1. */
export const FACEBOOK_HOSTS: readonly string[] = ['www.facebook.com', 'web.facebook.com'];

/** The same hosts as match patterns, for permissions and content scripts. */
export const FACEBOOK_MATCH_PATTERNS: string[] = FACEBOOK_HOSTS.map((host) => `https://${host}/*`);

/**
 * Order matters: earlier entries win. Safe destinations (always-allowed,
 * Messenger, Marketplace) come first so nothing can ever redirect them.
 */
export const ROUTE_MAP: readonly RouteEntry[] = [
  // --- Always allowed: account safety and housekeeping. Never redirected. ---
  {
    kind: 'always-allowed',
    id: 'auth',
    prefixes: [
      ['login'], // verified (/login/, /login/identify/)
      ['login.php'], // verified
      ['logout.php'], // verified
      ['checkpoint'], // verified: security checks
      ['two_step_verification'], // check: 2FA flow
      ['two_factor'], // check: older 2FA path
      ['recover'], // verified: account recovery
      ['security'], // check
      ['r.php'], // verified: signup
      ['reg'], // verified: signup
      ['device-based'], // check: saved-login flows
    ],
  },
  {
    kind: 'always-allowed',
    id: 'settings-and-help',
    prefixes: [
      ['settings'], // verified
      ['settings.php'], // check: legacy
      ['privacy'], // verified
      ['help'], // verified
      ['policies'], // verified
      ['policy.php'], // check: legacy
      ['legal'], // verified
    ],
  },
  {
    kind: 'always-allowed',
    id: 'oauth',
    prefixes: [
      ['dialog'], // verified: /dialog/oauth
      [/^v\d+(\.\d+)?$/, 'dialog'], // verified: /v19.0/dialog/oauth
    ],
  },
  {
    // Facebook's outbound-link redirector. Blocking it would break every
    // external link, including ones sellers send in Messenger.
    kind: 'always-allowed',
    id: 'link-shim',
    prefixes: [['l.php']], // verified
  },

  // --- Messenger: always works; it's where Marketplace deals happen. ---
  {
    kind: 'messenger',
    id: 'messenger',
    // verified: /messages/t/<id>, /messages/e2ee/t/<id>, /messages/requests/
    prefixes: [['messages']],
  },

  // --- Marketplace: the destination. Never redirected. ---
  {
    kind: 'marketplace',
    id: 'marketplace',
    prefixes: [
      ['marketplace'], // verified
      ['commerce', 'listing'], // check: legacy shared listing links
    ],
  },

  // --- Toggleable areas: hidden and redirected when switched off. ---
  {
    kind: 'toggleable-area',
    id: 'feed',
    // Note: logged-out Facebook shows its login form at "/" too. With Feed
    // off we redirect it anyway; Marketplace shows its own login prompt.
    exact: [[], ['home.php']], // verified
    prefixes: [['stories']], // verified
  },
  {
    // Reels and Watch are one area: Facebook opens Watch links in the Reels
    // player (/reel/<id>), confirmed by hand in Oct 2026.
    kind: 'toggleable-area',
    id: 'video',
    prefixes: [['reel'], ['reels']], // verified
  },
  {
    kind: 'toggleable-area',
    id: 'video',
    prefixes: [['watch']], // verified
    // /watch/?v=123 is one video someone shared, often in a chat. Leave it
    // reachable rather than make a shared link feel broken.
    exceptWithQueryParam: ['v'],
  },
  {
    kind: 'toggleable-area',
    id: 'groups',
    prefixes: [['groups']], // verified
  },
  {
    kind: 'toggleable-area',
    id: 'gaming',
    prefixes: [['gaming']], // verified. /games/ (instant games) is left as "other"; check.
  },
  {
    kind: 'toggleable-area',
    id: 'notifications',
    prefixes: [['notifications']], // verified
  },

  // --- Allowed areas: reachable and untouched in v1; future toggles. ---
  { kind: 'allowed-area', id: 'events', prefixes: [['events']] }, // verified
  { kind: 'allowed-area', id: 'pages', prefixes: [['pages']] }, // verified
  { kind: 'allowed-area', id: 'friends', prefixes: [['friends']] }, // verified
];

/**
 * First path segments that are Facebook features, not usernames. A
 * one-segment path not in this list (and not matched above) is treated as a
 * profile or Page. Getting this wrong only means cleanup runs or doesn't run
 * on that page; it never causes a redirect.
 */
export const RESERVED_FIRST_SEGMENTS: ReadonlySet<string> = new Set([
  'search',
  'bookmarks',
  'saved',
  'memories',
  'ads',
  'business',
  'photo',
  'photos',
  'video',
  'videos',
  'hashtag',
  'share',
  'sharer',
  'fundraisers',
  'games',
  'live',
  'media',
  'story.php',
  'permalink.php',
  'photo.php',
  'video.php',
  'sharer.php',
  'fb-answers', // AI-written answer pages, e.g. /fb-answers/<topic>/
]);

/** Paths that are always a profile or Page, whatever follows. */
export const PROFILE_PREFIXES: readonly PathPattern[] = [
  ['profile.php'], // verified: numeric-id profiles
  ['people'], // check: /people/<Name>/<id>/ for profiles without a username
  ['pg'], // check: legacy Page URLs
];
