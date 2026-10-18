/*
 * MarketplaceOnly page-structure capture (developer tool, never shipped).
 *
 * Paste into the browser console on a facebook.com page. After a 5-second
 * countdown (time to open a menu or the notifications pop-up), it downloads
 * an HTML skeleton of the page for building realistic test fixtures.
 *
 * What it keeps: element types, ARIA roles, Facebook's data-pagelet markers,
 * and link destinations with every ID, username, and query value replaced
 * by a placeholder. Labels and text are kept only if every word is a common
 * interface word ("Notifications", "Message", "See all"); anything else,
 * including all names, posts, and listing titles, becomes "[text]". Images,
 * class names, and scripts are dropped.
 *
 * Open the downloaded file in a text editor to check it before sharing.
 */
(() => {
  const DELAY_SECONDS = 5;
  /** Keep at most this many look-alike siblings (e.g. listing cards). */
  const MAX_SIMILAR_SIBLINGS = 4;

  const UI_WORDS = new Set(
    `home video videos watch reels reel marketplace groups group gaming games notifications
    notification messenger messages message menu facebook search create account your profile
    controls and settings shortcuts see all send seller save saved share close more friends
    events pages page feeds feed stories story browse buy sell selling buying categories
    category unread read chats chat new back next previous like comment details information
    today picks inbox location filters is this still available hi the a an of to for in on
    with options open list listing listings item items photo photos n you new tab main
    navigation banner complementary contacts sponsored help privacy terms log out dark mode
    display accessibility give feedback switch profiles view sort by price condition
    delivery method radius vehicles property rentals apparel electronics entertainment
    family garden hobbies household supplies musical instruments office pet sporting goods
    toys free classifieds create new listing see more less public only me notifications`
      .split(/\s+/)
      .filter(Boolean),
  );

  /** Path segments that are Facebook features, not personal identifiers. */
  const KNOWN_SEGMENTS = new Set(
    `marketplace item category search you selling buying saved inbox profile messages t e2ee
    groups feed joins discover watch reel reels live gaming notifications events friends
    requests suggestions pages stories home.php profile.php people pg settings privacy help
    login logout.php checkpoint bookmarks photo photos videos posts about create notes
    permalink.php story.php photo.php l.php commerce listing vehicles propertyrentals
    apparel electronics entertainment family garden hobbies home-goods free toys sports
    instruments office pets classifieds deals nearby`
      .split(/\s+/)
      .filter(Boolean),
  );

  const DROP_TAGS = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'NOSCRIPT', 'TEMPLATE', 'IFRAME', 'CANVAS']);
  const EMPTY_TAGS = new Set(['SVG', 'IMG', 'VIDEO', 'IMAGE', 'PICTURE']);
  const KEPT_ATTRIBUTES = [
    'role',
    'aria-label',
    'aria-current',
    'aria-expanded',
    'aria-haspopup',
    'aria-hidden',
    'aria-selected',
    'aria-checked',
    'data-pagelet',
    'href',
    'type',
    'placeholder',
    'contenteditable',
  ];

  function cleanText(text) {
    const trimmed = text.replace(/\s+/g, ' ').trim();
    if (!trimmed) return '';
    const digitsAsN = trimmed.replace(/\d+/g, 'N');
    const words = digitsAsN.toLowerCase().split(/[^a-z']+/).filter(Boolean);
    const allUi = words.length > 0 && words.every((w) => UI_WORDS.has(w.replace(/'s$/, '')));
    if (/^[N+·,.\s]+$/.test(digitsAsN)) return digitsAsN; // badge counts like "3" or "9+"
    return allUi ? digitsAsN : '[text]';
  }

  function cleanHref(href) {
    let url;
    try {
      url = new URL(href, location.href);
    } catch {
      return '{invalid}';
    }
    if (!/(^|\.)facebook\.com$/.test(url.hostname)) return 'https://external.example/';
    const segments = url.pathname.split('/').filter(Boolean).map((seg, i) => {
      const lower = seg.toLowerCase();
      if (KNOWN_SEGMENTS.has(lower)) return lower;
      if (/^v\d+(\.\d+)?$/.test(lower)) return lower;
      if (/^\d+$/.test(seg)) return '{id}';
      return i === 0 ? '{name}' : '{x}';
    });
    const keys = [...new Set([...url.searchParams.keys()])].filter((k) => /^[\w-]{1,30}$/.test(k));
    const query = keys.length ? '?' + keys.map((k) => `${k}={v}`).join('&') : '';
    const trailing = url.pathname.endsWith('/') && segments.length ? '/' : '';
    return '/' + segments.join('/') + trailing + query;
  }

  function cleanAttribute(name, value) {
    if (name === 'href') return cleanHref(value);
    if (name === 'aria-label' || name === 'placeholder') return cleanText(value);
    if (name === 'data-pagelet') return value.replace(/\d+/g, 'N').replace(/[^\w]/g, '');
    return value.slice(0, 30);
  }

  /** Converts a live element into a sanitized copy, or null if it holds nothing useful. */
  function convert(element) {
    if (DROP_TAGS.has(element.tagName.toUpperCase())) return null;
    const tag = element.tagName.toLowerCase();
    const copy = document.createElement(tag === 'image' ? 'svg' : tag);

    let interesting = false;
    for (const name of KEPT_ATTRIBUTES) {
      const value = element.getAttribute(name);
      if (value !== null) {
        copy.setAttribute(name, cleanAttribute(name, value));
        interesting = true;
      }
    }
    if (EMPTY_TAGS.has(element.tagName.toUpperCase())) return copy;

    let pendingText = '';
    const flushText = () => {
      const cleaned = cleanText(pendingText);
      if (cleaned) copy.append(cleaned);
      pendingText = '';
    };

    const signatures = new Map();
    for (const child of element.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        pendingText += child.textContent;
        continue;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) continue;
      flushText();
      const converted = convert(child);
      if (!converted) continue;
      // Collapse long runs of look-alike siblings (listing cards, chat rows).
      const signature = converted.outerHTML.replace(/\[text\]|\{[a-z]+\}|N/g, '');
      const seen = signatures.get(signature) || 0;
      signatures.set(signature, seen + 1);
      if (seen === MAX_SIMILAR_SIBLINGS) copy.append(document.createComment(' more similar items '));
      if (seen >= MAX_SIMILAR_SIBLINGS) continue;
      copy.append(converted);
      interesting = true;
    }
    flushText();
    if (copy.textContent) interesting = true;
    return interesting ? copy : null;
  }

  function pageType() {
    const first = location.pathname.split('/').filter(Boolean)[0] || 'feed';
    const second = location.pathname.split('/').filter(Boolean)[1] || '';
    if (first === 'feed' || first === 'home.php') return 'feed';
    if (first === 'marketplace') return second === 'item' ? 'marketplace-item' : 'marketplace';
    if (KNOWN_SEGMENTS.has(first)) return first.replace(/\W/g, '');
    return 'profile-or-page';
  }

  function capture() {
    const body = convert(document.body) || document.createElement('body');
    const dark = document.documentElement.className.includes('dark-mode');
    const html =
      `<!doctype html>\n<!-- MarketplaceOnly capture: ${pageType()} | ${new Date().toISOString().slice(0, 10)} | ` +
      `${dark ? 'dark' : 'light'} mode | ${navigator.userAgent.includes('Firefox') ? 'Firefox' : 'Chrome'} -->\n` +
      `<html lang="en"><head><meta charset="utf-8"><title>${pageType()}</title></head>\n${body.outerHTML}\n</html>\n`;
    return html;
  }

  function download(html) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    link.download = `mo-capture-${pageType()}-${Date.now()}.html`;
    document.documentElement.append(link);
    link.click();
    link.remove();
  }

  window.__moCapture = capture; // lets the capture be re-run or inspected
  console.log(`MarketplaceOnly capture in ${DELAY_SECONDS} seconds. Open any menu or pop-up you want included now.`);
  setTimeout(() => {
    const html = capture();
    download(html);
    console.log(`MarketplaceOnly capture downloaded (${Math.round(html.length / 1024)} KB).`);
  }, DELAY_SECONDS * 1000);
})();
