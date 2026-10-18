import { ROUTE_MAP, type PathPattern } from '@/routes/routeMap';
import type { AreaId } from '@/settings/schema';

/** Facebook writes links as "/groups/" or as full URLs; match all forms. */
const HREF_PREFIXES = ['', 'https://www.facebook.com', 'https://web.facebook.com'];

/**
 * CSS selectors for links into an area, derived from the route map so
 * hiding and redirecting always agree on what an area is.
 *
 * Matches whole segments: "/groups", "/groups/…", "/groups?…", but never
 * "/groupsforgood" (a username).
 */
export function areaLinkSelectors(area: AreaId): string[] {
  const selectors: string[] = [];
  for (const entry of ROUTE_MAP) {
    if (entry.kind !== 'toggleable-area' || entry.id !== area) continue;
    for (const pattern of entry.prefixes ?? []) selectors.push(...prefixLinks(pattern));
    for (const pattern of entry.exact ?? []) selectors.push(...exactLinks(pattern));
  }
  return selectors;
}

function toPath(pattern: PathPattern): string | null {
  // Regex segments can't be expressed as attribute selectors; skip them.
  if (!pattern.every((segment) => typeof segment === 'string')) return null;
  return '/' + pattern.join('/');
}

function prefixLinks(pattern: PathPattern): string[] {
  const path = toPath(pattern);
  if (path === null) return [];
  return HREF_PREFIXES.flatMap((host) => [
    `a[href="${host}${path}"]`,
    `a[href^="${host}${path}/"]`,
    `a[href^="${host}${path}?"]`,
  ]);
}

function exactLinks(pattern: PathPattern): string[] {
  const path = toPath(pattern);
  if (path === null) return [];
  if (path === '/') {
    return HREF_PREFIXES.flatMap((host) => [`a[href="${host}/"]`, `a[href^="${host}/?"]`]).concat(
      `a[href="https://www.facebook.com"]`,
    );
  }
  return HREF_PREFIXES.flatMap((host) => [`a[href="${host}${path}"]`, `a[href^="${host}${path}?"]`]);
}
