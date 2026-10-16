import { AREA_IDS, type AreaId, type Settings } from '@/settings/schema';
import type { RouteClass } from '@/routes/classifyRoute';

/** Where switched-off areas send the user. */
export const MARKETPLACE_PATH = '/marketplace/';

function isAreaId(route: RouteClass): route is AreaId {
  return (AREA_IDS as readonly string[]).includes(route);
}

/**
 * The one decision both redirect paths share: network rules (full page
 * loads) and the navigation watcher (in-app clicks). Only toggleable areas
 * that are switched off are ever redirected; Marketplace, Messenger,
 * always-allowed routes, profiles, and "other" never are.
 */
export function shouldRedirect(route: RouteClass, settings: Settings): boolean {
  return settings.enabled && isAreaId(route) && !settings.areas[route];
}

/** Areas that are switched off right now (none when the master switch is off). */
export function redirectedAreas(settings: Settings): AreaId[] {
  if (!settings.enabled) return [];
  return AREA_IDS.filter((id) => !settings.areas[id]);
}
