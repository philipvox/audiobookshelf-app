/**
 * src/shared/components/BookGrid.tsx
 *
 * 2-column grid view for book lists.
 * Displays cover art, title, author, and optional metadata.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { apiClient } from '@/core/api';
import { LibraryItem } from '@/core/types';
import { scale, useSecretLibraryColors } from '@/shared/theme';
import {
  secretLibraryColors as staticColors,
  secretLibraryFonts as fonts,
} from '@/shared/theme/secretLibrary';
import { CoverStars } from './CoverStars';

interface BookGridProps {
  books: LibraryItem[];
  onBookPress: (book: LibraryItem) => void;
  onBookLongPress?: (book: LibraryItem) => void;
}

function formatDurationCompact(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  return `${mins}m`;
}

export function BookGrid({ books, onBookPress, onBookLongPress }: BookGridProps) {
  const colors = useSecretLibraryColors();

  if (books.length === 0) {
    return (
      <Text style={[styles.emptyText, { color: colors.gray }]}>No books found</Text>
    );
  }

  // Build rows of 2
  const rows: LibraryItem[][] = [];
  for (let i = 0; i < books.length; i += 2) {
    rows.push(books.slice(i, i + 2));
  }

  return (
    <View style={styles.container}>
      {rows.map((row, rowIdx) => (
        <View key={rowIdx} style={styles.row}>
          {row.map((book) => {
            const coverUrl = apiClient.getItemCoverUrl(book.id, { width: 300, height: 300 });
            const metadata = book.media?.metadata;
            const title = metadata?.title || 'Unknown';
            const author = (metadata && 'authorName' in metadata ? metadata.authorName : undefined) || (metadata && 'authors' in metadata ? metadata.authors?.[0]?.name : undefined) || '';
            const duration = book.media?.duration || 0;

            return (
              <Pressable
                key={book.id}
                style={styles.card}
                onPress={() => onBookPress(book)}
                onLongPress={onBookLongPress ? () => onBookLongPress(book) : undefined}
                accessibilityLabel={`Open ${title} by ${author}`}
                accessibilityRole="button"
              >
                <View style={styles.coverContainer}>
                  <Image
                    source={{ uri: coverUrl }}
                    style={styles.cover}
                    contentFit="cover"
                  />
                  <CoverStars bookId={book.id} starSize={scale(20)} />
                </View>
                <View style={styles.info}>
                  <Text style={[styles.title, { color: colors.black }]} numberOfLines={2}>
                    {title}
                  </Text>
                  {author ? (
                    <Text style={[styles.author, { color: colors.gray }]} numberOfLines={1}>
                      {author}
                    </Text>
                  ) : null}
                  {duration > 0 && (
                    <Text style={[styles.meta, { color: colors.gray }]}>
                      {formatDurationCompact(duration)}
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          })}
          {/* Spacer for odd-count last row */}
          {row.length === 1 && <View style={styles.card} />}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: scale(16),
    gap: scale(20),
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
  },
  coverContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: scale(8),
    overflow: 'hidden',
  },
  cover: {
    width: '100%',
    height: '100%',
    borderRadius: scale(8),
    backgroundColor: staticColors.grayLine,
  },
  info: {
    marginTop: scale(10),
  },
  title: {
    fontFamily: fonts.playfair.regular,
    fontSize: scale(15),
    lineHeight: scale(18),
  },
  author: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(11),
    marginTop: scale(4),
  },
  meta: {
    fontFamily: fonts.jetbrainsMono.regular,
    fontSize: scale(9),
    marginTop: scale(2),
  },
  emptyText: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: scale(12),
    textAlign: 'center',
    paddingVertical: scale(40),
  },
});
