/**
 * src/features/mood-discovery/components/MoodBookCard.tsx
 *
 * Book card with match percentage badge for mood discovery results.
 * Now shows match attribution tags for why the book matched.
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
import { Icon } from '@/shared/components/Icon';
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

/**
 * Get matched dimensions from score breakdown
 */
function getMatchedDimensions(scoreData: ScoredBook): { icon: string; label: string }[] {
  const matches: { icon: string; label: string }[] = [];
  const score = scoreData.score;

  if (score.moodScore > 0) {
    matches.push({ icon: 'Heart', label: 'Mood' });
  }
  if (score.paceScore > 0) {
    matches.push({ icon: 'Flame', label: 'Energy' });
  }
  if (score.weightScore > 0) {
    matches.push({ icon: 'Sun', label: 'Tone' });
  }
  if (score.worldScore > 0) {
    matches.push({ icon: 'Globe', label: 'World' });
  }
  if (score.lengthScore > 0) {
    matches.push({ icon: 'Timer', label: 'Length' });
  }

  return matches;
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

  const matchedDimensions = scoreData ? getMatchedDimensions(scoreData) : [];

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
        {/* Match attribution icons */}
        {matchedDimensions.length > 0 && (
          <View style={styles.matchTags}>
            {matchedDimensions.slice(0, 3).map((dim, i) => (
              <View key={dim.label} style={styles.matchTag}>
                <Icon
                  name={dim.icon}
                  size={10}
                  color={colors.textTertiary}
                />
              </View>
            ))}
            {matchedDimensions.length > 3 && (
              <Text style={styles.moreMatches}>
                +{matchedDimensions.length - 3}
              </Text>
            )}
          </View>
        )}
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
  matchTags: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xxs,
    gap: 4,
  },
  matchTag: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreMatches: {
    fontSize: 9,
    color: colors.textTertiary,
    fontWeight: '500',
  },
});
