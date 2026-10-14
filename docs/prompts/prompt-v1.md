# Build: MarketplaceOnly browser extension (Chrome + Firefox, one codebase)

## Who you're working with
I'm a product leader, not a full-time engineer. I'll review your work milestone by milestone. Before writing any code, read this whole prompt, ask me any clarifying questions, then show me your plan for Milestone 1. Do not start the next milestone until I approve the current one. Explain non-obvious technical choices in plain language when you make them.

## The problem
Many people only use Facebook for Marketplace. Every visit drops them into the feed, Reels, Groups, and notifications, which are designed to keep them scrolling. Existing extensions either filter Marketplace listings or block one thing (like Reels). None make Facebook show only Marketplace.

## The product
An extension that makes Facebook behave like a standalone Marketplace app:
- Opening Facebook lands you on Marketplace.
- Feed, Reels, Watch, Groups, Gaming, and notifications are hidden and, where they have their own page, unreachable.
- Messenger always works, because that's where Marketplace deals happen.
- A small in-page tray lets users turn each area back on. One toggle per area controls both hiding AND redirecting.

Name: MarketplaceOnly. Do not use "Facebook" or Meta logos in the name or icon. The listing will say "Not affiliated with Meta."

## Product principles (use these to settle any judgment call)
1. **Fail open, never fail broken.** If a rule can't find what it's looking for, the worst outcome is extra clutter. It must never hide Marketplace content, the Message Seller button, search, or Messenger.
2. **The redirect is the backbone, cleanup is a layer.** Redirects key off URLs, which rarely change. Hiding keys off page structure, which changes often. The product must still be useful if every hiding rule breaks.
3. **Users are in control.** Opinionated defaults, every one reversible from the tray, no reload required.
4. **Quiet by default.** The tray stays collapsed unless there's a reason for the user to look at it.
5. **Private by design.** No server, no analytics, no accounts, no remote code. Nothing leaves the browser except what the user chooses to send in a bug report.

## Tech stack
- **WXT** framework with **TypeScript**, Manifest V3 for both Chrome and Firefox.
- One codebase. Use WXT's per-browser handling for manifest differences (Firefox needs `browser_specific_settings.gecko.id`; check AMO's current requirements for declaring data collection, which should be "none").
- Firefox MV3 treats host permissions as optional. Handle the case where the user hasn't granted facebook.com access: show a clear prompt to grant it on first run.
- Use `browser.*` via WXT's wrapper, not raw `chrome.*`.
- Permissions: `storage`, `declarativeNetRequest` (or the `WithHostAccess` variant if needed), host access to `https://www.facebook.com/*` and `https://web.facebook.com/*` only. Justify every permission in a comment in the config. No `tabs`, `history`, `cookies`, or `<all_urls>`.
- Testing: Vitest for unit tests, Playwright for tray and cleanup tests against local HTML fixtures.
- **Never automate logging into Facebook.** No test should touch the live site. I'll do live testing by hand.

## Architecture

### 1. Settings (single source of truth)
- Stored in `storage.sync` so settings follow the user across devices. Fall back to `storage.local` if sync is unavailable.
- Schema includes a `schemaVersion` number. Write a migration function and unit-test it. When a new toggle ships, migration adds it with its default and flags it as "new."
- Fields: master on/off, one boolean per area, `showEdgeTab`, `trayState` (collapsed/open), `seenSettings` (to detect new ones), breakage history.
- All parts of the extension (background, content scripts, tray) react live to setting changes. No reloads.

### 2. Route classifier (pure function, heavily tested)
- `classifyRoute(url) -> area | "marketplace" | "messenger" | "profile-or-page" | "always-allowed" | "other"`
- This one function decides what every URL is. Both the network rules and the in-app navigation watcher use it, so they can never disagree.
- Starting route map. Verify these against current Facebook and flag anything that looks wrong:

| Area | Routes |
|---|---|
| Feed | `/`, `/home.php`, `/stories/*` |
| Reels | `/reel/*`, `/reels/*` |
| Watch | `/watch*` |
| Groups | `/groups/*` |
| Gaming | `/gaming*` |
| Notifications | `/notifications*` |
| Marketplace | `/marketplace*` |
| Messenger (always allowed) | `/messages/*`, plus anything Messenger needs |
| Always allowed | login, logout, checkpoint/security, two-factor, account recovery, settings, privacy, help, OAuth dialogs |
| Events, Pages, Friends (allowed in v1, not toggles) | `/events/*`, `/pages/*`, `/friends/*` |
| Profile and Pages (allowed, untouched in v1) | `/profile.php?id=*`, `/{username}` |
| Other | anything unmatched: allowed (fail open) |

- Unit tests: at least 40 URL cases including query strings, trailing slashes, `web.facebook.com`, encoded characters, and tricky ones like a username that starts with "groups".
- Structure the route map so any allowed area can become a toggle later without rework.

### 3. Redirect backbone
- **Full page loads:** `declarativeNetRequest` dynamic rules, `main_frame` only, redirecting toggled-off areas to `/marketplace/`. Rebuild rules whenever settings change.
- **In-app navigation:** Facebook is a single-page app, so clicking a link often changes the URL without a page load. Detect these changes (a small main-world script that hooks `history.pushState`/`replaceState` and dispatches an event, plus `popstate`) and call `location.replace('/marketplace/')` when the new route is a toggled-off area.
- Use `replace`, not `assign`, so the back button doesn't trap users in a redirect loop.
- Guard against loops: never redirect from Marketplace, Messenger, or always-allowed routes, and cap redirects per tab per few seconds.

### 4. Cleanup layer
- One rule per area, defined in a single `rules.ts` registry so adding or fixing a rule touches one place. Each rule has: `id`, `label`, `area`, `selectors`, `expectedOn` (which route types it should find something on), and `neverMatchInside` guards.
- Hide via an injected stylesheet. Toggles add or remove classes on `<html>` (e.g. `html.mo-hide-groups ...`). Never delete nodes, so toggling back on is instant and safe.
- Selector priority, most stable first:
  1. Link targets: `a[href^="/groups/"]`, `a[href*="/reel/"]`, etc.
  2. Structural roles: `[role="navigation"]`, `[role="banner"]`, with `:has()` to hide a container that holds a matching link.
  3. Accessibility labels (`aria-label="Notifications"`) only as a last resort. These are language-specific, so for v1 support English and note this limitation.
  4. Never Facebook's generated class names.
- **Guardrails:** cleanup must never hide anything inside Marketplace's main listing area, listing detail pages, the Message Seller/Send button, Marketplace search, or Messenger. Write explicit Playwright tests for this.
- Re-apply as Facebook loads content (a debounced `MutationObserver`). Keep it cheap: no per-mutation full-document scans.

### 5. Seller profiles and Pages
Profiles and Pages stay reachable and untouched in v1. Facebook uses the same URL format for both, so don't try to tell them apart. No cleanup rules run on these routes. Global nav hiding (top bar icons) still applies since it's the same nav on every page.

### 6. Status and breakage detection
- Each enabled rule reports a status: **Hidden** (found and hidden), **Not on this page**, **Couldn't find it** (expected on this page but found nothing after the page settles), or **Off**.
- Avoid false alarms: only treat a rule as broken after it fails on 3 separate page loads where it was expected. Store this in breakage history.
- When a rule newly breaks, open the tray once to show it. Don't reopen for the same breakage.

### 7. The tray
- Rendered in a **Shadow DOM** attached to `document.documentElement` (not to any Facebook container), `position: fixed`, top layer z-index, so Facebook's styles and layout changes can't affect it.
- **Collapsed state:** a small tab on the right edge, vertically centered, roughly 28px wide, showing the extension icon. A dot on the tab if something is broken or new.
- **Open state:** a panel about 300px wide containing:
  - Master on/off switch at the top
  - One row per area: name, toggle, status indicator ("Hidden", "Couldn't find it", etc.), and a "New" badge if recently added
  - "Reset to defaults" (with a confirm step)
  - "Report a problem"
  - Version number
- **When it opens on its own:** first install, a rule newly breaks, a new setting ships. Otherwise it stays collapsed and remembers the user's last choice.
- Clicking the toolbar icon toggles the tray on Facebook tabs, and opens Marketplace on any other tab.
- Setting to hide the edge tab entirely (then the toolbar icon is the only way in).
- Accessible: keyboard navigable, visible focus, Esc closes, proper labels, works with screen readers.
- Matches Facebook's light and dark mode. Clean and minimal; it should feel native, not like an ad.

### 8. Report a problem
- Opens a prefilled GitHub new-issue page at `https://github.com/jagie/MarketplaceOnly/issues/new`.
- Prefill: extension version, browser and version, which rules show "Couldn't find it," and the page **type** (e.g. "marketplace listing," "profile or page") rather than the actual URL. No IDs, names, or personal data.
- The user sees and edits everything before submitting.

## User stories and acceptance criteria

**1. Toggle Groups off (reference story; model the other areas on it)**
As a Facebook user who only uses Marketplace, I want to toggle Groups off so I'm not pulled into group posts while shopping.
- Groups is off by default.
- With Groups off: Groups links, shortcuts, and nav icons are hidden everywhere; visiting any `/groups/` URL (typed, bookmarked, or clicked inside Facebook) lands me on Marketplace; the back button doesn't loop.
- Turning Groups on in the tray immediately shows Groups links and stops redirecting, no reload.
- Status shows "Hidden" when Groups elements are found and hidden.
- Turning Groups back off works the same way, instantly.

**2. Same pattern for Feed, Reels, Watch, Gaming, Notifications.** All off by default. With Feed off, opening facebook.com lands on Marketplace.
- Notifications: hide the bell and its badge count, and redirect `/notifications`. Messenger's unread badge stays visible.

**3. Messenger always works**
As a buyer, I need to message sellers.
- Messenger is not a toggle. Message Seller buttons, chat windows, the Messenger icon, and `/messages/` always work, in every settings combination. Tests prove it.

**4. Vet a seller**
As a buyer, I want to check a seller's profile before meeting them.
- Clicking a seller's name opens their profile or Page normally, with no content hidden beyond the global nav icons.

**5. Quiet tray**
As a daily user, I don't want the tray in my face.
- Opens automatically only on first install, new breakage, or new settings. Otherwise collapsed.

**6. Know when something's broken**
As a user, I want to know when the extension stops working so I'm not confused.
- Broken rules show "Couldn't find it." The tab shows a dot. The tray opens once.

**7. Start over**
- "Reset to defaults" restores all defaults after a confirm.

**8. Report a problem**
- One click opens a prefilled, privacy-safe GitHub issue.

**9. Settings follow me**
- Changes on one computer appear on another signed into the same browser account.

**10. Pause**
- Master switch off: Facebook behaves normally, and the tray tab stays so I can turn it back on.

## Milestones (stop for my review after each)
1. **Scaffold + route classifier.** WXT project, both browser builds working, settings schema with migrations, classifier with full unit tests. I load it unpacked in both browsers. Also create a `CLAUDE.md` at the repo root containing the product principles, guardrails, tech stack rules, and code quality standards from this prompt, so they apply to every future session. Point it to `docs/prompts/prompt-v1.md` for full requirements.
2. **Redirect backbone.** Network rules + in-app navigation watcher wired to settings (temporarily via a debug popup is fine). I use it for a few days.
3. **Cleanup layer.** Rule registry, stylesheet hiding, guardrail tests.
4. **Tray.** Shadow DOM tray, all states and auto-open logic, status indicators, reset, report link, accessibility.
5. **Ship prep.** README, `PRIVACY.md` (plain language: nothing collected, nothing sent), store listing copy for Chrome and Firefox, icon set, `wxt zip` for both browsers including the source zip Firefox requires for bundled code, and a manual test checklist for me covering every story above.

## Out of scope for v1 (don't build, but don't design against)
- Point-and-click element picker
- Mobile site (`m.facebook.com`) and the Facebook app
- Languages other than English for accessibility-label rules
- Safari
- Hiding Events, Pages, Friends, or any other unlisted area. These stay reachable and untouched in v1.
- Cleanup on profiles and Pages (candidate for a v1.1 "Clean up profiles" toggle)
- Any automated maintenance agent

## Code quality
- Small files, clear names, comments that explain *why*.
- No `any` in TypeScript.
- `npm run test`, `npm run build`, `npm run dev:chrome`, `npm run dev:firefox`, `npm run zip` all work.
- Keep a `CHANGELOG.md` from the first commit.
