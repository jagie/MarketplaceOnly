import { describe, expect, it } from 'vitest';
import { defaultSettings } from '@/settings/defaults';
import type { RouteClass } from '@/routes/classifyRoute';
import { redirectedAreas, shouldRedirect } from './policy';

const NEVER_REDIRECTED: RouteClass[] = [
  'marketplace',
  'messenger',
  'always-allowed',
  'profile-or-page',
  'other',
  'events',
  'pages',
  'friends',
];

describe('shouldRedirect', () => {
  it('redirects every area that is off by default', () => {
    const settings = defaultSettings();
    for (const area of ['feed', 'video', 'groups', 'gaming', 'notifications'] as const) {
      expect(shouldRedirect(area, settings)).toBe(true);
    }
  });

  it('stops redirecting an area once it is turned on', () => {
    const settings = defaultSettings();
    settings.areas.groups = true;
    expect(shouldRedirect('groups', settings)).toBe(false);
    expect(shouldRedirect('video', settings)).toBe(true);
  });

  it('never redirects anything when the master switch is off', () => {
    const settings = { ...defaultSettings(), enabled: false };
    expect(shouldRedirect('groups', settings)).toBe(false);
    expect(redirectedAreas(settings)).toEqual([]);
  });

  it.each(NEVER_REDIRECTED)('never redirects %s in any settings combination', (route) => {
    for (const enabled of [true, false]) {
      for (const on of [true, false]) {
        const settings = { ...defaultSettings(), enabled };
        for (const id of Object.keys(settings.areas) as (keyof typeof settings.areas)[]) {
          settings.areas[id] = on;
        }
        expect(shouldRedirect(route, settings)).toBe(false);
      }
    }
  });
});
