/**
 * src/features/home/components/BookRow.tsx
 *
 * Reusable horizontal row of book spines.
 * Used by SeriesSpineCard, TasteTextList shelf mode, and other book displays.
 * For animated/interactive bookshelf, use BookshelfView instead.
 */

import React, { memo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { BookSpineVertical, BookSpineVerticalData } from './BookSpineVertical';
import { useBookRowLayout, UseBookRowLayoutOptions } from '../hooks/useBookRowLayout';

// =============================================================================
// TYPES
// =============================================================================

interface BookRowProps {
  /** Array of books to display */
  books: BookSpineVerticalData[];
  /** Scale factor for book dimensions (default: 1) */
  scaleFactor?: number;
  /** Gap between books in pixels (default: 4) */
  gap?: number;
  /** Whether to enable leaning (default: true) */
  enableLeaning?: boolean;
  /** Callback when a book is pressed */
  onBookPress?: (book: BookSpineVerticalData) => void;
  /** Maximum number of books to show (default: all) */
  maxBooks?: number;
  /** Horizontal alignment (default: 'flex-start') */
  alignItems?: 'flex-start' | 'center' | 'flex-end';
}

// =============================================================================
// COMPONENT
// =============================================================================

function BookRowComponent({
  books,
  scaleFactor = 1,
  gap = 4,
  enableLeaning = true,
  onBookPress,
  maxBooks,
  alignItems = 'flex-start',
}: BookRowProps) {
  // Limit books if maxBooks specified
  const displayBooks = maxBooks ? books.slice(0, maxBooks) : books;

  // Calculate layout using the shared hook
  const layoutOptions: UseBookRowLayoutOptions = {
    scaleFactor,
    thicknessMultiplier: 1,
    leanAngle: 3,
    minTouchTarget: 0, // No touch padding needed for small displays
    enableLeaning,
  };

  const bookLayouts = useBookRowLayout(displayBooks, layoutOptions);

  // Handle book press
  const handlePress = useCallback(
    (book: BookSpineVerticalData) => {
      onBookPress?.(book);
    },
    [onBookPress]
  );

  if (bookLayouts.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { gap, alignItems }]}>
      {bookLayouts.map((layout) => (
        <BookSpineVertical
          key={layout.book.id}
          book={layout.book}
          width={layout.width}
          height={layout.height}
          leanAngle={layout.leanAngle}
          onPress={onBookPress ? handlePress : undefined}
        />
      ))}
    </View>
  );
}

export const BookRow = memo(BookRowComponent);

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end', // Books sit on bottom edge like a shelf
  },
});
