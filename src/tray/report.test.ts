import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ISSUE_FORM, buildReportUrl, describeBrowser } from './report';

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
      version: '1.0.0',
      userAgent: FIREFOX_UA,
      route: 'marketplace',
      isListing: true,
      statuses: { 'groups-top-bar': 'not-found', 'video-top-bar': 'hidden' },
    }),
  );
  const params = Object.fromEntries(url.searchParams);

  it('opens the problem form on the project issue page', () => {
    expect(url.origin + url.pathname).toBe('https://github.com/jagie/MarketplaceOnly/issues/new');
    expect(params.template).toBe('problem.yml');
  });

  it('fills in version, browser, page type, and broken rules', () => {
    expect(params).toMatchObject({
      title: 'Problem on a Marketplace listing page',
      page_type: 'Marketplace listing',
      couldnt_find: 'groups-top-bar',
      browser: 'Firefox 144.0',
      version: '1.0.0',
    });
  });

  it('sends nothing else: no URL, no page content', () => {
    expect(Object.keys(params).sort()).toEqual(['browser', 'couldnt_find', 'page_type', 'template', 'title', 'version']);
    expect(url.search).not.toMatch(/facebook\.com/);
  });

  it('every prefilled field exists in the GitHub form', () => {
    const form = readFileSync(`.github/ISSUE_TEMPLATE/${ISSUE_FORM}`, 'utf8');
    for (const id of ['page_type', 'couldnt_find', 'browser', 'version']) {
      expect(form, `form is missing field id "${id}"`).toContain(`id: ${id}`);
    }
  });
});
