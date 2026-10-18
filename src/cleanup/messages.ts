import type { RouteClass } from '@/routes/classifyRoute';
import type { RuleStatus } from './status';

/** Asks a Facebook tab for its current cleanup status (Options page). */
export const GET_STATUS = 'marketplaceonly:get-status';

/** Sent by the toolbar icon to open or close the tray. */
export const TOGGLE_TRAY = 'marketplaceonly:toggle-tray';

export interface StatusReport {
  route: RouteClass;
  statuses: Record<string, RuleStatus>;
}
