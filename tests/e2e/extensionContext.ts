import { readFileSync } from 'node:fs';
import path from 'node:path';
import { chromium, type BrowserContext, type Worker } from '@playwright/test';

/**
 * Launches Chromium with the real built extension (npm run build first)
 * and a fresh profile, so each call is a first install. Every request is
 * answered locally from the sanitized captures; nothing reaches Facebook.
 */
const EXTENSION = path.resolve('.output/chrome-mv3');
const capture = (file: string) => readFileSync(`tests/fixtures/captures/${file}`, 'utf8');

export async function launchWithExtension(): Promise<{ context: BrowserContext; worker: Worker }> {
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    args: [`--disable-extensions-except=${EXTENSION}`, `--load-extension=${EXTENSION}`],
  });
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === 'github.com') return route.fulfill({ contentType: 'text/html', body: '<title>issue</title>' });
    const file = url.pathname.startsWith('/marketplace/item/') ? 'listing-chat-open.html' : 'marketplace.html';
    let body = capture(file);
    // Simulates Facebook redesigning its top bar: our rules can't find it.
    if (url.pathname.includes('/redesigned/')) body = body.replace('role="banner"', 'role="none"');
    return route.fulfill({ contentType: 'text/html', body });
  });
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  return { context, worker };
}
