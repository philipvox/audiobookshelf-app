/**
 * src/navigation/components/GlobalMiniPlayer.tsx
 *
 * Secret Library Mini Player
 * Clean editorial design with dark background and pill-shaped controls.
 * Positioned at the bottom of the screen above the tab bar.
 */

import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { scale } from '@/shared/theme';
import { useShallow } from 'zustand/react/shallow';
import { usePlayerStore, useCurrentChapterIndex, useSeekingStore } from '@/features/player/stores';
import { useNormalizedChapters } from '@/shared/hooks';
import { getTitle } from '@/shared/utils/metadata';
import { haptics } from '@/core/native/haptics';
import { secretLibraryColors, secretLibraryFonts } from '@/shared/theme/secretLibrary';
import {
  RewindIcon,
  FastForwardIcon,
  PlayIcon,
  PauseIcon,
} from '@/features/player/components/PlayerIcons';

// =============================================================================
// CONSTANTS
// =============================================================================

const SWIPE_UP_THRESHOLD = -50;
const SWIPE_DOWN_THRESHOLD = 50;

// Dark background color - matches library screen (secretLibraryColors.black)
const MINI_PLAYER_BG = '#0f0f0f';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function GlobalMiniPlayer() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [currentRouteName, setCurrentRouteName] = useState('');

  // Track current route for hiding on modal screens
  useEffect(() => {
    const unsubscribe = navigation.addListener('state', () => {
      const state = navigation.getState();
      if (state) {
        const route = state.routes[state.index];
        setCurrentRouteName(route.name);
      }
    });
    return unsubscribe;
  }, [navigation]);

  // Player state - PERF: batch subscriptions with useShallow to reduce re-renders
  const {
    currentBook,
    isPlaying,
    isLoading,
    isBuffering,
    isPlayerVisible,
    position,
    duration,
    chapters,
    play,
    pause,
    togglePlayer,
    cleanup,
  } = usePlayerStore(
    useShallow((s) => ({
      currentBook: s.currentBook,
      isPlaying: s.isPlaying,
      isLoading: s.isLoading,
      isBuffering: s.isBuffering,
      isPlayerVisible: s.isPlayerVisible,
      position: s.position,
      duration: s.duration,
      chapters: s.chapters,
      play: s.play,
      pause: s.pause,
      togglePlayer: s.togglePlayer,
      cleanup: s.cleanup,
    }))
  );

  // Current chapter
  const currentChapterIndex = useCurrentChapterIndex();
  const normalizedChapters = useNormalizedChapters(chapters, {
    bookTitle: getTitle(currentBook),
  });
  const currentChapter = normalizedChapters[currentChapterIndex];
  const chapterName = currentChapter?.displayTitle || `Part ${currentChapterIndex + 1}`;

  // Swipe gesture state
  const translateY = useSharedValue(0);

  // Handlers
  const handlePlayPause = useCallback(() => {
    haptics.selection();
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, pause, play]);

  // Get bookId for progress saving
  const bookId = currentBook?.id;

  const handleSkipBack = useCallback(() => {
    haptics.selection();
    const newPosition = Math.max(0, position - 15);
    useSeekingStore.getState().seekTo(newPosition, duration, bookId);
  }, [position, duration, bookId]);

  const handleSkipForward = useCallback(() => {
    haptics.selection();
    const newPosition = Math.min(duration, position + 30);
    useSeekingStore.getState().seekTo(newPosition, duration, bookId);
  }, [position, duration, bookId]);

  const handleOpenPlayer = useCallback(() => {
    haptics.selection();
    togglePlayer?.();
  }, [togglePlayer]);

  const handleCloseMiniPlayer = useCallback(() => {
    haptics.selection();
    cleanup();
  }, [cleanup]);

  // Swipe gestures: up to open full player, down to close and save progress
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      'worklet';
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      'worklet';
      if (event.translationY < SWIPE_UP_THRESHOLD) {
        runOnJS(handleOpenPlayer)();
      } else if (event.translationY > SWIPE_DOWN_THRESHOLD) {
        runOnJS(handleCloseMiniPlayer)();
      }
      translateY.value = withTiming(0, { duration: 150 });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value < 0
      ? Math.min(0, translateY.value * 0.3)
      : Math.min(translateY.value * 0.5, 30) }],
  }));

  // Determine if mini player should be hidden
  const hiddenRoutes = ['ReadingHistoryWizard', 'MoodDiscovery', 'MoodResults', 'PreferencesOnboarding', 'SpinePlayground'];
  const shouldHide = !currentBook || isPlayerVisible || hiddenRoutes.includes(currentRouteName);

  const title = currentBook ? getTitle(currentBook) : '';

  return (
    <View
      style={[styles.wrapper, shouldHide && styles.hidden]}
      pointerEvents={shouldHide ? 'none' : 'auto'}
    >
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.container,
            { paddingBottom: insets.bottom > 0 ? insets.bottom : scale(12) },
            animatedStyle,
          ]}
        >
          {/* Controls Row */}
          <View style={styles.controlsRow}>
            {/* Book Info - tap to open player */}
            <Pressable style={styles.infoContainer} onPress={handleOpenPlayer}>
              <Text style={styles.bookTitle} numberOfLines={1}>{title}</Text>
              <Text style={styles.chapterName} numberOfLines={1}>{chapterName}</Text>
            </Pressable>

            {/* Buttons */}
            <View style={styles.buttonsContainer}>
              {/* Skip Back 15s */}
              <TouchableOpacity
                style={styles.skipButton}
                onPress={handleSkipBack}
              >
                <RewindIcon color={secretLibraryColors.white} size={16} />
              </TouchableOpacity>

              {/* Skip Forward 30s */}
              <TouchableOpacity
                style={styles.skipButton}
                onPress={handleSkipForward}
              >
                <FastForwardIcon color={secretLibraryColors.white} size={16} />
              </TouchableOpacity>

              {/* Play/Pause */}
              <TouchableOpacity
                style={styles.playButton}
                onPress={handlePlayPause}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size={18} color={secretLibraryColors.black} />
                ) : isBuffering ? (
                  <View style={styles.bufferingContainer}>
                    <ActivityIndicator size={32} color={secretLibraryColors.black} style={styles.bufferingSpinner} />
                    {isPlaying ? (
                      <PauseIcon color={secretLibraryColors.black} size={12} />
                    ) : (
                      <PlayIcon color={secretLibraryColors.black} size={12} />
                    )}
                  </View>
                ) : isPlaying ? (
                  <PauseIcon color={secretLibraryColors.black} size={18} />
                ) : (
                  <PlayIcon color={secretLibraryColors.black} size={18} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

/** Height of the mini player for layout calculations (includes safe area estimate) */
export const GLOBAL_MINI_PLAYER_HEIGHT = scale(110);

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  // Wrapper - always rendered to prevent Android SafeAreaProvider crash
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9998,
  },
  // Hidden state - visually hide without removing from view tree
  hidden: {
    opacity: 0,
  },
  container: {
    backgroundColor: MINI_PLAYER_BG,
    paddingHorizontal: scale(20),
    paddingTop: scale(16),
  },

  // Controls Row
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // Info
  infoContainer: {
    flex: 1,
    flexDirection: 'column',
    gap: scale(2),
    marginRight: scale(16),
  },
  bookTitle: {
    fontFamily: secretLibraryFonts.playfair.regular,
    fontSize: scale(18),
    color: secretLibraryColors.white,
  },
  chapterName: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    fontSize: scale(13),
    fontStyle: 'italic',
    color: secretLibraryColors.gray,
  },

  // Buttons
  buttonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  skipButton: {
    height: scale(38),
    paddingHorizontal: scale(16),
    borderRadius: scale(19),
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    height: scale(38),
    paddingHorizontal: scale(22),
    borderRadius: scale(19),
    backgroundColor: secretLibraryColors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bufferingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  bufferingSpinner: {
    position: 'absolute',
  },
});

export default GlobalMiniPlayer;
