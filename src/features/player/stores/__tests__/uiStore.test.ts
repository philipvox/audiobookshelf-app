/**
 * Tests for PlayerUIStore
 */

import { usePlayerUIStore } from '../uiStore';

describe('PlayerUIStore', () => {
  beforeEach(() => {
    // Reset store before each test
    usePlayerUIStore.getState().resetUI();
  });

  describe('Initial State', () => {
    it('has correct default values', () => {
      const state = usePlayerUIStore.getState();

      expect(state.isLoading).toBe(false);
      expect(state.isBuffering).toBe(false);
      expect(state.loadingProgress).toBe(0);
      expect(state.isFullScreenPlayerVisible).toBe(false);
      expect(state.isMiniPlayerVisible).toBe(false);
      expect(state.isChapterSheetOpen).toBe(false);
      expect(state.isSpeedSheetOpen).toBe(false);
      expect(state.isSleepTimerSheetOpen).toBe(false);
      expect(state.isQueueSheetOpen).toBe(false);
      expect(state.isSeekGestureActive).toBe(false);
      expect(state.isVolumeGestureActive).toBe(false);
      expect(state.isShakeDetectionActive).toBe(false);
      expect(state.errorToShow).toBeNull();
    });
  });

  describe('Loading States', () => {
    it('sets loading state', () => {
      usePlayerUIStore.getState().setLoading(true);
      expect(usePlayerUIStore.getState().isLoading).toBe(true);
      expect(usePlayerUIStore.getState().loadingProgress).toBe(0);

      usePlayerUIStore.getState().setLoading(false);
      expect(usePlayerUIStore.getState().isLoading).toBe(false);
      expect(usePlayerUIStore.getState().loadingProgress).toBe(100);
    });

    it('sets buffering state', () => {
      usePlayerUIStore.getState().setBuffering(true);
      expect(usePlayerUIStore.getState().isBuffering).toBe(true);

      usePlayerUIStore.getState().setBuffering(false);
      expect(usePlayerUIStore.getState().isBuffering).toBe(false);
    });

    it('sets loading progress', () => {
      usePlayerUIStore.getState().setLoadingProgress(50);
      expect(usePlayerUIStore.getState().loadingProgress).toBe(50);
    });

    it('clamps loading progress to 0-100', () => {
      usePlayerUIStore.getState().setLoadingProgress(-10);
      expect(usePlayerUIStore.getState().loadingProgress).toBe(0);

      usePlayerUIStore.getState().setLoadingProgress(150);
      expect(usePlayerUIStore.getState().loadingProgress).toBe(100);
    });
  });

  describe('Player Visibility', () => {
    it('shows full screen player and hides mini', () => {
      usePlayerUIStore.getState().showMiniPlayer();
      usePlayerUIStore.getState().showFullScreenPlayer();

      const state = usePlayerUIStore.getState();
      expect(state.isFullScreenPlayerVisible).toBe(true);
      expect(state.isMiniPlayerVisible).toBe(false);
    });

    it('hides full screen player and shows mini', () => {
      usePlayerUIStore.getState().showFullScreenPlayer();
      usePlayerUIStore.getState().hideFullScreenPlayer();

      const state = usePlayerUIStore.getState();
      expect(state.isFullScreenPlayerVisible).toBe(false);
      expect(state.isMiniPlayerVisible).toBe(true);
    });

    it('shows mini player and hides full screen', () => {
      usePlayerUIStore.getState().showFullScreenPlayer();
      usePlayerUIStore.getState().showMiniPlayer();

      const state = usePlayerUIStore.getState();
      expect(state.isMiniPlayerVisible).toBe(true);
      expect(state.isFullScreenPlayerVisible).toBe(false);
    });

    it('hides mini player', () => {
      usePlayerUIStore.getState().showMiniPlayer();
      usePlayerUIStore.getState().hideMiniPlayer();

      expect(usePlayerUIStore.getState().isMiniPlayerVisible).toBe(false);
    });

    it('hides all players', () => {
      usePlayerUIStore.getState().showFullScreenPlayer();
      usePlayerUIStore.getState().hideAllPlayers();

      const state = usePlayerUIStore.getState();
      expect(state.isFullScreenPlayerVisible).toBe(false);
      expect(state.isMiniPlayerVisible).toBe(false);
    });
  });

  describe('Sheet Controls', () => {
    it('opens chapter sheet and closes others', () => {
      usePlayerUIStore.getState().openSpeedSheet();
      usePlayerUIStore.getState().openChapterSheet();

      const state = usePlayerUIStore.getState();
      expect(state.isChapterSheetOpen).toBe(true);
      expect(state.isSpeedSheetOpen).toBe(false);
    });

    it('opens speed sheet and closes others', () => {
      usePlayerUIStore.getState().openChapterSheet();
      usePlayerUIStore.getState().openSpeedSheet();

      const state = usePlayerUIStore.getState();
      expect(state.isSpeedSheetOpen).toBe(true);
      expect(state.isChapterSheetOpen).toBe(false);
    });

    it('opens sleep timer sheet and closes others', () => {
      usePlayerUIStore.getState().openChapterSheet();
      usePlayerUIStore.getState().openSleepTimerSheet();

      const state = usePlayerUIStore.getState();
      expect(state.isSleepTimerSheetOpen).toBe(true);
      expect(state.isChapterSheetOpen).toBe(false);
    });

    it('opens queue sheet and closes others', () => {
      usePlayerUIStore.getState().openChapterSheet();
      usePlayerUIStore.getState().openQueueSheet();

      const state = usePlayerUIStore.getState();
      expect(state.isQueueSheetOpen).toBe(true);
      expect(state.isChapterSheetOpen).toBe(false);
    });

    it('closes individual sheets', () => {
      usePlayerUIStore.getState().openChapterSheet();
      usePlayerUIStore.getState().closeChapterSheet();
      expect(usePlayerUIStore.getState().isChapterSheetOpen).toBe(false);

      usePlayerUIStore.getState().openSpeedSheet();
      usePlayerUIStore.getState().closeSpeedSheet();
      expect(usePlayerUIStore.getState().isSpeedSheetOpen).toBe(false);

      usePlayerUIStore.getState().openSleepTimerSheet();
      usePlayerUIStore.getState().closeSleepTimerSheet();
      expect(usePlayerUIStore.getState().isSleepTimerSheetOpen).toBe(false);

      usePlayerUIStore.getState().openQueueSheet();
      usePlayerUIStore.getState().closeQueueSheet();
      expect(usePlayerUIStore.getState().isQueueSheetOpen).toBe(false);
    });

    it('closes all sheets', () => {
      usePlayerUIStore.getState().openChapterSheet();
      usePlayerUIStore.getState().closeAllSheets();

      const state = usePlayerUIStore.getState();
      expect(state.isChapterSheetOpen).toBe(false);
      expect(state.isSpeedSheetOpen).toBe(false);
      expect(state.isSleepTimerSheetOpen).toBe(false);
      expect(state.isQueueSheetOpen).toBe(false);
    });
  });

  describe('Gesture States', () => {
    it('sets seek gesture active', () => {
      usePlayerUIStore.getState().setSeekGestureActive(true);
      expect(usePlayerUIStore.getState().isSeekGestureActive).toBe(true);

      usePlayerUIStore.getState().setSeekGestureActive(false);
      expect(usePlayerUIStore.getState().isSeekGestureActive).toBe(false);
    });

    it('sets volume gesture active', () => {
      usePlayerUIStore.getState().setVolumeGestureActive(true);
      expect(usePlayerUIStore.getState().isVolumeGestureActive).toBe(true);

      usePlayerUIStore.getState().setVolumeGestureActive(false);
      expect(usePlayerUIStore.getState().isVolumeGestureActive).toBe(false);
    });
  });

  describe('Shake Detection', () => {
    it('sets shake detection active', () => {
      usePlayerUIStore.getState().setShakeDetectionActive(true);
      expect(usePlayerUIStore.getState().isShakeDetectionActive).toBe(true);

      usePlayerUIStore.getState().setShakeDetectionActive(false);
      expect(usePlayerUIStore.getState().isShakeDetectionActive).toBe(false);
    });
  });

  describe('Error Display', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('shows error message', () => {
      usePlayerUIStore.getState().showError('Test error');
      expect(usePlayerUIStore.getState().errorToShow).toBe('Test error');
    });

    it('auto-dismisses error after timeout', () => {
      usePlayerUIStore.getState().showError('Test error', 3000);
      expect(usePlayerUIStore.getState().errorToShow).toBe('Test error');

      jest.advanceTimersByTime(3000);
      expect(usePlayerUIStore.getState().errorToShow).toBeNull();
    });

    it('clears error manually', () => {
      usePlayerUIStore.getState().showError('Test error');
      usePlayerUIStore.getState().clearError();
      expect(usePlayerUIStore.getState().errorToShow).toBeNull();
    });

    it('replaces previous error', () => {
      usePlayerUIStore.getState().showError('Error 1');
      usePlayerUIStore.getState().showError('Error 2');
      expect(usePlayerUIStore.getState().errorToShow).toBe('Error 2');
    });
  });

  describe('Reset', () => {
    it('resets all UI state', () => {
      // Set various states
      usePlayerUIStore.getState().setLoading(true);
      usePlayerUIStore.getState().setBuffering(true);
      usePlayerUIStore.getState().showFullScreenPlayer();
      usePlayerUIStore.getState().openChapterSheet();
      usePlayerUIStore.getState().setSeekGestureActive(true);
      usePlayerUIStore.getState().setShakeDetectionActive(true);

      // Reset
      usePlayerUIStore.getState().resetUI();

      const state = usePlayerUIStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.isBuffering).toBe(false);
      expect(state.isFullScreenPlayerVisible).toBe(false);
      expect(state.isChapterSheetOpen).toBe(false);
      expect(state.isSeekGestureActive).toBe(false);
      expect(state.isShakeDetectionActive).toBe(false);
    });
  });
});
