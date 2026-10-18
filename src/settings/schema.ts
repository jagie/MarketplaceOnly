/**
 * The areas a user can switch on or off. Each one controls both hiding
 * (cleanup layer) and redirecting (network rules + in-app navigation).
 *
 * Adding an id here is all it takes to ship a new toggle: migration gives
 * existing users its default and flags it as "new" in the tray.
 *
 * "video" covers Reels and Watch together: Facebook now opens Watch links
 * in the Reels player, so separate switches couldn't work independently.
 */
export const AREA_IDS = ['feed', 'video', 'groups', 'gaming', 'notifications'] as const;
export type AreaId = (typeof AREA_IDS)[number];

/** Every user-facing setting the tray can flag as "new". */
export const SETTING_IDS = [...AREA_IDS, 'showEdgeTab'] as const;
export type SettingId = (typeof SETTING_IDS)[number];

export type TrayState = 'collapsed' | 'open';

/** Stored in storage.sync so it follows the user across devices. */
export interface Settings {
  schemaVersion: number;
  /** Master switch. Off means Facebook behaves normally. */
  enabled: boolean;
  /** true = the area is on (visible, reachable). false = hidden and redirected. */
  areas: Record<AreaId, boolean>;
  /** false = no edge tab; the toolbar icon is the only way into the tray. */
  showEdgeTab: boolean;
  trayState: TrayState;
  /** Settings the user has already been shown. Used to detect new ones. */
  seenSettings: SettingId[];
  /** Settings that shipped since the user last looked. Drives "New" badges. */
  newSettings: SettingId[];
}

/** Per-rule failure tracking for the cleanup layer (Milestone 3). */
export interface RuleBreakage {
  /** Page loads in a row where the rule was expected but found nothing. */
  misses: number;
  /** Set once misses reaches the threshold; cleared when the rule works again. */
  brokenSince: number | null;
  /** True once the tray has auto-opened for this breakage, so it only opens once. */
  announced: boolean;
}

/**
 * Stored in storage.local only. Breakage is device-specific (a rule can fail
 * on one machine and work on another) and changes often, which would burn
 * through storage.sync's write quota.
 */
export interface LocalState {
  breakageHistory: Record<string, RuleBreakage>;
}
