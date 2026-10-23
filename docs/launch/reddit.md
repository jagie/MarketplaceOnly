# Reddit

**Before posting anywhere:** read each community's rules (sidebar or "About"). Many ban or limit self-promotion, and some allow it only on a set day or in a weekly thread. Post in one or two at a time, not all at once, and reply to comments. Say plainly that you made it.

## Where it fits

| Community | Fit | Notes |
|---|---|---|
| r/digitalminimalism | Strong | The "avoid the feed" angle. Lead with the problem, not the product. |
| r/nosurf | Strong | Same angle; often strict about promotion, so check the rules. |
| r/FacebookMarketplace | Strong audience | Likely strict on promotion; message the moderators first and ask. |
| r/chrome_extensions | Good | Allows sharing your own extensions. |
| r/firefox | Okay | Add-on posts are fine if useful; mention it's open source. |
| r/SideProject | Good | Builders sharing projects; the "built with Claude Code" story fits. |
| r/ClaudeAI / r/vibecoding | Good | The build story, not the product pitch. |

## Post: digital minimalism / nosurf version

**Title**
> I only use Facebook for Marketplace, so I made an extension that hides everything else

**Body**
> Every time I opened Facebook to check a listing, I'd end up in the feed or Reels for twenty minutes. Blocking Facebook entirely wasn't an option because Marketplace is where I buy and sell locally.
>
> So I made MarketplaceOnly, a free browser extension for Chrome and Firefox:
>
> - Opening Facebook takes you straight to Marketplace
> - The feed, Reels, Groups, Gaming, and the notifications bell are hidden, and their pages redirect to Marketplace
> - Messenger always works, so you can still message sellers
> - A small tab on the side lets you switch anything back on when you actually want it
>
> It collects no data and has no server; the code is open source.
>
> Chrome: <CHROME_STORE_URL>
> Firefox: <FIREFOX_ADDONS_URL>
> Website: https://jagie.github.io/MarketplaceOnly/
>
> I made it, so I'm biased. Honest feedback welcome, especially if it misses something on your Facebook.

## Post: builder version (r/SideProject, r/ClaudeAI, r/vibecoding)

**Title**
> I'm a product leader, not an engineer. I shipped a Chrome + Firefox extension with Claude Code by writing a spec and reviewing milestone by milestone

**Body**
> I wanted Facebook without the feed, just Marketplace. Instead of hacking it together, I wrote a product spec the way I would for a team: principles ("fail open, never fail broken", "private by design"), user stories with acceptance criteria, and five milestones. Then I worked through it with Claude Code, reviewing each milestone before the next.
>
> What surprised me:
> - The spec's principles settled most judgment calls on their own.
> - Testing without touching the live site: I captured sanitized "skeletons" of real Facebook pages (no names or text) and every test runs against those.
> - My own hands-on testing caught a product issue no test would: Facebook now opens Watch in the Reels player, so two separate switches made no sense. We merged them.
> - Store submission (privacy forms, a Firefox source package that rebuilds byte for byte) was a milestone of its own.
>
> Result: MarketplaceOnly, free and open source. Spec and code: https://github.com/jagie/MarketplaceOnly
>
> Happy to share the spec and what I'd do differently.
