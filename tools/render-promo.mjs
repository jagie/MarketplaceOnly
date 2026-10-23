/*
 * Renders the store promo images with Playwright's Chromium
 * (developer tool, never shipped):
 *
 *   node tools/render-promo.mjs
 *     -> assets/store/promo-small-440x280.png   Chrome "small promo tile" (search results)
 *     -> assets/store/promo-marquee-1400x560.png Chrome "marquee" (featured placements)
 *
 * Plain text only: no Facebook or Meta logos, colors, or styling.
 */
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const ICON = readFileSync('assets/icon-candidates/tag.svg', 'utf8');
const NAVY = '#1d3f8f';

/** A static copy of the tray (light mode), matching src/tray/styles.ts. */
const AREAS = ['Feed', 'Video (Reels & Watch)', 'Groups', 'Gaming', 'Notifications'];
const trayMock = `
  <div class="tray">
    <div class="tray-head"><span class="tag">${ICON}</span><b>MarketplaceOnly</b><span class="x">✕</span></div>
    <div class="row master"><div><b>Marketplace only</b><small>On</small></div><i class="sw on"></i></div>
    <div class="label">Show on Facebook</div>
    ${AREAS.map((a) => `<div class="row"><div><b>${a}</b><small>Hidden</small></div><i class="sw"></i></div>`).join('')}
    <div class="foot"><span>Reset to defaults</span><span>Report a problem</span></div>
  </div>`;

const BASE_CSS = `
  * { box-sizing: border-box; margin: 0; }
  body {
    width: var(--w); height: var(--h); overflow: hidden;
    font-family: system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
    background: radial-gradient(circle at 85% 15%, #2f5bc4 0%, ${NAVY} 45%, #132b63 100%);
    color: #fff; position: relative;
  }
  .copy { position: absolute; }
  .logo { display: flex; align-items: center; }
  .logo svg { display: block; border-radius: 22%; box-shadow: 0 0 0 2px rgba(255,255,255,.25); }
  .name { font-weight: 800; letter-spacing: -0.01em; }
  .headline { font-weight: 700; color: #fff; }
  .sub { color: #c9d7f7; }
  .tray {
    position: absolute; width: 300px; background: #fff; color: #050505;
    border-radius: 12px; padding: 12px 0 8px; transform-origin: top left;
    box-shadow: 0 24px 48px rgba(0,0,0,.35), 0 2px 6px rgba(0,0,0,.2);
    font-size: 14px; line-height: 1.35;
  }
  .tray-head { display: flex; align-items: center; gap: 8px; padding: 0 12px 8px; font-size: 17px; }
  .tray-head b { flex: 1; }
  .tray-head .tag svg { width: 22px; height: 22px; display: block; border-radius: 5px; }
  .tray-head .x { color: #65676b; font-size: 16px; }
  .row { display: flex; align-items: center; gap: 12px; padding: 7px 12px; }
  .row > div { flex: 1; }
  .row b { display: block; font-weight: 600; }
  .row small { display: block; font-size: 12px; color: #65676b; }
  .master { border-bottom: 1px solid #ced0d4; padding-bottom: 12px; margin-bottom: 4px; }
  .label { margin: 8px 12px 0; font-size: 12px; font-weight: 600; color: #65676b; }
  .sw { width: 40px; height: 22px; border-radius: 11px; background: #bcc0c4; position: relative; flex: none; }
  .sw::after { content: ""; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: #fff; }
  .sw.on { background: #0866ff; }
  .sw.on::after { left: 21px; }
  .foot { display: flex; gap: 12px; margin-top: 4px; padding: 8px 12px 0; border-top: 1px solid #ced0d4; font-size: 13px; color: #0866ff; }
`;

const LAYOUTS = {
  'promo-small-440x280': {
    w: 440,
    h: 280,
    css: `
      .copy { left: 26px; top: 30px; width: 220px; }
      .logo svg { width: 52px; height: 52px; }
      .name { font-size: 25px; margin-top: 14px; }
      .headline { font-size: 17px; margin-top: 8px; line-height: 1.25; }
      .sub { font-size: 12.5px; margin-top: 10px; line-height: 1.4; }
      .tray { left: 262px; top: 34px; transform: scale(0.6); }
    `,
    copy: `<div class="logo">${ICON}</div>
      <div class="name">MarketplaceOnly</div>
      <div class="headline">Facebook, just Marketplace.</div>
      <div class="sub">Hides the Feed, Reels, Groups &amp; notifications.</div>`,
  },
  'promo-marquee-1400x560': {
    w: 1400,
    h: 560,
    css: `
      .copy { left: 96px; top: 96px; width: 680px; }
      .logo svg { width: 96px; height: 96px; }
      .logo .name { font-size: 64px; margin-left: 28px; }
      .headline { font-size: 52px; margin-top: 40px; line-height: 1.15; }
      .sub { font-size: 24px; margin-top: 24px; line-height: 1.45; }
      .tray { left: 930px; top: 70px; transform: scale(1.18); }
    `,
    copy: `<div class="logo">${ICON}<div class="name">MarketplaceOnly</div></div>
      <div class="headline">Facebook, just Marketplace.</div>
      <div class="sub">Lands you on Marketplace and hides the Feed, Reels, Groups,<br>Gaming &amp; notifications. Messenger always works.</div>`,
  },
};

const browser = await chromium.launch();
for (const [name, layout] of Object.entries(LAYOUTS)) {
  const page = await browser.newPage({ viewport: { width: layout.w, height: layout.h } });
  await page.setContent(
    `<style>body{--w:${layout.w}px;--h:${layout.h}px}${BASE_CSS}${layout.css}</style>
     <div class="copy">${layout.copy}</div>${trayMock}`,
  );
  await page.screenshot({ path: `assets/store/${name}.png` });
  await page.close();
  console.log(`Wrote assets/store/${name}.png`);
}
await browser.close();
