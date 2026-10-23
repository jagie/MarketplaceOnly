# Show HN

Post at https://news.ycombinator.com/submit. Weekday mornings (US Eastern) tend to do best. Stay around for the first couple of hours to answer comments.

**Title** (80 max)
> Show HN: MarketplaceOnly – a browser extension that turns Facebook into just Marketplace

**URL**
> https://github.com/jagie/MarketplaceOnly

(Linking the repo rather than a store page fits Show HN better: people can read the code.)

**Text** (first comment, or the text field)

> I only use Facebook for Marketplace, but every visit starts in the feed, and five minutes later I'm watching Reels. Existing extensions block one thing (usually Reels) or filter listings; none of them make Facebook *only* Marketplace.
>
> MarketplaceOnly does three things:
>
> 1. Redirects: opening facebook.com, or any switched-off area (/groups/, /reel/, /notifications…), lands you on Marketplace. One pure function classifies every URL, and it drives both declarativeNetRequest rules (full page loads) and a small history.pushState hook (Facebook's in-app navigation), so the two can't disagree.
> 2. Cleanup: a single generated stylesheet hides the top-bar icons, bell, and shortcuts, keyed to link targets and ARIA roles rather than Facebook's generated class names. Nothing is removed from the DOM, and guard selectors make it impossible to hide anything in Marketplace or Messenger.
> 3. A small tray on the edge of the page to switch any area back on, which also reports when a hiding rule stops finding its target (after 3 page loads, to avoid false alarms).
>
> The design principle is "fail open": if Facebook redesigns its pages, the worst case is extra clutter, never a broken Marketplace, and the redirects keep working because URLs rarely change.
>
> No server, no analytics, no remote code. Chrome and Firefox from one codebase (WXT, MV3).
>
> Full disclosure: I'm a product leader, not a full-time engineer, and I built this with Claude Code, working milestone by milestone from a written spec. That's in the repo too (docs/prompts). Tests run against sanitized captures of real Facebook pages, since nothing is allowed to log in to the live site.
>
> Chrome: https://chromewebstore.google.com/detail/marketplaceonly/fgdfomakocapejmihcefffoaidmafbgp
> Firefox: <FIREFOX_ADDONS_URL>
>
> Happy to answer questions, and I'd love to hear where it breaks.

**Tips**
- Don't ask friends to upvote; HN detects and penalizes voting rings.
- Answer critical comments with thanks and specifics.
