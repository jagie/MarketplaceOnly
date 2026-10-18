import { describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION, defaultSettings } from './defaults';
import { migrate, normalizeLocalState, type MigrationStep } from './migrate';
import { AREA_IDS, SETTING_IDS } from './schema';

/** A fully valid stored object, as the extension writes it today. */
function storedCurrent(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(defaultSettings())) as Record<string, unknown>;
}

describe('migrate', () => {
  describe('fresh install', () => {
    it.each([undefined, null, 'garbage', 42, [], true])('treats %j as a fresh install', (raw) => {
      expect(migrate(raw)).toEqual(defaultSettings());
    });

    it('defaults: master on, every area off, edge tab shown, tray open, nothing new', () => {
      const settings = migrate(undefined);
      expect(settings.enabled).toBe(true);
      expect(Object.values(settings.areas).every((on) => on === false)).toBe(true);
      expect(settings.showEdgeTab).toBe(true);
      expect(settings.trayState).toBe('open');
      expect(settings.seenSettings).toEqual([...SETTING_IDS]);
      expect(settings.newSettings).toEqual([]);
      expect(settings.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    });
  });

  describe('existing users', () => {
    it('round-trips valid settings unchanged', () => {
      const stored = storedCurrent();
      expect(migrate(stored)).toEqual(stored);
    });

    it('never overwrites user choices', () => {
      const stored = {
        ...storedCurrent(),
        enabled: false,
        areas: { feed: true, video: false, groups: true, gaming: false, notifications: true },
        showEdgeTab: false,
        trayState: 'collapsed',
      };
      const result = migrate(stored);
      expect(result.enabled).toBe(false);
      expect(result.areas).toEqual(stored.areas);
      expect(result.showEdgeTab).toBe(false);
      expect(result.trayState).toBe('collapsed');
    });

    it('does not mutate the stored object', () => {
      const stored = storedCurrent();
      const snapshot = JSON.stringify(stored);
      migrate(stored);
      expect(JSON.stringify(stored)).toBe(snapshot);
    });
  });

  describe('a new toggle ships', () => {
    it('adds the missing area with its default and flags it as new', () => {
      const stored = storedCurrent();
      const areas: Record<string, boolean> = { ...(stored.areas as Record<string, boolean>), groups: true };
      delete areas.gaming;
      const seen = SETTING_IDS.filter((id) => id !== 'gaming');

      const result = migrate({ ...stored, areas, seenSettings: seen });

      expect(result.areas.gaming).toBe(false);
      expect(result.areas.groups).toBe(true); // existing choice kept
      expect(result.newSettings).toEqual(['gaming']);
    });

    it('flags a new non-area setting too', () => {
      const stored = storedCurrent();
      delete stored.showEdgeTab;
      const result = migrate({ ...stored, seenSettings: AREA_IDS });
      expect(result.showEdgeTab).toBe(true);
      expect(result.newSettings).toEqual(['showEdgeTab']);
    });

    it('does not flag a setting the user has already seen', () => {
      const stored = storedCurrent();
      delete (stored.areas as Record<string, boolean>).video;
      expect(migrate(stored).newSettings).toEqual([]);
    });

    it('does not duplicate a setting that is already flagged', () => {
      const stored = storedCurrent();
      delete (stored.areas as Record<string, boolean>).video;
      const result = migrate({ ...stored, seenSettings: [], newSettings: ['video'] });
      expect(result.newSettings).toEqual(['video']);
    });
  });

  describe('corrupted values fall back to defaults (fail open)', () => {
    it('non-boolean master switch', () => {
      expect(migrate({ ...storedCurrent(), enabled: 'yes' }).enabled).toBe(true);
    });

    it('non-object areas', () => {
      const result = migrate({ ...storedCurrent(), areas: 'all off' });
      expect(result.areas).toEqual(defaultSettings().areas);
    });

    it('non-boolean area value keeps the default without flagging it new', () => {
      const stored = storedCurrent();
      const result = migrate({ ...stored, areas: { ...(stored.areas as object), groups: 'on' }, seenSettings: [] });
      expect(result.areas.groups).toBe(false);
      expect(result.newSettings).not.toContain('groups');
    });

    it('unknown tray state becomes collapsed (quiet by default)', () => {
      expect(migrate({ ...storedCurrent(), trayState: 'fullscreen' }).trayState).toBe('collapsed');
    });

    it('non-boolean showEdgeTab', () => {
      expect(migrate({ ...storedCurrent(), showEdgeTab: 0 }).showEdgeTab).toBe(true);
    });

    it('drops unknown and duplicate setting ids', () => {
      const result = migrate({
        ...storedCurrent(),
        seenSettings: ['feed', 'feed', 'teleport', 7],
        newSettings: 'groups',
      });
      expect(result.seenSettings).toEqual(['feed']);
    });

    it('ignores unknown fields from a newer version', () => {
      const result = migrate({ ...storedCurrent(), schemaVersion: 99, futureField: 1 });
      expect(result).toEqual(defaultSettings());
    });

    it('missing schemaVersion is treated as v1', () => {
      const stored = storedCurrent();
      delete stored.schemaVersion;
      expect(migrate(stored).schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    });
  });

  describe('v1 -> v2: Reels and Watch merge into Video', () => {
    function storedV1(reels: boolean, watch: boolean): Record<string, unknown> {
      return {
        schemaVersion: 1,
        enabled: true,
        areas: { feed: false, reels, watch, groups: true, gaming: false, notifications: false },
        showEdgeTab: true,
        trayState: 'collapsed',
        seenSettings: ['feed', 'reels', 'watch', 'groups', 'gaming', 'notifications', 'showEdgeTab'],
        newSettings: [],
      };
    }

    it.each([
      [false, false, false],
      [true, false, true],
      [false, true, true],
      [true, true, true],
    ])('reels=%s, watch=%s -> video=%s', (reels, watch, video) => {
      expect(migrate(storedV1(reels, watch)).areas.video).toBe(video);
    });

    it('keeps the other areas and drops the old ids', () => {
      const result = migrate(storedV1(false, false));
      expect(result.areas).toEqual({ feed: false, video: false, groups: true, gaming: false, notifications: false });
      expect(result.schemaVersion).toBe(2);
    });

    it('does not flag Video as new for someone who had seen Reels or Watch', () => {
      const result = migrate(storedV1(false, false));
      expect(result.newSettings).toEqual([]);
      expect(result.seenSettings).toContain('video');
    });

    it('carries a pending "new" badge over to Video', () => {
      const result = migrate({ ...storedV1(false, false), seenSettings: [], newSettings: ['reels'] });
      expect(result.newSettings).toContain('video');
    });
  });

  describe('version steps', () => {
    // Simulates a future v2 that renamed `masterOn` to `enabled`.
    const steps: Record<number, MigrationStep> = {
      1: ({ masterOn, ...rest }) => ({ ...rest, enabled: masterOn }),
    };

    it('runs each step from the stored version up to current', () => {
      const stored: Record<string, unknown> = { ...storedCurrent(), schemaVersion: 1, masterOn: false };
      delete stored.enabled;
      const result = migrate(stored, steps, 2);
      expect(result.enabled).toBe(false);
      expect(result.schemaVersion).toBe(2);
    });

    it('skips steps for data already at the current version', () => {
      const stored = { ...storedCurrent(), schemaVersion: 2, masterOn: true, enabled: false };
      expect(migrate(stored, steps, 2).enabled).toBe(false);
    });
  });
});

describe('normalizeLocalState', () => {
  it('returns empty history for missing or junk data', () => {
    expect(normalizeLocalState(undefined)).toEqual({ breakageHistory: {} });
    expect(normalizeLocalState({ breakageHistory: [] })).toEqual({ breakageHistory: {} });
  });

  it('keeps valid entries and drops malformed ones', () => {
    const good = { misses: 2, brokenSince: null, announced: false };
    const result = normalizeLocalState({
      breakageHistory: {
        'groups-nav': good,
        'reels-links': { misses: -1, brokenSince: null, announced: false },
        'feed-main': { misses: 3 },
      },
    });
    expect(result.breakageHistory).toEqual({ 'groups-nav': good });
  });
});
