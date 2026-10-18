# Firefox Add-ons (AMO) listing

Copy each field into addons.mozilla.org → Submit a New Add-on.

## Upload

- **Distribution:** On this site
- **Platform:** Firefox for desktop (Android is out of scope for v1)
- **Package:** `.output/marketplaceonly-1.0.0-firefox.zip`
- **Source code:** Yes. Upload `.output/marketplaceonly-1.0.0-sources.zip`. The code is bundled and minified, so AMO requires the source.

## Listing

**Name**
> MarketplaceOnly

**Add-on URL**
> marketplaceonly

**Summary** (250 max)
> Use Facebook just for Marketplace. Opening Facebook lands you on Marketplace; the Feed, Reels, Groups, Gaming, and notifications are hidden. Messenger always works. A small tray lets you switch any area back on. Not affiliated with Meta.

**Description** (supports basic formatting)
> Only on Facebook for Marketplace? MarketplaceOnly turns Facebook into a standalone Marketplace app.
>
> **What it does**
> - Opening Facebook lands you on Marketplace
> - The Feed, Reels and video, Groups, Gaming, and notifications are hidden and can't be reached by accident
> - Messenger always works, so you can message buyers and sellers
> - Listings, search, Message Seller, and seller profiles are never touched
>
> **You're in control.** A small tray on the right edge of Facebook lets you switch any area back on, instantly, with no reload. Click the toolbar icon to open it, or pause everything with one switch.
>
> **Tells you when Facebook changes.** If something can't be hidden anymore, the tray says so, and you can report it in one click.
>
> **Private by design.** No accounts, no analytics, no tracking, no server.
>
> **First run:** Firefox asks you to allow the add-on on facebook.com. It runs on no other site.
>
> Free and open source: https://github.com/jagie/MarketplaceOnly
>
> Not affiliated with Meta.

**Categories:** Social & Communication; Shopping
**Tags:** facebook, marketplace, distraction, focus, productivity
**Support website:** https://github.com/jagie/MarketplaceOnly/issues
**License:** MIT License
**Privacy policy:** paste the text of `PRIVACY.md`
**Icon:** `assets/store/icon-128.png`
**Screenshots:** same set as Chrome (see `chrome-web-store.md`).

**Data collection:** the manifest declares `data_collection_permissions: { required: ["none"] }`, and AMO will show "This add-on doesn't collect data."

## Notes for reviewers

> Build from the attached source with Node 24 and npm 11:
>
>     npm ci
>     npm run build:firefox
>
> Output is in .output/firefox-mv3/ and matches the uploaded package. Bundling uses WXT (Vite); all source is in src/.
>
> Permissions: storage (user settings), declarativeNetRequestWithHostAccess (redirects switched-off Facebook areas to /marketplace/), and host access to www.facebook.com and web.facebook.com only. No remote code, no network requests of its own, no data collection.
>
> To test: allow the add-on on facebook.com when prompted, sign in to Facebook yourself, and visit facebook.com/groups/; you'll land on Marketplace. The tray on the right edge (or the toolbar icon) switches areas back on.
>
> Linter: two warnings say data_collection_permissions isn't supported before Firefox 140. strict_min_version is 128 (current ESR) on purpose; older versions ignore the key.
