/*
 * Renders the extension icon SVGs to PNGs with Playwright's Chromium
 * (developer tool, never shipped).
 *
 *   node tools/render-icons.mjs preview <out.png>   side-by-side candidates
 *   node tools/render-icons.mjs build <name>        assets/icon-candidates/<name>.svg
 *                                                   -> public/icon/*.png (manifest icons)
 *                                                   -> assets/store/icon-128.png (store listing)
 */
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const [mode, arg] = process.argv.slice(2);
const svgOf = (name) => readFileSync(`assets/icon-candidates/${name}.svg`, 'utf8');
const browser = await chromium.launch();

async function renderPng(svg, size, path, padding = 0) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const inner = size - padding * 2;
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}div{padding:${padding}px}svg{width:${inner}px;height:${inner}px;display:block}</style><div>${svg}</div>`,
  );
  await page.screenshot({ path, omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  await page.close();
}

if (mode === 'build') {
  const svg = svgOf(arg);
  mkdirSync('public/icon', { recursive: true });
  mkdirSync('assets/store', { recursive: true });
  for (const size of [16, 32, 48, 96, 128]) await renderPng(svg, size, `public/icon/${size}.png`);
  // Store listings want 96px of artwork with 16px of transparent padding.
  await renderPng(svg, 128, 'assets/store/icon-128.png', 16);
  console.log(`Built icons from ${arg}.svg`);
} else if (mode === 'preview') {
  const names = readdirSync('assets/icon-candidates').filter((f) => f.endsWith('.svg')).map((f) => f.slice(0, -4));
  const sizes = [16, 32, 48, 128];
  const row = (bg, fg) =>
    names
      .map(
        (name, i) =>
          `<div class="r" style="background:${bg};color:${fg}"><b>${String.fromCharCode(65 + i)} · ${name}</b>${sizes
            .map((s) => `<span style="width:${s}px;height:${s}px">${svgOf(name)}</span>`)
            .join('')}</div>`,
      )
      .join('');
  const page = await browser.newPage({ viewport: { width: 560, height: 300 } });
  await page.setContent(
    `<style>body{margin:0;font:14px system-ui}.r{display:flex;align-items:center;gap:24px;padding:16px 24px}.r b{width:130px}span{display:inline-block}span svg{width:100%;height:100%;display:block}h3{margin:0;padding:8px 24px;font-size:13px}</style>
     <h3>Light toolbar</h3>${row('#f1f3f4', '#202124')}
     <h3 style="background:#35363a;color:#fff">Dark toolbar</h3>${row('#35363a', '#fff')}`,
  );
  await page.screenshot({ path: arg, fullPage: true });
  console.log(`Preview written to ${arg}`);
}
await browser.close();
