/**
 * src/features/browse/components/RecentlyAddedSection.tsx
 *
 * Recently Added section for Browse page with horizontal scrolling carousel.
 * Single row with peeking content on the right.
 */

import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { ChevronRight } from 'lucide-react-native';
import { secretLibraryColors, secretLibraryFonts } from '@/shared/theme/secretLibrary';
import { useLibraryCache, useCoverUrl } from '@/core/cache';
import { LibraryItem, BookMetadata } from '@/core/types';
import { scale, wp } from '@/shared/theme';
import { CompleteBadgeOverlay } from '@/features/completion';
import { useContentFilterStore, filterByAudience } from '../stores/contentFilterStore';

// Carousel layout constants
const PADDING = 16;
const GAP = 12;
// Card width: Show 2 full cards + peek of 3rd
const CARD_WIDTH = Math.floor((wp(100) - PADDING - GAP) * 0.42);
const COVER_HEIGHT = CARD_WIDTH;

// Helper to get book metadata safely
function getMetadata(item: LibraryItem): BookMetadata | Record<string, never> {
  if (item.mediaType !== 'book' || !item.media?.metadata) return {};
  return item.media.metadata as BookMetadata;
}

interface RecentlyAddedSectionProps {
  onBookPress?: (bookId: string) => void;
  onViewAll?: () => void;
  limit?: number;
}

interface CardProps {
  item: LibraryItem;
  onPress: () => void;
}

const colors = secretLibraryColors;

const CarouselBookCard = React.memo(function CarouselBookCard({ item, onPress }: CardProps) {
  const coverUrl = useCoverUrl(item.id, { width: 200 });
  const metadata = getMetadata(item);
  const title = metadata.title || 'Untitled';
  const author = metadata.authorName || metadata.authors?.[0]?.name || '';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
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

export function RecentlyAddedSection({
  onBookPress,
  onViewAll,
  limit = 12
}: RecentlyAddedSectionProps) {
  const { items: libraryItems, isLoaded } = useLibraryCache();

  // Content filter
  const audience = useContentFilterStore((s) => s.audience);
  const selectedAges = useContentFilterStore((s) => s.selectedAges);
  const selectedRatings = useContentFilterStore((s) => s.selectedRatings);
  const selectedTags = useContentFilterStore((s) => s.selectedTags);
  const lengthRange = useContentFilterStore((s) => s.lengthRange);

  // Get recently added books sorted by addedAt
  const recentBooks = useMemo(() => {
    if (!libraryItems?.length) return [];

    // Apply content filter first
    const filteredItems = filterByAudience(libraryItems, audience, selectedAges, selectedRatings, selectedTags, lengthRange);

    return [...filteredItems]
      .filter(item => item.mediaType === 'book')
      .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0))
      .slice(0, limit);
  }, [libraryItems, limit, audience, selectedAges, selectedRatings, selectedTags, lengthRange]);

  const handleBookPress = useCallback((bookId: string) => {
    onBookPress?.(bookId);
  }, [onBookPress]);

  if (!isLoaded || recentBooks.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.black }]}>
      {/* Section Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.white }]}>Recently Added</Text>
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
        {recentBooks.map((item) => (
          <CarouselBookCard
            key={item.id}
            item={item}
            onPress={() => handleBookPress(item.id)}
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
    alignItems: 'center',
    paddingHorizontal: PADDING,
    marginBottom: scale(16),
  },
  title: {
    fontFamily: secretLibraryFonts.playfair.bold,
    fontSize: scale(22),
    fontWeight: '700',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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

export default RecentlyAddedSection;
