/**
 * Tests for SettingsStore
 */

import {
  useSettingsStore,
  MIN_PLAYBACK_RATE,
  MAX_PLAYBACK_RATE,
  DEFAULT_PLAYBACK_RATE,
  MIN_SKIP_INTERVAL,
  MAX_SKIP_INTERVAL,
  DEFAULT_SKIP_FORWARD,
  DEFAULT_SKIP_BACK,
  DEFAULT_SMART_REWIND_MAX,
} from '../settingsStore';

// Helper for synchronous state changes
function act(fn: () => void): void {
  fn();
}

describe('SettingsStore', () => {
  beforeEach(() => {
    // Reset store to defaults before each test
    useSettingsStore.getState().resetToDefaults();
  });

  describe('Initial State', () => {
    it('has correct default values', () => {
      const state = useSettingsStore.getState();

      expect(state.bookSpeedMap).toEqual({});
      expect(state.globalDefaultRate).toBe(DEFAULT_PLAYBACK_RATE);
      expect(state.skipForwardInterval).toBe(DEFAULT_SKIP_FORWARD);
      expect(state.skipBackInterval).toBe(DEFAULT_SKIP_BACK);
      expect(state.smartRewindEnabled).toBe(true);
      expect(state.smartRewindMaxSeconds).toBe(DEFAULT_SMART_REWIND_MAX);
      expect(state.shakeToExtendEnabled).toBe(true);
    });
  });

  describe('Playback Rate', () => {
    it('sets book-specific speed', () => {
      act(() => {
        useSettingsStore.getState().setBookSpeed('book-1', 1.5);
      });

      expect(useSettingsStore.getState().bookSpeedMap['book-1']).toBe(1.5);
    });

    it('clamps rate to valid range', () => {
      act(() => {
        useSettingsStore.getState().setBookSpeed('book-1', 0.1);
        useSettingsStore.getState().setBookSpeed('book-2', 5.0);
      });

      const state = useSettingsStore.getState();
      expect(state.bookSpeedMap['book-1']).toBe(MIN_PLAYBACK_RATE);
      expect(state.bookSpeedMap['book-2']).toBe(MAX_PLAYBACK_RATE);
    });

    it('gets book speed with fallback to global', () => {
      act(() => {
        useSettingsStore.getState().setBookSpeed('book-1', 1.75);
        useSettingsStore.getState().setGlobalDefaultRate(1.25);
      });

      const state = useSettingsStore.getState();
      expect(state.getBookSpeed('book-1')).toBe(1.75);
      expect(state.getBookSpeed('book-2')).toBe(1.25); // Falls back to global
    });

    it('sets global default rate', () => {
      act(() => {
        useSettingsStore.getState().setGlobalDefaultRate(1.5);
      });

      expect(useSettingsStore.getState().globalDefaultRate).toBe(1.5);
    });

    it('clamps global rate to valid range', () => {
      act(() => {
        useSettingsStore.getState().setGlobalDefaultRate(10);
      });

      expect(useSettingsStore.getState().globalDefaultRate).toBe(MAX_PLAYBACK_RATE);
    });

    it('clears book-specific speed', () => {
      act(() => {
        useSettingsStore.getState().setBookSpeed('book-1', 1.5);
        useSettingsStore.getState().setBookSpeed('book-2', 2.0);
        useSettingsStore.getState().clearBookSpeed('book-1');
      });

      const state = useSettingsStore.getState();
      expect(state.bookSpeedMap['book-1']).toBeUndefined();
      expect(state.bookSpeedMap['book-2']).toBe(2.0);
    });
  });

  describe('Skip Intervals', () => {
    it('sets skip forward interval', () => {
      act(() => {
        useSettingsStore.getState().setSkipForwardInterval(45);
      });

      expect(useSettingsStore.getState().skipForwardInterval).toBe(45);
    });

    it('sets skip backward interval', () => {
      act(() => {
        useSettingsStore.getState().setSkipBackInterval(20);
      });

      expect(useSettingsStore.getState().skipBackInterval).toBe(20);
    });

    it('clamps skip intervals to valid range', () => {
      act(() => {
        useSettingsStore.getState().setSkipForwardInterval(1);
        useSettingsStore.getState().setSkipBackInterval(500);
      });

      const state = useSettingsStore.getState();
      expect(state.skipForwardInterval).toBe(MIN_SKIP_INTERVAL);
      expect(state.skipBackInterval).toBe(MAX_SKIP_INTERVAL);
    });
  });

  describe('Smart Rewind', () => {
    it('enables/disables smart rewind', () => {
      act(() => {
        useSettingsStore.getState().setSmartRewindEnabled(false);
      });

      expect(useSettingsStore.getState().smartRewindEnabled).toBe(false);

      act(() => {
        useSettingsStore.getState().setSmartRewindEnabled(true);
      });

      expect(useSettingsStore.getState().smartRewindEnabled).toBe(true);
    });

    it('sets smart rewind max seconds', () => {
      act(() => {
        useSettingsStore.getState().setSmartRewindMaxSeconds(60);
      });

      expect(useSettingsStore.getState().smartRewindMaxSeconds).toBe(60);
    });

    it('clamps smart rewind to valid range', () => {
      act(() => {
        useSettingsStore.getState().setSmartRewindMaxSeconds(1);
      });

      expect(useSettingsStore.getState().smartRewindMaxSeconds).toBe(5); // MIN_SMART_REWIND

      act(() => {
        useSettingsStore.getState().setSmartRewindMaxSeconds(500);
      });

      expect(useSettingsStore.getState().smartRewindMaxSeconds).toBe(120); // MAX_SMART_REWIND
    });
  });

  describe('Sleep Timer Preferences', () => {
    it('enables/disables shake to extend', () => {
      act(() => {
        useSettingsStore.getState().setShakeToExtendEnabled(false);
      });

      expect(useSettingsStore.getState().shakeToExtendEnabled).toBe(false);
    });
  });

  describe('Bulk Operations', () => {
    it('resets to defaults', () => {
      act(() => {
        useSettingsStore.getState().setBookSpeed('book-1', 2.0);
        useSettingsStore.getState().setGlobalDefaultRate(1.5);
        useSettingsStore.getState().setSkipForwardInterval(60);
        useSettingsStore.getState().setSmartRewindEnabled(false);
        useSettingsStore.getState().resetToDefaults();
      });

      const state = useSettingsStore.getState();
      expect(state.bookSpeedMap).toEqual({});
      expect(state.globalDefaultRate).toBe(DEFAULT_PLAYBACK_RATE);
      expect(state.skipForwardInterval).toBe(DEFAULT_SKIP_FORWARD);
      expect(state.smartRewindEnabled).toBe(true);
    });

    it('imports settings', () => {
      act(() => {
        useSettingsStore.getState().importSettings({
          globalDefaultRate: 1.75,
          skipForwardInterval: 45,
          smartRewindEnabled: false,
        });
      });

      const state = useSettingsStore.getState();
      expect(state.globalDefaultRate).toBe(1.75);
      expect(state.skipForwardInterval).toBe(45);
      expect(state.smartRewindEnabled).toBe(false);
      // Other values remain at defaults
      expect(state.skipBackInterval).toBe(DEFAULT_SKIP_BACK);
    });

    it('imports settings with clamping', () => {
      act(() => {
        useSettingsStore.getState().importSettings({
          globalDefaultRate: 10,
          skipForwardInterval: 1,
        });
      });

      const state = useSettingsStore.getState();
      expect(state.globalDefaultRate).toBe(MAX_PLAYBACK_RATE);
      expect(state.skipForwardInterval).toBe(MIN_SKIP_INTERVAL);
    });

    it('exports settings', () => {
      act(() => {
        useSettingsStore.getState().setBookSpeed('book-1', 1.5);
        useSettingsStore.getState().setGlobalDefaultRate(1.25);
      });

      const exported = useSettingsStore.getState().exportSettings();

      expect(exported.bookSpeedMap).toEqual({ 'book-1': 1.5 });
      expect(exported.globalDefaultRate).toBe(1.25);
      expect(exported.skipForwardInterval).toBe(DEFAULT_SKIP_FORWARD);
    });
  });
});

// Hook tests are skipped because they require a React component context
// The hooks are simple wrappers around useSettingsStore selectors
// and are tested implicitly through the store tests above
