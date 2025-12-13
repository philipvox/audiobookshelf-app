/**
 * src/features/series/components/SeriesCard.tsx
 *
 * Enhanced series card based on UX research.
 * Features:
 * - Progress dots showing completion status
 * - Books completed count
 * - Time remaining estimate
 */

import React, { memo, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SeriesInfo } from '../services/seriesAdapter';
import { apiClient } from '@/core/api';
import { theme } from '@/shared/theme';
import { formatDuration } from '@/shared/utils/metadata';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (size / 402) * SCREEN_WIDTH;

const ACCENT = '#F4B60C';
const ACCENT_DIM = 'rgba(244,182,12,0.5)';

interface SeriesCardProps {
  series: SeriesInfo;
  showProgress?: boolean;
}

// Progress dot component
function ProgressDot({
  status,
  size = 6,
}: {
  status: 'completed' | 'in_progress' | 'not_started';
  size?: number;
}) {
  const getColor = () => {
    switch (status) {
      case 'completed':
        return ACCENT;
      case 'in_progress':
        return ACCENT_DIM;
      default:
        return 'rgba(255,255,255,0.3)';
    }
  };

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: getColor(),
      }}
    />
  );
}

function SeriesCardComponent({ series, showProgress = true }: SeriesCardProps) {
  const navigation = useNavigation<any>();

  const handlePress = () => {
    navigation.navigate('SeriesDetail', { seriesName: series.name });
  };

  const coverUrl = series.coverUrl
    ? apiClient.getItemCoverUrl(series.coverUrl)
    : undefined;

  // Calculate progress stats from books
  const progressStats = useMemo(() => {
    if (!series.books || series.books.length === 0) {
      return { completed: 0, inProgress: 0, notStarted: series.bookCount, remainingDuration: 0 };
    }

    let completed = 0;
    let inProgress = 0;
    let totalListened = 0;
    let totalDuration = 0;

    series.books.forEach(book => {
      const progress = (book as any).userMediaProgress?.progress || 0;
      const duration = (book.media as any)?.duration || 0;
      totalDuration += duration;
      totalListened += duration * progress;

      if (progress >= 0.95) {
        completed++;
      } else if (progress > 0) {
        inProgress++;
      }
    });

    const notStarted = series.bookCount - completed - inProgress;
    const remainingDuration = totalDuration - totalListened;

    return { completed, inProgress, notStarted, remainingDuration };
  }, [series.books, series.bookCount]);

  const hasProgress = progressStats.completed > 0 || progressStats.inProgress > 0;
  const isComplete = progressStats.completed === series.bookCount;

  // Limit dots shown (max 10, then show indicator)
  const maxDots = 10;
  const showAllDots = series.bookCount <= maxDots;
  const dotsToShow = showAllDots ? series.bookCount : maxDots - 1;

  const durationText = series.totalDuration > 0
    ? formatDuration(series.totalDuration)
    : null;

  const remainingText = progressStats.remainingDuration
    ? formatDuration(progressStats.remainingDuration)
    : null;

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={handlePress}
    >
      <View style={styles.coverContainer}>
        {coverUrl ? (
          <Image source={coverUrl} style={styles.cover} contentFit="cover" transition={200} />
        ) : (
          <View style={[styles.cover, styles.placeholderCover]}>
            <Text style={styles.placeholderText}>📚</Text>
          </View>
        )}

        {/* Complete badge */}
        {isComplete && (
          <View style={styles.completeBadge}>
            <Ionicons name="checkmark" size={scale(12)} color="#000" />
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {series.name}
        </Text>

        {/* Progress dots - only show if there's progress */}
        {showProgress && hasProgress && (
          <View style={styles.progressRow}>
            <View style={styles.progressDots}>
              {Array.from({ length: dotsToShow }).map((_, i) => {
                let status: 'completed' | 'in_progress' | 'not_started';
                if (i < progressStats.completed) {
                  status = 'completed';
                } else if (i < progressStats.completed + progressStats.inProgress) {
                  status = 'in_progress';
                } else {
                  status = 'not_started';
                }
                return <ProgressDot key={i} status={status} />;
              })}
              {!showAllDots && (
                <Text style={styles.moreText}>+{series.bookCount - maxDots + 1}</Text>
              )}
            </View>
            <Text style={styles.progressCount}>
              {progressStats.completed}/{series.bookCount}
            </Text>
          </View>
        )}

        {/* Book count and duration */}
        <Text style={styles.bookCount} numberOfLines={1}>
          {hasProgress && remainingText ? (
            `~${remainingText} left`
          ) : (
            <>
              {series.bookCount} {series.bookCount === 1 ? 'book' : 'books'}
              {durationText && ` • ${durationText}`}
            </>
          )}
        </Text>
      </View>
    </Pressable>
  );
}

// Memoize to prevent unnecessary re-renders in lists
export const SeriesCard = memo(SeriesCardComponent);

const styles = StyleSheet.create({
  container: {
    width: '48%',
    marginBottom: theme.spacing[4],
  },
  pressed: {
    opacity: 0.7,
  },
  coverContainer: {
    aspectRatio: 1,
    borderRadius: theme.radius.large,
    overflow: 'hidden',
    backgroundColor: theme.colors.neutral[200],
    ...theme.elevation.small,
    position: 'relative',
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  placeholderCover: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.neutral[300],
  },
  placeholderText: {
    fontSize: 48,
  },
  completeBadge: {
    position: 'absolute',
    top: scale(8),
    right: scale(8),
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  info: {
    marginTop: theme.spacing[2],
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing[1],
    lineHeight: 20,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing[1],
  },
  progressDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(3),
  },
  moreText: {
    fontSize: scale(10),
    color: 'rgba(255,255,255,0.5)',
    marginLeft: scale(2),
  },
  progressCount: {
    fontSize: scale(11),
    fontWeight: '600',
    color: ACCENT,
  },
  bookCount: {
    fontSize: 13,
    color: theme.colors.text.secondary,
  },
});
