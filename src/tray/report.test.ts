import { describe, expect, it } from 'vitest';
import { buildReportUrl, describeBrowser } from './report';

const CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.7390.54 Safari/537.36';
const FIREFOX_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:144.0) Gecko/20100101 Firefox/144.0';

describe('describeBrowser', () => {
  it('names Chrome and Firefox with versions', () => {
    expect(describeBrowser(CHROME_UA)).toBe('Chrome 141.0.7390.54');
    expect(describeBrowser(FIREFOX_UA)).toBe('Firefox 144.0');
  });
});

describe('buildReportUrl', () => {
  const url = new URL(
    buildReportUrl({
      version: '0.1.0',
      userAgent: FIREFOX_UA,
      route: 'marketplace',
      isListing: true,
      statuses: { 'groups-top-bar': 'not-found', 'video-top-bar': 'hidden' },
    }),
  );
  const body = url.searchParams.get('body') ?? '';

  it('goes to the project issue page', () => {
    expect(url.origin + url.pathname).toBe('https://github.com/jagie/MarketplaceOnly/issues/new');
  });

  it('includes version, browser, page type, and broken rules', () => {
    expect(body).toContain('Version: 0.1.0');
    expect(body).toContain('Browser: Firefox 144.0');
    expect(body).toContain('Page type: Marketplace listing');
    expect(body).toContain('groups-top-bar');
    expect(body).not.toContain('video-top-bar');
    expect(url.searchParams.get('title')).toBe('Problem on a Marketplace listing page');
  });

  it('never includes a URL or anything from the page', () => {
    expect(body).not.toMatch(/facebook\.com|https?:\/\//);
  });
});
