/**
 * src/navigation/components/GlobalMiniPlayer.tsx
 *
 * Global floating mini player with dark mode design.
 * Layout: [Cover Circle] [Title] [SkipBack][SkipForward][Play] - all in circles
 * Timeline progress bar with ruler-style ticks and red marker
 * Shows on all screens when a book is loaded, hidden when full player is open.
 */

import React, { useCallback, useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Rect } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  spacing,
  layout,
  hp,
  scale,
} from '@/shared/theme';
import { useIsDarkMode, useThemeStore } from '@/shared/theme/themeStore';
import { lightColors, darkColors, getThemeColors, accentColors } from '@/shared/theme/colors';
import { usePlayerStore } from '@/features/player/stores/playerStore';
import { useCoverUrl } from '@/core/cache';
import { getTitle } from '@/shared/utils/metadata';

// Layout constants
const COVER_SIZE = scale(0);
const BUTTON_SIZE = scale(40); // Smaller circular buttons
const NAV_BAR_HEIGHT = hp(7);
const SWIPE_THRESHOLD = -50;
const SCREEN_WIDTH = Dimensions.get('window').width;
const TIMELINE_PADDING = 0;
const TIMELINE_WIDTH = SCREEN_WIDTH - (TIMELINE_PADDING * 2);

// Mini player color type
interface MiniPlayerColors {
  background: string;
  backgroundTransparent: string;
  backgroundTertiary: string;
  textPrimary: string;
  textSecondary: string;
  borderStrong: string;
  borderDefault: string;
  accent: string;
  tickDefault: string;
  tickActive: string;
}

// Hook to get mini player colors based on theme - uses theme tokens with dynamic accent
function useMiniPlayerColors(): MiniPlayerColors {
  const isDark = useIsDarkMode();
  const accentTheme = useThemeStore((state) => state.accentTheme);
  const themeColors = getThemeColors(accentTheme, isDark);
  const colors = isDark ? darkColors : lightColors;

  return {
    background: colors.nav.background,
    backgroundTransparent: isDark ? 'rgba(0,0,0,0)' : 'rgba(255,255,255,0)',
    backgroundTertiary: colors.background.tertiary,
    textPrimary: colors.text.primary,
    textSecondary: colors.text.secondary,
    borderStrong: colors.border.strong,
    borderDefault: colors.border.default,
    accent: themeColors.accent.primary,
    tickDefault: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)',
    tickActive: themeColors.accent.primary,
  };
}

// Skip Back icon (previous track style)
const SkipBackIcon = ({ size, color }: { size: number; color: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M19 20L9 12L19 4V20Z"
      fill={color}
    />
    <Rect x="5" y="4" width="2" height="16" fill={color} />
  </Svg>
);

// Skip Forward icon (next track style)
const SkipForwardIcon = ({ size, color }: { size: number; color: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M5 4L15 12L5 20V4Z"
      fill={color}
    />
    <Rect x="17" y="4" width="2" height="16" fill={color} />
  </Svg>
);

// Play icon (filled triangle)
const PlayIcon = ({ size, color }: { size: number; color: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M8 5.14v13.72a1 1 0 001.5.86l10.14-6.86a1 1 0 000-1.72L9.5 4.28a1 1 0 00-1.5.86z"
      fill={color}
    />
  </Svg>
);

// Pause icon (two bars)
const PauseIcon = ({ size, color }: { size: number; color: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="6" y="5" width="4" height="14" rx="1" fill={color} />
    <Rect x="14" y="5" width="4" height="14" rx="1" fill={color} />
  </Svg>
);

// Chapter type for timeline (kept for interface compatibility)
interface ChapterInfo {
  start: number;
  end: number;
}

// Simple progress bar component
interface TimelineProgressBarProps {
  position: number; // Current position in seconds
  duration: number; // Total duration in seconds
  chapters: ChapterInfo[]; // Not used but kept for interface compatibility
  onSeek: (position: number) => void; // Seek to position in seconds
  colors: MiniPlayerColors; // Theme colors
}

const BAR_HEIGHT = 3;

const TimelineProgressBar = React.memo(({ position, duration, onSeek, colors }: TimelineProgressBarProps) => {
  // Simple linear progress based on time
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
      const newProgress = Math.max(0, Math.min(1, event.x / TIMELINE_WIDTH));
      runOnJS(handleSeek)(newProgress);
    });

  // Pan gesture for scrubbing
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      'worklet';
      const newProgress = Math.max(0, Math.min(1, event.x / TIMELINE_WIDTH));
      runOnJS(handleSeek)(newProgress);
    });

  const combinedGesture = Gesture.Race(panGesture, tapGesture);

  return (
    <GestureDetector gesture={combinedGesture}>
      <View style={timelineStyles.container}>
        {/* Background track */}
        <View style={[timelineStyles.track, { backgroundColor: colors.tickDefault }]} />
        {/* Filled progress */}
        <View style={[timelineStyles.fill, { backgroundColor: colors.accent, width: `${progress * 100}%` }]} />
      </View>
    </GestureDetector>
  );
});

const timelineStyles = StyleSheet.create({
  container: {
    width: TIMELINE_WIDTH,
    height: scale(19), // Touch target height
    marginHorizontal: TIMELINE_PADDING,
    justifyContent: 'flex-end', // Track sits at bottom, closer to content
    paddingBottom: scale(0),
  },
  track: {
    width: '100%',
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
  },
  fill: {
    position: 'absolute',
    left: 0,
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
  },
});

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

  // Cover URL
  const coverUrl = useCoverUrl(currentBook?.id || '');

  // Theme colors
  const colors = useMiniPlayerColors();

  // Swipe gesture state
  const translateY = useSharedValue(0);

  // Handlers
  const handlePlayPause = useCallback(async () => {
    if (isPlaying) {
      await pause();
    } else {
      await play();
    }
  }, [isPlaying, pause, play]);

  const handleSkipBack = useCallback(() => {
    const newPosition = Math.max(0, position - 30);
    seekTo?.(newPosition);
  }, [position, seekTo]);

  const handleSkipForward = useCallback(() => {
    const newPosition = Math.min(duration, position + 30);
    seekTo?.(newPosition);
  }, [position, duration, seekTo]);

  const handleOpenPlayer = useCallback(() => {
    togglePlayer?.();
  }, [togglePlayer]);

  // Handle timeline seek - receives position in seconds
  const handleTimelineSeek = useCallback((newPosition: number) => {
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
  const iconSize = scale(20); // Smaller icons for smaller buttons

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          styles.container,
          {
            paddingBottom: NAV_BAR_HEIGHT,
          },
          animatedStyle,
        ]}
        entering={SlideInDown.duration(250).springify()}
        exiting={SlideOutDown.duration(200)}
      >
        {/* Solid background for content area */}
        <View style={[styles.solidBackground, { backgroundColor: colors.background }]} pointerEvents="none" />


        {/* Timeline progress bar */}
        <TimelineProgressBar
          position={position}
          duration={duration}
          chapters={chapters}
          onSeek={handleTimelineSeek}
          colors={colors}
        />

        {/* Content row */}
        <Pressable
          style={styles.content}
          onPress={handleOpenPlayer}
          accessibilityRole="button"
          accessibilityLabel={`Now playing: ${title}. Tap to open player.`}
        >
          {/* Circular Cover Image */}
          <View style={[styles.coverContainer, { borderColor: colors.borderDefault }]}>
            {coverUrl ? (
              <Image
                source={coverUrl}
                style={styles.cover}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.cover, { backgroundColor: colors.backgroundTertiary }]} />
            )}
          </View>

          {/* Title */}
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
              {title}
            </Text>
          </View>

          {/* Control Buttons - circular outline style */}
          <View style={styles.controls}>
            {/* Skip Back */}
            <TouchableOpacity
              style={[styles.circleButton, { borderColor: colors.borderStrong }]}
              onPress={handleSkipBack}
              accessibilityRole="button"
              accessibilityLabel="Skip back"
            >
              <SkipBackIcon size={iconSize} color={colors.textPrimary} />
            </TouchableOpacity>

            {/* Skip Forward */}
            <TouchableOpacity
              style={[styles.circleButton, { borderColor: colors.borderStrong }]}
              onPress={handleSkipForward}
              accessibilityRole="button"
              accessibilityLabel="Skip forward"
            >
              <SkipForwardIcon size={iconSize} color={colors.textPrimary} />
            </TouchableOpacity>

            {/* Play/Pause */}
            <TouchableOpacity
              style={[styles.circleButton, { borderColor: colors.borderStrong }]}
              onPress={handlePlayPause}
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : isPlaying ? (
                <PauseIcon size={iconSize} color={colors.accent} />
              ) : (
                <PlayIcon size={iconSize} color={colors.accent} />
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

/** Height of the mini player for layout calculations */
export const GLOBAL_MINI_PLAYER_HEIGHT = scale(80);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 50,
    zIndex: 9998,
    // No padding top - timeline sits at the very top
  },
  solidBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: scale(19), // Start below the timeline
  },
  gradientFeather: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -scale(20), // Sits just above the solid area
    height: scale(60), // Feather height
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  coverContainer: {
    width: COVER_SIZE-20,
    height: COVER_SIZE-20,
    borderRadius: 11,
    overflow: 'hidden',
    borderWidth: 1,
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    flex: 1,
    marginLeft: 0,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: scale(19),
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  circleButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default GlobalMiniPlayer;
