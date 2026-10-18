import type { RuleStatus } from '@/cleanup/status';
import type { RouteClass } from '@/routes/classifyRoute';
import { AREA_IDS, type AreaId, type LocalState, type Settings } from '@/settings/schema';
import { h } from './dom';
import { closeIcon, tagIcon } from './icon';
import { AREA_LABELS, STATUS_TEXT, areaStatus, needsAttention } from './model';
import { TRAY_CSS } from './styles';

export interface TrayActions {
  setOpen(open: boolean): void;
  setEnabled(enabled: boolean): void;
  setArea(area: AreaId, shown: boolean): void;
  setShowEdgeTab(show: boolean): void;
  reset(): void;
  report(): void;
}

export interface TrayData {
  settings: Settings;
  local: LocalState;
  route: RouteClass;
  statuses: Record<string, RuleStatus>;
}

const HOST_TAG = 'marketplaceonly-tray';

/**
 * The in-page tray. Lives in a shadow root attached to <html> (not inside
 * any Facebook container), so Facebook's styles and layout changes can't
 * touch it. Purely a view: every change goes through `actions`, and the
 * tray re-renders from settings, so all tabs stay in step.
 */
export class Tray {
  private readonly host: HTMLElement;
  private readonly shadow: ShadowRoot;
  private readonly tab: HTMLButtonElement;
  private readonly dot: HTMLElement;
  private readonly panel: HTMLElement;
  private readonly masterSwitch: HTMLButtonElement;
  private readonly masterHint: HTMLElement;
  private readonly areaRows = new Map<AreaId, { toggle: HTMLButtonElement; status: HTMLElement; badge: HTMLElement }>();
  private readonly edgeTabBox: HTMLInputElement;
  private readonly resetLink: HTMLButtonElement;
  private readonly confirmRow: HTMLElement;
  private data: TrayData | undefined;
  private wasOpen = false;
  /** Set when the user opens the tray, so focus moves into it then (and only then). */
  private focusOnOpen = false;

  constructor(
    private readonly actions: TrayActions,
    version: string,
  ) {
    this.host = document.createElement(HOST_TAG);
    // "open" mode only so tests can reach in; Facebook has no reason to.
    this.shadow = this.host.attachShadow({ mode: 'open' });
    this.shadow.append(h('style', {}, TRAY_CSS), this.buildSkeleton(version));

    this.tab = this.query<HTMLButtonElement>('.tab');
    this.dot = this.query('.dot');
    this.panel = this.query('.panel');
    this.masterSwitch = this.query<HTMLButtonElement>('.master .switch');
    this.masterHint = this.query('#mo-master-hint');
    this.edgeTabBox = this.query<HTMLInputElement>('.edge-tab');
    this.resetLink = this.query<HTMLButtonElement>('.reset');
    this.confirmRow = this.query('.confirm');

    this.buildAreaRows();
    this.wireEvents();
  }

  mount(): void {
    if (!this.host.isConnected) document.documentElement.append(this.host);
  }

  unmount(): void {
    this.host.remove();
  }

  get isMounted(): boolean {
    return this.host.isConnected;
  }

  render(data: TrayData): void {
    this.data = data;
    const { settings, local, statuses } = data;
    const open = settings.trayState === 'open';

    // Theme follows Facebook's own dark mode class, else the system setting.
    const root = document.documentElement.classList;
    const dark = root.contains('__fb-dark-mode') ||
      (!root.contains('__fb-light-mode') && matchMedia('(prefers-color-scheme: dark)').matches);
    this.host.setAttribute('data-theme', dark ? 'dark' : 'light');

    this.panel.hidden = !open;
    this.tab.hidden = open || !settings.showEdgeTab;
    this.tab.setAttribute('aria-expanded', String(open));
    this.dot.hidden = !needsAttention(settings, local);
    this.tab.setAttribute(
      'aria-label',
      this.dot.hidden ? 'Open MarketplaceOnly' : 'Open MarketplaceOnly (needs attention)',
    );

    this.masterSwitch.setAttribute('aria-checked', String(settings.enabled));
    this.masterHint.textContent = settings.enabled ? 'On' : 'Paused: Facebook looks normal';
    this.panel.classList.toggle('paused', !settings.enabled);

    for (const [area, row] of this.areaRows) {
      const shown = settings.areas[area];
      row.toggle.setAttribute('aria-checked', String(shown));
      row.toggle.disabled = !settings.enabled;
      const status = settings.enabled ? areaStatus(area, statuses) : 'off';
      row.status.textContent = STATUS_TEXT[status];
      row.status.className = `status ${status}`;
      row.badge.hidden = !settings.newSettings.includes(area);
    }
    this.edgeTabBox.checked = settings.showEdgeTab;

    // Move focus sensibly when the tray opens or closes.
    if (open && !this.wasOpen && this.focusOnOpen) this.query<HTMLButtonElement>('.close').focus();
    this.focusOnOpen = false;
    if (!open && this.wasOpen && this.shadow.activeElement) {
      if (!this.tab.hidden) this.tab.focus();
      else (this.shadow.activeElement as HTMLElement).blur();
    }
    this.wasOpen = open;
  }

  /** Toolbar icon: open or close. */
  toggle(): void {
    const open = this.data?.settings.trayState !== 'open';
    this.focusOnOpen = open;
    this.actions.setOpen(open);
  }

  /** The static structure; areas are added by buildAreaRows. */
  private buildSkeleton(version: string): HTMLElement {
    const tab = h(
      'button',
      { class: 'tab', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'mo-panel', 'aria-label': 'Open MarketplaceOnly' },
      tagIcon(),
      h('span', { class: 'dot', hidden: true }),
    );
    const header = h(
      'header',
      {},
      tagIcon(),
      h('h2', { id: 'mo-title' }, 'MarketplaceOnly'),
      h('button', { class: 'icon-button close', type: 'button', 'aria-label': 'Close' }, closeIcon()),
    );
    const master = h(
      'div',
      { class: 'row master' },
      h(
        'div',
        { class: 'text' },
        h('span', { class: 'name', id: 'mo-master-label' }, 'Marketplace only'),
        h('span', { class: 'status', id: 'mo-master-hint' }),
      ),
      h('button', {
        class: 'switch',
        type: 'button',
        role: 'switch',
        'aria-labelledby': 'mo-master-label',
        'aria-describedby': 'mo-master-hint',
      }),
    );
    const footer = h(
      'footer',
      {},
      h('button', { class: 'link reset', type: 'button' }, 'Reset to defaults'),
      h('button', { class: 'link report', type: 'button' }, 'Report a problem'),
      h('span', { class: 'version' }, `v${version}`),
      h(
        'div',
        { class: 'confirm', role: 'group', 'aria-label': 'Confirm reset', hidden: true },
        h('span', {}, 'Reset all settings?'),
        h('button', { class: 'link danger confirm-reset', type: 'button' }, 'Reset'),
        h('button', { class: 'link cancel-reset', type: 'button' }, 'Cancel'),
      ),
    );
    const panel = h(
      'section',
      { class: 'panel', id: 'mo-panel', role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': 'mo-title', hidden: true },
      header,
      master,
      h('p', { class: 'section-label', id: 'mo-areas-label' }, 'Show on Facebook'),
      h('ul', { class: 'areas', 'aria-labelledby': 'mo-areas-label' }),
      h('label', { class: 'option' }, h('input', { type: 'checkbox', class: 'edge-tab' }), ' Show the side tab'),
      footer,
    );
    return h('div', { class: 'root' }, tab, panel);
  }

  private buildAreaRows(): void {
    const list = this.query('.areas');
    for (const area of AREA_IDS) {
      const item = document.createElement('li');
      item.className = 'row';
      const nameId = `mo-area-${area}`;
      const statusId = `mo-status-${area}`;

      const text = document.createElement('div');
      text.className = 'text';
      const name = document.createElement('span');
      name.className = 'name';
      name.id = nameId;
      name.textContent = AREA_LABELS[area];
      const badge = document.createElement('span');
      badge.className = 'new';
      badge.textContent = 'New';
      badge.hidden = true;
      const status = document.createElement('span');
      status.className = 'status';
      status.id = statusId;
      text.append(name, badge, status);

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'switch';
      toggle.setAttribute('role', 'switch');
      toggle.setAttribute('aria-labelledby', nameId);
      toggle.setAttribute('aria-describedby', statusId);
      toggle.addEventListener('click', () => {
        const shown = toggle.getAttribute('aria-checked') !== 'true';
        toggle.setAttribute('aria-checked', String(shown)); // instant feedback
        this.actions.setArea(area, shown);
      });

      item.append(text, toggle);
      list.append(item);
      this.areaRows.set(area, { toggle, status, badge });
    }
  }

  private wireEvents(): void {
    this.tab.addEventListener('click', () => {
      this.focusOnOpen = true;
      this.actions.setOpen(true);
    });
    this.query('.close').addEventListener('click', () => this.actions.setOpen(false));
    this.masterSwitch.addEventListener('click', () => {
      const enabled = this.masterSwitch.getAttribute('aria-checked') !== 'true';
      this.masterSwitch.setAttribute('aria-checked', String(enabled));
      this.actions.setEnabled(enabled);
    });
    this.edgeTabBox.addEventListener('change', () => this.actions.setShowEdgeTab(this.edgeTabBox.checked));
    this.query('.report').addEventListener('click', () => this.actions.report());

    // Reset needs a second, explicit click.
    this.resetLink.addEventListener('click', () => this.showConfirm(true));
    this.query('.cancel-reset').addEventListener('click', () => this.showConfirm(false));
    this.query('.confirm-reset').addEventListener('click', () => {
      this.showConfirm(false);
      this.actions.reset();
    });

    // Keys typed in the tray belong to the tray: don't trigger Facebook's
    // keyboard shortcuts. Esc closes.
    for (const type of ['keydown', 'keyup', 'keypress'] as const) {
      this.host.addEventListener(type, (event) => {
        event.stopPropagation();
        if (type === 'keydown' && (event as KeyboardEvent).key === 'Escape' && !this.panel.hidden) {
          if (!this.confirmRow.hidden) this.showConfirm(false);
          else this.actions.setOpen(false);
        }
      });
    }
  }

  private showConfirm(show: boolean): void {
    this.confirmRow.hidden = !show;
    this.resetLink.hidden = show;
    this.query<HTMLButtonElement>(show ? '.cancel-reset' : '.reset').focus();
  }

  private query<T extends HTMLElement = HTMLElement>(selector: string): T {
    const element = this.shadow.querySelector<T>(selector);
    if (!element) throw new Error(`Tray is missing ${selector}`);
    return element;
  }
}
