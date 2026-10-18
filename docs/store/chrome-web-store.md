# Chrome Web Store listing

Copy each field into the Chrome Web Store Developer Dashboard.

## Store listing

**Name** (75 max)
> MarketplaceOnly

**Summary** (132 max)
> Use Facebook just for Marketplace. Hides the Feed, Reels, Groups, Gaming, and notifications, and lands you on Marketplace.

**Description**
> Only on Facebook for Marketplace? MarketplaceOnly turns Facebook into a standalone Marketplace app.
>
> WHAT IT DOES
> • Opening Facebook lands you on Marketplace
> • The Feed, Reels and video, Groups, Gaming, and notifications are hidden and can't be reached by accident
> • Messenger always works, so you can message buyers and sellers
> • Listings, search, Message Seller, and seller profiles are never touched
>
> YOU'RE IN CONTROL
> A small tray on the right edge of Facebook lets you switch any area back on, instantly, with no reload. Click the toolbar icon to open it, or pause everything with one switch.
>
> TELLS YOU WHEN FACEBOOK CHANGES
> If Facebook changes its pages and something can't be hidden anymore, the tray says so, and you can report it in one click.
>
> PRIVATE BY DESIGN
> No accounts, no analytics, no tracking, no server. Your settings stay in your browser.
>
> Free and open source: https://github.com/jagie/MarketplaceOnly
>
> Not affiliated with Meta.

**Category:** Productivity → Tools (alternative: Shopping)
**Language:** English

**Icon:** `assets/store/icon-128.png` (128×128 with transparent padding, as the store requires)

**Screenshots** (at least 1, up to 5; 1280×800 or 640×400). Take these yourself on real Facebook; see the tips in the manual test checklist. Suggested:
1. Marketplace with the tray open (top bar cleaned up)
2. The tray close up, showing switches and statuses
3. The collapsed side tab on Marketplace
4. A listing with the Message Seller button visible
5. The Options page

## Privacy practices tab

**Single purpose**
> MarketplaceOnly lets people use Facebook only for Marketplace: it redirects other Facebook areas to Marketplace and hides links to them, with a tray to switch each area back on.

**Permission justifications**
- `storage`: Saves the user's settings (which areas are shown, tray state) and a per-device count of hiding rules that failed, used to tell the user when Facebook changes.
- `declarativeNetRequestWithHostAccess`: Redirects full page loads of areas the user switched off (e.g. facebook.com/groups/) to facebook.com/marketplace/. Only page navigations on facebook.com are affected.
- Host permissions (`https://www.facebook.com/*`, `https://web.facebook.com/*`): Needed to hide switched-off areas on Facebook pages, show the settings tray, and apply the redirect rules. No other sites.

**Are you using remote code?**
> No, I am not using remote code.

**Data usage:** check none of the data types. Then certify all three statements (not sold to third parties; not used for unrelated purposes; not used for creditworthiness or lending).

**Privacy policy URL**
> https://github.com/jagie/MarketplaceOnly/blob/main/PRIVACY.md

## Package

Upload `.output/marketplaceonly-1.0.0-chrome.zip` (made by `npm run zip`).
