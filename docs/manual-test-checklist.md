# Manual test checklist

Run this on real Facebook, signed in as yourself, in **both Chrome and Firefox** before each release. Each section matches a user story in [prompt-v1.md](prompts/prompt-v1.md). Tick a box only when it passes in both browsers.

Version tested: ______  Date: ______

## 0. Setup

- [ ] `npm run build` finishes without errors.
- [ ] **Chrome:** `chrome://extensions` → Developer mode → Load unpacked → `.output/chrome-mv3`. No errors on the card.
- [ ] **Firefox:** `about:debugging#/runtime/this-firefox` → Load Temporary Add-on → `.output/firefox-mv3/manifest.json`.
- [ ] **Firefox:** the setup page opens on its own. **Allow on facebook.com** shows Firefox's permission prompt, and accepting it shows "You're all set".
- [ ] Both: the toolbar shows the green price tag icon.
- [ ] **Fresh install only:** opening Facebook shows the tray already open (first install).

## 1. Toggle Groups off (reference story)

- [ ] Groups is off by default (its switch is off, and its status says "Hidden").
- [ ] The Groups icon isn't in the top bar, and Groups isn't in the left-side shortcuts (check on the Feed with Feed switched on).
- [ ] Typing `facebook.com/groups/` in the address bar lands on Marketplace.
- [ ] A bookmarked group link lands on Marketplace.
- [ ] A Groups link clicked inside Facebook (e.g. from a notification or search result) lands on Marketplace.
- [ ] After any of those, **Back** returns to where you were, without bouncing back to Marketplace.
- [ ] Switching Groups **on** in the tray brings the Groups icon back immediately, without a reload, and `/groups/` opens normally.
- [ ] Switching Groups **off** again hides it immediately.

## 2. Feed, Video, Gaming, Notifications

For each area, repeat the story 1 checks:

- [ ] **Feed:** opening `facebook.com` lands on Marketplace; the Home icon is hidden.
- [ ] **Video (Reels & Watch):** the Reels icon is hidden; `/reel/…`, `/reels/`, and `/watch/` land on Marketplace.
- [ ] **Gaming:** the Gaming icon is hidden; `/gaming/` lands on Marketplace.
- [ ] **Notifications:** the bell **and its red count** are hidden; `/notifications` lands on Marketplace.
- [ ] **Notifications:** Messenger's unread count stays visible.
- [ ] Each area, switched on, shows its icon again instantly and stops redirecting.

## 3. Messenger always works

In every combination you try (at least: everything off, everything on, master switch off):

- [ ] The Messenger icon in the top bar opens chats.
- [ ] `facebook.com/messages/` opens and shows your conversations.
- [ ] On a listing, **Message Seller** (or **Send**) opens a chat, and the message sends.
- [ ] Small chat windows at the bottom of the page work.

## 4. Vet a seller

- [ ] On a listing, clicking the seller's name opens their profile or Page normally.
- [ ] On that profile, only the top-bar icons are hidden; the profile itself is untouched.
- [ ] A seller's profile reached by its `profile.php?id=…` address works the same.

## 5. Quiet tray

- [ ] Close the tray, reload: it stays closed.
- [ ] Open another Facebook tab: the tray is closed there too.
- [ ] The side tab is a slim tag on the right edge, vertically centered, with no dot (unless something is broken or new).
- [ ] Toolbar icon on a Facebook tab: opens the tray; again: closes it.
- [ ] Toolbar icon on a non-Facebook tab (e.g. a news site): opens Marketplace in a **new** tab.
- [ ] Untick **Show the side tab** and close the tray: no tab; the toolbar icon still opens it.

## 6. Know when something's broken

Can't be forced on real Facebook; covered by automated tests. If you ever see it:

- [ ] A rule says **Couldn't find it** in red, the side tab has a dot, and the tray opened by itself once.
- [ ] Closing the tray doesn't make it reopen for the same problem; the dot stays until it's fixed.

## 7. Start over

- [ ] Switch a couple of areas on, then **Reset to defaults** → it asks first; **Cancel** changes nothing.
- [ ] **Reset to defaults** → **Reset** → every area is off again and the tray stays open.

## 8. Report a problem

- [ ] **Report a problem** opens GitHub's "Report a problem" form in a new tab. It needs the repository pushed to GitHub, with `.github/ISSUE_TEMPLATE/problem.yml` on the main branch.
- [ ] Page type, browser, version, and "Couldn't find it" are filled in.
- [ ] Nothing in the form contains a facebook.com address, a name, or page content.
- [ ] Closing the GitHub tab without submitting sends nothing.

## 9. Settings follow me

Needs two computers (or two browser profiles) signed in to the same Chrome or Firefox account with sync on:

- [ ] Switch Groups on in one; within about a minute, it's on in the other.

## 10. Pause

- [ ] Master switch off: Facebook looks completely normal (all icons back, no redirects).
- [ ] The side tab stays, so you can turn it back on.
- [ ] Master switch on: everything is hidden and redirecting again, with no reload.

## Options page and keyboard

- [ ] Right-click the toolbar icon → **Options** (Firefox: Manage Extension → Options): the same switches as the tray, and they stay in sync with it.
- [ ] Options shows the status list from your most recent Facebook tab.
- [ ] Keyboard only: Tab to the side tab, Enter opens, Tab moves through the switches, Space toggles, Esc closes.
- [ ] Switch Facebook to dark mode (Menu → Display & accessibility): the tray turns dark too.

## Store screenshots (while you're here)

1280×800 works for both stores. Before each screenshot:

- Use a listing with no faces or personal details visible, or blur them.
- Close chat windows that show names.
- Hide your profile picture in the top bar (crop or blur).

Suggested shots: Marketplace with the tray open; the tray close up; the collapsed side tab; a listing with Message Seller; the Options page.
