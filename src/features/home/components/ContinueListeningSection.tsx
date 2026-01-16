/**
 * src/features/home/components/ContinueListeningSection.tsx
 *
 * Continue Listening section with card container styling
 * Matches the same styling as YourSeriesSection and RecentlyAddedSection
 *
 * Features:
 * - Cover tap: loads book to player (paused)
 * - Cover long press: opens book details
 * - Title tap: opens book details
 * - Shows "time since last played" (e.g., "2h ago", "3d ago")
 * - Shows "Added X ago" for library books without progress
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';
import { LibraryItem, BookMetadata } from '@/core/types';
import { ContinueListeningItem } from '@/shared/hooks/useContinueListening';
import { apiClient } from '@/core/api';

// Helper to get book metadata safely (accepts both LibraryItem and ContinueListeningItem)
function getBookMetadata(item: LibraryItem | ContinueListeningItem): BookMetadata | null {
  if (item.mediaType !== 'book' || !item.media?.metadata) return null;
  return item.media.metadata as BookMetadata;
}
import { wp, hp, moderateScale } from '@/shared/theme';
import { useColors } from '@/shared/theme/themeStore';
import { ThemeColors } from '@/shared/theme/colors';

// Format time ago (e.g., "30 sec ago", "5 min ago", "2 hours ago")
function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (months > 0) return months === 1 ? '1 month ago' : `${months} months ago`;
  if (weeks > 0) return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  if (days > 0) return days === 1 ? '1 day ago' : `${days} days ago`;
  if (hours > 0) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  if (minutes > 0) return minutes === 1 ? '1 min ago' : `${minutes} min ago`;
  if (seconds > 10) return `${seconds} sec ago`;
  return 'just now';
}

// Layout constants matching other card sections
const MARGIN_H = wp(3.25);       // 3.25%w horizontal margin
const PADDING = wp(4);           // 4%w internal padding
const RADIUS = wp(2.5);          // 2.5%w border radius
const GAP = wp(3);               // 3%w gap

// Card dimensions
const CARD = {
  coverSize: wp(22),            // Square cover
  gap: wp(4),                   // Gap between cards
  titleWidth: wp(22),           // Width for title text
};

// getItemLayout for horizontal scroll optimization
// Item width includes the cover size plus the gap (separator)
const getItemLayout = (_data: any, index: number) => ({
  length: CARD.coverSize + CARD.gap,
  offset: (CARD.coverSize + CARD.gap) * index,
  index,
});

// Play icon for overlay
const PlayIcon = ({ size, color }: { size: number; color: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M8 5.14v14.72a1 1 0 001.5.86l11.14-7.36a1 1 0 000-1.72L9.5 4.28a1 1 0 00-1.5.86z"
      fill={color}
    />
  </Svg>
);

// Bookmark icon for "added to library" indicator
const BookmarkIcon = ({ size, color }: { size: number; color: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M5 4C5 2.89543 5.89543 2 7 2H17C18.1046 2 19 2.89543 19 4V21C19 21.3746 18.7907 21.7178 18.4576 21.8892C18.1245 22.0606 17.7236 22.0315 17.4188 21.8137L12 17.8619L6.58124 21.8137C6.27642 22.0315 5.87549 22.0606 5.54242 21.8892C5.20935 21.7178 5 21.3746 5 21V4Z" />
  </Svg>
);

interface ContinueListeningSectionProps {
  /** List of books to display (supports both LibraryItem and ContinueListeningItem) */
  books: (LibraryItem | ContinueListeningItem)[];
  /** Callback when cover is pressed (loads book paused) */
  onCoverPress: (book: LibraryItem | ContinueListeningItem) => void;
  /** Callback when title is pressed or cover is long-pressed (opens details) */
  onDetailsPress: (book: LibraryItem | ContinueListeningItem) => void;
  /** Callback when "View All" is pressed */
  onViewAll: () => void;
}

/**
 * Check if item is a ContinueListeningItem (has library membership fields)
 */
function isContinueListeningItem(item: LibraryItem | ContinueListeningItem): item is ContinueListeningItem {
  return 'hasStarted' in item && 'lastInteraction' in item;
}

/**
 * Individual book card with cover and title
 * - Cover tap: plays book (paused)
 * - Cover long press: opens details
 * - Title tap: opens details
 * - Shows progress bar for in-progress books
 * - Shows "Added" badge for library-only books
 */
const ContinueListeningCard = ({
  book,
  onCoverPress,
  onDetailsPress,
  colors,
}: {
  book: LibraryItem | ContinueListeningItem;
  onCoverPress: () => void;
  onDetailsPress: () => void;
  colors: ThemeColors;
}) => {
  const coverUrl = apiClient.getItemCoverUrl(book.id);
  const metadata = getBookMetadata(book);
  const title = metadata?.title || 'Unknown';
  const author = metadata?.authorName || metadata?.authors?.[0]?.name || '';
  const progress = book.userMediaProgress?.progress || 0;

  // Determine if this is a library-added book vs in-progress book
  const isLibraryItem = isContinueListeningItem(book);
  const hasStarted = isLibraryItem ? book.hasStarted : progress > 0;
  const isInLibrary = isLibraryItem ? book.isInLibrary : false;
  const lastInteraction = isLibraryItem ? book.lastInteraction : undefined;

  // Get lastUpdate from various possible locations in the API response
  let lastUpdateMs: number | undefined;

  if (lastInteraction) {
    // Use unified lastInteraction from ContinueListeningItem
    lastUpdateMs = lastInteraction;
  } else {
    const rawLastUpdate =
      book.userMediaProgress?.lastUpdate ||
      (book as any).mediaProgress?.lastUpdate;

    if (rawLastUpdate && rawLastUpdate > 0) {
      // If less than 10 billion, it's definitely in seconds and needs conversion
      if (rawLastUpdate < 10000000000) {
        lastUpdateMs = rawLastUpdate * 1000;
      } else {
        // Already in milliseconds
        lastUpdateMs = rawLastUpdate;
      }
    }
  }

  const hasProgress = progress > 0 && progress < 1;
  const timeAgo = lastUpdateMs ? formatTimeAgo(lastUpdateMs) : '';

  // Determine label: "Added X ago" for library-only, "Played X ago" for in-progress
  const timeLabel = hasStarted
    ? timeAgo
    : isInLibrary
    ? `Added ${timeAgo}`
    : timeAgo;

  return (
    <View style={styles.cardContainer}>
      {/* Cover - tap to play, long press for details */}
      <TouchableOpacity
        onPress={onCoverPress}
        onLongPress={onDetailsPress}
        activeOpacity={0.9}
        accessibilityLabel={author ? `${title} by ${author}, ${Math.round(progress * 100)}% complete` : `${title}, ${Math.round(progress * 100)}% complete`}
        accessibilityRole="button"
        accessibilityHint="Tap to play. Long press for details."
      >
        <View style={styles.coverWrapper}>
          <Image
            source={coverUrl}
            style={styles.cover}
            contentFit="cover"
            transition={200}
          />
          {/* Play overlay - show bookmark badge for library-only books */}
          <View style={styles.playOverlay}>
            {hasStarted ? (
              <PlayIcon size={wp(7)} color="white" />
            ) : isInLibrary ? (
              <View style={styles.bookmarkBadge}>
                <BookmarkIcon size={wp(4)} color="white" />
              </View>
            ) : (
              <PlayIcon size={wp(7)} color="white" />
            )}
          </View>
          {/* Progress bar at bottom of cover (only show if has progress) */}
          {hasProgress && (
            <View style={styles.progressBarContainer}>
              <View style={[
                styles.progressBarFill,
                { width: `${progress * 100}%`, backgroundColor: colors.progress.fill }
              ]} />
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Title - tap for details */}
      <TouchableOpacity onPress={onDetailsPress} activeOpacity={0.7}>
        <Text style={[styles.cardTitle, { color: colors.text.primary }]} numberOfLines={2}>
          {title}
        </Text>
      </TouchableOpacity>

      {/* Time label - "Added X ago" or "X ago" */}
      {timeLabel ? (
        <Text style={[styles.timeAgo, { color: colors.text.secondary }]}>{timeLabel}</Text>
      ) : null}
    </View>
  );
};

export function ContinueListeningSection({
  books,
  onCoverPress,
  onDetailsPress,
  onViewAll,
}: ContinueListeningSectionProps) {
  const colors = useColors();

  const renderCard = useCallback(
    ({ item }: { item: LibraryItem | ContinueListeningItem }) => (
      <ContinueListeningCard
        book={item}
        onCoverPress={() => onCoverPress(item)}
        onDetailsPress={() => onDetailsPress(item)}
        colors={colors}
      />
    ),
    [onCoverPress, onDetailsPress, colors]
  );

  if (books.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <Text style={[styles.header, { color: colors.text.primary }]}>
        Continue Listening
      </Text>

      {/* Horizontal scroll of book cards - extends to screen edges */}
      <FlatList<LibraryItem | ContinueListeningItem>
        data={books}
        renderItem={renderCard}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ width: CARD.gap }} />}
        getItemLayout={getItemLayout}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: hp(2),
  },
  header: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    marginBottom: GAP,
    marginLeft: MARGIN_H, // Align with card left edge
  },
  list: {
    paddingLeft: MARGIN_H, // Start aligned with card left edge
  },

  // Individual card styles
  cardContainer: {
    width: CARD.coverSize,
  },
  coverWrapper: {
    width: CARD.coverSize,
    height: CARD.coverSize,
    borderRadius: wp(1.5),
    overflow: 'hidden',
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Fixed dark overlay for cover visibility
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookmarkBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: wp(3),
    padding: wp(1.5),
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: wp(1),
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Fixed dark overlay for cover visibility
  },
  progressBarFill: {
    height: '100%',
  },
  cardTitle: {
    width: CARD.titleWidth,
    textAlign: 'left',
    fontSize: moderateScale(11),
    marginTop: hp(0.6),
  },
  timeAgo: {
    width: CARD.titleWidth,
    textAlign: 'left',
    fontSize: moderateScale(10),
    marginTop: hp(0.3),
  },
});

export default ContinueListeningSection;
