/**
 * src/navigation/components/GlobalMiniPlayer.tsx
 *
 * Global floating mini player with CD disc, swipe gestures, and animations.
 * Shows on all screens when a book is loaded, hidden when full player is open.
 */

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useFrameCallback,
  withTiming,
  withSpring,
  runOnJS,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { wp, hp, moderateScale, COLORS } from '@/shared/hooks/useResponsive';
import { usePlayerStore } from '@/features/player/stores/playerStore';
import { useCoverUrl } from '@/core/cache';
import { getTitle, getAuthorName } from '@/shared/utils/metadata';

// Mini disc size
const MINI_DISC_SIZE = hp(6);
const MINI_HOLE_SIZE = MINI_DISC_SIZE * 0.12;
const MINI_SPINDLE_SIZE = MINI_DISC_SIZE * 0.22;

// Layout constants
const MINI_PLAYER_HEIGHT = hp(8);
const NAV_BAR_HEIGHT = hp(13.5); // Position directly above nav bar
const SWIPE_THRESHOLD = -50; // Negative because swiping up

const ACCENT = COLORS.accent;
const TOUCH_TARGET = Math.max(44, hp(5));

// Mini CD Disc component
const MiniCDDisc = ({
  coverUrl,
  isPlaying,
}: {
  coverUrl: string | null;
  isPlaying: boolean;
}) => {
  const rotation = useSharedValue(0);
  const speed = useSharedValue(0);
  const lastFrameTime = useSharedValue(Date.now());

  useEffect(() => {
    speed.value = withTiming(isPlaying ? 0.02 : 0, { duration: 200 });
  }, [isPlaying]);

  useFrameCallback((frameInfo) => {
    'worklet';
    const now = frameInfo.timestamp;
    const delta = Math.min(now - lastFrameTime.value, 50);
    lastFrameTime.value = now;
    if (Math.abs(speed.value) > 0.001) {
      rotation.value = (rotation.value + speed.value * delta) % 360;
    }
  }, true);

  const discStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View style={miniDiscStyles.container}>
      <Animated.View style={[miniDiscStyles.disc, discStyle]}>
        {coverUrl ? (
          <Image
            source={coverUrl}
            style={miniDiscStyles.cover}
            contentFit="cover"
          />
        ) : (
          <View style={[miniDiscStyles.cover, { backgroundColor: '#333' }]} />
        )}
      </Animated.View>
      {/* Chrome spindle center - static */}
      <View style={miniDiscStyles.spindleOuter}>
        <LinearGradient
          colors={['#666666', '#444444', '#333333']}
          style={StyleSheet.absoluteFill}
        />
        <View style={miniDiscStyles.spindleInner}>
          <LinearGradient
            colors={['#888888', '#666666', '#444444']}
            style={StyleSheet.absoluteFill}
          />
          <View style={miniDiscStyles.spindleCenter} />
        </View>
      </View>
    </View>
  );
};

const miniDiscStyles = StyleSheet.create({
  container: {
    width: MINI_DISC_SIZE,
    height: MINI_DISC_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disc: {
    width: MINI_DISC_SIZE,
    height: MINI_DISC_SIZE,
    borderRadius: MINI_DISC_SIZE / 2,
    overflow: 'hidden',
  },
  cover: {
    width: '100%',
    height: '100%',
    borderRadius: MINI_DISC_SIZE / 2,
  },
  spindleOuter: {
    position: 'absolute',
    width: MINI_SPINDLE_SIZE,
    height: MINI_SPINDLE_SIZE,
    borderRadius: MINI_SPINDLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  spindleInner: {
    width: MINI_SPINDLE_SIZE * 0.7,
    height: MINI_SPINDLE_SIZE * 0.7,
    borderRadius: (MINI_SPINDLE_SIZE * 0.7) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  spindleCenter: {
    width: MINI_HOLE_SIZE,
    height: MINI_HOLE_SIZE,
    borderRadius: MINI_HOLE_SIZE / 2,
    backgroundColor: '#1a1a1a',
  },
});

// Rewind icon
const RewindIcon = ({ size, color }: { size: number; color: string }) => (
  <Svg width={size} height={size * 0.7} viewBox="0 0 22 15" fill="none">
    <Path
      d="M9.65391 13.3207C9.65391 13.8212 9.08125 14.1058 8.68224 13.8036L0.391342 7.52258C0.0713467 7.28016 0.0713462 6.79919 0.391341 6.55677L8.68223 0.275788C9.08125 -0.0264932 9.65391 0.258109 9.65391 0.758693V13.3207Z"
      fill={color}
    />
    <Path
      d="M21.7539 13.3207C21.7539 13.8212 21.1812 14.1058 20.7822 13.8036L12.4913 7.52258C12.1713 7.28016 12.1713 6.79919 12.4913 6.55677L20.7822 0.275788C21.1812 -0.0264932 21.7539 0.258109 21.7539 0.758693V13.3207Z"
      fill={color}
    />
  </Svg>
);

// Play icon
const PlayIcon = ({ size, color }: { size: number; color: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M8 5.14v14.72a1 1 0 001.5.86l11.14-7.36a1 1 0 000-1.72L9.5 4.28a1 1 0 00-1.5.86z"
      fill={color}
    />
  </Svg>
);

export function GlobalMiniPlayer() {
  const insets = useSafeAreaInsets();

  // Player state
  const currentBook = usePlayerStore((s) => s.currentBook);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isLoading = usePlayerStore((s) => s.isLoading);
  const isPlayerVisible = usePlayerStore((s) => s.isPlayerVisible);
  const position = usePlayerStore((s) => s.position);
  const duration = usePlayerStore((s) => s.duration);
  const play = usePlayerStore((s) => s.play);
  const pause = usePlayerStore((s) => s.pause);
  const seekTo = usePlayerStore((s) => s.seekTo);
  const togglePlayer = usePlayerStore((s) => s.togglePlayer);

  // Cover URL
  const coverUrl = useCoverUrl(currentBook?.id || '');

  // Swipe gesture state
  const translateY = useSharedValue(0);

  // Handlers - must be defined before any conditional returns
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

  const handleOpenPlayer = useCallback(() => {
    togglePlayer?.();
  }, [togglePlayer]);

  // Swipe up gesture to open full player
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      'worklet';
      // Only allow upward swipe
      if (event.translationY < 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      'worklet';
      if (event.translationY < SWIPE_THRESHOLD) {
        // Swipe up detected - open player
        runOnJS(handleOpenPlayer)();
      }
      // Reset position
      translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: Math.min(0, translateY.value * 0.3) }],
  }));

  // Don't render if no book or full player is open
  if (!currentBook || isPlayerVisible) {
    return null;
  }

  const title = getTitle(currentBook);
  const author = getAuthorName(currentBook);
  const progress = duration > 0 ? position / duration : 0;
  const skipIconSize = hp(2.5);
  const playIconSize = hp(3);

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[styles.container, { paddingBottom: NAV_BAR_HEIGHT }, animatedStyle]}
        entering={SlideInDown.duration(250).springify()}
        exiting={SlideOutDown.duration(200)}
      >
        <View style={styles.innerContainer}>
          {/* Progress bar at top */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress * 100}%` },
              ]}
            />
          </View>

          {/* Content row */}
          <Pressable
            style={styles.content}
            onPress={handleOpenPlayer}
            accessibilityRole="button"
            accessibilityLabel={`Now playing: ${title} by ${author}. Tap or swipe up to open player.`}
          >
            {/* Mini CD Disc */}
            <MiniCDDisc coverUrl={coverUrl} isPlaying={isPlaying} />

            {/* Title */}
            <View style={styles.textContainer}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
            </View>

            {/* Controls */}
            <View style={styles.controls}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={handleSkipBack}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Skip back 30 seconds"
              >
                <RewindIcon size={skipIconSize} color="white" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlButton, { marginLeft: wp(1) }]}
                onPress={handlePlayPause}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={ACCENT} />
                ) : isPlaying ? (
                  <Ionicons name="pause" size={playIconSize} color={ACCENT} />
                ) : (
                  <PlayIcon size={playIconSize} color={ACCENT} />
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

/** Height of the mini player for layout calculations */
export const GLOBAL_MINI_PLAYER_HEIGHT = MINI_PLAYER_HEIGHT;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    borderTopWidth: 1,
    borderTopColor: 'rgba(102,102,102,0.5)',
    overflow: 'hidden',
    zIndex: 9998,
  },
  innerContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  progressTrack: {
    height: hp(0.4),
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: ACCENT,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
  },
  textContainer: {
    flex: 1,
    marginLeft: wp(3),
    marginRight: wp(2),
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(14),
    fontWeight: '500',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
  },
});

export default GlobalMiniPlayer;
