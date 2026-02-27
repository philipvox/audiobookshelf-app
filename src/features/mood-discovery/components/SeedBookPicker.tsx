/**
 * src/features/mood-discovery/components/SeedBookPicker.tsx
 *
 * Book picker for Step 3 of the mood discovery quiz.
 * "Of all your books, which do you wish you could read for the first time again?"
 *
 * Design:
 * - Search input at top
 * - List view with book rows (cover, title, author)
 * - Loading state to prevent flash of empty state
 */

import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Icon } from '@/shared/components/Icon';
import { spacing, radius, scale, useTheme } from '@/shared/theme';
import { secretLibraryFonts } from '@/shared/theme/secretLibrary';
import { useLibraryCache } from '@/core/cache/libraryCache';
import { useFinishedBooks } from '@/core/hooks/useUserBooks';
import { usePlaylists } from '@/features/playlists';
import { apiClient } from '@/core/api';
import { LibraryItem } from '@/core/types';
import { Mood, MOOD_COLORS } from '../types';

interface SeedBookPickerProps {
  /** Currently selected book ID */
  selectedBookId: string | null;
  /** Called when a book is selected */
  onSelectBook: (bookId: string | null) => void;
  /** Optional mood to filter/prioritize books */
  mood?: Mood | null;
  /** Compact mode - smaller items */
  compact?: boolean;
}

/**
 * Book row item in the picker list
 */
const BookRowItem = React.memo(function BookRowItem({
  item,
  selected,
  onSelect,
  colors,
  moodColor,
}: {
  item: LibraryItem;
  selected: boolean;
  onSelect: () => void;
  colors: any;
  moodColor?: { primary: string; cardBg: string };
}) {
  const title = item.media?.metadata?.title || 'Unknown';
  const author = item.media?.metadata?.authorName || 'Unknown Author';
  const coverUrl = apiClient.getItemCoverUrl(item.id, { width: 120, height: 120 });

  return (
    <Pressable
      onPress={onSelect}
      style={[
        styles.bookRow,
        selected && styles.bookRowSelected,
      ]}
    >
      {/* Cover */}
      <View style={[styles.coverContainer, { backgroundColor: colors.background.secondary }]}>
        <Image
          source={coverUrl}
          style={styles.coverImage}
          contentFit="cover"
          transition={200}
        />
        {selected && (
          <View style={[styles.selectedBadge, moodColor && { backgroundColor: moodColor.primary }]}>
            <Icon name="Check" size={14} color="#FFFFFF" />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.bookInfo}>
        <Text
          style={[styles.bookTitle, { color: colors.text.primary }]}
          numberOfLines={2}
        >
          {title}
        </Text>
        <Text
          style={[styles.bookAuthor, { color: colors.text.secondary }]}
          numberOfLines={1}
        >
          {author}
        </Text>
      </View>

      {/* Selection indicator */}
      <View style={[
        styles.radioOuter,
        { borderColor: selected ? (moodColor?.primary || '#FFFFFF') : 'rgba(255,255,255,0.3)' },
        selected && [styles.radioOuterSelected, moodColor && { borderColor: moodColor.primary, backgroundColor: moodColor.primary }],
      ]}>
        {selected && <View style={styles.radioInner} />}
      </View>
    </Pressable>
  );
});

export function SeedBookPicker({
  selectedBookId,
  onSelectBook,
  mood,
  compact = false,
}: SeedBookPickerProps) {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  // Get library items
  const items = useLibraryCache((s) => s.items);

  // Get playlists and finished books
  const { data: playlists = [], isLoading: isLoadingPlaylists } = usePlaylists();
  const { data: finishedBooksData = [], isLoading: isLoadingFinished } = useFinishedBooks();

  // Get books from all playlists (deduplicated)
  const playlistBookIds = useMemo(() => {
    const ids = new Set<string>();
    for (const playlist of playlists) {
      for (const item of playlist.items) {
        ids.add(item.libraryItemId);
      }
    }
    return ids;
  }, [playlists]);

  // Get last 3 finished book IDs (sorted by most recently finished)
  const recentFinishedIds = useMemo(() => {
    // finishedBooksData is already sorted by finishedAt DESC from SQLite
    const ids: string[] = [];
    for (const book of finishedBooksData) {
      if (ids.length >= 3) break;
      ids.push(book.bookId);
    }

    // Also check server progress for >= 95% (sorted by lastUpdate)
    if (ids.length < 3) {
      const serverFinished = items
        .filter((item) => (item.userMediaProgress?.progress || 0) >= 0.95 && !ids.includes(item.id))
        .sort((a, b) => (b.userMediaProgress?.lastUpdate || 0) - (a.userMediaProgress?.lastUpdate || 0));
      for (const item of serverFinished) {
        if (ids.length >= 3) break;
        ids.push(item.id);
      }
    }

    return new Set(ids);
  }, [finishedBooksData, items]);

  // Filter and sort books
  // Default: show playlist books + last 3 finished
  // When searching: search ALL books
  const filteredBooks = useMemo(() => {
    let books = items.filter((item) => item.mediaType === 'book');

    if (searchQuery.trim()) {
      // When searching, search ALL books
      const query = searchQuery.toLowerCase();
      books = books.filter((item) => {
        const title = item.media?.metadata?.title?.toLowerCase() || '';
        const author = item.media?.metadata?.authorName?.toLowerCase() || '';
        return title.includes(query) || author.includes(query);
      });
      // Sort search results by title
      books.sort((a, b) => {
        const titleA = a.media?.metadata?.title || '';
        const titleB = b.media?.metadata?.title || '';
        return titleA.localeCompare(titleB);
      });
    } else {
      // Default: playlist books + last 3 finished (deduplicated)
      const candidateIds = new Set<string>();
      for (const id of playlistBookIds) candidateIds.add(id);
      for (const id of recentFinishedIds) candidateIds.add(id);

      books = books.filter((item) => candidateIds.has(item.id));

      // Sort: recently finished first, then playlist books by title
      books.sort((a, b) => {
        const aFinished = recentFinishedIds.has(a.id);
        const bFinished = recentFinishedIds.has(b.id);
        if (aFinished && !bFinished) return -1;
        if (!aFinished && bFinished) return 1;
        const titleA = a.media?.metadata?.title || '';
        const titleB = b.media?.metadata?.title || '';
        return titleA.localeCompare(titleB);
      });
    }

    return books.slice(0, 100);
  }, [items, searchQuery, playlistBookIds, recentFinishedIds]);

  const handleSelectBook = useCallback(
    (bookId: string) => {
      // Toggle selection - if already selected, deselect
      if (selectedBookId === bookId) {
        onSelectBook(null);
      } else {
        onSelectBook(bookId);
      }
    },
    [selectedBookId, onSelectBook]
  );

  const moodColorObj = mood ? MOOD_COLORS[mood] : undefined;

  const renderItem = useCallback(
    ({ item }: { item: LibraryItem }) => (
      <BookRowItem
        item={item}
        selected={item.id === selectedBookId}
        onSelect={() => handleSelectBook(item.id)}
        colors={colors}
        moodColor={moodColorObj}
      />
    ),
    [selectedBookId, handleSelectBook, colors, moodColorObj]
  );

  // Show loading while fetching data
  if ((isLoadingPlaylists || isLoadingFinished) && !searchQuery) {
    return (
      <View style={styles.container}>
        {/* Search bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.background.tertiary, borderColor: colors.border.default }]}>
          <Icon name="Search" size={18} color={colors.text.tertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text.primary }]}
            placeholder="Search all books..."
            placeholderTextColor={colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Loading indicator */}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.text.tertiary} />
          <Text style={[styles.loadingText, { color: colors.text.tertiary }]}>
            Loading your books...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.background.tertiary, borderColor: colors.border.default }]}>
        <Icon name="Search" size={18} color={colors.text.tertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text.primary }]}
          placeholder="Search all books..."
          placeholderTextColor={colors.text.tertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="X" size={18} color={colors.text.tertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Books list */}
      <FlatList
        data={filteredBooks}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: colors.border.default }]} />
        )}
      />

      {/* Empty state */}
      {filteredBooks.length === 0 && (
        <View style={styles.emptyState}>
          <Icon name="BookOpen" size={48} color={colors.text.tertiary} />
          <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
            {searchQuery ? 'No books match your search' : 'No playlist or finished books found'}
          </Text>
          {!searchQuery && (
            <Text style={[styles.emptySubtext, { color: colors.text.tertiary }]}>
              Search to find any book in your library
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(14),
    paddingVertical: spacing.xs,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  separator: {
    height: 1,
    marginLeft: scale(72), // Align with text, not cover
  },

  // Book row styles
  bookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(12),
    paddingHorizontal: scale(4),
    gap: scale(12),
  },
  bookRowSelected: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  coverContainer: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(8),
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  selectedBadge: {
    position: 'absolute',
    top: scale(4),
    left: scale(4),
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  bookTitle: {
    fontFamily: secretLibraryFonts.playfair.regular,
    fontSize: scale(15),
    fontWeight: '500',
    marginBottom: 2,
  },
  bookAuthor: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(12),
  },

  // Radio button
  radioOuter: {
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
  },
  radioInner: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    backgroundColor: '#000000',
  },

  // Loading state
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(13),
  },

  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(14),
    textAlign: 'center',
  },
  emptySubtext: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(12),
    textAlign: 'center',
    opacity: 0.7,
  },
});
