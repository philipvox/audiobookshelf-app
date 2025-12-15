/**
 * src/features/mood-discovery/components/MoodBookCard.tsx
 *
 * Book card with match percentage badge for mood discovery results.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useCoverUrl } from '@/core/cache';
import type { LibraryItem } from '@/core/types';
import { ScoredBook } from '../types';
import { colors, spacing, radius, formatDuration } from '@/shared/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface MoodBookCardProps {
  /** Library item to display */
  item: LibraryItem;
  /** Score data for this book */
  scoreData?: ScoredBook;
  /** Callback when card is pressed */
  onPress: () => void;
  /** Card width */
  width?: number;
}

/**
 * Get match quality label and color
 */
function getMatchQuality(percent: number): { label: string; color: string } {
  if (percent >= 80) return { label: 'Great Match', color: colors.success };
  if (percent >= 60) return { label: 'Good Match', color: colors.accent };
  if (percent >= 40) return { label: 'Partial', color: colors.warning };
  return { label: '', color: colors.textTertiary };
}

export function MoodBookCard({
  item,
  scoreData,
  onPress,
  width = 140,
}: MoodBookCardProps) {
  const metadata = (item.media?.metadata as any) || {};
  const title = metadata.title || 'Unknown Title';
  const author = metadata.authorName || 'Unknown Author';
  const duration = (item.media as any)?.duration || 0;
  const coverUrl = useCoverUrl(item.id);

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const matchQuality = scoreData
    ? getMatchQuality(scoreData.matchPercent)
    : null;

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.container, { width }, animatedStyle]}
    >
      {/* Cover */}
      <View style={[styles.coverContainer, { width, height: width }]}>
        <Image
          source={{ uri: coverUrl }}
          style={styles.cover}
          contentFit="cover"
          transition={200}
        />
        {/* Match badge */}
        {scoreData && scoreData.matchPercent >= 40 && (
          <View
            style={[
              styles.matchBadge,
              { backgroundColor: matchQuality?.color || colors.accent },
            ]}
          >
            <Text style={styles.matchPercent}>{scoreData.matchPercent}%</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.author} numberOfLines={1}>
          {author}
        </Text>
        <Text style={styles.duration}>
          {formatDuration.short(duration)}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginRight: spacing.sm,
  },
  coverContainer: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.backgroundTertiary,
    marginBottom: spacing.xs,
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  matchBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    paddingVertical: 2,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.sm,
  },
  matchPercent: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000',
  },
  info: {
    paddingHorizontal: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 17,
    marginBottom: 2,
  },
  author: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  duration: {
    fontSize: 11,
    color: colors.textTertiary,
  },
});
