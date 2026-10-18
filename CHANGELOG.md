# Changelog

All notable changes to MarketplaceOnly are recorded here.

## [Unreleased]

### Added (Milestone 4: tray)
- In-page tray in a shadow root on `<html>`: a slim edge tab (with a dot when something is broken or new) that opens a 300px panel with the master switch, one switch per area with its status and "New" badge, "Show the side tab", Reset to defaults (with confirm), Report a problem, and the version.
- Opens by itself only on first install, once per new breakage, and when a new setting ships; otherwise it remembers the last choice.
- Toolbar icon toggles the tray on Facebook tabs and opens Marketplace in a new tab elsewhere (or the setup page if facebook.com access is missing).
- Matches Facebook's light and dark mode. Keyboard accessible: switches are real buttons with `role="switch"`, focus moves into the tray when opened and back to the tab when closed, Esc closes, and typing in the tray never triggers Facebook shortcuts.
- Report a problem opens a prefilled GitHub issue with version, browser, page type, and rules that couldn't find their target; never URLs or page content.
- Options page (right-click the icon → Options) with the same settings and the latest tab's status; a way back in if the tray ever breaks.
- Playwright tests driving the real tray in the built extension.

### Changed (Milestone 4)
- The debug popup became the Options page.

### Added (Milestone 3: cleanup layer)
- Rule registry (`src/cleanup/rules.ts`): top-bar icons for Feed, Video, Groups, and Gaming; left-side shortcuts; the notifications bell, count, and pop-up.
- Hiding by one generated stylesheet plus attributes on `<html>`. Nothing is removed from the page, and toggles apply instantly.
- Guardrails in the stylesheet itself: nothing inside the main content, and nothing containing Marketplace links, Messenger, search, or Message Seller/Send, is ever hidden.
- Status per rule (Hidden, Not on this page, Couldn't find it, Off) and per-device breakage history; a rule only counts as broken after 3 page loads in a row. Top-bar rules don't alarm when someone's top bar simply lacks an icon.
- Debug popup shows each rule's status for the current tab.
- Playwright tests against sanitized captures of real pages (every settings combination), plus end-to-end tests running the built extension against them.
- `/fb-answers/` pages are recognized as a Facebook section, not a profile.

### Changed
- Reels and Watch are now one "Video" switch. Facebook opens Watch links in the Reels player, so two switches couldn't work independently. Settings migrate automatically (schema v2): if either was on, Video starts on.

### Added
- Developer tool `tools/capture-page-structure.js` that captures a privacy-safe skeleton of a Facebook page for building test fixtures, with a Playwright test proving it strips personal data (`npm run test:e2e`).
- Milestone 2: redirect backbone.
  - Network rules redirect full page loads of switched-off areas to `/marketplace/` (same host). Rules are generated from the route map and rebuilt whenever settings change.
  - In-app navigation watcher: a page-world hook on `pushState`/`replaceState` plus `popstate` redirects with `location.replace`, capped at 3 redirects per tab per 10 seconds.
  - Settings changes apply live, including redirecting away from an area the moment it's switched off.
  - Onboarding page asks for facebook.com access when the browser hasn't granted it (Firefox, or if revoked).
  - Temporary debug popup with the master switch and area toggles (replaced by the tray in Milestone 4).
  - Tests proving network rules and the classifier agree on every test URL, and that Marketplace, Messenger, and always-allowed routes are never redirected in any settings combination.
- Milestone 1: project scaffold.
  - WXT + TypeScript project that builds Manifest V3 extensions for Chrome (120+) and Firefox (128+).
  - Minimal permissions (`storage`, `declarativeNetRequestWithHostAccess`, two Facebook hosts), each justified in `wxt.config.ts`.
  - Firefox declares that it collects no data (`data_collection_permissions: none`).
  - Settings schema with migrations: synced settings, per-device breakage history, automatic "new" flags when a toggle ships.
  - Route classifier (`classifyRoute`) with a declarative route map and 100+ URL test cases.
  - `CLAUDE.md` with the product principles, guardrails, and engineering rules.
