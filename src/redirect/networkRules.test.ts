import { describe, expect, it } from 'vitest';
import { classifyRoute } from '@/routes/classifyRoute';
import { URL_CASES } from '@/routes/urlCases';
import { defaultSettings } from '@/settings/defaults';
import { AREA_IDS, type Settings } from '@/settings/schema';
import { buildNetworkRules, type NetworkRule } from './networkRules';
import { shouldRedirect } from './policy';

/**
 * Evaluates rules the way the browser does: highest-priority match wins,
 * "allow" stops redirects. Case-insensitive, as the rules request.
 */
function networkRedirects(rules: NetworkRule[], url: string): boolean {
  const matches = rules
    .filter((rule) => new RegExp(rule.condition.regexFilter, 'i').test(url))
    .sort((a, b) => b.priority - a.priority);
  return matches[0]?.action.type === 'redirect';
}

/**
 * URLs only the in-page watcher handles. Browsers match network rules
 * against the raw URL, so a disguised path like /%67roups/ slips past them;
 * the watcher decodes it and redirects once the page starts loading.
 */
const WATCHER_ONLY = new Set(['https://www.facebook.com/%67roups/123/']);

const ALL_URLS = Object.values(URL_CASES).flat().map(([url]) => url);

function settingsWithAll(on: boolean): Settings {
  const settings = defaultSettings();
  for (const id of AREA_IDS) settings.areas[id] = on;
  return settings;
}

describe('buildNetworkRules', () => {
  it('agrees with the classifier on every test URL (all areas off)', () => {
    const settings = defaultSettings();
    const rules = buildNetworkRules(settings);
    for (const url of ALL_URLS) {
      if (WATCHER_ONLY.has(url)) continue;
      const expected = shouldRedirect(classifyRoute(url), settings);
      expect({ url, redirects: networkRedirects(rules, url) }).toEqual({ url, redirects: expected });
    }
  });

  it('agrees with the classifier with only Groups and Video off', () => {
    const settings = settingsWithAll(true);
    settings.areas.groups = false;
    settings.areas.video = false;
    const rules = buildNetworkRules(settings);
    for (const url of ALL_URLS) {
      if (WATCHER_ONLY.has(url)) continue;
      expect({ url, redirects: networkRedirects(rules, url) }).toEqual({
        url,
        redirects: shouldRedirect(classifyRoute(url), settings),
      });
    }
  });

  it('produces no rules when every area is on', () => {
    expect(buildNetworkRules(settingsWithAll(true))).toEqual([]);
  });

  it('produces no rules when the master switch is off', () => {
    expect(buildNetworkRules({ ...defaultSettings(), enabled: false })).toEqual([]);
  });

  it('never redirects Marketplace, so a redirect can never loop', () => {
    const rules = buildNetworkRules(defaultSettings());
    expect(networkRedirects(rules, 'https://www.facebook.com/marketplace/')).toBe(false);
    expect(networkRedirects(rules, 'https://web.facebook.com/marketplace/')).toBe(false);
  });

  it('gives every rule a unique positive id and targets page loads only', () => {
    const rules = buildNetworkRules(defaultSettings());
    expect(new Set(rules.map((r) => r.id)).size).toBe(rules.length);
    expect(rules.every((r) => r.id > 0)).toBe(true);
    expect(rules.every((r) => r.condition.resourceTypes.join() === 'main_frame')).toBe(true);
  });

  it('redirects to /marketplace/ on the same host, dropping the query', () => {
    const [rule] = buildNetworkRules(defaultSettings());
    expect(rule?.action).toEqual({
      type: 'redirect',
      redirect: { transform: { path: '/marketplace/', query: '', fragment: '' } },
    });
  });
});
