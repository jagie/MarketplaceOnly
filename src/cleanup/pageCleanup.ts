import { classifyRoute, type RouteClass } from '@/routes/classifyRoute';
import type { Settings } from '@/settings/schema';
import { loadLocalState, saveLocalState } from '@/settings/store';
import { PAGE_CLEANUP_ROUTES, RULES } from './rules';
import { recordPageResult, ruleStatus, type RuleProbe, type RuleStatus } from './status';
import { HIDE_ATTRIBUTE, PAGE_ATTRIBUTE, buildStylesheet, ruleSelector } from './stylesheet';

const STYLE_ID = 'marketplaceonly-cleanup';
/** How long after a page (or in-app navigation) loads before judging rules. */
const SETTLE_MS = 6000;
/** Facebook changes the page constantly; re-check status at most this often. */
const PROBE_INTERVAL_MS = 1500;

/** Precomputed once: selectors don't change while the page is open. */
const RULE_SELECTORS = new Map(RULES.map((rule) => [rule.id, ruleSelector(rule)]));

/**
 * Applies the cleanup layer to one Facebook tab: injects the stylesheet,
 * keeps the <html> attributes in step with settings and route, and tracks
 * per-rule status and breakage.
 */
export class PageCleanup {
  private settings: Settings;
  private route: RouteClass;
  private href = location.href;
  private statuses: Record<string, RuleStatus> = {};
  /** Rules that matched at any point during this page view. */
  private seenThisPage = new Set<string>();
  private settleTimer: ReturnType<typeof setTimeout> | undefined;
  private probeTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly observer: MutationObserver;

  constructor(settings: Settings) {
    this.settings = settings;
    this.route = classifyRoute(location.href);
    this.observer = new MutationObserver((mutations) => this.onMutations(mutations));
  }

  start(): void {
    injectStylesheet();
    this.applyAttributes();
    // Watch the whole page cheaply: the callback only schedules a throttled
    // check, it never scans the page itself.
    this.observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [HIDE_ATTRIBUTE, PAGE_ATTRIBUTE],
    });
    this.startPageView();
  }

  stop(): void {
    this.observer.disconnect();
    clearTimeout(this.settleTimer);
    clearTimeout(this.probeTimer);
    document.getElementById(STYLE_ID)?.remove();
    document.documentElement.removeAttribute(HIDE_ATTRIBUTE);
    document.documentElement.removeAttribute(PAGE_ATTRIBUTE);
  }

  updateSettings(settings: Settings): void {
    this.settings = settings;
    this.applyAttributes();
    this.scheduleProbe();
  }

  /** Call after an in-app navigation; counts as a new page view. */
  onNavigate(): void {
    // Facebook also calls replaceState without changing the address.
    if (location.href === this.href) return;
    this.href = location.href;
    this.route = classifyRoute(location.href);
    this.applyAttributes();
    this.startPageView();
  }

  report(): { route: RouteClass; statuses: Record<string, RuleStatus> } {
    return { route: this.route, statuses: { ...this.statuses } };
  }

  private startPageView(): void {
    this.seenThisPage.clear();
    clearTimeout(this.settleTimer);
    this.settleTimer = setTimeout(() => void this.recordBreakage(), SETTLE_MS);
    this.scheduleProbe();
  }

  /** The only per-page work: two attributes on <html>. CSS does the rest. */
  private applyAttributes(): void {
    const root = document.documentElement;
    const hidden = this.settings.enabled
      ? Object.entries(this.settings.areas)
          .filter(([, on]) => !on)
          .map(([area]) => area)
          .join(' ')
      : '';
    if (root.getAttribute(HIDE_ATTRIBUTE) !== hidden) root.setAttribute(HIDE_ATTRIBUTE, hidden);

    const pageScope = PAGE_CLEANUP_ROUTES.includes(this.route);
    if (pageScope !== root.hasAttribute(PAGE_ATTRIBUTE)) {
      if (pageScope) root.setAttribute(PAGE_ATTRIBUTE, '');
      else root.removeAttribute(PAGE_ATTRIBUTE);
    }
  }

  private onMutations(mutations: MutationRecord[]): void {
    // If Facebook rewrites <html>'s attributes, put ours back.
    if (mutations.some((m) => m.type === 'attributes')) this.applyAttributes();
    // Facebook can also replace <head>; make sure our stylesheet survives.
    if (!document.getElementById(STYLE_ID)) injectStylesheet();
    this.scheduleProbe();
  }

  private scheduleProbe(): void {
    if (this.probeTimer !== undefined) return;
    this.probeTimer = setTimeout(() => {
      this.probeTimer = undefined;
      this.probe();
    }, PROBE_INTERVAL_MS);
  }

  private probe(): void {
    for (const rule of RULES) {
      const matched = document.querySelector(RULE_SELECTORS.get(rule.id) ?? '') !== null;
      if (matched) this.seenThisPage.add(rule.id);
      const probe: RuleProbe = {
        matched: matched || this.seenThisPage.has(rule.id),
        containerPresent: rule.container ? document.querySelector(rule.container) !== null : false,
      };
      this.statuses[rule.id] = ruleStatus(rule, this.settings, this.route, probe);
    }
  }

  /** Once per page view, after it settles: update per-device breakage history. */
  private async recordBreakage(): Promise<void> {
    this.probe();
    const state = await loadLocalState();
    const now = Date.now();
    for (const rule of RULES) {
      const status = this.statuses[rule.id];
      if (!status) continue;
      const next = recordPageResult(state.breakageHistory[rule.id], status, now);
      if (next) state.breakageHistory[rule.id] = next;
      else delete state.breakageHistory[rule.id];
    }
    await saveLocalState(state);
  }
}

function injectStylesheet(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = buildStylesheet();
  // <head> may not exist yet at document_start; <html> always does.
  (document.head ?? document.documentElement).append(style);
}
