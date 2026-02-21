/**
 * src/features/library/components/tabs/CompletedTab.tsx
 *
 * Completed books tab content for MyLibraryScreen.
 * Shows books that have been finished using a virtualized FlatList.
 *
 * Uses FlatList for proper virtualization - only renders visible items.
 * This is critical for performance with large libraries (100+ completed books).
 */

import React, { useCallback } from 'react';
import { View, FlatList, StyleSheet, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LibraryEmptyState } from '../LibraryEmptyState';
import { BookRow } from '../BookRow';
import { scale, useTheme } from '@/shared/theme';
import { SCREEN_BOTTOM_PADDING } from '@/constants/layout';
import { EnrichedBook } from '../../types';

interface CompletedTabProps {
  books: EnrichedBook[];
  onBookPress: (bookId: string) => void;
  onBookPlay: (book: EnrichedBook) => void;
  isMarkedFinished: (bookId: string) => boolean;
  onBrowse: () => void;
  // Refresh control props passed from parent
  refreshing?: boolean;
  onRefresh?: () => void;
}

// Estimated item height for getItemLayout optimization
const ITEM_HEIGHT = scale(80);

export function CompletedTab({
  books,
  onBookPress,
  onBookPlay,
  isMarkedFinished,
  onBrowse,
  refreshing = false,
  onRefresh,
}: CompletedTabProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // Memoized render function for FlatList
  const renderItem = useCallback(({ item: book }: { item: EnrichedBook }) => (
    <BookRow
      book={book}
      onPress={() => onBookPress(book.id)}
      onPlay={() => onBookPlay(book)}
      isMarkedFinished={isMarkedFinished(book.id)}
    />
  ), [onBookPress, onBookPlay, isMarkedFinished]);

  const keyExtractor = useCallback((item: EnrichedBook) => item.id, []);

  // Header component with count
  const ListHeader = useCallback(() => (
    <View style={styles.header}>
      <Text style={[styles.headerText, { color: colors.text.secondary }]}>
        {books.length} {books.length === 1 ? 'book' : 'books'} completed
      </Text>
    </View>
  ), [books.length, colors.text.secondary]);

  // Optimized item layout (all items same height)
  const getItemLayout = useCallback((_: any, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index + scale(40), // Add header height offset
    index,
  }), []);

  if (books.length === 0) {
    return <LibraryEmptyState tab="completed" onAction={onBrowse} />;
  }

  return (
    <FlatList
      data={books}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeader}
      getItemLayout={getItemLayout}
      // Performance optimizations
      removeClippedSubviews={Platform.OS === 'android'}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      initialNumToRender={10}
      windowSize={5}
      // Pull to refresh
      refreshing={refreshing}
      onRefresh={onRefresh}
      // Content styling
      contentContainerStyle={[
        styles.listContent,
        { paddingBottom: SCREEN_BOTTOM_PADDING + insets.bottom },
      ]}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: scale(20),
    paddingVertical: scale(12),
  },
  headerText: {
    fontSize: scale(13),
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
  },
  listContent: {
    flexGrow: 1,
  },
});

export default CompletedTab;
