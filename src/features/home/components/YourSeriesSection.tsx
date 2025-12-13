/**
 * src/features/home/components/YourSeriesSection.tsx
 *
 * Your Series section with card container and list rows
 * Shows series the user is currently reading (has progress on at least one book)
 *
 * Uses same card container styling as RecentlyAddedSection:
 * - Container: 93.5%w (3.25%w margin each side)
 * - Border radius: 2.5%w
 * - Background: subtle glass effect (rgba(255,255,255,0.05))
 * - Border: 1px rgba(102,102,102,0.5)
 * - Internal padding: 4%w
 * - Cover: 17%w square with small radius
 * - Header: white, moderateScale(16), semi-bold
 * - 44pt minimum touch targets
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { apiClient } from '@/core/api';
import { wp, hp, moderateScale, COLORS } from '@/shared/hooks/useResponsive';
import { SeriesWithBooks } from '../types';

// Layout constants (same as RecentlyAddedSection)
const MARGIN_H = wp(3.25);       // 3.25%w horizontal margin
const PADDING = wp(4);           // 4%w internal padding
const RADIUS = wp(2.5);          // 2.5%w border radius
const COVER_SIZE = wp(17);       // 17%w square
const COVER_RADIUS = wp(1.5);    // Small radius
const GAP = wp(3);               // 3%w gap between cover and text
const TOUCH_TARGET = Math.max(wp(8), 44);
const ROW_GAP = wp(3);           // 3%w vertical gap between rows

interface YourSeriesSectionProps {
  /** List of series with books */
  series: SeriesWithBooks[];
  /** Callback when a series row is pressed (view details) */
  onSeriesPress: (series: SeriesWithBooks) => void;
  /** Callback when play button is pressed (play first in-progress book) */
  onPlayPress?: (series: SeriesWithBooks) => void;
  /** Callback when more button is pressed */
  onMorePress?: (series: SeriesWithBooks) => void;
  /** Maximum number of items to show */
  maxItems?: number;
}

/**
 * Get the cover URL for a series (use first book's cover)
 */
function getSeriesCoverUrl(series: SeriesWithBooks): string | null {
  if (series.books.length > 0) {
    return apiClient.getItemCoverUrl(series.books[0].id);
  }
  return null;
}

/**
 * Get author name from series (from first book)
 */
function getSeriesAuthor(series: SeriesWithBooks): string {
  if (series.books.length === 0) return '';
  const metadata = series.books[0].media?.metadata as any;
  if (!metadata) return '';
  if (metadata.authorName) return metadata.authorName;
  if (metadata.authors?.length > 0) {
    return metadata.authors.map((a: any) => a.name).join(', ');
  }
  return '';
}

/**
 * Format book count for display
 */
function formatBookCount(series: SeriesWithBooks): string {
  const { totalBooks, booksInProgress, booksCompleted } = series;

  if (booksCompleted > 0 && booksInProgress > 0) {
    return `${booksCompleted} of ${totalBooks} completed`;
  }
  if (booksInProgress > 0) {
    return `${booksInProgress} in progress`;
  }
  if (totalBooks > 1) {
    return `${totalBooks} books`;
  }
  return '1 book';
}

/**
 * Single series row in the list
 */
const SeriesRow = ({
  series,
  onPress,
  onPlayPress,
  onMorePress,
  isFirst,
}: {
  series: SeriesWithBooks;
  onPress: () => void;
  onPlayPress?: () => void;
  onMorePress?: () => void;
  isFirst: boolean;
}) => {
  const coverUrl = getSeriesCoverUrl(series);
  const author = getSeriesAuthor(series);
  const bookCount = formatBookCount(series);

  return (
    <TouchableOpacity
      style={[styles.row, !isFirst && styles.rowWithGap]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Cover thumbnail */}
      {coverUrl ? (
        <Image
          source={coverUrl}
          style={styles.cover}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder]}>
          <Ionicons name="library" size={wp(6)} color="rgba(255,255,255,0.3)" />
        </View>
      )}

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {series.name}
        </Text>
        <Text style={styles.author} numberOfLines={1}>
          {author}
        </Text>
        <Text style={styles.bookCount} numberOfLines={1}>
          {bookCount}
        </Text>
      </View>

      {/* Play button - circle outline */}
      {onPlayPress && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation?.();
            onPlayPress();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View style={styles.playCircle}>
            <Ionicons name="play" size={wp(3)} color="#fff" style={{ marginLeft: 2 }} />
          </View>
        </TouchableOpacity>
      )}

      {/* More button - vertical dots */}
      {onMorePress && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation?.();
            onMorePress();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="ellipsis-vertical" size={wp(5)} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      )}

      {/* Chevron for navigation (if no more button) */}
      {!onMorePress && (
        <View style={styles.chevron}>
          <Ionicons name="chevron-forward" size={wp(5)} color="rgba(255,255,255,0.5)" />
        </View>
      )}
    </TouchableOpacity>
  );
};

export function YourSeriesSection({
  series,
  onSeriesPress,
  onPlayPress,
  onMorePress,
  maxItems = 5,
}: YourSeriesSectionProps) {
  if (series.length === 0) return null;

  const displaySeries = series.slice(0, maxItems);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Header */}
        <Text style={styles.header}>Your Series</Text>

        {/* Series rows */}
        {displaySeries.map((item, index) => (
          <SeriesRow
            key={item.id}
            series={item}
            onPress={() => onSeriesPress(item)}
            onPlayPress={onPlayPress ? () => onPlayPress(item) : undefined}
            onMorePress={onMorePress ? () => onMorePress(item) : undefined}
            isFirst={index === 0}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: MARGIN_H,
    marginTop: hp(3),  // 3%h gap from Recently Added
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(102,102,102,0.5)',
    borderRadius: RADIUS,
    padding: PADDING,
  },
  header: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(16),
    fontWeight: '600',
    marginBottom: GAP,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowWithGap: {
    marginTop: ROW_GAP,
  },
  cover: {
    width: COVER_SIZE,
    height: COVER_SIZE,
    borderRadius: COVER_RADIUS,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    marginLeft: GAP,
    marginRight: wp(2),
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: moderateScale(14),
    fontWeight: '600',
  },
  author: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: moderateScale(13),
    marginTop: hp(0.2),
  },
  bookCount: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: moderateScale(12),
    marginTop: hp(0.1),
  },
  actionButton: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  playCircle: {
    width: wp(6),
    height: wp(6),
    borderRadius: wp(3),
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.8)',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default YourSeriesSection;
