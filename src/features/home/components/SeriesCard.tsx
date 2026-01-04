/**
 * src/features/home/components/SeriesCard.tsx
 *
 * Series card with fanned cover design matching SeriesListScreen
 */

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { apiClient } from '@/core/api';
import { colors, scale, spacing, radius } from '@/shared/theme';
import { SeriesCardProps } from '../types';
import { SeriesHeartButton } from '@/shared/components';
import { useThemeColors, useIsDarkMode } from '@/shared/theme/themeStore';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PADDING = 16;
const GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - PADDING * 2 - GAP) / 2;

// Fanned cover dimensions
const COVER_SIZE = 60;
const FAN_OFFSET = 18;
const FAN_ROTATION = 8;
const FAN_VERTICAL_OFFSET = 6;
const MAX_VISIBLE_BOOKS = 5;

export function SeriesCard({ series, onPress, onLongPress }: SeriesCardProps) {
  const themeColors = useThemeColors();
  const isDarkMode = useIsDarkMode();

  // Get cover URLs for up to 5 books
  const bookCovers = useMemo(() => {
    return series.books.slice(0, MAX_VISIBLE_BOOKS).map((book) => apiClient.getItemCoverUrl(book.id));
  }, [series.books]);

  const numCovers = bookCovers.length;
  const cardBgColor = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: cardBgColor }]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      {/* Heart button - top right */}
      <SeriesHeartButton
        seriesName={series.name}
        size={10}
        showCircle
        style={styles.heartButton}
      />

      {/* Fanned covers */}
      <View style={styles.coverFan}>
        {numCovers > 0 ? (
          <View style={[
            styles.fanContainer,
            { width: COVER_SIZE + (numCovers - 1) * FAN_OFFSET }
          ]}>
            {bookCovers.map((coverUrl, idx) => {
              const middleIndex = (numCovers - 1) / 2;
              const rotation = (idx - middleIndex) * FAN_ROTATION;
              const distanceFromCenter = Math.abs(idx - middleIndex);
              const zIndex = numCovers - Math.floor(distanceFromCenter);
              const scaleValue = 1 - (distanceFromCenter * 0.12);
              const coverSize = COVER_SIZE * scaleValue;
              const sizeOffset = (COVER_SIZE - coverSize) / 2;
              const verticalOffset = sizeOffset + (distanceFromCenter * FAN_VERTICAL_OFFSET);
              const horizontalOffset = idx * FAN_OFFSET + sizeOffset;

              return (
                <Image
                  key={idx}
                  source={coverUrl}
                  style={[
                    styles.fanCover,
                    {
                      width: coverSize,
                      height: coverSize,
                      left: horizontalOffset,
                      top: verticalOffset,
                      zIndex,
                      transform: [{ rotate: `${rotation}deg` }],
                    },
                  ]}
                  contentFit="cover"
                  transition={150}
                />
              );
            })}
          </View>
        ) : null}
      </View>

      {/* Series name */}
      <Text style={[styles.seriesName, { color: themeColors.text }]} numberOfLines={2}>
        {series.name}
      </Text>
      <Text style={[styles.bookCount, { color: themeColors.textSecondary }]}>
        {series.books.length} {series.books.length === 1 ? 'book' : 'books'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  heartButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
  coverFan: {
    height: COVER_SIZE + 10,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fanContainer: {
    position: 'relative',
    height: COVER_SIZE,
  },
  fanCover: {
    position: 'absolute',
    width: COVER_SIZE,
    height: COVER_SIZE,
    borderRadius: 5,
    backgroundColor: 'rgba(128,128,128,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  seriesName: {
    fontSize: scale(13),
    fontWeight: '600',
    lineHeight: scale(17),
    textAlign: 'center',
  },
  bookCount: {
    fontSize: scale(11),
    textAlign: 'center',
    marginTop: 2,
  },
});
