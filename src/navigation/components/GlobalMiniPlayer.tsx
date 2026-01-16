/**
 * src/navigation/components/GlobalMiniPlayer.tsx
 *
 * Secret Library Mini Player
 * Clean editorial design with scrubber, time display, book info, and controls.
 * Positioned at the bottom of the screen above the tab bar.
 */

import React, { useCallback, useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
  DimensionValue,
} from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  SlideInDown,
  SlideOutDown,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { scale, hp, useSecretLibraryColors } from '@/shared/theme';
import { usePlayerStore, useCurrentChapterIndex } from '@/features/player/stores/playerStore';
import { useNormalizedChapters } from '@/shared/hooks';
import { getTitle } from '@/shared/utils/metadata';
import { haptics } from '@/core/native/haptics';
import {
  secretLibraryColors as staticColors,
} from '@/shared/theme/secretLibrary';

// =============================================================================
// CONSTANTS
// =============================================================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NAV_BAR_HEIGHT = hp(7);
const SWIPE_THRESHOLD = -50;
const SCRUBBER_HEIGHT = 20;
const HANDLE_SIZE = 16;
const TRACK_HEIGHT = 3;

// =============================================================================
// ICONS
// =============================================================================

interface IconProps {
  color?: string;
  size?: number;
}

// Rewind icon (<<)
const RewindIcon = ({ color = staticColors.black, size = 12 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M12.5 8L7 12l5.5 4V8z" />
    <Path d="M18 8l-5.5 4 5.5 4V8z" />
  </Svg>
);

// Fast Forward icon (>>)
const FastForwardIcon = ({ color = staticColors.black, size = 12 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M11.5 16l5.5-4-5.5-4v8z" />
    <Path d="M6 16l5.5-4L6 8v8z" />
  </Svg>
);

// Play icon
const PlayIcon = ({ color = staticColors.white, size = 14 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M8 5v14l11-7z" />
  </Svg>
);

// Pause icon
const PauseIcon = ({ color = staticColors.white, size = 14 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Rect x={6} y={5} width={4} height={14} />
    <Rect x={14} y={5} width={4} height={14} />
  </Svg>
);

// =============================================================================
// SCRUBBER COMPONENT
// =============================================================================

interface ScrubberProps {
  position: number;
  duration: number;
  onSeek: (position: number) => void;
}

const Scrubber = React.memo(({ position, duration, onSeek }: ScrubberProps) => {
  const progress = useMemo(() => {
    if (duration <= 0) return 0;
    return Math.min(1, Math.max(0, position / duration));
  }, [position, duration]);

  const handleSeek = useCallback((normalizedProgress: number) => {
    const clampedProgress = Math.max(0, Math.min(1, normalizedProgress));
    const newPosition = clampedProgress * duration;
    onSeek(newPosition);
  }, [duration, onSeek]);

  // Tap gesture for seeking
  const tapGesture = Gesture.Tap()
    .onEnd((event) => {
      'worklet';
      const trackWidth = SCREEN_WIDTH - 32; // Account for padding
      const newProgress = Math.max(0, Math.min(1, event.x / trackWidth));
      runOnJS(handleSeek)(newProgress);
    });

  // Pan gesture for scrubbing
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      'worklet';
      const trackWidth = SCREEN_WIDTH - 32;
      const newProgress = Math.max(0, Math.min(1, event.x / trackWidth));
      runOnJS(handleSeek)(newProgress);
    });

  const combinedGesture = Gesture.Race(panGesture, tapGesture);

  const progressPercent: DimensionValue = `${progress * 100}%`;
  const handleLeft: DimensionValue = `${progress * 100}%`;

  return (
    <GestureDetector gesture={combinedGesture}>
      <View style={styles.scrubberContainer}>
        {/* Track */}
        <View style={styles.scrubberTrack}>
          {/* Fill */}
          <Animated.View style={[styles.scrubberFill, { width: progressPercent }]} />
        </View>
        {/* Handle */}
        <Animated.View style={[styles.scrubberHandle, { left: handleLeft }]} />
      </View>
    </GestureDetector>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function GlobalMiniPlayer() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [currentRouteName, setCurrentRouteName] = useState('');

  // Theme-aware colors
  const colors = useSecretLibraryColors();

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

  // Player state
  const currentBook = usePlayerStore((s) => s.currentBook);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isLoading = usePlayerStore((s) => s.isLoading);
  const isPlayerVisible = usePlayerStore((s) => s.isPlayerVisible);
  const position = usePlayerStore((s) => s.position);
  const duration = usePlayerStore((s) => s.duration);
  const chapters = usePlayerStore((s) => s.chapters);
  const play = usePlayerStore((s) => s.play);
  const pause = usePlayerStore((s) => s.pause);
  const seekTo = usePlayerStore((s) => s.seekTo);
  const togglePlayer = usePlayerStore((s) => s.togglePlayer);

  // Current chapter
  const currentChapterIndex = useCurrentChapterIndex();
  const normalizedChapters = useNormalizedChapters(chapters, {
    bookTitle: getTitle(currentBook),
  });
  const currentChapter = normalizedChapters[currentChapterIndex];
  const chapterName = currentChapter?.displayTitle || `Chapter ${currentChapterIndex + 1}`;

  // Swipe gesture state
  const translateY = useSharedValue(0);

  // Handlers
  const handlePlayPause = useCallback(async () => {
    haptics.selection();
    if (isPlaying) {
      await pause();
    } else {
      await play();
    }
  }, [isPlaying, pause, play]);

  const handleSkipBack = useCallback(() => {
    haptics.selection();
    const newPosition = Math.max(0, position - 15);
    seekTo?.(newPosition);
  }, [position, seekTo]);

  const handleSkipForward = useCallback(() => {
    haptics.selection();
    const newPosition = Math.min(duration, position + 30);
    seekTo?.(newPosition);
  }, [position, duration, seekTo]);

  const handleOpenPlayer = useCallback(() => {
    haptics.selection();
    togglePlayer?.();
  }, [togglePlayer]);

  const handleSeek = useCallback((newPosition: number) => {
    seekTo?.(newPosition);
  }, [seekTo]);

  // Swipe up gesture to open full player
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      'worklet';
      if (event.translationY < 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      'worklet';
      if (event.translationY < SWIPE_THRESHOLD) {
        runOnJS(handleOpenPlayer)();
      }
      translateY.value = withTiming(0, { duration: 150 });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: Math.min(0, translateY.value * 0.3) }],
  }));

  // Don't render if no book or full player is open
  const hiddenRoutes = ['ReadingHistoryWizard', 'MoodDiscovery', 'MoodResults', 'PreferencesOnboarding'];
  if (!currentBook || isPlayerVisible || hiddenRoutes.includes(currentRouteName)) {
    return null;
  }

  const title = getTitle(currentBook);

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          styles.container,
          {
            paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
            backgroundColor: colors.white,
            borderTopColor: colors.grayLine,
          },
          animatedStyle,
        ]}
        entering={SlideInDown.duration(250).springify()}
        exiting={SlideOutDown.duration(200)}
      >
        {/* Scrubber */}
        <View style={styles.scrubberContainer}>
          {/* Track */}
          <View style={[styles.scrubberTrack, { backgroundColor: colors.grayLine }]}>
            {/* Fill */}
            <Animated.View
              style={[
                styles.scrubberFill,
                { backgroundColor: colors.black, width: `${duration > 0 ? Math.min(1, Math.max(0, position / duration)) * 100 : 0}%` as any }
              ]}
            />
          </View>
          {/* Handle */}
          <Animated.View
            style={[
              styles.scrubberHandle,
              { backgroundColor: colors.black, left: `${duration > 0 ? Math.min(1, Math.max(0, position / duration)) * 100 : 0}%` as any }
            ]}
          />
        </View>

        {/* Controls Row */}
        <View style={styles.controlsRow}>
          {/* Book Info - tap to open player */}
          <Pressable style={styles.infoContainer} onPress={handleOpenPlayer}>
            <Text style={[styles.bookTitle, { color: colors.black }]} numberOfLines={1}>{title}</Text>
            <Text style={[styles.chapterName, { color: colors.gray }]} numberOfLines={1}>{chapterName}</Text>
          </Pressable>

          {/* Buttons */}
          <View style={styles.buttonsContainer}>
            {/* Skip Back 15s */}
            <TouchableOpacity
              style={[styles.skipButton, { borderColor: colors.grayLine, backgroundColor: colors.grayLight }]}
              onPress={handleSkipBack}
            >
              <RewindIcon color={colors.black} size={14} />
            </TouchableOpacity>

            {/* Skip Forward 30s */}
            <TouchableOpacity
              style={[styles.skipButton, { borderColor: colors.grayLine, backgroundColor: colors.grayLight }]}
              onPress={handleSkipForward}
            >
              <FastForwardIcon color={colors.black} size={14} />
            </TouchableOpacity>

            {/* Play/Pause */}
            <TouchableOpacity
              style={[styles.playButton, { backgroundColor: colors.black }]}
              onPress={handlePlayPause}
              disabled={isLoading}
            >
              {isPlaying ? (
                <PauseIcon color={colors.white} size={14} />
              ) : (
                <PlayIcon color={colors.white} size={14} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

/** Height of the mini player for layout calculations */
export const GLOBAL_MINI_PLAYER_HEIGHT = scale(130);

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9998,
    backgroundColor: staticColors.grayLight,
    borderTopWidth: 1,
    borderTopColor: staticColors.grayLine,
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  // Scrubber
  scrubberContainer: {
    height: SCRUBBER_HEIGHT,
    justifyContent: 'center',
    marginBottom: 6,
  },
  scrubberTrack: {
    width: '100%',
    height: TRACK_HEIGHT,
    backgroundColor: staticColors.grayLine,
    borderRadius: TRACK_HEIGHT / 2,
  },
  scrubberFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: TRACK_HEIGHT,
    backgroundColor: staticColors.black,
    borderRadius: TRACK_HEIGHT / 2,
  },
  scrubberHandle: {
    position: 'absolute',
    top: (SCRUBBER_HEIGHT - HANDLE_SIZE) / 2,
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    backgroundColor: staticColors.black,
    borderRadius: HANDLE_SIZE / 2,
    marginLeft: -HANDLE_SIZE / 2,
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
    gap: 2,
    marginRight: 12,
  },
  bookTitle: {
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
    fontSize: 13,
    fontWeight: '600',
    color: staticColors.black,
  },
  chapterName: {
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
    fontSize: 11,
    color: staticColors.gray,
  },

  // Buttons
  buttonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  skipButton: {
    width: 40,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: staticColors.grayLine,
    backgroundColor: staticColors.grayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 40,
    height: 32,
    borderRadius: 16,
    backgroundColor: staticColors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default GlobalMiniPlayer;
