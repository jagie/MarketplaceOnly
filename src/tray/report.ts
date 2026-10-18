import type { RouteClass } from '@/routes/classifyRoute';
import type { RuleStatus } from '@/cleanup/status';
import { RULES } from '@/cleanup/rules';

export const ISSUES_URL = 'https://github.com/jagie/MarketplaceOnly/issues/new';
/** The issue form in .github/ISSUE_TEMPLATE/; its field ids match the keys below. */
export const ISSUE_FORM = 'problem.yml';

/** A page type in plain words. Never the URL, so no IDs or names leak. */
const PAGE_TYPES: Record<RouteClass, string> = {
  marketplace: 'Marketplace',
  messenger: 'Messenger',
  'profile-or-page': 'profile or Page',
  'always-allowed': 'account or settings page',
  other: 'other Facebook page',
  feed: 'Feed',
  video: 'Reels or video',
  groups: 'Groups',
  gaming: 'Gaming',
  notifications: 'Notifications',
  events: 'Events',
  pages: 'Pages directory',
  friends: 'Friends',
};

export function describeBrowser(userAgent: string): string {
  const firefox = /Firefox\/([\d.]+)/.exec(userAgent);
  if (firefox) return `Firefox ${firefox[1]}`;
  const edge = /Edg\/([\d.]+)/.exec(userAgent);
  if (edge) return `Edge ${edge[1]}`;
  const chrome = /Chrome\/([\d.]+)/.exec(userAgent);
  if (chrome) return `Chrome ${chrome[1]}`;
  return 'Unknown browser';
}

export interface ReportInput {
  version: string;
  userAgent: string;
  route: RouteClass;
  /** Marketplace listing pages get a more specific description. */
  isListing: boolean;
  statuses: Record<string, RuleStatus>;
}

/**
 * Opens the GitHub problem form with the technical fields filled in: the
 * extension version, browser, page type, and which rules couldn't find
 * their target. Nothing else. The user sees and edits all of it, and
 * nothing is sent until they press Submit on GitHub.
 */
export function buildReportUrl(input: ReportInput): string {
  const notFound = RULES.filter((rule) => input.statuses[rule.id] === 'not-found').map((rule) => rule.id);
  const pageType = input.isListing ? 'Marketplace listing' : PAGE_TYPES[input.route];

  const url = new URL(ISSUES_URL);
  url.searchParams.set('template', ISSUE_FORM);
  url.searchParams.set('title', `Problem on a ${pageType} page`);
  url.searchParams.set('page_type', pageType);
  url.searchParams.set('couldnt_find', notFound.length ? notFound.join(', ') : 'none');
  url.searchParams.set('browser', describeBrowser(input.userAgent));
  url.searchParams.set('version', input.version);
  return url.toString();
}
