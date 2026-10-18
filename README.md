<p align="center"><img src="assets/store/icon-128.png" width="96" height="96" alt=""></p>

# MarketplaceOnly

**Use Facebook just for Marketplace.** MarketplaceOnly makes Facebook behave like a standalone Marketplace app: opening Facebook lands you on Marketplace, and the Feed, Reels and video, Groups, Gaming, and notifications are hidden and out of reach. Messenger always works, because that's where Marketplace deals happen.

For Chrome and Firefox. Not affiliated with Meta.

## What it does

- **Lands you on Marketplace.** Visiting facebook.com, or any switched-off area such as `/groups/` or `/reel/`, takes you to Marketplace instead. That includes links clicked inside Facebook.
- **Hides the rest.** Top-bar icons, the notifications bell, and shortcuts to switched-off areas disappear.
- **Leaves buying and selling alone.** Listings, search, the Message Seller button, Messenger, and seller profiles are never touched.
- **You're in control.** A small tray on the right edge of Facebook lets you switch each area back on, instantly and without a reload. Click the toolbar icon to open or close it. The same settings are on the Options page.
- **Tells you when Facebook changes.** If a hiding rule stops finding what it looks for on 3 page loads in a row, the tray says "Couldn't find it" and opens once to let you know.

## Privacy

MarketplaceOnly has no server, no analytics, no accounts, and no remote code. Your settings stay in your browser (and its own sync). See [PRIVACY.md](PRIVACY.md).

## Install

- **Chrome:** Chrome Web Store (link coming soon)
- **Firefox:** Firefox Add-ons (link coming soon)

## Report a problem

Click **Report a problem** in the tray. It opens a [GitHub issue form](https://github.com/jagie/MarketplaceOnly/issues/new?template=problem.yml) with the version, browser, and page type filled in. It never includes the page address or anything personal.

## How it works

1. **Redirects are the backbone.** One function (`classifyRoute`) decides what every Facebook URL is. It drives both the browser's built-in redirect rules (for full page loads) and a small watcher for Facebook's in-app navigation, so the two never disagree. URLs rarely change, so this keeps working even if Facebook redesigns its pages.
2. **Cleanup is a layer on top.** One stylesheet hides switched-off areas, keyed to link targets and page roles rather than Facebook's generated class names. Nothing is ever removed from the page, and guardrails prevent hiding anything on Marketplace or in Messenger.

## Development

Requires Node 24 and npm 11.

```bash
npm ci                # install exact dependency versions
npm run dev:chrome    # build in watch mode for Chrome (load .output/chrome-mv3-dev unpacked)
npm run dev:firefox   # same for Firefox (.output/firefox-mv3-dev)
npm run test          # unit tests (Vitest)
npm run test:e2e      # browser tests (Playwright) against local page captures
npm run typecheck
npm run lint
npm run build         # production builds for both browsers in .output/
npm run zip           # store packages, plus the Firefox source package
```

Tests never touch the live Facebook site, and nothing ever logs in. Browser tests use sanitized captures of real pages in `tests/fixtures/captures/`, made with [`tools/capture-page-structure.js`](tools/capture-page-structure.js).

Product requirements and engineering rules are in [CLAUDE.md](CLAUDE.md) and [docs/prompts/prompt-v1.md](docs/prompts/prompt-v1.md).

### Building from source (for store reviewers)

```bash
npm ci
npm run build:firefox   # output: .output/firefox-mv3/
npm run build:chrome    # output: .output/chrome-mv3/
```

The build uses only the code in this repository: WXT (Vite) bundles and minifies TypeScript from `src/`, with no code generated from remote sources.

## License

[MIT](LICENSE). Not affiliated with, endorsed by, or sponsored by Meta Platforms, Inc.
