import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { defaultSettings } from './defaults';
import { initSettings, loadSettings, saveSettings, updateSettings, watchSettings } from './store';

describe('settings store', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.restoreAllMocks();
  });

  it('initSettings writes migrated defaults to sync storage', async () => {
    await initSettings();
    expect(await fakeBrowser.storage.sync.get('settings')).toEqual({ settings: defaultSettings() });
  });

  it('save and load round-trip', async () => {
    const settings = { ...defaultSettings(), enabled: false };
    await saveSettings(settings);
    expect(await loadSettings()).toEqual(settings);
  });

  it('updateSettings applies a change on top of the stored value', async () => {
    await saveSettings({ ...defaultSettings(), showEdgeTab: false });
    const next = await updateSettings((s) => ({ ...s, areas: { ...s.areas, groups: true } }));
    expect(next.showEdgeTab).toBe(false);
    expect((await loadSettings()).areas.groups).toBe(true);
  });

  it('falls back to local storage when sync is unavailable', async () => {
    vi.spyOn(fakeBrowser.storage.sync, 'get').mockRejectedValue(new Error('sync disabled'));
    await saveSettings({ ...defaultSettings(), enabled: false });
    expect(await fakeBrowser.storage.local.get('settings')).toEqual({
      settings: { ...defaultSettings(), enabled: false },
    });
    expect((await loadSettings()).enabled).toBe(false);
  });

  it('watchSettings reports changes as migrated settings', async () => {
    const onChange = vi.fn();
    const stop = watchSettings(onChange);
    await vi.waitFor(async () => {
      // Keep writing until the async watcher is attached and sees one.
      await saveSettings({ ...defaultSettings(), enabled: false });
      expect(onChange).toHaveBeenCalled();
    });
    expect(onChange).toHaveBeenLastCalledWith({ ...defaultSettings(), enabled: false });
    stop();
  });
});
