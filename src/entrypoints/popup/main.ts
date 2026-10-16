import { hasHostAccess, requestHostAccess } from '@/permissions/hostAccess';
import { AREA_IDS, type AreaId, type Settings } from '@/settings/schema';
import { loadSettings, updateSettings, watchSettings } from '@/settings/store';

/** Temporary labels; the tray (Milestone 4) gets the real ones. */
const AREA_LABELS: Record<AreaId, string> = {
  feed: 'Feed',
  reels: 'Reels',
  watch: 'Watch',
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
