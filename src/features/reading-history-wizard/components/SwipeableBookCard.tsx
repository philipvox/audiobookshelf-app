/**
 * src/features/reading-history-wizard/components/SwipeableBookCard.tsx
 *
 * Tinder-style swipeable book card.
 * Swipe right = mark as finished
 * Swipe left = skip
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Book, Check, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { getCoverUrl } from '@/core/cache';
import { scale, spacing, useTheme } from '@/shared/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.85;
const CARD_HEIGHT = CARD_WIDTH * 1.4;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

interface SwipeableBookCardProps {
  bookId: string;
  title: string;
  authorName?: string;
  seriesName?: string;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

export function SwipeableBookCard({
  bookId,
  title,
  authorName,
  seriesName,
  onSwipeLeft,
  onSwipeRight,
}: SwipeableBookCardProps) {
  const { colors } = useTheme();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);
  const scale_value = useSharedValue(1);

  const coverUrl = getCoverUrl(bookId);

  const handleSwipeComplete = useCallback(
    (direction: 'left' | 'right') => {
      if (direction === 'right') {
        onSwipeRight();
      } else {
        onSwipeLeft();
      }
    },
    [onSwipeLeft, onSwipeRight]
  );

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      'worklet';
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.5;
      rotation.value = interpolate(
        event.translationX,
        [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
        [-15, 0, 15],
        Extrapolation.CLAMP
      );
    })
    .onEnd((event) => {
      'worklet';
      if (event.translationX > SWIPE_THRESHOLD) {
        // Swipe right - mark as finished
        translateX.value = withTiming(SCREEN_WIDTH * 1.5, { duration: 300 });
        runOnJS(handleSwipeComplete)('right');
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        // Swipe left - skip
        translateX.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: 300 });
        runOnJS(handleSwipeComplete)('left');
      } else {
        // Return to center
        translateX.value = withSpring(0, { damping: 15 });
        translateY.value = withSpring(0, { damping: 15 });
        rotation.value = withSpring(0, { damping: 15 });
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
      { scale: scale_value.value },
    ],
  }));

  // Overlay opacity based on swipe direction
  const rightOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP
    ),
  }));

  const leftOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolation.CLAMP
    ),
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.card, { backgroundColor: colors.background.secondary }, cardStyle]}>
        {/* Cover Image */}
        {coverUrl ? (
          <Image
            source={coverUrl}
            style={styles.cover}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder, { backgroundColor: colors.background.secondary }]}>
            <Book
              size={scale(80)}
              color="rgba(255,255,255,0.3)"
              strokeWidth={1.5}
            />
          </View>
        )}

        {/* Gradient overlay for text */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.9)']}
          style={styles.gradient}
        />

        {/* Book Info */}
        <View style={styles.info}>
          <Text style={[styles.title, { color: colors.text.primary }]} numberOfLines={2}>
            {title}
          </Text>
          {authorName && (
            <Text style={[styles.author, { color: colors.text.secondary }]} numberOfLines={1}>
              {authorName}
            </Text>
          )}
          {seriesName && (
            <Text style={[styles.series, { color: colors.accent.primary }]} numberOfLines={1}>
              {seriesName}
            </Text>
          )}
        </View>

        {/* Swipe indicators */}
        <Animated.View style={[styles.overlay, styles.rightOverlay, rightOverlayStyle]}>
          <View style={[styles.overlayBadge, { backgroundColor: colors.accent.primary }]}>
            <Check size={scale(40)} color={colors.text.inverse} strokeWidth={3} />
            <Text style={[styles.overlayText, { color: colors.text.inverse }]}>FINISHED</Text>
          </View>
        </Animated.View>

        <Animated.View style={[styles.overlay, styles.leftOverlay, leftOverlayStyle]}>
          <View style={[styles.overlayBadge, styles.skipBadge]}>
            <X size={scale(40)} color={colors.text.primary} strokeWidth={2.5} />
            <Text style={[styles.overlayText, styles.skipText, { color: colors.text.primary }]}>SKIP</Text>
          </View>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: scale(20),
    overflow: 'hidden',
    // backgroundColor set via themeColors in JSX
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor set via themeColors in JSX
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '40%',
  },
  info: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
  },
  title: {
    fontSize: scale(22),
    fontWeight: '700',
    // color set via themeColors in JSX
    marginBottom: spacing.xs,
  },
  author: {
    fontSize: scale(16),
    // color set via themeColors in JSX
    marginBottom: spacing.xs,
  },
  series: {
    fontSize: scale(14),
    // color set via accentColors in JSX
    fontStyle: 'italic',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightOverlay: {
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
  },
  leftOverlay: {
    backgroundColor: 'rgba(244, 67, 54, 0.3)',
  },
  overlayBadge: {
    // backgroundColor set via accentColors in JSX
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: scale(12),
    alignItems: 'center',
    transform: [{ rotate: '-15deg' }],
    borderWidth: 3,
    borderColor: 'transparent', // Color set via theme in JSX
  },
  skipBadge: {
    backgroundColor: 'rgba(244, 67, 54, 0.9)',
    // borderColor set via theme in JSX
  },
  overlayText: {
    fontSize: scale(18),
    fontWeight: '800',
    // color set via theme in JSX
    marginTop: spacing.xs,
  },
  skipText: {
    // color set via theme in JSX
  },
});

export default SwipeableBookCard;
