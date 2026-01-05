/**
 * src/features/library/components/FannedSeriesCard.tsx
 *
 * Series card with fanned book covers.
 * Used in library tabs for series display.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { apiClient } from '@/core/api';
import { scale, spacing, wp } from '@/shared/theme';
import { useThemeColors, useIsDarkMode } from '@/shared/theme/themeStore';
import { SeriesHeartButton } from '@/shared/components';
import { FannedSeriesCardData } from '../types';

// Fanned series card dimensions
const SCREEN_WIDTH = wp(100);
const PADDING = 16;
const GAP = 12;
const SERIES_CARD_WIDTH = (SCREEN_WIDTH - PADDING * 2 - GAP) / 2;
const COVER_SIZE = 60;
const FAN_OFFSET = 18;
const FAN_ROTATION = 8;
const FAN_VERTICAL_OFFSET = 6;
const MAX_VISIBLE_BOOKS = 5;

interface FannedSeriesCardProps {
  series: FannedSeriesCardData;
  onPress: () => void;
}

export const FannedSeriesCard = React.memo(function FannedSeriesCard({
  series,
  onPress,
}: FannedSeriesCardProps) {
  const themeColors = useThemeColors();
  const isDarkMode = useIsDarkMode();

  // Get cover URLs for up to 5 books
  const bookCovers = useMemo(() => {
    return (series.books || []).slice(0, MAX_VISIBLE_BOOKS).map(book => apiClient.getItemCoverUrl(book.id));
  }, [series.books]);

  const numCovers = bookCovers.length;
  const cardBgColor = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const bookCount = series.bookCount ?? series.books?.length ?? 0;

  return (
    <TouchableOpacity
      style={[styles.fannedSeriesCard, { backgroundColor: cardBgColor }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Heart button - top right */}
      <SeriesHeartButton
        seriesName={series.name}
        size={10}
        showCircle
        style={styles.fannedHeartButton}
      />

      {/* Fanned covers */}
      <View style={styles.fannedCoverFan}>
        {numCovers > 0 ? (
          <View style={[
            styles.fannedFanContainer,
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
                    styles.fannedCover,
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
      <Text style={[styles.fannedSeriesName, { color: themeColors.text }]} numberOfLines={2}>
        {series.name}
      </Text>
      <Text style={[styles.fannedBookCount, { color: themeColors.textSecondary }]}>
        {bookCount} {bookCount === 1 ? 'book' : 'books'}
      </Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  fannedSeriesCard: {
    width: SERIES_CARD_WIDTH,
    borderRadius: scale(12),
    padding: scale(12),
    position: 'relative',
  },
  fannedHeartButton: {
    position: 'absolute',
    top: scale(8),
    right: scale(8),
    zIndex: 10,
  },
  fannedCoverFan: {
    height: COVER_SIZE + FAN_VERTICAL_OFFSET * 2,
    marginBottom: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  fannedFanContainer: {
    height: COVER_SIZE + FAN_VERTICAL_OFFSET * 2,
    position: 'relative',
  },
  fannedCover: {
    position: 'absolute',
    borderRadius: scale(6),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  fannedSeriesName: {
    fontSize: scale(14),
    fontWeight: '600',
    marginBottom: scale(2),
  },
  fannedBookCount: {
    fontSize: scale(12),
  },
});

export default FannedSeriesCard;
