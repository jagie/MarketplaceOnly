import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const SCRIPT = readFileSync('tools/capture-page-structure.js', 'utf8');

/** A fake page with personal details the capture must never keep. */
const FAKE_PAGE = `<!doctype html><html class="__fb-dark-mode"><body>
  <div role="banner">
    <a href="/" aria-label="Facebook">logo</a>
    <a href="/groups/feed/?ref=bookmarks">Groups</a>
    <a href="/reel/987654321/">Reels</a>
    <div aria-label="Notifications, 3 unread" role="button"><span>3</span></div>
    <a href="/messages/t/111222333/" aria-label="Messenger">Messenger</a>
    <a href="/jane.doe.42" aria-label="Jane Doe's profile">Jane Doe</a>
  </div>
  <div role="main" data-pagelet="MarketplaceFeed123">
    <a href="/marketplace/item/5550001/?ref=search&referral_code=abc">Vintage oak dresser</a>
    <span>Lakewood, CO</span>
    <div role="button" aria-label="Message">Message</div>
    <img src="https://scontent.example/secret.jpg" alt="Jane Doe in front of house">
    <a href="https://www.facebook.com/l.php?u=https%3A%2F%2Fprivate.example%2Fme">link</a>
    <a href="https://private-blog.example/john">external</a>
  </div>
  <script>var secret = "token-123";</script>
</body></html>`;

test('capture keeps structure and strips personal data', async ({ page }) => {
  await page.route('https://www.facebook.com/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: FAKE_PAGE }),
  );
  await page.goto('https://www.facebook.com/marketplace/item/5550001/');
  await page.evaluate(SCRIPT);
  const html = await page.evaluate(() => (window as unknown as { __moCapture: () => string }).__moCapture());

  // Structure and safe interface words survive.
  expect(html).toContain('marketplace-item');
  expect(html).toContain('dark mode');
  expect(html).toContain('role="banner"');
  expect(html).toContain('href="/groups/feed/?ref={v}"');
  expect(html).toContain('href="/reel/{id}/"');
  expect(html).toContain('aria-label="Notifications, N unread"');
  expect(html).toContain('href="/messages/t/{id}/"');
  expect(html).toContain('aria-label="Message"');
  expect(html).toContain('data-pagelet="MarketplaceFeedN"');
  expect(html).toContain('href="/{name}"');
  expect(html).toContain('href="https://external.example/"');

  // Nothing personal or identifying survives.
  for (const secret of [
    'Jane',
    'Doe',
    'jane.doe',
    '987654321',
    '111222333',
    '5550001',
    'oak dresser',
    'Lakewood',
    'abc',
    'secret',
    'scontent',
    'private',
    'token',
    'john',
  ]) {
    expect(html, `capture leaked "${secret}"`).not.toContain(secret);
  }
});
