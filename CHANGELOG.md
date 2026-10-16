# Changelog

All notable changes to MarketplaceOnly are recorded here.

## [Unreleased]

### Added
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
