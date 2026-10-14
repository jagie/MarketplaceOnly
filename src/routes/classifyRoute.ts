import type { AreaId } from '@/settings/schema';
import {
  FACEBOOK_HOSTS,
  PROFILE_PREFIXES,
  RESERVED_FIRST_SEGMENTS,
  ROUTE_MAP,
  type AllowedAreaId,
  type PathPattern,
  type RouteEntry,
  type SegmentPattern,
} from './routeMap';

export type RouteClass =
  | AreaId
  | AllowedAreaId
  | 'marketplace'
  | 'messenger'
  | 'profile-or-page'
  | 'always-allowed'
  | 'other';

/**
 * Usernames and Page vanity names: letters, digits, periods, and (in older
 * Page URLs) hyphens. Anything with ".php" is a Facebook script, not a name.
 */
const NAME_SEGMENT = /^[\w.-]+$/;

/**
 * First segments the route map claims (e.g. "watch") are never usernames,
 * even when an entry is skipped, like /watch/?v=123 falling through to "other".
 */
const ROUTE_MAP_FIRST_SEGMENTS: ReadonlySet<string> = new Set(
  ROUTE_MAP.flatMap((entry) => [...(entry.prefixes ?? []), ...(entry.exact ?? [])])
    .map((pattern) => pattern[0])
    .filter((first): first is string => typeof first === 'string'),
);

/**
 * Decides what a URL is. Pure and synchronous so it can be unit-tested
 * exhaustively and called on every in-app navigation.
 *
 * Fails open: anything it can't parse or doesn't recognise is "other",
 * which is never redirected.
 */
export function classifyRoute(url: string | URL): RouteClass {
  const parsed = parseUrl(url);
  if (!parsed || !FACEBOOK_HOSTS.includes(parsed.hostname)) return 'other';

  const segments = pathSegments(parsed.pathname);

  for (const entry of ROUTE_MAP) {
    if (entryMatches(entry, segments, parsed.searchParams)) {
      if (entry.kind === 'toggleable-area' || entry.kind === 'allowed-area') return entry.id;
      return entry.kind;
    }
  }

  if (isProfileOrPage(segments)) return 'profile-or-page';
  return 'other';
}

function parseUrl(url: string | URL): URL | null {
  if (url instanceof URL) return url;
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

/**
 * "/Groups//123/" -> ["groups", "123"]. Each segment is percent-decoded so
 * "/%67roups/" can't sneak past, and lowercased because Facebook paths are
 * case-insensitive.
 */
export function pathSegments(pathname: string): string[] {
  return pathname
    .split('/')
    .filter((segment) => segment !== '')
    .map((segment) => safeDecode(segment).toLowerCase());
}

function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    // Malformed encoding like "%E0%A4%A": match on the raw text instead.
    return segment;
  }
}

function entryMatches(entry: RouteEntry, segments: string[], query: URLSearchParams): boolean {
  if (entry.exceptWithQueryParam?.some((param) => query.has(param))) return false;
  const exact = entry.exact?.some((pattern) => matchesExactly(pattern, segments)) ?? false;
  return exact || startsWithAny(entry.prefixes ?? [], segments);
}

function startsWithAny(patterns: readonly PathPattern[], segments: string[]): boolean {
  return patterns.some(
    (pattern) =>
      pattern.length > 0 &&
      pattern.length <= segments.length &&
      pattern.every((part, i) => segmentMatches(part, segments[i])),
  );
}

function matchesExactly(pattern: PathPattern, segments: string[]): boolean {
  return (
    pattern.length === segments.length &&
    pattern.every((part, i) => segmentMatches(part, segments[i]))
  );
}

function segmentMatches(pattern: SegmentPattern, segment: string | undefined): boolean {
  if (segment === undefined) return false;
  return typeof pattern === 'string' ? pattern === segment : pattern.test(segment);
}

function isProfileOrPage(segments: string[]): boolean {
  if (startsWithAny(PROFILE_PREFIXES, segments)) return true;
  const first = segments[0];
  if (first === undefined) return false;
  if (RESERVED_FIRST_SEGMENTS.has(first) || ROUTE_MAP_FIRST_SEGMENTS.has(first)) return false;
  return NAME_SEGMENT.test(first) && !first.endsWith('.php');
}
