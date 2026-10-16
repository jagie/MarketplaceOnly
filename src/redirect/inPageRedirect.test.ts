import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultSettings } from '@/settings/defaults';
import { redirectIfBlocked } from './inPageRedirect';
import { MAX_REDIRECTS } from './loopGuard';

function fakeLocation(href: string) {
  const replace = vi.fn<(url: string) => void>();
  return { location: { href, replace } as unknown as Location, replace };
}

describe('redirectIfBlocked', () => {
  // The loop cap remembers recent redirects; jump the clock a minute ahead
  // before each test so every test starts with a full allowance.
  let now = Date.UTC(2026, 0, 1);
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime((now += 60_000));
  });
  afterAll(() => {
    vi.useRealTimers();
  });

  it('replaces a switched-off area with Marketplace', () => {
    const { location, replace } = fakeLocation('https://www.facebook.com/groups/123/');
    expect(redirectIfBlocked(defaultSettings(), location)).toBe(true);
    expect(replace).toHaveBeenCalledWith('/marketplace/');
  });

  it('catches disguised paths the network rules miss', () => {
    const { location, replace } = fakeLocation('https://www.facebook.com/%67roups/123/');
    redirectIfBlocked(defaultSettings(), location);
    expect(replace).toHaveBeenCalledWith('/marketplace/');
  });

  it.each([
    'https://www.facebook.com/marketplace/item/1/',
    'https://www.facebook.com/messages/t/1',
    'https://www.facebook.com/login/',
    'https://www.facebook.com/zuck',
  ])('leaves %s alone', (href) => {
    const { location, replace } = fakeLocation(href);
    expect(redirectIfBlocked(defaultSettings(), location)).toBe(false);
    expect(replace).not.toHaveBeenCalled();
  });

  it('does nothing for an area the user turned on', () => {
    const settings = defaultSettings();
    settings.areas.groups = true;
    const { location, replace } = fakeLocation('https://www.facebook.com/groups/123/');
    expect(redirectIfBlocked(settings, location)).toBe(false);
    expect(replace).not.toHaveBeenCalled();
  });

  it(`stops after ${MAX_REDIRECTS} redirects in a row to avoid loops`, () => {
    const { location, replace } = fakeLocation('https://www.facebook.com/reel/1');
    for (let i = 0; i < MAX_REDIRECTS + 2; i++) redirectIfBlocked(defaultSettings(), location);
    expect(replace).toHaveBeenCalledTimes(MAX_REDIRECTS);
  });
});
