/**
 * Cap on in-page redirects per tab. If something unexpected makes Facebook
 * bounce us back to a blocked page, we stop redirecting rather than trap the
 * user in a loop. Network rules still apply on the next full page load.
 */
export const MAX_REDIRECTS = 3;
export const WINDOW_MS = 10_000;

/**
 * Given the times of recent redirects, decides whether another is allowed
 * now, and returns the updated list to store. Pure, so it's easy to test.
 */
export function checkRedirectBudget(
  recent: readonly number[],
  now: number,
): { allowed: boolean; recent: number[] } {
  const inWindow = recent.filter((t) => now - t < WINDOW_MS && t <= now);
  if (inWindow.length >= MAX_REDIRECTS) return { allowed: false, recent: inWindow };
  return { allowed: true, recent: [...inWindow, now] };
}
