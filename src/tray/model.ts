import { RULES } from '@/cleanup/rules';
import type { RuleStatus } from '@/cleanup/status';
import { defaultSettings } from '@/settings/defaults';
import type { AreaId, LocalState, Settings } from '@/settings/schema';

export const AREA_LABELS: Record<AreaId, string> = {
  feed: 'Feed',
  video: 'Video (Reels & Watch)',
  groups: 'Groups',
  gaming: 'Gaming',
  notifications: 'Notifications',
};

/** Shown next to each area. "Showing" is used instead of "Off" so it can't be misread as the switch. */
export const STATUS_TEXT: Record<RuleStatus, string> = {
  hidden: 'Hidden',
  'not-on-page': 'Not on this page',
  'not-found': "Couldn't find it",
  off: 'Showing',
};

/**
 * One status per area, from its rules: any breakage wins (the user should
 * see it), then "Hidden" if anything was hidden.
 */
export function areaStatus(area: AreaId, statuses: Record<string, RuleStatus>): RuleStatus {
  const ofArea = RULES.filter((rule) => rule.area === area).map((rule) => statuses[rule.id] ?? 'off');
  if (ofArea.includes('not-found')) return 'not-found';
  if (ofArea.includes('hidden')) return 'hidden';
  if (ofArea.every((status) => status === 'off')) return 'off';
  return 'not-on-page';
}

export function brokenRuleIds(local: LocalState): string[] {
  return Object.entries(local.breakageHistory)
    .filter(([, entry]) => entry.brokenSince !== null)
    .map(([id]) => id);
}

/** The dot on the edge tab: something broke, or a new setting shipped. */
export function needsAttention(settings: Settings, local: LocalState): boolean {
  return settings.newSettings.length > 0 || brokenRuleIds(local).length > 0;
}

/** Breakages the tray hasn't opened for yet. Each one opens it exactly once. */
export function unannouncedBreakage(local: LocalState): string[] {
  return Object.entries(local.breakageHistory)
    .filter(([, entry]) => entry.brokenSince !== null && !entry.announced)
    .map(([id]) => id);
}

export function markAnnounced(local: LocalState, ruleIds: readonly string[]): LocalState {
  const breakageHistory = { ...local.breakageHistory };
  for (const id of ruleIds) {
    const entry = breakageHistory[id];
    if (entry) breakageHistory[id] = { ...entry, announced: true };
  }
  return { breakageHistory };
}

/** Called when the user closes the tray: "New" badges have been seen. */
export function markSettingsSeen(settings: Settings): Settings {
  return {
    ...settings,
    seenSettings: [...new Set([...settings.seenSettings, ...settings.newSettings])],
    newSettings: [],
  };
}

/** Everything back to defaults, except the tray stays open: the user is in it. */
export function resetToDefaults(): Settings {
  return { ...defaultSettings(), trayState: 'open' };
}
