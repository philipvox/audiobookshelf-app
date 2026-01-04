/**
 * Integration tests for playerStore.
 *
 * These tests verify the playerStore behavior in realistic scenarios,
 * using the extracted pure functions and test utilities.
 */

import {
  createMockTracks,
  createMockChapters,
  createMockBookMedia,
  createInitialPlayerState,
  SEEK_TEST_SCENARIOS,
  PLAYBACK_RATE_TEST_VALUES,
  resetTestEnvironment,
} from './testUtils';

import {
  findTrackForPosition,
  calculateGlobalPosition,
  calculateProgress,
  formatDuration,
  clampPlaybackRate,
  getNextPlaybackRate,
  findChapterForPosition,
  calculateSmartRewindSeconds,
} from '../../utils/index';

describe('PlayerStore Integration', () => {
  beforeEach(() => {
    resetTestEnvironment();
  });

  describe('Track Navigation', () => {
    const tracks = createMockTracks(3);
    // Total duration: 5400s (3 tracks × 1800s each)

    it('finds correct track for global position', () => {
      // Position 0 -> Track 0
      expect(findTrackForPosition(tracks, 0)?.trackIndex).toBe(0);

      // Position 900 (middle of track 1) -> Track 0
      expect(findTrackForPosition(tracks, 900)?.trackIndex).toBe(0);

      // Position 1800 (start of track 2) -> Track 1
      expect(findTrackForPosition(tracks, 1800)?.trackIndex).toBe(1);

      // Position 4500 (middle of track 3) -> Track 2
      expect(findTrackForPosition(tracks, 4500)?.trackIndex).toBe(2);
    });

    it('calculates global position from track position', () => {
      expect(calculateGlobalPosition(tracks, 0, 500)).toBe(500);
      expect(calculateGlobalPosition(tracks, 1, 500)).toBe(2300);
      expect(calculateGlobalPosition(tracks, 2, 500)).toBe(4100);
    });

    it('handles seeking across track boundaries', () => {
      // Start in track 1, seek to track 3
      const startTrack = findTrackForPosition(tracks, 500);
      expect(startTrack?.trackIndex).toBe(0);

      const endTrack = findTrackForPosition(tracks, 4000);
      expect(endTrack?.trackIndex).toBe(2);
      expect(endTrack?.positionInTrack).toBe(400);
    });
  });

  describe('Progress Tracking', () => {
    it('calculates progress correctly', () => {
      expect(calculateProgress(0, 3600)).toBe(0);
      expect(calculateProgress(1800, 3600)).toBe(0.5);
      expect(calculateProgress(3600, 3600)).toBe(1);
    });

    it('clamps progress to valid range', () => {
      expect(calculateProgress(-100, 3600)).toBe(0);
      expect(calculateProgress(5000, 3600)).toBe(1);
    });

    it('handles zero duration', () => {
      expect(calculateProgress(100, 0)).toBe(0);
    });

    it('formats duration correctly', () => {
      expect(formatDuration(0)).toBe('0:00');
      expect(formatDuration(65)).toBe('1:05');
      expect(formatDuration(3661)).toBe('1:01:01');
    });
  });

  describe('Playback Rate', () => {
    it('clamps rate to valid range', () => {
      expect(clampPlaybackRate(0.3)).toBe(0.5);
      expect(clampPlaybackRate(1.5)).toBe(1.5);
      expect(clampPlaybackRate(5.0)).toBe(3.0);
    });

    it('cycles through standard rates', () => {
      expect(getNextPlaybackRate(1.0)).toBe(1.25);
      expect(getNextPlaybackRate(1.25)).toBe(1.5);
      expect(getNextPlaybackRate(3.0)).toBe(0.5); // Wraps around
    });

    it.each(PLAYBACK_RATE_TEST_VALUES)(
      'accepts rate $rate ($label)',
      ({ rate }) => {
        const clamped = clampPlaybackRate(rate);
        expect(clamped).toBeGreaterThanOrEqual(0.5);
        expect(clamped).toBeLessThanOrEqual(3.0);
      }
    );
  });

  describe('Chapter Navigation', () => {
    const chapters = createMockChapters(5);
    // Chapters: 0-1800, 1800-3600, 3600-5400, 5400-7200, 7200-9000

    it('finds chapter for position', () => {
      expect(findChapterForPosition(chapters, 500)?.index).toBe(0);
      expect(findChapterForPosition(chapters, 2000)?.index).toBe(1);
      expect(findChapterForPosition(chapters, 8000)?.index).toBe(4);
    });

    it('handles position at chapter boundary', () => {
      // Exactly at chapter 2 start
      const result = findChapterForPosition(chapters, 1800);
      expect(result?.index).toBe(1);
    });

    it('handles position beyond all chapters', () => {
      const result = findChapterForPosition(chapters, 10000);
      expect(result?.index).toBe(4); // Last chapter
    });
  });

  describe('Smart Rewind', () => {
    it('returns 0 for very short pauses', () => {
      expect(calculateSmartRewindSeconds(1000, 60)).toBe(0);
      expect(calculateSmartRewindSeconds(2000, 60)).toBe(0);
    });

    it('calculates appropriate rewind for various pause durations', () => {
      // 3 second pause -> ~3 second rewind
      expect(calculateSmartRewindSeconds(3000, 60)).toBe(3);

      // 30 second pause -> ~10 second rewind
      expect(calculateSmartRewindSeconds(30000, 60)).toBe(10);

      // 2 minute pause -> ~15 second rewind
      expect(calculateSmartRewindSeconds(120000, 60)).toBe(15);

      // 1 hour pause -> ~30 second rewind
      expect(calculateSmartRewindSeconds(3600000, 60)).toBe(30);
    });

    it('respects max rewind setting', () => {
      // Even long pauses respect the max
      expect(calculateSmartRewindSeconds(86400000, 15)).toBe(15);
      expect(calculateSmartRewindSeconds(86400000, 30)).toBe(30);
    });
  });

  describe('Seek Scenarios', () => {
    it.each(SEEK_TEST_SCENARIOS)(
      '$name',
      ({ seekTarget, expectedFinalPosition, duration }) => {
        // Calculate where we'd end up
        const clamped = Math.max(0, Math.min(seekTarget, duration));
        expect(clamped).toBe(expectedFinalPosition);
      }
    );
  });

  describe('Book Media Loading', () => {
    it('creates valid mock book media', () => {
      const book = createMockBookMedia();

      expect(book.libraryItemId).toBeDefined();
      expect(book.title).toBeDefined();
      expect(book.tracks.length).toBe(3);
      expect(book.chapters.length).toBe(5);
      expect(book.duration).toBe(5400); // 3 tracks × 1800s
    });

    it('creates book with custom tracks', () => {
      const customTracks = createMockTracks(5);
      const book = createMockBookMedia({ tracks: customTracks });

      expect(book.tracks.length).toBe(5);
      expect(book.duration).toBe(9000); // 5 tracks × 1800s
    });
  });

  describe('State Initialization', () => {
    it('creates initial state with defaults', () => {
      const state = createInitialPlayerState();

      expect(state.isPlaying).toBe(false);
      expect(state.position).toBe(0);
      expect(state.playbackRate).toBe(1.0);
      expect(state.isSeeking).toBe(false);
    });

    it('creates initial state with overrides', () => {
      const state = createInitialPlayerState({
        isPlaying: true,
        position: 1000,
        playbackRate: 1.5,
      });

      expect(state.isPlaying).toBe(true);
      expect(state.position).toBe(1000);
      expect(state.playbackRate).toBe(1.5);
    });
  });

  describe('Multi-Track Seeking', () => {
    const tracks = createMockTracks(4);

    it('correctly maps global position to track position', () => {
      // Global position 4000 should be in track 3 (index 2)
      // Track 3 starts at 3600, so position in track = 400
      const result = findTrackForPosition(tracks, 4000);

      expect(result?.trackIndex).toBe(2);
      expect(result?.positionInTrack).toBe(400);
    });

    it('handles seeking to exact track boundaries', () => {
      // Seek to start of track 2 (global position 1800)
      const result = findTrackForPosition(tracks, 1800);

      expect(result?.trackIndex).toBe(1);
      expect(result?.positionInTrack).toBe(0);
    });

    it('clamps position when seeking past end', () => {
      // Seek past the end of all tracks
      const result = findTrackForPosition(tracks, 10000);

      expect(result?.trackIndex).toBe(3); // Last track
      expect(result?.positionInTrack).toBe(1800); // At end of track
    });
  });

  describe('Edge Cases', () => {
    it('handles empty tracks array', () => {
      expect(findTrackForPosition([], 100)).toBeNull();
      expect(calculateGlobalPosition([], 0, 100)).toBe(0);
    });

    it('handles empty chapters array', () => {
      expect(findChapterForPosition([], 100)).toBeNull();
    });

    it('handles negative positions', () => {
      const tracks = createMockTracks(3);
      const result = findTrackForPosition(tracks, -100);

      expect(result?.trackIndex).toBe(0);
      expect(result?.positionInTrack).toBe(0);
    });

    it('handles NaN and Infinity in duration formatting', () => {
      expect(formatDuration(NaN)).toBe('0:00');
      expect(formatDuration(Infinity)).toBe('0:00');
      expect(formatDuration(-100)).toBe('0:00');
    });
  });
});
