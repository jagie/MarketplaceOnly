import { defineConfig } from 'wxt';
import { FACEBOOK_MATCH_PATTERNS } from './src/routes/routeMap';

export default defineConfig({
  srcDir: 'src',
  zip: {
    // Store artwork isn't needed to build; keep the reviewer source package small.
    excludeSources: ['assets/store/**', 'assets/icon-candidates/**', 'site/**'],
  },
  manifest: ({ browser }) => ({
    // Store search treats "MarketplaceOnly" as one word, so the Chrome name
    // repeats "Marketplace" on its own plus the words people search for.
    // Firefox caps manifest names at 45 characters; there the full name is
    // typed into the Add-ons listing instead (which allows 50).
    name: browser === 'firefox' ? 'MarketplaceOnly' : 'MarketplaceOnly: Marketplace, Hide Feed & Reels',
    // Toolbar, menus, and other tight spaces use the short name.
    short_name: 'MarketplaceOnly',
    // Shown under the name in Chrome Web Store search results. Max 132 characters.
    description:
      'Use Facebook just for Marketplace. Hides the Feed, Reels, Groups, Gaming, and notifications, and lands you on Marketplace.',
    permissions: [
      // storage: saves the user's toggles (synced across their devices) and
      // per-device breakage history. Nothing is sent anywhere.
      'storage',
      // declarativeNetRequestWithHostAccess: redirects full page loads of
      // switched-off areas (e.g. /groups/) to /marketplace/. The "WithHostAccess"
      // variant only acts on hosts we already have permission for, so it adds
      // no "block content on any page" install warning that plain
      // declarativeNetRequest would.
      'declarativeNetRequestWithHostAccess',
    ],
    // Host access: lets the redirect rules and the in-page cleanup run on
    // Facebook, and nowhere else. Firefox treats these as optional in MV3,
    // so the extension asks for them on first run (onboarding page).
    // Only www and web.facebook.com: m.facebook.com is out of scope for v1,
    // and we never ask for <all_urls>.
    host_permissions: FACEBOOK_MATCH_PATTERNS,
    // No popup: clicking the icon toggles the in-page tray (or opens
    // Marketplace on other sites). Settings are also on the Options page.
    action: { default_title: 'MarketplaceOnly' },
    ...(browser === 'firefox'
      ? {
          browser_specific_settings: {
            gecko: {
              // Permanent: must never change after the first AMO upload.
              id: 'marketplaceonly@jagie.dev',
              // 128 is the current ESR and supports CSS :has() and DNR.
              strict_min_version: '128.0',
              // AMO's built-in data consent declaration: we collect nothing.
              data_collection_permissions: { required: ['none'] },
            },
          },
        }
      : {
          minimum_chrome_version: '120',
        }),
  }),
});
