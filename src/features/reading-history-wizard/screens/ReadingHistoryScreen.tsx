/**
 * src/features/reading-history-wizard/screens/ReadingHistoryScreen.tsx
 *
 * Manage reading history - view and edit finished books.
 * Shows all books marked as finished with ability to unmark.
 */

import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useGalleryStore } from '../stores/galleryStore';
import { useLibraryCache } from '@/core/cache/libraryCache';
import { getCoverUrl } from '@/core/cache';
import { LibraryItem } from '@/core/types';
import { colors, scale, spacing } from '@/shared/theme';

const ACCENT = colors.accent;

interface HistoryBook {
  id: string;
  title: string;
  authorName: string;
  seriesName?: string;
  coverUrl: string | null;
  markedAt: number;
  synced: boolean;
}

function getMetadata(item: LibraryItem): any {
  return (item.media?.metadata as any) || {};
}

function getTitle(item: LibraryItem): string {
  return getMetadata(item).title || 'Unknown Title';
}

function getAuthorName(item: LibraryItem): string {
  return getMetadata(item).authorName || 'Unknown Author';
}

function getSeriesName(item: LibraryItem): string {
  const name = getMetadata(item).seriesName || '';
  return name.replace(/\s*#[\d.]+$/, '').trim();
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

type SortOption = 'recent' | 'title' | 'author';
type FilterOption = 'all' | 'synced' | 'pending';

export function ReadingHistoryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  // Store
  const markedBooks = useGalleryStore((s) => s.markedBooks);
  const unmarkBook = useGalleryStore((s) => s.unmarkBook);
  const items = useLibraryCache((s) => s.items);

  // UI State
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);

  // Build history list
  const historyBooks = useMemo((): HistoryBook[] => {
    const books: HistoryBook[] = [];

    markedBooks.forEach((marked, bookId) => {
      const item = items.find((i) => i.id === bookId);
      if (item) {
        books.push({
          id: bookId,
          title: getTitle(item),
          authorName: getAuthorName(item),
          seriesName: getSeriesName(item) || undefined,
          coverUrl: getCoverUrl(bookId),
          markedAt: marked.markedAt,
          synced: marked.synced,
        });
      }
    });

    // Filter
    let filtered = books;
    if (filterBy === 'synced') {
      filtered = books.filter((b) => b.synced);
    } else if (filterBy === 'pending') {
      filtered = books.filter((b) => !b.synced);
    }

    // Sort
    switch (sortBy) {
      case 'recent':
        filtered.sort((a, b) => b.markedAt - a.markedAt);
        break;
      case 'title':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'author':
        filtered.sort((a, b) => a.authorName.localeCompare(b.authorName));
        break;
    }

    return filtered;
  }, [markedBooks, items, sortBy, filterBy]);

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleToggleSelect = useCallback((bookId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(bookId)) {
        next.delete(bookId);
      } else {
        next.add(bookId);
      }
      return next;
    });
  }, []);

  const handleLongPress = useCallback((bookId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSelecting(true);
    setSelectedIds(new Set([bookId]));
  }, []);

  const handleCancelSelection = useCallback(() => {
    setIsSelecting(false);
    setSelectedIds(new Set());
  }, []);

  const handleUnmarkSelected = useCallback(() => {
    if (selectedIds.size === 0) return;

    Alert.alert(
      'Remove from History',
      `Mark ${selectedIds.size} book${selectedIds.size > 1 ? 's' : ''} as unread?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            selectedIds.forEach((id) => unmarkBook(id));
            setSelectedIds(new Set());
            setIsSelecting(false);
          },
        },
      ]
    );
  }, [selectedIds, unmarkBook]);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === historyBooks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(historyBooks.map((b) => b.id)));
    }
  }, [selectedIds.size, historyBooks]);

  const renderBook = useCallback(({ item }: { item: HistoryBook }) => {
    const isSelected = selectedIds.has(item.id);

    return (
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        layout={Layout.springify()}
      >
        <TouchableOpacity
          style={[styles.bookItem, isSelected && styles.bookItemSelected]}
          onPress={() => isSelecting ? handleToggleSelect(item.id) : null}
          onLongPress={() => handleLongPress(item.id)}
          activeOpacity={0.7}
        >
          {/* Selection checkbox */}
          {isSelecting && (
            <View style={styles.checkbox}>
              {isSelected ? (
                <Ionicons name="checkmark-circle" size={scale(24)} color={ACCENT} />
              ) : (
                <Ionicons name="ellipse-outline" size={scale(24)} color={colors.textSecondary} />
              )}
            </View>
          )}

          {/* Cover */}
          {item.coverUrl ? (
            <Image source={item.coverUrl} style={styles.cover} contentFit="cover" />
          ) : (
            <View style={[styles.cover, styles.coverPlaceholder]}>
              <Ionicons name="book" size={scale(20)} color="rgba(255,255,255,0.3)" />
            </View>
          )}

          {/* Info */}
          <View style={styles.bookInfo}>
            <Text style={styles.bookTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.bookAuthor} numberOfLines={1}>{item.authorName}</Text>
            {item.seriesName && (
              <Text style={styles.bookSeries} numberOfLines={1}>{item.seriesName}</Text>
            )}
          </View>

          {/* Meta */}
          <View style={styles.bookMeta}>
            <Text style={styles.bookDate}>{formatDate(item.markedAt)}</Text>
            {!item.synced && (
              <View style={styles.pendingBadge}>
                <Ionicons name="cloud-upload-outline" size={scale(12)} color={colors.textSecondary} />
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [isSelecting, selectedIds, handleToggleSelect, handleLongPress]);

  const totalCount = markedBooks.size;
  const syncedCount = Array.from(markedBooks.values()).filter((b) => b.synced).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Ionicons name="close" size={scale(28)} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Reading History</Text>
          <Text style={styles.headerSubtitle}>
            {totalCount} finished • {syncedCount} synced
          </Text>
        </View>

        {isSelecting ? (
          <TouchableOpacity style={styles.headerAction} onPress={handleCancelSelection}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerAction} />
        )}
      </View>

      {/* Sort/Filter Bar */}
      <View style={styles.controlBar}>
        <View style={styles.sortButtons}>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'recent' && styles.sortButtonActive]}
            onPress={() => setSortBy('recent')}
          >
            <Text style={[styles.sortButtonText, sortBy === 'recent' && styles.sortButtonTextActive]}>
              Recent
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'title' && styles.sortButtonActive]}
            onPress={() => setSortBy('title')}
          >
            <Text style={[styles.sortButtonText, sortBy === 'title' && styles.sortButtonTextActive]}>
              Title
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'author' && styles.sortButtonActive]}
            onPress={() => setSortBy('author')}
          >
            <Text style={[styles.sortButtonText, sortBy === 'author' && styles.sortButtonTextActive]}>
              Author
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Selection Bar */}
      {isSelecting && (
        <Animated.View
          style={styles.selectionBar}
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
        >
          <TouchableOpacity style={styles.selectAllButton} onPress={handleSelectAll}>
            <Ionicons
              name={selectedIds.size === historyBooks.length ? 'checkbox' : 'square-outline'}
              size={scale(20)}
              color={colors.textPrimary}
            />
            <Text style={styles.selectAllText}>
              {selectedIds.size === historyBooks.length ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.removeButton, selectedIds.size === 0 && styles.removeButtonDisabled]}
            onPress={handleUnmarkSelected}
            disabled={selectedIds.size === 0}
          >
            <Ionicons name="trash-outline" size={scale(18)} color="#F44336" />
            <Text style={styles.removeButtonText}>
              Remove ({selectedIds.size})
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Book List */}
      {historyBooks.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="book-outline" size={scale(60)} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No Books Yet</Text>
          <Text style={styles.emptySubtitle}>
            Books you mark as finished will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={historyBooks}
          keyExtractor={(item) => item.id}
          renderItem={renderBook}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + spacing.lg },
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Hint */}
      {!isSelecting && historyBooks.length > 0 && (
        <View style={[styles.hint, { paddingBottom: insets.bottom + spacing.md }]}>
          <Text style={styles.hintText}>Long press to select and remove</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  closeButton: {
    width: scale(44),
    height: scale(44),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: scale(17),
    fontWeight: '600',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: scale(12),
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerAction: {
    width: scale(60),
    alignItems: 'flex-end',
  },
  cancelText: {
    fontSize: scale(15),
    color: ACCENT,
    fontWeight: '500',
  },
  controlBar: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  sortButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  sortButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: scale(14),
    backgroundColor: colors.backgroundSecondary,
  },
  sortButtonActive: {
    backgroundColor: `${ACCENT}20`,
    borderWidth: 1,
    borderColor: ACCENT,
  },
  sortButtonText: {
    fontSize: scale(13),
    color: colors.textSecondary,
  },
  sortButtonTextActive: {
    color: ACCENT,
    fontWeight: '600',
  },
  selectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  selectAllText: {
    fontSize: scale(14),
    color: colors.textPrimary,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: scale(14),
    backgroundColor: 'rgba(244, 67, 54, 0.15)',
  },
  removeButtonDisabled: {
    opacity: 0.4,
  },
  removeButtonText: {
    fontSize: scale(13),
    color: '#F44336',
    fontWeight: '500',
  },
  listContent: {
    paddingTop: spacing.sm,
  },
  bookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  bookItemSelected: {
    backgroundColor: `${ACCENT}10`,
  },
  checkbox: {
    marginRight: spacing.xs,
  },
  cover: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(6),
    backgroundColor: colors.backgroundSecondary,
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookInfo: {
    flex: 1,
  },
  bookTitle: {
    fontSize: scale(15),
    fontWeight: '600',
    color: colors.textPrimary,
  },
  bookAuthor: {
    fontSize: scale(13),
    color: colors.textSecondary,
    marginTop: 2,
  },
  bookSeries: {
    fontSize: scale(12),
    color: ACCENT,
    marginTop: 2,
    fontStyle: 'italic',
  },
  bookMeta: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  bookDate: {
    fontSize: scale(11),
    color: colors.textSecondary,
  },
  pendingBadge: {
    padding: 2,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  emptyTitle: {
    fontSize: scale(20),
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.lg,
  },
  emptySubtitle: {
    fontSize: scale(14),
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  hint: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: spacing.sm,
    backgroundColor: colors.backgroundPrimary,
  },
  hintText: {
    fontSize: scale(12),
    color: colors.textTertiary,
  },
});

export default ReadingHistoryScreen;
