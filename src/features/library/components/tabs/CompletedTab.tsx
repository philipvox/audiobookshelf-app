/**
 * src/features/library/components/tabs/CompletedTab.tsx
 *
 * Completed books tab content for MyLibraryScreen.
 * Shows books that have been finished.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SectionHeader } from '@/features/home/components/SectionHeader';
import { LibraryEmptyState } from '../LibraryEmptyState';
import { BookRow } from '../BookRow';
import { scale } from '@/shared/theme';
import { EnrichedBook } from '../../types';

interface CompletedTabProps {
  books: EnrichedBook[];
  onBookPress: (bookId: string) => void;
  onBookPlay: (book: EnrichedBook) => void;
  isMarkedFinished: (bookId: string) => boolean;
  onBrowse: () => void;
}

export function CompletedTab({
  books,
  onBookPress,
  onBookPlay,
  isMarkedFinished,
  onBrowse,
}: CompletedTabProps) {
  if (books.length === 0) {
    return <LibraryEmptyState tab="completed" onAction={onBrowse} />;
  }

  return (
    <View style={styles.section}>
      <SectionHeader title={`Completed (${books.length})`} showViewAll={false} />
      {books.map(book => (
        <BookRow
          key={book.id}
          book={book}
          onPress={() => onBookPress(book.id)}
          onPlay={() => onBookPlay(book)}
          showIndicator
          isMarkedFinished={isMarkedFinished(book.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: scale(24),
  },
});

export default CompletedTab;
