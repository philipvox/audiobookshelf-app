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
import Svg, { Path, Circle as SvgCircle, Rect, Line } from 'react-native-svg';
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
import { useThemeStore, useThemeColors } from '@/shared/theme/themeStore';
import { usePlayerStore } from '@/features/player/stores/playerStore';
import { useCoverUrl } from '@/core/cache';
import { getTitle } from '@/shared/utils/metadata';

// Layout constants
const COVER_SIZE = scale(56);
const BUTTON_SIZE = scale(32); // Smaller circular buttons
const NAV_BAR_HEIGHT = hp(10);
const SWIPE_THRESHOLD = -50;
const SCREEN_WIDTH = Dimensions.get('window').width;
const TIMELINE_PADDING = spacing.lg;
const TIMELINE_WIDTH = SCREEN_WIDTH - (TIMELINE_PADDING * 2);
const MARKER_RADIUS = 8;
const MAJOR_TICK_HEIGHT = 10;
const MINOR_TICK_HEIGHT = 5;

// Mini player colors for light and dark modes
const miniPlayerColors = {
  light: {
    background: '#FFFFFF',
    backgroundTransparent: 'rgba(255,255,255,0)',
    backgroundTertiary: '#E5E5E5',
    textPrimary: '#000000',
    textSecondary: 'rgba(0,0,0,0.5)',
    borderStrong: '#000000',
    borderDefault: 'rgba(0,0,0,0.1)',
    accent: '#E53935',
    tickDefault: 'rgba(0,0,0,0.3)',
    tickActive: '#F50101',
  },
  dark: {
    background: '#000000',
    backgroundTransparent: 'rgba(0,0,0,0)',
    backgroundTertiary: '#1C1C1E',
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.7)',
    borderStrong: 'rgba(255,255,255,0.2)',
    borderDefault: 'rgba(255,255,255,0.1)',
    accent: '#E53935',
    tickDefault: 'rgba(255,255,255,0.4)',
    tickActive: '#F50101',
  },
};

// Hook to get mini player colors based on theme
function useMiniPlayerColors() {
  const mode = useThemeStore((state) => state.mode);
  return miniPlayerColors[mode];
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

// Chapter type for timeline
interface ChapterInfo {
  start: number;
  end: number;
}

// Calculate optimal tick interval based on book duration
// Returns consistent ~8-12 major ticks regardless of book length
function getTickInterval(durationSeconds: number): { majorInterval: number; minorCount: number } {
  const hours = durationSeconds / 3600;

  if (hours < 0.5) return { majorInterval: 5 * 60, minorCount: 4 };      // 5 min majors
  if (hours < 1) return { majorInterval: 10 * 60, minorCount: 4 };      // 10 min majors
  if (hours < 3) return { majorInterval: 15 * 60, minorCount: 2 };      // 15 min majors
  if (hours < 6) return { majorInterval: 30 * 60, minorCount: 2 };      // 30 min majors
  if (hours < 12) return { majorInterval: 60 * 60, minorCount: 3 };     // 1 hr majors
  return { majorInterval: 2 * 60 * 60, minorCount: 3 };                 // 2 hr majors
}

// Check if a time position is near a chapter boundary
// Returns true if within threshold% of any chapter start
function isNearChapter(
  timeSeconds: number,
  chapters: ChapterInfo[],
  duration: number,
  thresholdPercent: number = 2
): boolean {
  if (!chapters.length || duration <= 0) return false;

  const thresholdSeconds = (duration * thresholdPercent) / 100;

  for (const chapter of chapters) {
    const distance = Math.abs(timeSeconds - chapter.start);
    if (distance <= thresholdSeconds) return true;
  }
  return false;
}

// Timeline progress bar component with hybrid time-based + chapter-aware ticks
interface TimelineProgressBarProps {
  position: number; // Current position in seconds
  duration: number; // Total duration in seconds
  chapters: ChapterInfo[]; // Chapter boundaries for visual hints
  onSeek: (position: number) => void; // Seek to position in seconds
  colors: typeof miniPlayerColors.light; // Theme colors
}

const TimelineProgressBar = React.memo(({ position, duration, chapters, onSeek, colors }: TimelineProgressBarProps) => {
  // Simple linear progress based on time
  const normalizedProgress = useMemo(() => {
    if (duration <= 0) return 0;
    return position / duration;
  }, [position, duration]);

  const markerPosition = useSharedValue(normalizedProgress * TIMELINE_WIDTH);
  const isDragging = useSharedValue(false);

  // Update marker when progress changes (but not while dragging)
  useEffect(() => {
    if (!isDragging.value) {
      markerPosition.value = normalizedProgress * TIMELINE_WIDTH;
    }
  }, [normalizedProgress]);

  // Generate tick marks using adaptive time intervals + chapter awareness
  // Time-based for consistency, with visual hints for chapter boundaries
  const ticks = useMemo(() => {
    if (duration <= 0) return [];

    const tickArray: { x: number; isMajor: boolean; isChapterAligned: boolean }[] = [];
    const { majorInterval, minorCount } = getTickInterval(duration);

    // Generate time-based ticks
    for (let time = 0; time <= duration; time += majorInterval) {
      const x = (time / duration) * TIMELINE_WIDTH;
      const nearChapter = isNearChapter(time, chapters, duration);

      // Add major tick
      tickArray.push({
        x,
        isMajor: true,
        isChapterAligned: nearChapter,
      });

      // Add minor ticks (except after last major)
      if (time + majorInterval <= duration) {
        const minorSpacing = majorInterval / (minorCount + 1);
        for (let i = 1; i <= minorCount; i++) {
          const minorTime = time + (i * minorSpacing);
          if (minorTime < duration) {
            const minorX = (minorTime / duration) * TIMELINE_WIDTH;
            tickArray.push({
              x: minorX,
              isMajor: false,
              isChapterAligned: false, // Minor ticks don't show chapter hints
            });
          }
        }
      }
    }

    // Ensure final tick at end if not already there
    const lastTick = tickArray[tickArray.length - 1];
    if (!lastTick || Math.abs(lastTick.x - TIMELINE_WIDTH) > 1) {
      tickArray.push({
        x: TIMELINE_WIDTH,
        isMajor: true,
        isChapterAligned: isNearChapter(duration, chapters, duration),
      });
    }

    return tickArray;
  }, [duration, chapters]);

  // Convert normalized progress back to actual position (simple linear)
  const normalizedToPosition = useCallback((normalized: number): number => {
    if (duration <= 0) return 0;
    return normalized * duration;
  }, [duration]);

  const handleSeek = useCallback((normalizedProgress: number) => {
    const clampedProgress = Math.max(0, Math.min(1, normalizedProgress));
    const newPosition = normalizedToPosition(clampedProgress);
    onSeek(newPosition);
  }, [normalizedToPosition, onSeek]);

  // Pan gesture for scrubbing
  const scrubGesture = Gesture.Pan()
    .onStart(() => {
      'worklet';
      isDragging.value = true;
    })
    .onUpdate((event) => {
      'worklet';
      const newX = Math.max(0, Math.min(TIMELINE_WIDTH, event.x));
      markerPosition.value = newX;
    })
    .onEnd((event) => {
      'worklet';
      isDragging.value = false;
      const newProgress = Math.max(0, Math.min(1, event.x / TIMELINE_WIDTH));
      runOnJS(handleSeek)(newProgress);
    });

  // Tap gesture for seeking
  const tapGesture = Gesture.Tap()
    .onEnd((event) => {
      'worklet';
      const newX = Math.max(0, Math.min(TIMELINE_WIDTH, event.x));
      markerPosition.value = newX;
      const newProgress = newX / TIMELINE_WIDTH;
      runOnJS(handleSeek)(newProgress);
    });

  const combinedGesture = Gesture.Race(scrubGesture, tapGesture);

  const markerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: markerPosition.value - MARKER_RADIUS }],
  }));

  // Find which tick is closest to marker for red highlight
  const currentTickIndex = useMemo(() => {
    if (!ticks.length) return -1;
    const markerX = normalizedProgress * TIMELINE_WIDTH;
    let closestIndex = 0;
    let closestDistance = Math.abs(ticks[0].x - markerX);
    for (let i = 1; i < ticks.length; i++) {
      const distance = Math.abs(ticks[i].x - markerX);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = i;
      }
    }
    return closestIndex;
  }, [ticks, normalizedProgress]);

  return (
    <GestureDetector gesture={combinedGesture}>
      <View style={timelineStyles.container}>
        {/* Red marker circle */}
        <Animated.View style={[timelineStyles.marker, markerStyle]}>
          <View style={timelineStyles.markerInner} />
        </Animated.View>

        {/* Tick marks */}
        <Svg width={TIMELINE_WIDTH} height={MAJOR_TICK_HEIGHT + 4} style={timelineStyles.ticks}>
          {ticks.map((tick, index) => {
            const isCurrentTick = index === currentTickIndex;
            // Chapter-aligned ticks get brighter/thicker styling
            const tickColor = isCurrentTick
              ? colors.tickActive
              : tick.isChapterAligned
                ? colors.textPrimary
                : colors.tickDefault;
            const tickWidth = tick.isChapterAligned ? 1.5 : 1;

            return (
              <Line
                key={index}
                x1={tick.x}
                y1={tick.isMajor ? 0 : MAJOR_TICK_HEIGHT - MINOR_TICK_HEIGHT}
                x2={tick.x}
                y2={MAJOR_TICK_HEIGHT}
                stroke={tickColor}
                strokeWidth={tickWidth}
              />
            );
          })}
        </Svg>
      </View>
    </GestureDetector>
  );
});

const timelineStyles = StyleSheet.create({
  container: {
    width: TIMELINE_WIDTH,
    height: MARKER_RADIUS * 2 + MAJOR_TICK_HEIGHT + 4,
    marginHorizontal: TIMELINE_PADDING,
    marginBottom: spacing.sm,
  },
  marker: {
    position: 'absolute',
    top: 0,
    width: MARKER_RADIUS * 2,
    height: MARKER_RADIUS * 2,
    borderRadius: MARKER_RADIUS,
    backgroundColor: '#F50101',
    zIndex: 10,
    // Shadow for blur effect
    shadowColor: '#F50101',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  markerInner: {
    width: '100%',
    height: '100%',
    borderRadius: MARKER_RADIUS,
    backgroundColor: '#F50101',
  },
  ticks: {
    position: 'absolute',
    bottom: 0,
    left: 0,
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
  const iconSize = scale(14); // Smaller icons for smaller buttons

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

        {/* Gradient feather at top - transparent to solid */}
        <LinearGradient
          colors={[colors.backgroundTransparent, colors.background] as any}
          style={styles.gradientFeather}
          pointerEvents="none"
        />

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
    bottom: 0,
    zIndex: 9998,
    paddingTop: spacing.lg,
    // No border - gradient handles the fade
  },
  solidBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: scale(20), // Start below the timeline
  },
  gradientFeather: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -scale(40), // Sits just above the solid area
    height: scale(60), // Feather height
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  coverContainer: {
    width: COVER_SIZE,
    height: COVER_SIZE,
    borderRadius: COVER_SIZE / 2,
    overflow: 'hidden',
    borderWidth: 1,
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: scale(18),
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
