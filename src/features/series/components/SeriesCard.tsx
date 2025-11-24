/**
 * src/features/series/components/SeriesCard.tsx
 *
 * Card displaying series information with book count and progress.
 */

import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SeriesInfo } from '../services/seriesService';
import { apiClient } from '@/core/api';
import { theme } from '@/shared/theme';

interface SeriesCardProps {
  series: SeriesInfo;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function SeriesCard({ series }: SeriesCardProps) {
  const navigation = useNavigation();

  const handlePress = () => {
    navigation.navigate('SeriesDetail' as never, { seriesId: series.id } as never);
  };

  // Use first book's cover
  const coverUrl = series.coverUrl
    ? apiClient.getItemCoverUrl(series.coverUrl)
    : undefined;

  const progressPercent = Math.round(series.progress * 100);
  const hasProgress = series.progress > 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={handlePress}
    >
      {/* Cover Image */}
      <View style={styles.coverContainer}>
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={styles.cover} resizeMode="cover" />
        ) : (
          <View style={[styles.cover, styles.placeholderCover]}>
            <Text style={styles.placeholderText}>📚</Text>
          </View>
        )}

        {/* Progress indicator */}
        {hasProgress && (
          <View style={styles.progressBadge}>
            <Text style={styles.progressText}>{progressPercent}%</Text>
          </View>
        )}
      </View>

      {/* Series Info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {series.name}
        </Text>
        <Text style={styles.bookCount} numberOfLines={1}>
          {series.bookCount} {series.bookCount === 1 ? 'book' : 'books'}
        </Text>
        <Text style={styles.duration} numberOfLines={1}>
          {formatDuration(series.totalDuration)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 160,
    marginBottom: theme.spacing[4],
  },
  pressed: {
    opacity: 0.7,
  },
  coverContainer: {
    position: 'relative',
    width: 160,
    height: 240,
    borderRadius: theme.radius.large,
    backgroundColor: theme.colors.neutral[200],
    overflow: 'hidden',
    ...theme.elevation.small,
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
  progressBadge: {
    position: 'absolute',
    top: theme.spacing[2],
    right: theme.spacing[2],
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.radius.medium,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.text.inverse,
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
  bookCount: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing[1] / 2,
  },
  duration: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
  },
});