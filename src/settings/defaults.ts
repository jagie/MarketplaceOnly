import { AREA_IDS, SETTING_IDS, type AreaId, type LocalState, type Settings } from './schema';

export const CURRENT_SCHEMA_VERSION = 1;

/** Opinionated default: every distraction area is off. */
export const DEFAULT_AREA_VALUE: Record<AreaId, boolean> = Object.fromEntries(
  AREA_IDS.map((id) => [id, false]),
) as Record<AreaId, boolean>;

/** Settings for a brand-new install. Returns a fresh object each call. */
export function defaultSettings(): Settings {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    enabled: true,
    areas: { ...DEFAULT_AREA_VALUE },
    showEdgeTab: true,
    // Open on first install so the user sees what the extension did.
    trayState: 'open',
    // A new user is seeing everything for the first time, so nothing is "new".
    seenSettings: [...SETTING_IDS],
    newSettings: [],
  };
}

export function defaultLocalState(): LocalState {
  return { breakageHistory: {} };
}
