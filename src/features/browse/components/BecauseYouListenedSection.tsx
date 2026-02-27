/**
 * src/features/browse/components/BecauseYouListenedSection.tsx
 *
 * "Because you listened to X" section for Browse page.
 * Shows recommendations based on a recently listened book.
 * Single row horizontal scrolling carousel with peeking content.
 */

import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { ChevronRight } from 'lucide-react-native';
import { secretLibraryColors, secretLibraryFonts } from '@/shared/theme/secretLibrary';
import { useCoverUrl } from '@/core/cache';
import { LibraryItem, BookMetadata } from '@/core/types';
import { scale, wp } from '@/shared/theme';
import { CompleteBadgeOverlay } from '@/features/completion';
import { useReadingHistory } from '@/features/reading-history-wizard';

// Carousel layout constants
const PADDING = 16;
const GAP = 12;
const CARD_WIDTH = Math.floor((wp(100) - PADDING - GAP) * 0.42);
const COVER_HEIGHT = CARD_WIDTH;

// Helper to get book metadata safely
function getMetadata(item: LibraryItem): BookMetadata | Record<string, never> {
  if (item.mediaType !== 'book' || !item.media?.metadata) return {};
  return item.media.metadata as BookMetadata;
}

interface BecauseYouListenedSectionProps {
  items: LibraryItem[];
  onBookPress?: (bookId: string) => void;
  onBookLongPress?: (bookId: string) => void;
  onViewAll?: () => void;
  limit?: number;
  /** Which source book index to use (0 = most recent, 1 = second most recent, etc.) */
  sourceIndex?: number;
}

interface CardProps {
  item: LibraryItem;
  onPress: () => void;
  onLongPress?: () => void;
}

const colors = secretLibraryColors;

const CarouselBookCard = React.memo(function CarouselBookCard({ item, onPress, onLongPress }: CardProps) {
  const coverUrl = useCoverUrl(item.id, { width: 200 });
  const metadata = getMetadata(item);
  const title = metadata.title || 'Untitled';
  const author = metadata.authorName || metadata.authors?.[0]?.name || '';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} onLongPress={onLongPress} activeOpacity={0.8}>
      <View style={[styles.coverContainer, { backgroundColor: colors.grayLine }]}>
        <Image
          source={coverUrl}
          style={styles.cover}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={200}
        />
        <CompleteBadgeOverlay bookId={item.id} size="small" />
      </View>
      <Text style={[styles.cardTitle, { color: colors.white }]} numberOfLines={1}>
        {title}
      </Text>
      {author && (
        <Text style={[styles.cardAuthor, { color: colors.gray }]} numberOfLines={1}>
          {author}
        </Text>
      )}
    </TouchableOpacity>
  );
});

export function BecauseYouListenedSection({
  items,
  onBookPress,
  onBookLongPress,
  onViewAll,
  limit = 12,
  sourceIndex = 0
}: BecauseYouListenedSectionProps) {
  const { isFinished, hasBeenStarted } = useReadingHistory();

  // Find a recently listened book to base recommendations on
  const { sourceBook, recommendations } = useMemo(() => {
    if (!items?.length) return { sourceBook: null, recommendations: [] };

    // Find recently listened books with progress
    const recentlyListened = items
      .filter(item => {
        if (item.mediaType !== 'book') return false;
        const progress = item.userMediaProgress?.progress || 0;
        return progress > 0.1 || isFinished(item.id) || hasBeenStarted(item.id);
      })
      .sort((a, b) => {
        const aTime = a.userMediaProgress?.lastUpdate || 0;
        const bTime = b.userMediaProgress?.lastUpdate || 0;
        return bTime - aTime;
      });

    if (recentlyListened.length <= sourceIndex) return { sourceBook: null, recommendations: [] };

    // Use the book at sourceIndex as source
    const source = recentlyListened[sourceIndex];
    const sourceMetadata = getMetadata(source);
    const sourceAuthor = sourceMetadata.authorName || sourceMetadata.authors?.[0]?.name || '';
    const sourceGenres = sourceMetadata.genres || [];
    const sourceSeries = sourceMetadata.series?.[0]?.name || '';

    // Get IDs of all source books used (to avoid recommending them)
    const usedSourceIds = new Set(recentlyListened.slice(0, sourceIndex + 1).map(b => b.id));

    // Find similar books (same author, genre, or series)
    const similar = items
      .filter(item => {
        if (item.mediaType !== 'book') return false;
        if (usedSourceIds.has(item.id)) return false;

        // Skip books already started or finished
        const progress = item.userMediaProgress?.progress || 0;
        if (progress > 0.1 || isFinished(item.id)) return false;

        const metadata = getMetadata(item);
        const author = metadata.authorName || metadata.authors?.[0]?.name || '';
        const genres = metadata.genres || [];
        const series = metadata.series?.[0]?.name || '';

        // Same author
        if (sourceAuthor && author === sourceAuthor) return true;

        // Same series (but different book)
        if (sourceSeries && series === sourceSeries) return true;

        // Shared genre
        if (sourceGenres.length > 0 && genres.some(g => sourceGenres.includes(g))) return true;

        return false;
      })
      .slice(0, limit);

    return { sourceBook: source, recommendations: similar };
  }, [items, limit, isFinished, hasBeenStarted, sourceIndex]);

  const handleBookPress = useCallback((bookId: string) => {
    onBookPress?.(bookId);
  }, [onBookPress]);

  const handleBookLongPress = useCallback((bookId: string) => {
    onBookLongPress?.(bookId);
  }, [onBookLongPress]);

  if (!sourceBook || recommendations.length === 0) {
    return null;
  }

  const sourceMetadata = getMetadata(sourceBook);
  const sourceTitle = sourceMetadata.title || 'Unknown';

  return (
    <View style={[styles.container, { backgroundColor: colors.black }]}>
      {/* Section Header */}
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.subtitle, { color: colors.gray }]}>Because you listened to</Text>
          <Text style={[styles.title, { color: colors.white }]} numberOfLines={1}>
            {sourceTitle}
          </Text>
        </View>
        {onViewAll && (
          <TouchableOpacity style={styles.viewAllButton} onPress={onViewAll}>
            <Text style={[styles.viewAllText, { color: colors.gray }]}>View All</Text>
            <ChevronRight size={16} color={colors.gray} />
          </TouchableOpacity>
        )}
      </View>

      {/* Horizontal Scrolling Carousel - Single Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carousel}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + GAP}
      >
        {recommendations.map((item) => (
          <CarouselBookCard
            key={item.id}
            item={item}
            onPress={() => handleBookPress(item.id)}
            onLongPress={() => handleBookLongPress(item.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: scale(24),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: PADDING,
    marginBottom: scale(16),
  },
  headerTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  subtitle: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(10),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  title: {
    fontFamily: secretLibraryFonts.playfair.bold,
    fontSize: scale(20),
    fontWeight: '700',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: scale(16),
  },
  viewAllText: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(12),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  carousel: {
    paddingLeft: PADDING,
    paddingRight: PADDING / 2,
    gap: GAP,
  },
  card: {
    width: CARD_WIDTH,
  },
  coverContainer: {
    width: CARD_WIDTH,
    height: COVER_HEIGHT,
    borderRadius: scale(8),
    overflow: 'hidden',
    marginBottom: scale(8),
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  cardTitle: {
    fontFamily: secretLibraryFonts.playfair.regular,
    fontSize: scale(14),
    lineHeight: scale(18),
    marginBottom: scale(2),
  },
  cardAuthor: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(11),
  },
});

export default BecauseYouListenedSection;
