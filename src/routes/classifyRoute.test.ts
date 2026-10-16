import { describe, expect, it } from 'vitest';
import { classifyRoute, pathSegments } from './classifyRoute';
import { URL_CASES } from './urlCases';

describe('classifyRoute', () => {
  for (const [group, cases] of Object.entries(URL_CASES)) {
    describe(group, () => {
      it.each(cases)('%s -> %s', (url, expected) => {
        expect(classifyRoute(url)).toBe(expected);
      });
    });
  }

  it('accepts URL objects', () => {
    expect(classifyRoute(new URL('https://www.facebook.com/groups/1'))).toBe('groups');
  });
});

describe('pathSegments', () => {
  it('splits, decodes, lowercases, and drops empty segments', () => {
    expect(pathSegments('/Groups//%31%32%33/')).toEqual(['groups', '123']);
  });

  it('keeps malformed encodings as raw text instead of throwing', () => {
    expect(pathSegments('/%E0%A4%A/')).toEqual(['%e0%a4%a']);
  });
});
