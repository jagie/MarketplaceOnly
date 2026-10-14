import { defineConfig } from 'wxt';

// Only these two hosts. m.facebook.com is out of scope for v1, and we never
// ask for <all_urls>: the extension has no business on any other site.
const FACEBOOK_HOSTS = ['https://www.facebook.com/*', 'https://web.facebook.com/*'];

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
    // so the extension asks for them on first run (Milestone 2).
    host_permissions: FACEBOOK_HOSTS,
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
