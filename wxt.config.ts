import { defineConfig } from 'wxt';
import { FACEBOOK_MATCH_PATTERNS } from './src/routes/routeMap';

export default defineConfig({
  srcDir: 'src',
  manifest: ({ browser }) => ({
    name: 'MarketplaceOnly',
    description:
      'Make Facebook show only Marketplace and Messenger. Not affiliated with Meta.',
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
