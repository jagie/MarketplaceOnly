import { describe, expect, it } from 'vitest';
import { defaultSettings } from '@/settings/defaults';
import type { LocalState } from '@/settings/schema';
import {
  areaStatus,
  markAnnounced,
  markSettingsSeen,
  needsAttention,
  resetToDefaults,
  unannouncedBreakage,
} from './model';

const broken = (announced: boolean) => ({ misses: 3, brokenSince: 100, announced });
const local = (history: LocalState['breakageHistory']): LocalState => ({ breakageHistory: history });

describe('areaStatus', () => {
  it('reports breakage first', () => {
    expect(areaStatus('groups', { 'groups-top-bar': 'not-found', 'groups-shortcuts': 'hidden' })).toBe('not-found');
  });
  it('then hidden', () => {
    expect(areaStatus('groups', { 'groups-top-bar': 'hidden', 'groups-shortcuts': 'not-on-page' })).toBe('hidden');
  });
  it('is off only when every rule is off', () => {
    expect(areaStatus('groups', { 'groups-top-bar': 'off', 'groups-shortcuts': 'off' })).toBe('off');
    expect(areaStatus('groups', {})).toBe('off');
  });
  it('otherwise not on this page', () => {
    expect(areaStatus('groups', { 'groups-top-bar': 'not-on-page', 'groups-shortcuts': 'off' })).toBe('not-on-page');
  });
});

describe('attention and auto-open', () => {
  it('no dot for a settled install', () => {
    expect(needsAttention(defaultSettings(), local({}))).toBe(false);
  });
  it('dot when a setting is new', () => {
    expect(needsAttention({ ...defaultSettings(), newSettings: ['gaming'] }, local({}))).toBe(true);
  });
  it('dot while a rule is broken, even after the tray opened for it', () => {
    expect(needsAttention(defaultSettings(), local({ 'groups-top-bar': broken(true) }))).toBe(true);
  });
  it('no dot for misses below the threshold', () => {
    expect(needsAttention(defaultSettings(), local({ x: { misses: 2, brokenSince: null, announced: false } }))).toBe(false);
  });
  it('opens once per breakage', () => {
    const state = local({ a: broken(false), b: broken(true) });
    expect(unannouncedBreakage(state)).toEqual(['a']);
    expect(unannouncedBreakage(markAnnounced(state, ['a']))).toEqual([]);
  });
});

describe('settings helpers', () => {
  it('closing the tray clears "New" badges', () => {
    const result = markSettingsSeen({ ...defaultSettings(), seenSettings: ['feed'], newSettings: ['gaming'] });
    expect(result.newSettings).toEqual([]);
    expect(result.seenSettings).toEqual(['feed', 'gaming']);
  });
  it('reset restores defaults and keeps the tray open', () => {
    expect(resetToDefaults()).toEqual({ ...defaultSettings(), trayState: 'open' });
  });
});
