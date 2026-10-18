import type { RouteClass } from '@/routes/classifyRoute';
import type { RuleStatus } from '@/cleanup/status';
import { RULES } from '@/cleanup/rules';

export const ISSUES_URL = 'https://github.com/jagie/MarketplaceOnly/issues/new';

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
 * A prefilled GitHub issue. Only the extension version, browser, page type,
 * and which rules couldn't find their target. The user sees and edits all
 * of it before anything is submitted.
 */
export function buildReportUrl(input: ReportInput): string {
  const notFound = RULES.filter((rule) => input.statuses[rule.id] === 'not-found').map(
    (rule) => `- ${rule.label} (\`${rule.id}\`)`,
  );
  const pageType = input.isListing ? 'Marketplace listing' : PAGE_TYPES[input.route];
  const body = [
    '**What happened?**',
    '',
    '<!-- Describe what you saw. Please do not include links, names, or screenshots with personal details. -->',
    '',
    '**Details** (filled in by MarketplaceOnly)',
    `- Version: ${input.version}`,
    `- Browser: ${describeBrowser(input.userAgent)}`,
    `- Page type: ${pageType}`,
    `- Couldn't find:${notFound.length ? '\n' + notFound.map((line) => '  ' + line).join('\n') : ' nothing'}`,
  ].join('\n');

  const url = new URL(ISSUES_URL);
  url.searchParams.set('title', 'Problem on a ' + pageType + ' page');
  url.searchParams.set('body', body);
  return url.toString();
}
