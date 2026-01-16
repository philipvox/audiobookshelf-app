/**
 * src/features/browse/components/SeriesCard.tsx
 *
 * Reusable series card component for browse pages.
 * Single source of truth for series card styling across the app.
 *
 * Variants:
 * - light: White/cream background (default)
 * - dark: Black background
 *
 * Layouts:
 * - list: Full-width with title/count on top row, author/dots on bottom
 * - grid: Compact square with dots on separate row
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { secretLibraryColors as staticColors, secretLibraryFonts } from '@/shared/theme/secretLibrary';
import { scale, useSecretLibraryColors } from '@/shared/theme';
// MIGRATED: Now using new spine system via adapter
import { hashString, SPINE_COLOR_PALETTE } from '@/features/home/utils/spine/adapter';

// Re-export for backwards compatibility
export const SERIES_DOT_COLORS = SPINE_COLOR_PALETTE;

// Get deterministic color for a book based on its ID
export function getBookDotColor(bookId: string): string {
  const hash = hashString(bookId);
  return SPINE_COLOR_PALETTE[hash % SPINE_COLOR_PALETTE.length];
}

// Get color dots for a series based on book IDs
export function getSeriesColorDots(bookIds: string[], maxDots = 8): string[] {
  return bookIds.slice(0, maxDots).map(getBookDotColor);
}

export type SeriesCardVariant = 'light' | 'dark';
export type SeriesCardLayout = 'list' | 'grid';

export interface SeriesCardProps {
  /** Series name */
  name: string;
  /** Author name */
  author: string;
  /** Number of books in series */
  bookCount: number;
  /** Book IDs for generating color dots */
  bookIds: string[];
  /** Visual variant */
  variant?: SeriesCardVariant;
  /** Layout mode */
  layout?: SeriesCardLayout;
  /** Maximum color dots to show */
  maxDots?: number;
  /** Called when card is pressed */
  onPress?: () => void;
}

export function SeriesCard({
  name,
  author,
  bookCount,
  bookIds,
  variant = 'light',
  layout = 'list',
  maxDots = 8,
  onPress,
}: SeriesCardProps) {
  // Theme-aware colors
  const colors = useSecretLibraryColors();

  // Generate color dots based on book IDs
  const colorDots = useMemo(() => getSeriesColorDots(bookIds, maxDots), [bookIds, maxDots]);

  const isGrid = layout === 'grid';

  return (
    <Pressable
      style={[
        styles.card,
        { backgroundColor: colors.white },
        isGrid && styles.cardGrid,
      ]}
      onPress={onPress}
    >
      {/* Top row: Title and count */}
      <View style={styles.topRow}>
        <Text
          style={[styles.title, { color: colors.black }]}
          numberOfLines={1}
        >
          {name}
        </Text>
        {!isGrid && (
          <Text style={[styles.count, { color: colors.gray }]}>
            {bookCount} {bookCount === 1 ? 'book' : 'books'}
          </Text>
        )}
      </View>

      {/* Bottom row: Author and dots (or count for grid) */}
      <View style={styles.bottomRow}>
        <Text style={[styles.author, { color: colors.gray }]} numberOfLines={1}>
          {author}
        </Text>
        {isGrid ? (
          <Text style={[styles.count, { color: colors.gray }]}>{bookCount}</Text>
        ) : (
          <View style={styles.dotsContainer}>
            {colorDots.map((color, index) => (
              <View
                key={`${index}-${color}`}
                style={[styles.dot, { backgroundColor: color }]}
              />
            ))}
          </View>
        )}
      </View>

      {/* Grid layout: Dots on separate row */}
      {isGrid && (
        <View style={styles.gridDotsRow}>
          {colorDots.map((color, index) => (
            <View
              key={`${index}-${color}`}
              style={[styles.dot, { backgroundColor: color }]}
            />
          ))}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  cardGrid: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontFamily: secretLibraryFonts.playfair.regular,
    fontSize: scale(17),
    lineHeight: scale(17) * 1.2,
    flex: 1,
    marginRight: 12,
  },
  count: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(9),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  author: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(9),
    flex: 1,
    marginRight: 12,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 3,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  gridDotsRow: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 10,
  },
});
