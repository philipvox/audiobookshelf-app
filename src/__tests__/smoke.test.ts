/**
 * src/__tests__/smoke.test.ts
 *
 * Integration smoke tests that exercise real code paths with minimal mocking.
 * These catch runtime crashes that Jest unit tests miss because unit tests
 * mock away the modules where bugs actually live.
 *
 * What these tests catch:
 * - .toFixed() on strings from SQLite (positionResolver crash)
 * - Wrong method/property names on store objects
 * - Type coercion issues at data boundaries
 * - Store action sequences that crash in real usage
 *
 * These are NOT component render tests — they test the logic layer directly.
 */

// Minimal native module mocks — only what's needed to let the import chain
// resolve without crashing. The actual logic under test is NOT mocked.
jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({
    play: jest.fn(),
    pause: jest.fn(),
    remove: jest.fn(),
    seekTo: jest.fn(),
    replace: jest.fn(),
    volume: 1,
    currentStatus: { isLoaded: false },
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  })),
  setAudioModeAsync: jest.fn(),
  AudioPlayer: jest.fn(),
}));
jest.mock('expo-media-control', () => ({
  MediaControl: { setNowPlaying: jest.fn(), setPlaybackState: jest.fn(), enableCommands: jest.fn() },
  PlaybackState: { Playing: 0, Paused: 1 },
  Command: { play: 'play', pause: 'pause' },
}));
jest.mock('@modules/audio-noisy-module', () => null, { virtual: true });
jest.mock('expo-file-system', () => ({
  documentDirectory: '/mock/',
  getInfoAsync: jest.fn(() => Promise.resolve({ exists: false })),
  makeDirectoryAsync: jest.fn(),
  deleteAsync: jest.fn(),
  readDirectoryAsync: jest.fn(() => Promise.resolve([])),
  readAsStringAsync: jest.fn(() => Promise.resolve('')),
  writeAsStringAsync: jest.fn(),
  downloadAsync: jest.fn(),
  cacheDirectory: '/mock/cache/',
}));
jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => ({
    runAsync: jest.fn(),
    getFirstAsync: jest.fn(),
    getAllAsync: jest.fn(() => []),
    withTransactionAsync: jest.fn((fn: any) => fn()),
    execAsync: jest.fn(),
    closeSync: jest.fn(),
  })),
}));
jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn(() => Promise.resolve('mockedhash')),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const reanimated = {
    makeMutable: jest.fn((val: any) => ({ value: val })),
    useSharedValue: jest.fn((val: any) => ({ value: val })),
    useAnimatedStyle: jest.fn(() => ({})),
    withSpring: jest.fn((val: any) => val),
    withTiming: jest.fn((val: any) => val),
    interpolate: jest.fn(),
    Extrapolation: { CLAMP: 'clamp' },
    runOnJS: jest.fn((fn: any) => fn),
    createAnimatedComponent: (comp: any) => comp || ((props: any) => React.createElement('View', props)),
    View: (props: any) => React.createElement('View', props),
  };
  return { __esModule: true, default: reanimated, ...reanimated };
});
jest.mock('react-native-gesture-handler', () => ({
  Gesture: { Pan: jest.fn(() => ({ onUpdate: jest.fn().mockReturnThis(), onEnd: jest.fn().mockReturnThis() })) },
  GestureDetector: ({ children }: any) => children,
}));

// ============================================================================
// POSITION RESOLVER — catches type coercion crashes from SQLite data
// ============================================================================

import {
  resolvePosition,
  createLocalSource,
  createServerSource,
  type PositionSource,
} from '@/features/player/utils/positionResolver';

describe('positionResolver (integration)', () => {
  it('handles numeric positions correctly', () => {
    const local = createLocalSource(45.5, Date.now() - 1000);
    const server = createServerSource(30.0, Date.now());
    const result = resolvePosition(local, server);
    expect(result.position).toBeDefined();
    expect(typeof result.position).toBe('number');
  });

  it('handles string positions from SQLite without crashing', () => {
    // SQLite can return numbers as strings — this was crashing with
    // "local.position.toFixed is not a function"
    const local: PositionSource = {
      position: '45.5' as unknown as number, // SQLite string
      updatedAt: Date.now() - 1000,
      source: 'local',
    };
    const server: PositionSource = {
      position: '30.0' as unknown as number, // SQLite string
      updatedAt: Date.now(),
      source: 'server',
    };

    // Should NOT throw (was crashing with ".toFixed is not a function")
    const result = resolvePosition(local, server);
    expect(typeof result.position).toBe('number');
    expect(Number.isFinite(result.position)).toBe(true);
  });

  it('handles null positions without crashing', () => {
    const result = resolvePosition(null, null);
    expect(result.position).toBe(0);
    expect(result.source).toBe('local');
  });

  it('handles one null source', () => {
    const local = createLocalSource(120, Date.now());
    expect(() => resolvePosition(local, null)).not.toThrow();
    expect(() => resolvePosition(null, local)).not.toThrow();
  });

  it('handles zero positions', () => {
    const local = createLocalSource(0, Date.now());
    const server = createServerSource(0, Date.now());
    const result = resolvePosition(local, server);
    expect(result.position).toBe(0);
  });

  it('handles NaN positions without crashing', () => {
    const local: PositionSource = {
      position: NaN,
      updatedAt: Date.now(),
      source: 'local',
    };
    // Should not throw
    expect(() => resolvePosition(local, null)).not.toThrow();
  });

  it('same session uses max position', () => {
    const now = Date.now();
    const local = createLocalSource(100, now);
    const server = createServerSource(80, now);
    const result = resolvePosition(local, server);
    expect(result.position).toBe(100);
  });

  it('different session prefers local when ahead (safety net prevents regression)', () => {
    const local = createLocalSource(100, Date.now() - 60000);
    const server = createServerSource(50, Date.now());
    const result = resolvePosition(local, server);
    expect(result.position).toBe(100); // Local is ahead by >5s — safety net prevents regression
    expect(result.source).toBe('local');
  });

  it('different session uses server when server is ahead', () => {
    const local = createLocalSource(50, Date.now() - 60000);
    const server = createServerSource(100, Date.now());
    const result = resolvePosition(local, server);
    expect(result.position).toBe(100); // Server is newer AND ahead
    expect(result.source).toBe('server');
  });
});

// ============================================================================
// SHARED UTILS — catches missing exports, wrong function signatures
// ============================================================================

import { formatBytes } from '@/shared/utils/format';
import { formatDuration } from '@/shared/utils/format';

describe('shared utils (integration)', () => {
  it('formatBytes handles all input types', () => {
    expect(() => formatBytes(0)).not.toThrow();
    expect(() => formatBytes(1024)).not.toThrow();
    expect(() => formatBytes(1073741824)).not.toThrow();
    expect(typeof formatBytes(1024)).toBe('string');
    // Edge cases
    expect(() => formatBytes(-1)).not.toThrow();
    expect(() => formatBytes(NaN)).not.toThrow();
  });

  it('formatDuration handles all input types', () => {
    expect(() => formatDuration(0)).not.toThrow();
    expect(() => formatDuration(3661)).not.toThrow();
    expect(typeof formatDuration(100)).toBe('string');
  });
});

// ============================================================================
// CHAPTER UTILITIES — catches type issues in shared chapter code
// ============================================================================

import { calculateTimeRemaining, isBookComplete } from '@/shared/utils/chapters/progressCalculator';
import { findChapterForPosition } from '@/shared/utils/chapters/chapterNavigator';
import type { Chapter } from '@/shared/utils/chapters/types';

describe('chapter utilities (integration)', () => {
  const mockChapters: Chapter[] = [
    { id: 1, title: 'Chapter 1', start: 0, end: 600 },
    { id: 2, title: 'Chapter 2', start: 600, end: 1200 },
    { id: 3, title: 'Chapter 3', start: 1200, end: 1800 },
  ];

  it('calculateTimeRemaining with valid inputs', () => {
    const result = calculateTimeRemaining(300, 1800);
    expect(typeof result).toBe('number');
    expect(result).toBe(1500);
  });

  it('calculateTimeRemaining with string inputs from SQLite', () => {
    // SQLite may return strings
    const result = calculateTimeRemaining('300' as any, '1800' as any);
    expect(typeof result).toBe('number');
  });

  it('isBookComplete with various position/duration values', () => {
    // isBookComplete(position, duration, threshold=0.95)
    expect(isBookComplete(96, 100)).toBe(true);   // 96% > 95%
    expect(isBookComplete(50, 100)).toBe(false);   // 50% < 95%
    expect(isBookComplete(100, 100)).toBe(true);   // 100%
    expect(isBookComplete(0, 100)).toBe(false);    // 0%
  });

  it('findChapterForPosition with valid position', () => {
    const chapter = findChapterForPosition(mockChapters, 700);
    expect(chapter).toBeDefined();
  });

  it('findChapterForPosition with boundary positions', () => {
    expect(() => findChapterForPosition(mockChapters, 0)).not.toThrow();
    expect(() => findChapterForPosition(mockChapters, 1800)).not.toThrow();
    expect(() => findChapterForPosition(mockChapters, -1)).not.toThrow();
  });

  it('findChapterForPosition with empty chapters', () => {
    expect(() => findChapterForPosition([], 100)).not.toThrow();
  });
});

// ============================================================================
// AUDIO SERVICE TYPES — verifies shared type exports resolve
// ============================================================================

import type {
  PlaybackState,
  AudioTrackInfo,
  AudioError,
  AudioErrorType,
} from '@/features/player/services/audioServiceTypes';

describe('audio service types (integration)', () => {
  it('type exports are importable and usable', () => {
    // Verify the types compile and can be used in runtime constructs
    const state: PlaybackState = {
      isPlaying: false,
      position: 0,
      duration: 100,
      isBuffering: false,
      didJustFinish: false,
    };
    expect(state.position).toBe(0);

    const track: AudioTrackInfo = {
      url: 'https://example.com/audio.m4b',
      title: 'Test Track',
      startOffset: 0,
      duration: 100,
    };
    expect(track.url).toBeDefined();

    const error: AudioError = {
      type: 'LOAD_FAILED' as AudioErrorType,
      message: 'test',
    };
    expect(error.type).toBe('LOAD_FAILED');
  });
});

// ============================================================================
// TICK CACHE — verifies shared utility moved correctly
// ============================================================================

import { preWarmTickCache } from '@/shared/utils/tickCache';

describe('tickCache (integration)', () => {
  it('exports are importable from shared location', () => {
    expect(typeof preWarmTickCache).toBe('function');
  });

  it('re-export shim works from old location', () => {
    const oldExports = require('@/features/player/services/tickCache');
    expect(typeof oldExports.preWarmTickCache).toBe('function');
  });
});

// ============================================================================
// FEELING CHIP TYPE — verifies shared type moved correctly
// ============================================================================

describe('feelingChip type (integration)', () => {
  it('type is importable from shared location', () => {
    const sharedModule = require('@/shared/types/feelingChip');
    // Type-only exports won't have runtime values, but the module should resolve
    expect(sharedModule).toBeDefined();
  });

  it('re-export from old location resolves', () => {
    const oldModule = require('@/features/browse/stores/feelingChipStore');
    expect(oldModule).toBeDefined();
  });
});

// ============================================================================
// STORE FACADES — verifies facade re-exports resolve to real stores
// ============================================================================

describe('store facades (integration)', () => {
  it('playerFacade exports resolve', () => {
    const facade = require('@/shared/stores/playerFacade');
    expect(facade.usePlayerStore).toBeDefined();
    expect(typeof facade.usePlayerStore).toBe('function');
    expect(facade.usePlayerSettingsStore).toBeDefined();
    expect(facade.useSpeedStore).toBeDefined();
    expect(facade.useSeekingStore).toBeDefined();
  });

  it('queueFacade exports resolve', () => {
    const facade = require('@/shared/stores/queueFacade');
    expect(facade.useQueueStore).toBeDefined();
    expect(typeof facade.useQueueStore).toBe('function');
  });

});

// ============================================================================
// RE-EXPORT SHIMS — verifies old import paths still work
// ============================================================================

describe('re-export shims (integration)', () => {
  it('player/utils re-exports from shared/utils/chapters', () => {
    const oldModule = require('@/features/player/utils/progressCalculator');
    expect(oldModule.calculateTimeRemaining).toBeDefined();
    expect(oldModule.isBookComplete).toBeDefined();
  });

  it('player/utils/chapterNavigator re-exports', () => {
    const oldModule = require('@/features/player/utils/chapterNavigator');
    expect(oldModule.findChapterForPosition).toBeDefined();
  });

  it('player/services/tickCache re-exports', () => {
    const oldModule = require('@/features/player/services/tickCache');
    expect(oldModule.preWarmTickCache).toBeDefined();
  });
});

// ============================================================================
// STORE ACTION SEQUENCES — catches wrong method/property names
// ============================================================================

describe('store action sequences (integration)', () => {
  it('playerStore has expected methods', () => {
    const { usePlayerStore } = require('@/shared/stores/playerFacade');
    const state = usePlayerStore.getState();

    // Methods that authService.clearStorage() calls
    expect(typeof state.cleanup).toBe('function');
    expect(typeof state.play).toBe('function');
    expect(typeof state.pause).toBe('function');
    expect(typeof state.setPlayerVisible).toBe('function');

    // Properties that components read
    expect('isPlaying' in state).toBe(true);
    expect('isPlayerVisible' in state).toBe(true);
    expect('currentBook' in state).toBe(true);
    expect('position' in state).toBe(true);
    expect('duration' in state).toBe(true);
    expect('chapters' in state).toBe(true);
  });

  it('seekingStore has expected methods', () => {
    const { useSeekingStore } = require('@/shared/stores/playerFacade');
    const state = useSeekingStore.getState();

    // Method that authService calls
    expect(typeof state.resetSeekingState).toBe('function');
    expect('isSeeking' in state).toBe(true);
    expect('seekPosition' in state).toBe(true);
  });

  it('playerSettingsStore has expected properties', () => {
    const { usePlayerSettingsStore } = require('@/shared/stores/playerFacade');
    const state = usePlayerSettingsStore.getState();

    // Properties read by GlobalMiniPlayer
    expect('skipBackInterval' in state).toBe(true);
    expect('skipForwardInterval' in state).toBe(true);
    expect(typeof state.skipBackInterval).toBe('number');
    expect(typeof state.skipForwardInterval).toBe('number');
  });

});
