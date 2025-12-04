/**
 * src/features/player/panels/DetailsPanel.tsx
 * Redesigned to match AudioDetailsSection example
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import {
  getAuthorName,
  getNarratorName,
  getDescription,
  getSeriesWithSequence,
  getSeriesName,
  getGenres,
  getPublishedYear,
} from '@/shared/utils/metadata';
import type { LibraryItem } from '@/core/api';

interface DetailsPanelProps {
  book: LibraryItem;
  duration: number;
  chaptersCount: number;
  isLight: boolean;
  onNavigateToAuthor?: (authorName: string) => void;
  onNavigateToNarrator?: (narratorName: string) => void;
  onNavigateToSeries?: (seriesName: string) => void;
}

export function DetailsPanel({
  book,
  duration,
  chaptersCount,
  isLight,
  onNavigateToAuthor,
  onNavigateToNarrator,
  onNavigateToSeries,
}: DetailsPanelProps) {
  const textColor = isLight ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.95)';
  const labelColor = isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)';
  const descColor = isLight ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.85)';
  const borderColor = isLight ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)';

  // Extract metadata using utilities
  const author = getAuthorName(book);
  const narrator = getNarratorName(book);
  const description = getDescription(book);
  const series = getSeriesWithSequence(book);
  const seriesName = getSeriesName(book);
  const genres = getGenres(book);
  const publishedYear = getPublishedYear(book);
  const metadata = (book?.media?.metadata as any) || {};
  const language = metadata.language || null;

  const handleAuthorPress = () => {
    if (author && author !== 'Unknown Author' && onNavigateToAuthor) {
      onNavigateToAuthor(author);
    }
  };

  const handleNarratorPress = () => {
    if (narrator && narrator !== 'Unknown Narrator' && onNavigateToNarrator) {
      onNavigateToNarrator(narrator);
    }
  };

  const handleSeriesPress = () => {
    if (seriesName && onNavigateToSeries) {
      onNavigateToSeries(seriesName);
    }
  };

  const canNavigateToAuthor = !!onNavigateToAuthor && author && author !== 'Unknown Author';
  const canNavigateToNarrator = !!onNavigateToNarrator && narrator && narrator !== 'Unknown Narrator';
  const canNavigateToSeries = !!onNavigateToSeries && !!seriesName;

  const hasAuthor = author && author !== 'Unknown Author';
  const hasNarrator = narrator && narrator !== 'Unknown Narrator';

  // Format duration nicely
  const formatDurationLong = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* By / Read by - Horizontal Layout */}
        {(hasAuthor || hasNarrator) && (
          <View style={styles.byRow}>
            {hasAuthor && (
              <View style={styles.byColumn}>
                <Text style={[styles.label, { color: labelColor }]}>By</Text>
                {canNavigateToAuthor ? (
                  <TouchableOpacity onPress={handleAuthorPress} activeOpacity={0.7}>
                    <Text style={[styles.byValue, { color: textColor }]}>{author}</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={[styles.byValue, { color: textColor }]}>{author}</Text>
                )}
              </View>
            )}
            {hasNarrator && (
              <View style={styles.byColumn}>
                <Text style={[styles.label, { color: labelColor }]}>Read by</Text>
                {canNavigateToNarrator ? (
                  <TouchableOpacity onPress={handleNarratorPress} activeOpacity={0.7}>
                    <Text style={[styles.byValue, { color: textColor }]}>{narrator}</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={[styles.byValue, { color: textColor }]}>{narrator}</Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Description */}
        {description && (
          <View style={styles.descSection}>
            <Text style={[styles.label, { color: labelColor }]}>Desc.</Text>
            <Text style={[styles.description, { color: descColor }]} numberOfLines={5}>
              {description}
            </Text>
          </View>
        )}

        {/* Genres - Bordered Pills */}
        {genres.length > 0 && (
          <View style={styles.genresSection}>
            <Text style={[styles.label, { color: labelColor }]}>Genres</Text>
            <View style={styles.pillsRow}>
              {genres.slice(0, 4).map((genre: string, idx: number) => (
                <View key={idx} style={[styles.pill, { borderColor }]}>
                  <Text style={[styles.pillText, { color: textColor }]}>{genre}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Series - Bordered Pill Button */}
        {series && (
          <View style={styles.seriesSection}>
            <Text style={[styles.label, { color: labelColor }]}>Series</Text>
            {canNavigateToSeries ? (
              <TouchableOpacity onPress={handleSeriesPress} activeOpacity={0.7}>
                <View style={[styles.pill, { borderColor }]}>
                  <Text style={[styles.pillText, { color: textColor }]}>{series}</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={[styles.pill, { borderColor }]}>
                <Text style={[styles.pillText, { color: textColor }]}>{series}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Bottom Stats Row - Fixed at bottom */}
      <View style={[styles.statsRow, { borderTopColor: borderColor }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: labelColor }]}>Chapters:</Text>
          <Text style={[styles.statValue, { color: textColor }]}>{chaptersCount}</Text>
        </View>
        {publishedYear && (
          <Text style={[styles.statValue, { color: textColor }]}>{publishedYear}</Text>
        )}
        {language && (
          <Text style={[styles.statValue, { color: textColor }]}>{language}</Text>
        )}
        <Text style={[styles.statValue, { color: textColor }]}>
          {formatDurationLong(duration)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 4,
  },
  // By / Read by row
  byRow: {
    flexDirection: 'row',
    gap: 40,
    marginBottom: 20,
  },
  byColumn: {
    gap: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '400',
  },
  byValue: {
    fontSize: 20,
    fontWeight: '400',
  },
  // Description
  descSection: {
    marginBottom: 20,
    gap: 4,
  },
  description: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '400',
  },
  // Genres
  genresSection: {
    marginBottom: 20,
    gap: 10,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  pill: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pillText: {
    fontSize: 16,
    fontWeight: '400',
  },
  // Series
  seriesSection: {
    gap: 10,
    marginBottom: 20,
  },
  // Bottom stats row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderTopWidth: 0,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: 16,
    fontWeight: '400',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '400',
  },
});

export default DetailsPanel;
