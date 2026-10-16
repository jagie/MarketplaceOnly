import { storage } from 'wxt/utils/storage';
import { migrate, normalizeLocalState } from './migrate';
import type { LocalState, Settings } from './schema';

type SettingsKey = 'sync:settings' | 'local:settings';
const SYNC_KEY: SettingsKey = 'sync:settings';
const LOCAL_FALLBACK_KEY: SettingsKey = 'local:settings';
const LOCAL_STATE_KEY = 'local:state';

/**
 * Settings live in storage.sync so they follow the user across devices.
 * Sync can be unavailable (e.g. disabled by browser policy), in which case
 * reads throw; we then keep settings on this device instead.
 */
async function settingsKey(): Promise<SettingsKey> {
  try {
    await storage.getItem(SYNC_KEY);
    return SYNC_KEY;
  } catch {
    return LOCAL_FALLBACK_KEY;
  }
}

export async function loadSettings(): Promise<Settings> {
  return migrate(await storage.getItem<unknown>(await settingsKey()));
}

export async function saveSettings(settings: Settings): Promise<void> {
  await storage.setItem(await settingsKey(), settings);
}

/** Read-modify-write helper so callers never save a stale copy. */
export async function updateSettings(change: (current: Settings) => Settings): Promise<Settings> {
  const next = change(await loadSettings());
  await saveSettings(next);
  return next;
}

/**
 * Runs migration and writes the result back, so stored data is always in
 * the current shape. Called by the background on install and update.
 */
export async function initSettings(): Promise<Settings> {
  return updateSettings((current) => current);
}

/**
 * Calls `onChange` whenever settings change in any part of the extension or
 * on another synced device. Returns a function that stops watching.
 *
 * Listens to both storage areas, registered synchronously: a sleeping
 * background script is only woken for listeners attached right away. Only
 * one area is ever written (sync, or local if sync is unavailable).
 */
export function watchSettings(onChange: (settings: Settings) => void): () => void {
  const unwatchers = [SYNC_KEY, LOCAL_FALLBACK_KEY].map((key) =>
    storage.watch<unknown>(key, (raw) => onChange(migrate(raw))),
  );
  return () => unwatchers.forEach((unwatch) => unwatch());
}

export async function loadLocalState(): Promise<LocalState> {
  return normalizeLocalState(await storage.getItem<unknown>(LOCAL_STATE_KEY));
}

export async function saveLocalState(state: LocalState): Promise<void> {
  await storage.setItem(LOCAL_STATE_KEY, state);
}
