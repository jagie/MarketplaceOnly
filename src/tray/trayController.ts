import type { PageCleanup } from '@/cleanup/pageCleanup';
import type { LocalState, Settings } from '@/settings/schema';
import { saveLocalState, saveSettings, updateSettings } from '@/settings/store';
import { markAnnounced, markSettingsSeen, resetToDefaults, unannouncedBreakage } from './model';
import { buildReportUrl } from './report';
import { Tray } from './tray';

/**
 * Connects the tray to settings, breakage history, and the cleanup status.
 * Settings are the single source of truth: the tray asks for a change, the
 * change is saved, and every open Facebook tab re-renders from it.
 */
export class TrayController {
  private readonly tray: Tray;
  private settings: Settings;
  private local: LocalState;

  constructor(
    settings: Settings,
    local: LocalState,
    private readonly cleanup: PageCleanup,
  ) {
    this.settings = settings;
    this.local = local;
    const version = browser.runtime.getManifest().version;
    this.tray = new Tray(
      {
        setOpen: (open) =>
          this.change((s) =>
            open ? { ...s, trayState: 'open' } : markSettingsSeen({ ...s, trayState: 'collapsed' }),
          ),
        setEnabled: (enabled) => this.change((s) => ({ ...s, enabled })),
        setArea: (area, shown) => this.change((s) => ({ ...s, areas: { ...s.areas, [area]: shown } })),
        setShowEdgeTab: (showEdgeTab) => this.change((s) => ({ ...s, showEdgeTab })),
        reset: () => {
          const next = resetToDefaults();
          void saveSettings(next).then(() => this.onSettings(next));
        },
        report: () => this.openReport(),
      },
      version,
    );
  }

  start(): void {
    this.tray.mount();
    this.render();
    void this.announceBreakage();
  }

  stop(): void {
    this.tray.unmount();
  }

  /** Facebook occasionally rebuilds the page; put the tray back if it went missing. */
  ensureMounted(): void {
    if (!this.tray.isMounted) this.tray.mount();
  }

  toggle(): void {
    this.tray.toggle();
  }

  onSettings(settings: Settings): void {
    this.settings = settings;
    this.render();
  }

  onLocalState(local: LocalState): void {
    this.local = local;
    this.render();
    void this.announceBreakage();
  }

  render(): void {
    this.tray.render({ settings: this.settings, local: this.local, ...this.cleanup.report() });
  }

  private change(edit: (current: Settings) => Settings): void {
    // Render right away for instant feedback; storage then confirms it.
    this.onSettings(edit(this.settings));
    void updateSettings(edit).then((saved) => this.onSettings(saved));
  }

  /**
   * Opens the tray once for each newly broken rule. Only the tab the user is
   * looking at does this, so background tabs don't race each other.
   */
  private async announceBreakage(): Promise<void> {
    if (document.visibilityState !== 'visible') return;
    const fresh = unannouncedBreakage(this.local);
    if (fresh.length === 0) return;
    this.local = markAnnounced(this.local, fresh);
    await saveLocalState(this.local);
    this.change((s) => ({ ...s, trayState: 'open' }));
  }

  private openReport(): void {
    const { route, statuses } = this.cleanup.report();
    const url = buildReportUrl({
      version: browser.runtime.getManifest().version,
      userAgent: navigator.userAgent,
      route,
      isListing: /^\/marketplace\/item\//.test(location.pathname),
      statuses,
    });
    // The user reviews and edits the issue on GitHub before submitting.
    window.open(url, '_blank', 'noopener');
  }
}
