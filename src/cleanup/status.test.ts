import { describe, expect, it } from 'vitest';
import { defaultSettings } from '@/settings/defaults';
import { RULES } from './rules';
import { BREAKAGE_THRESHOLD, recordPageResult, ruleStatus, type RuleStatus } from './status';

function rule(id: string) {
  const found = RULES.find((r) => r.id === id);
  if (!found) throw new Error(`no rule ${id}`);
  return found;
}

const FOUND = { matched: true, containerPresent: true };
const MISSING_BUT_BAR_PRESENT = { matched: false, containerPresent: true };
const NOTHING = { matched: false, containerPresent: false };

describe('ruleStatus', () => {
  const settings = defaultSettings();

  it('is "hidden" when the rule matches', () => {
    expect(ruleStatus(rule('groups-top-bar'), settings, 'marketplace', FOUND)).toBe('hidden');
  });

  it('is "off" when the area is switched on', () => {
    const on = defaultSettings();
    on.areas.groups = true;
    expect(ruleStatus(rule('groups-top-bar'), on, 'marketplace', FOUND)).toBe('off');
  });

  it('is "off" for everything when the master switch is off', () => {
    const paused = { ...defaultSettings(), enabled: false };
    for (const r of RULES) expect(ruleStatus(r, paused, 'marketplace', FOUND)).toBe('off');
  });

  it('is "not-found" when the whole top bar is missing on a page that should have it', () => {
    expect(ruleStatus(rule('groups-top-bar'), settings, 'marketplace', NOTHING)).toBe('not-found');
  });

  it('is "not-on-page" when the top bar is there but this person has no such icon', () => {
    expect(ruleStatus(rule('gaming-top-bar'), settings, 'marketplace', MISSING_BUT_BAR_PRESENT)).toBe(
      'not-on-page',
    );
  });

  it('is "not-on-page" where the rule is not expected (login pages)', () => {
    expect(ruleStatus(rule('groups-top-bar'), settings, 'always-allowed', NOTHING)).toBe('not-on-page');
  });

  it('page rules are "off" on Marketplace, Messenger, and profiles (never run there)', () => {
    for (const route of ['marketplace', 'messenger', 'profile-or-page'] as const) {
      expect(ruleStatus(rule('groups-shortcuts'), settings, route, FOUND)).toBe('off');
    }
  });

  it('shortcut rules never raise an alarm', () => {
    expect(ruleStatus(rule('groups-shortcuts'), settings, 'other', NOTHING)).toBe('not-on-page');
  });

  it('a missing bell is "not-found" (every top bar has one)', () => {
    expect(ruleStatus(rule('notifications-bell'), settings, 'marketplace', NOTHING)).toBe('not-found');
  });
});

describe('recordPageResult', () => {
  function run(statuses: RuleStatus[]) {
    let history = undefined as ReturnType<typeof recordPageResult>;
    statuses.forEach((status, i) => (history = recordPageResult(history, status, 1000 + i)));
    return history;
  }

  it(`marks a rule broken only after ${BREAKAGE_THRESHOLD} misses in a row`, () => {
    expect(run(['not-found', 'not-found'])?.brokenSince).toBeNull();
    expect(run(['not-found', 'not-found', 'not-found'])?.brokenSince).toBe(1002);
  });

  it('keeps the original breakage time and announcement flag on later misses', () => {
    let history = recordPageResult({ misses: 3, brokenSince: 500, announced: true }, 'not-found', 2000);
    history = recordPageResult(history, 'not-found', 3000);
    expect(history).toEqual({ misses: 5, brokenSince: 500, announced: true });
  });

  it('a success clears the history', () => {
    expect(run(['not-found', 'not-found', 'hidden'])).toBeUndefined();
    expect(run(['not-found', 'not-found', 'hidden', 'not-found', 'not-found'])?.brokenSince).toBeNull();
  });

  it('pages where the rule is off or not expected leave history alone', () => {
    const before = { misses: 2, brokenSince: null, announced: false };
    expect(recordPageResult(before, 'off', 1)).toBe(before);
    expect(recordPageResult(before, 'not-on-page', 1)).toBe(before);
  });
});
