import { ROUTE_MAP, type PathPattern } from '@/routes/routeMap';
import type { AreaId, Settings } from '@/settings/schema';
import { MARKETPLACE_PATH, redirectedAreas } from './policy';

/**
 * A declarativeNetRequest rule, typed locally with plain strings. The
 * browser's own types use enums that don't exist at runtime in every
 * browser; the background casts at the API boundary.
 */
export interface NetworkRule {
  id: number;
  priority: number;
  action:
    | { type: 'redirect'; redirect: { transform: { path: string; query: string; fragment: string } } }
    | { type: 'allow' };
  condition: {
    regexFilter: string;
    resourceTypes: ['main_frame'];
    isUrlFilterCaseSensitive: false;
  };
}

/**
 * Host part shared by every rule. Kept in step with FACEBOOK_HOSTS: the test
 * suite checks rules against the same URL list as the classifier.
 */
const HOST = String.raw`^https://(?:www|web)\.facebook\.com`;

/** Ends a path match: the next character starts a new segment, query, or fragment. */
const SEGMENT_END = String.raw`(?:[/?#]|$)`;

const REDIRECT_PRIORITY = 1;
/** Exemptions (e.g. one shared video) must beat the redirect. */
const EXEMPTION_PRIORITY = 2;

/**
 * Builds the network rules for the current settings. Generated from the
 * route map rather than written by hand, so full page loads and in-app
 * navigation can't disagree about what gets redirected.
 *
 * Only full page loads (`main_frame`) are touched. Images, scripts, and
 * Messenger's background requests are never affected.
 */
export function buildNetworkRules(settings: Settings): NetworkRule[] {
  const rules: NetworkRule[] = [];
  const off = new Set<AreaId>(redirectedAreas(settings));

  for (const entry of ROUTE_MAP) {
    if (entry.kind !== 'toggleable-area' || !off.has(entry.id)) continue;

    const prefixes = (entry.prefixes ?? []).map(prefixRegex);
    const exact = (entry.exact ?? []).map(exactRegex);
    for (const regexFilter of [...prefixes, ...exact]) {
      rules.push(redirectRule(rules.length + 1, regexFilter));
    }

    for (const param of entry.exceptWithQueryParam ?? []) {
      for (const prefix of entry.prefixes ?? []) {
        rules.push(allowRule(rules.length + 1, queryExemptionRegex(prefix, param)));
      }
    }
  }
  return rules;
}

function redirectRule(id: number, regexFilter: string): NetworkRule {
  return {
    id,
    priority: REDIRECT_PRIORITY,
    // "transform" keeps the user on the same host (www or web) and drops
    // the old query and fragment.
    action: {
      type: 'redirect',
      redirect: { transform: { path: MARKETPLACE_PATH, query: '', fragment: '' } },
    },
    condition: condition(regexFilter),
  };
}

function allowRule(id: number, regexFilter: string): NetworkRule {
  return { id, priority: EXEMPTION_PRIORITY, action: { type: 'allow' }, condition: condition(regexFilter) };
}

function condition(regexFilter: string): NetworkRule['condition'] {
  return { regexFilter, resourceTypes: ['main_frame'], isUrlFilterCaseSensitive: false };
}

/** ["groups"] -> matches /groups, /groups/, /groups/123, /groups?x, //groups//1 */
function prefixRegex(pattern: PathPattern): string {
  return `${HOST}${pathRegex(pattern)}${SEGMENT_END}`;
}

/** [] -> /, /?sk=h_chr;  ["home.php"] -> /home.php, /home.php/?ref=x */
function exactRegex(pattern: PathPattern): string {
  return `${HOST}${pathRegex(pattern)}/*(?:[?#]|$)`;
}

/** /watch/anything?...v=... (the param can appear anywhere in the query) */
function queryExemptionRegex(pattern: PathPattern, param: string): string {
  return `${HOST}${pathRegex(pattern)}(?:/[^?#]*)?\\?(?:[^#]*&)?${escapeRegex(param)}(?:[=&#]|$)`;
}

function pathRegex(pattern: PathPattern): string {
  return pattern
    .map((segment) => {
      // Network rules only support simple segments. A regex segment in a
      // toggleable area would need a hand-written rule; fail loudly in tests.
      if (typeof segment !== 'string') {
        throw new Error(`Toggleable route segments must be plain strings, got ${String(segment)}`);
      }
      return `/+${escapeRegex(segment)}`;
    })
    .join('');
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
