import { CURRENT_SCHEMA_VERSION, DEFAULT_AREA_VALUE, defaultLocalState, defaultSettings } from './defaults';
import {
  AREA_IDS,
  SETTING_IDS,
  type LocalState,
  type RuleBreakage,
  type SettingId,
  type Settings,
  type TrayState,
} from './schema';

type RawObject = Record<string, unknown>;

/**
 * A step that upgrades stored data from version N to N + 1. Steps handle
 * renames and reshapes. Adding a new toggle needs no step: `normalize`
 * below fills in any missing setting with its default.
 */
export type MigrationStep = (raw: RawObject) => RawObject;

/** Keyed by the version the step upgrades *from*. */
export const MIGRATIONS: Readonly<Record<number, MigrationStep>> = {
  1: mergeReelsAndWatchIntoVideo,
};

/**
 * v1 -> v2: Facebook opens Watch links in the Reels player, so the separate
 * "reels" and "watch" switches became one "video" switch. If the user had
 * turned either one on, they wanted video, so the merged switch starts on.
 */
function mergeReelsAndWatchIntoVideo(raw: RawObject): RawObject {
  const renameIds = (ids: unknown): unknown =>
    Array.isArray(ids) ? ids.map((id) => (id === 'reels' || id === 'watch' ? 'video' : id)) : ids;

  const next: RawObject = {
    ...raw,
    seenSettings: renameIds(raw.seenSettings),
    newSettings: renameIds(raw.newSettings),
  };
  if (isObject(raw.areas)) {
    const { reels, watch, ...otherAreas } = raw.areas;
    // Only set video if v1 actually stored a choice; otherwise leave it
    // missing so it gets its default like any new setting.
    next.areas =
      reels === undefined && watch === undefined
        ? otherAreas
        : { ...otherAreas, video: reels === true || watch === true };
  }
  return next;
}

/**
 * Turns whatever is in storage into valid, current Settings.
 *
 * Fails open: anything missing or malformed falls back to its default rather
 * than throwing, so a corrupted storage entry can never break the extension.
 */
export function migrate(
  raw: unknown,
  steps: Readonly<Record<number, MigrationStep>> = MIGRATIONS,
  currentVersion: number = CURRENT_SCHEMA_VERSION,
): Settings {
  // Nothing stored (or junk): treat as a fresh install.
  if (!isObject(raw)) return { ...defaultSettings(), schemaVersion: currentVersion };

  let data: RawObject = { ...raw };
  let version = typeof data.schemaVersion === 'number' ? data.schemaVersion : 1;
  while (version < currentVersion) {
    const step = steps[version];
    if (step) data = step(data);
    version += 1;
  }
  // A version newer than ours means a newer copy of the extension on another
  // device synced first. We keep the fields we understand and ignore the rest.
  return normalize(data, currentVersion);
}

function normalize(data: RawObject, currentVersion: number): Settings {
  const defaults = defaultSettings();
  const storedAreas = isObject(data.areas) ? data.areas : {};

  const seenSettings = filterSettingIds(data.seenSettings);
  const newSettings = filterSettingIds(data.newSettings);
  // Settings missing from storage just shipped for this user.
  const missing: SettingId[] = [];

  const areas = { ...DEFAULT_AREA_VALUE };
  for (const id of AREA_IDS) {
    const value = storedAreas[id];
    if (typeof value === 'boolean') areas[id] = value;
    else if (!(id in storedAreas)) missing.push(id);
  }

  let showEdgeTab = defaults.showEdgeTab;
  if (typeof data.showEdgeTab === 'boolean') showEdgeTab = data.showEdgeTab;
  else if (!('showEdgeTab' in data)) missing.push('showEdgeTab');

  for (const id of missing) {
    if (!seenSettings.includes(id) && !newSettings.includes(id)) newSettings.push(id);
  }

  return {
    schemaVersion: currentVersion,
    enabled: typeof data.enabled === 'boolean' ? data.enabled : defaults.enabled,
    areas,
    showEdgeTab,
    trayState: isTrayState(data.trayState) ? data.trayState : 'collapsed',
    seenSettings,
    newSettings,
  };
}

/** Same fail-open treatment for the per-device state in storage.local. */
export function normalizeLocalState(raw: unknown): LocalState {
  const state = defaultLocalState();
  if (!isObject(raw) || !isObject(raw.breakageHistory)) return state;
  for (const [ruleId, entry] of Object.entries(raw.breakageHistory)) {
    if (isRuleBreakage(entry)) state.breakageHistory[ruleId] = entry;
  }
  return state;
}

function isObject(value: unknown): value is RawObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTrayState(value: unknown): value is TrayState {
  return value === 'open' || value === 'collapsed';
}

function isSettingId(value: unknown): value is SettingId {
  return (SETTING_IDS as readonly unknown[]).includes(value);
}

/** Keeps known ids only, without duplicates. Unknown ids come from newer versions. */
function filterSettingIds(value: unknown): SettingId[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(isSettingId))];
}

function isRuleBreakage(value: unknown): value is RuleBreakage {
  return (
    isObject(value) &&
    typeof value.misses === 'number' &&
    value.misses >= 0 &&
    (value.brokenSince === null || typeof value.brokenSince === 'number') &&
    typeof value.announced === 'boolean'
  );
}
