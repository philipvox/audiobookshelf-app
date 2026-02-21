/**
 * src/features/library/components/GenreCards.tsx
 *
 * Genre card components styled like SeriesCard from browse feature.
 * Uses color dots instead of stacked book covers.
 *
 * Variants:
 * - GenreCardLarge: For "Your Genres" section (grid layout)
 * - GenreCardCompact: For within meta-categories (list layout)
 * - GenreListItem: For A-Z flat view
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { secretLibraryColors, secretLibraryFonts } from '@/shared/theme/secretLibrary';
import { scale } from '@/shared/theme';
import { hashString, SPINE_COLOR_PALETTE } from '@/shared/spine';
import { GenreWithData } from '../constants/genreCategories';
import { useColors } from '@/shared/theme/themeStore';

// Get deterministic color for a book based on its ID
function getBookDotColor(bookId: string): string {
  const hash = hashString(bookId);
  return SPINE_COLOR_PALETTE[hash % SPINE_COLOR_PALETTE.length];
}

// Get color dots for a genre based on book IDs (cover IDs are item IDs)
function getGenreColorDots(bookIds: string[], maxDots = 8): string[] {
  return bookIds.slice(0, maxDots).map(getBookDotColor);
}

// =============================================================================
// GenreCardLarge - For "Your Genres" and "Popular Genres" sections
// Full-width list layout with color dots and border separator
// =============================================================================

interface GenreCardLargeProps {
  genre: GenreWithData;
  onPress: () => void;
  variant?: 'light' | 'dark';
}

export function GenreCardLarge({ genre, onPress, variant = 'light' }: GenreCardLargeProps) {
  const isDark = variant === 'dark';

  // Generate color dots based on book IDs (coverIds are book IDs)
  const colorDots = useMemo(() => getGenreColorDots(genre.coverIds, 8), [genre.coverIds]);

  return (
    <Pressable
      style={[
        styles.largeCard,
        isDark ? styles.cardDark : styles.cardLight,
        isDark ? styles.borderDark : styles.borderLight,
      ]}
      onPress={onPress}
    >
      {/* Left side: Name and count */}
      <View style={styles.largeCardLeft}>
        <Text
          style={[styles.largeName, isDark && styles.titleDark]}
          numberOfLines={1}
        >
          {genre.name}
        </Text>
        <Text style={styles.count}>
          {genre.bookCount} {genre.bookCount === 1 ? 'book' : 'books'}
        </Text>
      </View>

      {/* Right side: Color Dots */}
      <View style={styles.dotsRow}>
        {colorDots.map((color, index) => (
          <View
            key={`${index}-${color}`}
            style={[styles.dot, { backgroundColor: color }]}
          />
        ))}
      </View>
    </Pressable>
  );
}

// =============================================================================
// GenreCardCompact - For within meta-categories
// Full-width list layout with dots on the right
// =============================================================================

interface GenreCardCompactProps {
  genre: GenreWithData;
  onPress: () => void;
  variant?: 'light' | 'dark';
}

export function GenreCardCompact({ genre, onPress, variant = 'light' }: GenreCardCompactProps) {
  const isDark = variant === 'dark';

  // Generate color dots based on book IDs
  const colorDots = useMemo(() => getGenreColorDots(genre.coverIds, 6), [genre.coverIds]);

  return (
    <Pressable
      style={[
        styles.compactCard,
        isDark ? styles.cardDark : styles.cardLight,
        isDark ? styles.borderDark : styles.borderLight,
      ]}
      onPress={onPress}
    >
      {/* Left: Name and count */}
      <View style={styles.compactLeft}>
        <Text
          style={[styles.compactName, isDark && styles.titleDark]}
          numberOfLines={1}
        >
          {genre.name}
        </Text>
        <Text style={styles.count}>
          {genre.bookCount} {genre.bookCount === 1 ? 'book' : 'books'}
        </Text>
      </View>

      {/* Right: Dots */}
      <View style={styles.compactDotsRow}>
        {colorDots.map((color, index) => (
          <View
            key={`${index}-${color}`}
            style={[styles.dotSmall, { backgroundColor: color }]}
          />
        ))}
      </View>
    </Pressable>
  );
}

// =============================================================================
// GenreListItem - For A-Z flat view
// Full-width list item with dots
// =============================================================================

interface GenreListItemProps {
  genre: GenreWithData;
  onPress: () => void;
}

export function GenreListItem({ genre, onPress }: GenreListItemProps) {
  const colors = useColors();

  // Generate color dots based on book IDs
  const colorDots = useMemo(() => getGenreColorDots(genre.coverIds, 6), [genre.coverIds]);

  return (
    <Pressable
      style={[styles.listItem, { borderBottomColor: colors.border.default }]}
      onPress={onPress}
    >
      {/* Left: Name */}
      <View style={styles.listItemLeft}>
        <Text style={[styles.listName, { color: colors.text.primary }]} numberOfLines={1}>
          {genre.name}
        </Text>
        {/* Dots under the name */}
        <View style={styles.listDotsRow}>
          {colorDots.map((color, index) => (
            <View
              key={`${index}-${color}`}
              style={[styles.dotSmall, { backgroundColor: color }]}
            />
          ))}
        </View>
      </View>

      {/* Right: Count */}
      <Text style={[styles.listCount, { color: colors.text.tertiary }]}>
        {genre.bookCount}
      </Text>
    </Pressable>
  );
}

// =============================================================================
// PopularGenreCard - Alias for GenreCardLarge (backwards compatibility)
// =============================================================================

interface PopularGenreCardProps {
  genre: GenreWithData;
  onPress: () => void;
}

export function PopularGenreCard({ genre, onPress }: PopularGenreCardProps) {
  return <GenreCardLarge genre={genre} onPress={onPress} />;
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  // Card base styles
  cardLight: {
    backgroundColor: secretLibraryColors.white,
  },
  cardDark: {
    backgroundColor: secretLibraryColors.black,
  },
  borderLight: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  borderDark: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },

  // Large Card (Your Genres / Popular Genres - single column list)
  largeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  largeCardLeft: {
    flex: 1,
    marginRight: 16,
  },
  largeName: {
    fontFamily: secretLibraryFonts.playfair.regular,
    fontSize: scale(17),
    color: secretLibraryColors.black,
    lineHeight: scale(22),
    marginBottom: 4,
  },
  titleDark: {
    color: secretLibraryColors.white,
  },
  count: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(9),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: secretLibraryColors.gray,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 3,
    flexWrap: 'wrap',
    maxWidth: 100,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },

  // Compact Card (Meta-category expanded - single column list)
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  compactLeft: {
    flex: 1,
    marginRight: 16,
  },
  compactName: {
    fontFamily: secretLibraryFonts.playfair.regular,
    fontSize: scale(15),
    color: secretLibraryColors.black,
    marginBottom: 2,
  },
  compactDotsRow: {
    flexDirection: 'row',
    gap: 3,
  },
  dotSmall: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },

  // List Item (A-Z view)
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 56,
  },
  listItemLeft: {
    flex: 1,
    marginRight: 12,
  },
  listName: {
    fontFamily: secretLibraryFonts.playfair.regular,
    fontSize: scale(15),
    marginBottom: 6,
  },
  listDotsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  listCount: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(11),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
