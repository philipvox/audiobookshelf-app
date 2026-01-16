/**
 * src/features/browse/components/CollectionRow.tsx
 *
 * Horizontal collection row with header and book thumbnails.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Collection } from '@/core/types';
import { secretLibraryColors, secretLibraryFonts } from '@/shared/theme/secretLibrary';
import { CollectionThumb } from './CollectionThumb';
import { scale } from '@/shared/theme';

interface CollectionRowProps {
  collection: Collection;
  onPress?: () => void;
  onBookPress?: (bookId: string) => void;
}

function CollectionRowComponent({
  collection,
  onPress,
  onBookPress,
}: CollectionRowProps) {
  const books = collection.books.slice(0, 4);
  const bookCount = collection.books.length;

  return (
    <Pressable style={styles.container} onPress={onPress}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{collection.name}</Text>
        <Text style={styles.count}>{bookCount} books</Text>
      </View>

      {/* Thumbnails */}
      <View style={styles.row}>
        {books.map((book, index) => (
          <CollectionThumb
            key={book.id}
            bookId={book.id}
            bookTitle={(book.media?.metadata as any)?.title}
            index={index}
            onPress={() => onBookPress?.(book.id)}
          />
        ))}
      </View>
    </Pressable>
  );
}

export const CollectionRow = memo(CollectionRowComponent);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    marginBottom: 28,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  title: {
    fontFamily: secretLibraryFonts.playfair.regular,
    fontSize: scale(14),
    color: secretLibraryColors.black,
  },
  count: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(9),
    color: secretLibraryColors.gray,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
});
