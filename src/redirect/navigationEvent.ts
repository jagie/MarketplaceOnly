/**
 * Event the page-world hook fires on window after Facebook changes the URL
 * without a page load. The two scripts run in separate JavaScript worlds but
 * share the DOM, so a DOM event is how they talk.
 */
export const NAVIGATION_EVENT = 'marketplaceonly:navigate';
