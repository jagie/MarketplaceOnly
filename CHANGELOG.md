# Changelog

All notable changes to MarketplaceOnly are recorded here.

## [Unreleased]

### Added
- Milestone 1: project scaffold.
  - WXT + TypeScript project that builds Manifest V3 extensions for Chrome (120+) and Firefox (128+).
  - Minimal permissions (`storage`, `declarativeNetRequestWithHostAccess`, two Facebook hosts), each justified in `wxt.config.ts`.
  - Firefox declares that it collects no data (`data_collection_permissions: none`).
  - Settings schema with migrations: synced settings, per-device breakage history, automatic "new" flags when a toggle ships.
  - Route classifier (`classifyRoute`) with a declarative route map and 100+ URL test cases.
  - `CLAUDE.md` with the product principles, guardrails, and engineering rules.
