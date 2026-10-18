# MarketplaceOnly

A Chrome + Firefox extension that makes Facebook behave like a standalone Marketplace app. Full requirements, architecture, user stories, and milestones: [docs/prompts/prompt-v1.md](docs/prompts/prompt-v1.md). Read it before making product decisions.

## Working with the owner
- The owner is a product leader, not a full-time engineer. Explain non-obvious technical choices in plain language.
- Work milestone by milestone. Stop for review after each; don't start the next until approved.
- Never use "Facebook" or Meta logos in the name or icon. Listings say "Not affiliated with Meta."

## Product principles (settle every judgment call with these)
1. **Fail open, never fail broken.** If a rule can't find its target, the worst outcome is extra clutter. Never hide Marketplace content, the Message Seller button, search, or Messenger.
2. **The redirect is the backbone; cleanup is a layer.** Redirects key off URLs (stable). Hiding keys off page structure (fragile). The product must still be useful if every hiding rule breaks.
3. **Users are in control.** Opinionated defaults, every one reversible from the tray, no reload required.
4. **Quiet by default.** The tray stays collapsed unless there's a reason to look.
5. **Private by design.** No server, no analytics, no accounts, no remote code. Nothing leaves the browser except what the user chooses to send in a bug report.

## Guardrails
- Cleanup must never hide anything inside Marketplace's listing area, listing detail pages, the Message Seller/Send button, Marketplace search, or Messenger. Playwright tests must prove this.
- Messenger is never a toggle and works in every settings combination.
- Never redirect from Marketplace, Messenger, or always-allowed routes (login, checkpoint, 2FA, recovery, settings, privacy, help, OAuth, `/l.php`). Use `location.replace`, not `assign`. Cap redirects per tab.
- Profiles and Pages are reachable and untouched in v1 (only global nav hiding applies).
- Unmatched URLs are "other" and always allowed.
- Hide via an injected stylesheet + classes on `<html>`. Never delete nodes.
- Selector priority: link targets → structural roles (with `:has()`) → English aria-labels as a last resort. Never Facebook's generated class names.
- Bug reports include the page *type*, never the URL, IDs, names, or personal data.

## Tech stack rules
- WXT + TypeScript, Manifest V3 for both Chrome and Firefox (Firefox builds need `--mv3`; the npm scripts pass it).
- Use `browser.*` from WXT, never raw `chrome.*`.
- Permissions: `storage`, `declarativeNetRequestWithHostAccess`, hosts `https://www.facebook.com/*` and `https://web.facebook.com/*` only. Every permission has a justification comment in `wxt.config.ts`. Never add `tabs`, `history`, `cookies`, or `<all_urls>`.
- Firefox gecko id `marketplaceonly@jagie.dev` is permanent. Minimums: Chrome 120, Firefox 128.
- Settings live in `storage.sync` (fallback `storage.local`); per-device breakage history lives in `storage.local`. Every schema change goes through `src/settings/migrate.ts` with tests.
- `classifyRoute` (`src/routes/`) is the single source of truth for what a URL is. Network rules and the navigation watcher must both derive from `src/routes/routeMap.ts`, and both decide via `shouldRedirect` in `src/redirect/policy.ts`. `networkRules.test.ts` checks they agree on every URL in `src/routes/urlCases.ts`; add new URLs there.
- Cleanup rules live only in `src/cleanup/rules.ts`. Link selectors are generated from the route map (`linkSelectors.ts`); guards are applied to every rule in `stylesheet.ts`. Fixtures are sanitized captures in `tests/fixtures/captures/` (made with `tools/capture-page-structure.js`); fix a rule by adding or refreshing a capture and a test.
- Testing: Vitest for unit tests (`npm run test`), Playwright against local HTML fixtures (`npm run test:e2e`, which builds first). **Never automate logging into Facebook. No test touches the live site.**

## Code quality
- Small files, clear names, comments that explain *why*.
- No `any` (ESLint enforces it).
- These must all work: `npm run test`, `npm run build`, `npm run dev:chrome`, `npm run dev:firefox`, `npm run zip`, plus `npm run typecheck` and `npm run lint`.
- Update `CHANGELOG.md` with every change.
