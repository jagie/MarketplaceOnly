import type { RuleStatus } from './status';

/** Asks the Facebook tab for its current cleanup status (debug popup, later the tray). */
export const GET_STATUS = 'marketplaceonly:get-status';

export interface StatusReport {
  route: string;
  statuses: Record<string, RuleStatus>;
}
