import { GET_STATUS, type StatusReport } from '@/cleanup/messages';
import { RULES } from '@/cleanup/rules';
import type { RuleStatus } from '@/cleanup/status';
import { hasHostAccess, requestHostAccess } from '@/permissions/hostAccess';
import { AREA_IDS, type AreaId, type Settings } from '@/settings/schema';
import { loadSettings, updateSettings, watchSettings } from '@/settings/store';

/** Temporary labels; the tray (Milestone 4) gets the real ones. */
const AREA_LABELS: Record<AreaId, string> = {
  feed: 'Feed',
  video: 'Video (Reels & Watch)',
  groups: 'Groups',
  gaming: 'Gaming',
  notifications: 'Notifications',
};

const enabledBox = document.querySelector<HTMLInputElement>('#enabled');
const areasBox = document.querySelector<HTMLFieldSetElement>('#areas');
const accessBox = document.querySelector<HTMLDivElement>('#access');
const grantButton = document.querySelector<HTMLButtonElement>('#grant');

const areaBoxes = new Map<AreaId, HTMLInputElement>();
for (const id of AREA_IDS) {
  const label = document.createElement('label');
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.addEventListener('change', () => {
    void updateSettings((s) => ({ ...s, areas: { ...s.areas, [id]: box.checked } }));
  });
  label.append(box, ` ${AREA_LABELS[id]}`);
  areasBox?.append(label);
  areaBoxes.set(id, box);
}

enabledBox?.addEventListener('change', () => {
  void updateSettings((s) => ({ ...s, enabled: enabledBox.checked }));
});

function render(settings: Settings): void {
  if (enabledBox) enabledBox.checked = settings.enabled;
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
grantButton?.addEventListener('click', () => {
  void requestHostAccess().then((granted) => {
    if (accessBox) accessBox.hidden = granted;
  });
});

const STATUS_TEXT: Record<RuleStatus, string> = {
  hidden: 'Hidden',
  'not-on-page': 'Not on this page',
  'not-found': "Couldn't find it",
  off: 'Off',
};

const statusList = document.querySelector<HTMLUListElement>('#statuses');

/** Asks the current tab's cleanup script what it found. Non-Facebook tabs don't answer. */
async function showStatuses(): Promise<void> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.id === undefined || !statusList) return;
  let report: StatusReport | undefined;
  try {
    report = (await browser.tabs.sendMessage(tab.id, GET_STATUS)) as StatusReport | undefined;
  } catch {
    return; // not a Facebook tab, or the page is still loading
  }
  if (!report) return;
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
// Statuses settle a few seconds after the page loads; refresh while open.
setInterval(() => void showStatuses(), 2000);
