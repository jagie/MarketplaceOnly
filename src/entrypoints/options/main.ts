import { GET_STATUS, type StatusReport } from '@/cleanup/messages';
import { RULES } from '@/cleanup/rules';
import { hasHostAccess, requestHostAccess } from '@/permissions/hostAccess';
import { FACEBOOK_MATCH_PATTERNS } from '@/routes/routeMap';
import { AREA_IDS, type AreaId, type Settings } from '@/settings/schema';
import { loadSettings, saveSettings, updateSettings, watchSettings } from '@/settings/store';
import { AREA_LABELS, STATUS_TEXT, resetToDefaults } from '@/tray/model';
import { buildReportUrl } from '@/tray/report';

/**
 * Options page: the tray's settings outside Facebook. Also the way back in
 * if a Facebook change ever breaks the tray.
 */
const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector);

const enabledBox = $<HTMLInputElement>('#enabled');
const edgeTabBox = $<HTMLInputElement>('#edge-tab');
const areasBox = $<HTMLFieldSetElement>('#areas');
const accessBox = $<HTMLDivElement>('#access');
const statusList = $<HTMLUListElement>('#statuses');
const statusSource = $<HTMLParagraphElement>('#status-source');
const version = browser.runtime.getManifest().version;

const versionLabel = $('#version');
if (versionLabel) versionLabel.textContent = `Version ${version}`;

const areaBoxes = new Map<AreaId, HTMLInputElement>();
for (const id of AREA_IDS) {
  const label = document.createElement('label');
  label.className = 'row';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.addEventListener('change', () => {
    void updateSettings((s) => ({ ...s, areas: { ...s.areas, [id]: box.checked } }));
  });
  const text = document.createElement('span');
  text.textContent = AREA_LABELS[id];
  label.append(box, text);
  areasBox?.append(label);
  areaBoxes.set(id, box);
}

enabledBox?.addEventListener('change', () => {
  void updateSettings((s) => ({ ...s, enabled: enabledBox.checked }));
});
edgeTabBox?.addEventListener('change', () => {
  void updateSettings((s) => ({ ...s, showEdgeTab: edgeTabBox.checked }));
});

function render(settings: Settings): void {
  if (enabledBox) enabledBox.checked = settings.enabled;
  if (edgeTabBox) edgeTabBox.checked = settings.showEdgeTab;
  for (const [id, box] of areaBoxes) {
    box.checked = settings.areas[id];
    box.disabled = !settings.enabled;
  }
}
void loadSettings().then(render);
watchSettings(render);

void hasHostAccess().then((granted) => {
  if (accessBox) accessBox.hidden = granted;
});
$('#grant')?.addEventListener('click', () => {
  // Called directly in the click handler: browsers only prompt on a user action.
  void requestHostAccess().then((granted) => {
    if (accessBox) accessBox.hidden = granted;
  });
});

$('#reset')?.addEventListener('click', () => {
  if (!confirm('Reset all MarketplaceOnly settings to their defaults?')) return;
  // The tray opens on Facebook so the user can see what changed.
  void saveSettings(resetToDefaults());
});

/** Status from the Facebook tab the user used most recently. */
async function latestReport(): Promise<StatusReport | undefined> {
  // Host access lets us find Facebook tabs by address without the "tabs" permission.
  const tabs = await browser.tabs.query({ url: FACEBOOK_MATCH_PATTERNS });
  const latest = tabs.sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0))[0];
  if (latest?.id === undefined) return undefined;
  try {
    return (await browser.tabs.sendMessage(latest.id, GET_STATUS)) as StatusReport | undefined;
  } catch {
    return undefined; // still loading, or opened before the extension
  }
}

async function showStatuses(): Promise<void> {
  const report = await latestReport();
  if (!statusList || !statusSource) return;
  if (!report) {
    statusSource.textContent = "Open Facebook in a tab to see what's being hidden.";
    statusList.replaceChildren();
    return;
  }
  statusSource.textContent = 'From your most recent Facebook tab.';
  statusList.replaceChildren(
    ...RULES.map((rule) => {
      const status = report.statuses[rule.id] ?? 'off';
      const item = document.createElement('li');
      const label = document.createElement('span');
      label.textContent = rule.label;
      const value = document.createElement('span');
      value.textContent = STATUS_TEXT[status];
      value.className = `status-${status}`;
      item.append(label, value);
      return item;
    }),
  );
}
void showStatuses();
// Statuses settle a few seconds after a page loads; keep the list fresh.
setInterval(() => void showStatuses(), 3000);

$('#report')?.addEventListener('click', () => {
  void latestReport().then((report) => {
    const url = buildReportUrl({
      version,
      userAgent: navigator.userAgent,
      route: report?.route ?? 'other',
      isListing: false,
      statuses: report?.statuses ?? {},
    });
    window.open(url, '_blank', 'noopener');
  });
});
