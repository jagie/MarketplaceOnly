import { FACEBOOK_MATCH_PATTERNS } from '@/routes/routeMap';

const FACEBOOK_ORIGINS = { origins: FACEBOOK_MATCH_PATTERNS };

/**
 * Chrome grants facebook.com access at install. Firefox (MV3) treats it as
 * optional and the user can revoke it in either browser, so we check before
 * relying on it. Without access, nothing runs on Facebook at all.
 */
export function hasHostAccess(): Promise<boolean> {
  return browser.permissions.contains(FACEBOOK_ORIGINS);
}

/**
 * Must be called directly from a click handler: browsers only show the
 * permission prompt in response to a user action.
 */
export function requestHostAccess(): Promise<boolean> {
  return browser.permissions.request(FACEBOOK_ORIGINS);
}
