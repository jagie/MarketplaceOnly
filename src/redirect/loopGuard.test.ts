import { describe, expect, it } from 'vitest';
import { MAX_REDIRECTS, WINDOW_MS, checkRedirectBudget } from './loopGuard';

describe('checkRedirectBudget', () => {
  it('allows the first redirect and records it', () => {
    expect(checkRedirectBudget([], 1000)).toEqual({ allowed: true, recent: [1000] });
  });

  it(`allows up to ${MAX_REDIRECTS} redirects in the window, then blocks`, () => {
    let recent: number[] = [];
    const results: boolean[] = [];
    for (let i = 0; i < MAX_REDIRECTS + 2; i++) {
      const result = checkRedirectBudget(recent, 1000 + i * 100);
      results.push(result.allowed);
      recent = result.recent;
    }
    expect(results).toEqual([true, true, true, false, false]);
  });

  it('allows redirects again once old ones age out', () => {
    const recent = [1000, 1100, 1200];
    expect(checkRedirectBudget(recent, 1300).allowed).toBe(false);
    expect(checkRedirectBudget(recent, 1200 + WINDOW_MS).allowed).toBe(true);
  });

  it('ignores timestamps from the future (clock changes)', () => {
    expect(checkRedirectBudget([9e15, 9e15, 9e15], 1000).allowed).toBe(true);
  });
});
