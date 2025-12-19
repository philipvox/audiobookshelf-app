/**
 * src/features/reading-history-wizard/screens/ReadingHistoryScreen.tsx
 *
 * Redesigned reading history screen with:
 * - Stats summary header
 * - Sort pill filters
 * - Compact list items with duration
 * - Selection mode with footer
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
import {
  CheckCircle,
  Circle,
  Book,
  CloudCheck,
  CloudUpload,
  CheckSquare,
  Square,
  ArrowLeft,
  BookOpen,
} from 'lucide-react-native';
import { Image } from 'expo-image';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useGalleryStore } from '../stores/galleryStore';
import { useLibraryCache } from '@/core/cache/libraryCache';
import { getCoverUrl } from '@/core/cache';
import { LibraryItem } from '@/core/types';
import { wp, hp, moderateScale, spacing } from '@/shared/theme';

// =============================================================================
// COLORS (matching MarkBooksScreen)
// =============================================================================

const COLORS = {
  accent: '#F3B60C',
  accentDim: 'rgba(243, 182, 12, 0.15)',

  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textTertiary: 'rgba(255, 255, 255, 0.5)',
  textHint: 'rgba(255, 255, 255, 0.35)',

  surface: 'rgba(255, 255, 255, 0.05)',
  surfaceBorder: 'rgba(255, 255, 255, 0.08)',

  success: '#22C55E',
  danger: '#EF4444',

  background: '#0A0A0A',
};

// =============================================================================
// LAYOUT CONSTANTS
// =============================================================================

const LAYOUT = {
  HORIZONTAL_PADDING: wp(5.5),
  COVER_SIZE: wp(12),
  COVER_RADIUS: wp(12) * 0.125,
  CHECKBOX_SIZE: wp(5.5),
};

// =============================================================================
// TYPES
// =============================================================================

interface HistoryBook {
  id: string;
  title: string;
  authorName: string;
  seriesName?: string;
  duration: number;
  coverUrl: string | null;
  markedAt: number;
  synced: boolean;
}

type SortOption = 'recent' | 'title' | 'author' | 'duration';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

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

function getSeriesSequence(item: LibraryItem): string {
  const name = getMetadata(item).seriesName || '';
  const match = name.match(/#([\d.]+)$/);
  return match ? match[1] : '';
}

function getDuration(item: LibraryItem): number {
  return (item.media as any)?.duration || 0;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatTotalHours(seconds: number): string {
  const hours = Math.round(seconds / 3600);
  return `~${hours} hours`;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// =============================================================================
// SORT PILLS COMPONENT
// =============================================================================

interface SortPillsProps {
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
}

function SortPills({ sortBy, onSortChange }: SortPillsProps) {
  const options: { key: SortOption; label: string }[] = [
    { key: 'recent', label: 'Recent' },
    { key: 'title', label: 'Title' },
    { key: 'author', label: 'Author' },
    { key: 'duration', label: 'Duration' },
  ];

  return (
    <View style={styles.sortContainer}>
      {options.map((option) => {
        const isActive = sortBy === option.key;
        return (
          <TouchableOpacity
            key={option.key}
            style={[styles.sortPill, isActive && styles.sortPillActive]}
            onPress={() => {
              Haptics.selectionAsync();
              onSortChange(option.key);
            }}
          >
            <Text style={[styles.sortPillText, isActive && styles.sortPillTextActive]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// =============================================================================
// STATS SUMMARY COMPONENT
// =============================================================================

interface StatsSummaryProps {
  totalBooks: number;
  totalDuration: number;
  syncedCount: number;
}

function StatsSummary({ totalBooks, totalDuration, syncedCount }: StatsSummaryProps) {
  return (
    <View style={styles.statsContainer}>
      <Text style={styles.statsPrimary}>
        {totalBooks} books finished • {formatTotalHours(totalDuration)}
      </Text>
      <Text style={styles.statsSecondary}>
        {syncedCount} synced to server
      </Text>
    </View>
  );
}

// =============================================================================
// LIST ITEM COMPONENT
// =============================================================================

interface HistoryListItemProps {
  book: HistoryBook;
  isSelecting: boolean;
  isSelected: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

function HistoryListItem({
  book,
  isSelecting,
  isSelected,
  onPress,
  onLongPress,
}: HistoryListItemProps) {
  const seriesInfo = book.seriesName
    ? `${book.seriesName} • ${formatDuration(book.duration)}`
    : formatDuration(book.duration);

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      layout={Layout.springify()}
    >
      <TouchableOpacity
        style={[styles.listItem, isSelected && styles.listItemSelected]}
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.7}
      >
        {/* Selection checkbox */}
        {isSelecting && (
          <View style={styles.checkboxContainer}>
            {isSelected ? (
              <CheckCircle size={LAYOUT.CHECKBOX_SIZE} color={COLORS.accent} strokeWidth={2} />
            ) : (
              <Circle size={LAYOUT.CHECKBOX_SIZE} color={COLORS.textTertiary} strokeWidth={2} />
            )}
          </View>
        )}

        {/* Cover */}
        {book.coverUrl ? (
          <Image source={book.coverUrl} style={styles.listCover} contentFit="cover" />
        ) : (
          <View style={[styles.listCover, styles.listCoverPlaceholder]}>
            <Book size={wp(5)} color="rgba(255,255,255,0.3)" strokeWidth={1.5} />
          </View>
        )}

        {/* Info */}
        <View style={styles.listInfo}>
          <Text style={styles.listTitle} numberOfLines={1}>
            {book.title}
          </Text>
          <Text style={styles.listSubtitle} numberOfLines={1}>
            {book.authorName}
          </Text>
          <Text style={styles.listMeta} numberOfLines={1}>
            {seriesInfo}
          </Text>
        </View>

        {/* Date & Sync */}
        <View style={styles.listRight}>
          <Text style={styles.listDate}>{formatDate(book.markedAt)}</Text>
          {book.synced ? (
            <CloudCheck size={wp(4)} color={COLORS.success} strokeWidth={2} />
          ) : (
            <CloudUpload size={wp(4)} color={COLORS.textTertiary} strokeWidth={2} />
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// =============================================================================
// SELECTION FOOTER COMPONENT
// =============================================================================

interface SelectionFooterProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onCancel: () => void;
  onRemove: () => void;
}

function SelectionFooter({
  selectedCount,
  totalCount,
  onSelectAll,
  onCancel,
  onRemove,
}: SelectionFooterProps) {
  const allSelected = selectedCount === totalCount && totalCount > 0;

  return (
    <Animated.View
      style={styles.selectionFooter}
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
    >
      <View style={styles.selectionFooterLeft}>
        <TouchableOpacity style={styles.selectAllButton} onPress={onSelectAll}>
          {allSelected ? (
            <CheckSquare size={wp(5)} color={COLORS.textPrimary} strokeWidth={2} />
          ) : (
            <Square size={wp(5)} color={COLORS.textPrimary} strokeWidth={2} />
          )}
        </TouchableOpacity>
        <Text style={styles.selectionCount}>{selectedCount} selected</Text>
      </View>

      <View style={styles.selectionFooterRight}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.removeButton, selectedCount === 0 && styles.removeButtonDisabled]}
          onPress={onRemove}
          disabled={selectedCount === 0}
        >
          <Text style={styles.removeButtonText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// =============================================================================
// MAIN SCREEN COMPONENT
// =============================================================================

export function ReadingHistoryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  // Store
  const markedBooks = useGalleryStore((s) => s.markedBooks);
  const unmarkBook = useGalleryStore((s) => s.unmarkBook);
  const items = useLibraryCache((s) => s.items);

  // UI State
  const [sortBy, setSortBy] = useState<SortOption>('recent');
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
          duration: getDuration(item),
          coverUrl: getCoverUrl(bookId),
          markedAt: marked.markedAt,
          synced: marked.synced,
        });
      }
    });

    // Sort
    switch (sortBy) {
      case 'recent':
        books.sort((a, b) => b.markedAt - a.markedAt);
        break;
      case 'title':
        books.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'author':
        books.sort((a, b) => a.authorName.localeCompare(b.authorName));
        break;
      case 'duration':
        books.sort((a, b) => b.duration - a.duration);
        break;
    }

    return books;
  }, [markedBooks, items, sortBy]);

  // Stats
  const stats = useMemo(() => {
    let totalDuration = 0;
    let syncedCount = 0;

    markedBooks.forEach((marked, bookId) => {
      const item = items.find((i) => i.id === bookId);
      if (item) {
        totalDuration += getDuration(item);
        if (marked.synced) syncedCount++;
      }
    });

    return {
      totalBooks: markedBooks.size,
      totalDuration,
      syncedCount,
    };
  }, [markedBooks, items]);

  // Handlers
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsSelecting(true);
    setSelectedIds(new Set([bookId]));
  }, []);

  const handleCancelSelection = useCallback(() => {
    setIsSelecting(false);
    setSelectedIds(new Set());
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === historyBooks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(historyBooks.map((b) => b.id)));
    }
  }, [selectedIds.size, historyBooks]);

  const handleRemoveSelected = useCallback(() => {
    if (selectedIds.size === 0) return;

    Alert.alert(
      'Remove from History',
      `Remove ${selectedIds.size} book${selectedIds.size > 1 ? 's' : ''} from your reading history?`,
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

  const handleItemPress = useCallback((bookId: string) => {
    if (isSelecting) {
      handleToggleSelect(bookId);
    }
  }, [isSelecting, handleToggleSelect]);

  const renderItem = useCallback(({ item }: { item: HistoryBook }) => (
    <HistoryListItem
      book={item}
      isSelecting={isSelecting}
      isSelected={selectedIds.has(item.id)}
      onPress={() => handleItemPress(item.id)}
      onLongPress={() => handleLongPress(item.id)}
    />
  ), [isSelecting, selectedIds, handleItemPress, handleLongPress]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={handleClose}>
          <ArrowLeft size={moderateScale(22)} color={COLORS.textPrimary} strokeWidth={2} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Reading History</Text>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => {
            if (!isSelecting && historyBooks.length > 0) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setIsSelecting(true);
            }
          }}
        >
          {!isSelecting && historyBooks.length > 0 && (
            <Text style={styles.selectLink}>Select</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Stats Summary */}
      {stats.totalBooks > 0 && (
        <StatsSummary
          totalBooks={stats.totalBooks}
          totalDuration={stats.totalDuration}
          syncedCount={stats.syncedCount}
        />
      )}

      {/* Sort Pills */}
      {historyBooks.length > 0 && (
        <SortPills sortBy={sortBy} onSortChange={setSortBy} />
      )}

      {/* Book List */}
      {historyBooks.length === 0 ? (
        <View style={styles.emptyState}>
          <BookOpen size={wp(15)} color={COLORS.textTertiary} strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>No Books Yet</Text>
          <Text style={styles.emptySubtitle}>
            Books you mark as finished will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={historyBooks}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: isSelecting ? hp(12) : insets.bottom + spacing.lg },
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Selection Footer */}
      {isSelecting && (
        <View style={[styles.selectionFooterWrapper, { paddingBottom: insets.bottom }]}>
          <SelectionFooter
            selectedCount={selectedIds.size}
            totalCount={historyBooks.length}
            onSelectAll={handleSelectAll}
            onCancel={handleCancelSelection}
            onRemove={handleRemoveSelected}
          />
        </View>
      )}
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.HORIZONTAL_PADDING,
    height: hp(6),
  },
  headerButton: {
    width: wp(12),
    height: wp(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: moderateScale(17),
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  selectLink: {
    fontSize: moderateScale(14),
    fontWeight: '500',
    color: COLORS.accent,
  },

  // Stats Summary
  statsContainer: {
    paddingHorizontal: LAYOUT.HORIZONTAL_PADDING,
    paddingVertical: hp(1.5),
    backgroundColor: COLORS.surface,
    marginHorizontal: LAYOUT.HORIZONTAL_PADDING,
    marginTop: hp(1),
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  statsPrimary: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  statsSecondary: {
    fontSize: moderateScale(12),
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: wp(0.5),
  },

  // Sort Pills
  sortContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: wp(2),
    paddingHorizontal: LAYOUT.HORIZONTAL_PADDING,
    paddingVertical: hp(1.5),
  },
  sortPill: {
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
    borderRadius: hp(1.5),
    backgroundColor: COLORS.surface,
  },
  sortPillActive: {
    backgroundColor: COLORS.accent,
  },
  sortPillText: {
    fontSize: moderateScale(12),
    fontWeight: '500',
    color: COLORS.textTertiary,
  },
  sortPillTextActive: {
    fontWeight: '600',
    color: '#000000',
  },

  // List
  listContent: {
    paddingTop: hp(1),
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.HORIZONTAL_PADDING,
    paddingVertical: hp(1.2),
    gap: wp(3),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
  },
  listItemSelected: {
    backgroundColor: COLORS.accentDim,
  },
  checkboxContainer: {
    marginRight: wp(1),
  },
  listCover: {
    width: LAYOUT.COVER_SIZE,
    height: LAYOUT.COVER_SIZE,
    borderRadius: LAYOUT.COVER_RADIUS,
    backgroundColor: COLORS.surface,
  },
  listCoverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  listInfo: {
    flex: 1,
    gap: wp(0.5),
  },
  listTitle: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  listSubtitle: {
    fontSize: moderateScale(12),
    color: COLORS.textSecondary,
  },
  listMeta: {
    fontSize: moderateScale(11),
    color: COLORS.textTertiary,
  },
  listRight: {
    alignItems: 'flex-end',
    gap: wp(1),
  },
  listDate: {
    fontSize: moderateScale(11),
    color: COLORS.textSecondary,
  },

  // Selection Footer
  selectionFooterWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
  },
  selectionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.HORIZONTAL_PADDING,
    paddingVertical: hp(1.5),
  },
  selectionFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  selectAllButton: {
    padding: wp(1),
  },
  selectionCount: {
    fontSize: moderateScale(14),
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  selectionFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
  },
  cancelButton: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
  },
  cancelButtonText: {
    fontSize: moderateScale(14),
    color: COLORS.textSecondary,
  },
  removeButton: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    backgroundColor: COLORS.danger,
    borderRadius: wp(2),
  },
  removeButtonDisabled: {
    opacity: 0.4,
  },
  removeButtonText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: wp(8),
  },
  emptyTitle: {
    fontSize: moderateScale(20),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: hp(2),
  },
  emptySubtitle: {
    fontSize: moderateScale(14),
    color: COLORS.textSecondary,
    marginTop: hp(1),
    textAlign: 'center',
  },
});

export default ReadingHistoryScreen;
