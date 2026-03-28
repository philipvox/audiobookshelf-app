/**
 * src/features/player/sheets/BookmarksSheet.tsx
 *
 * Bookmarks panel - Dark editorial design with filter tabs, bookmark types, and notes.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  FlatList,
  Share,
  Alert,
  Clipboard,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { haptics } from '@/core/native/haptics';
import { scale } from '@/shared/theme';
import type { Bookmark } from '../stores/bookmarksStore';

// Dark theme colors
const dark = {
  bg: '#1a1a1a',
  surface: '#252525',
  surfaceLight: '#2f2f2f',
  border: 'rgba(255,255,255,0.12)',
  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.5)',
  accent: '#FFFFFF',
  danger: '#FF4D4D',
  dangerBg: 'rgba(255,77,77,0.15)',
  noteBg: 'rgba(76,175,80,0.15)',
  noteText: '#81C784',
  handle: 'rgba(255,255,255,0.3)',
};

// =============================================================================
// ICONS
// =============================================================================

const BookmarkIcon = ({ color = dark.text, size = 14 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
    <Path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </Svg>
);

const NoteIcon = ({ color = dark.text, size = 14 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
    <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <Path d="M14 2v6h6" />
    <Path d="M16 13H8M16 17H8M10 9H8" />
  </Svg>
);

const PlayIcon = ({ color = dark.text, size = 12 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
    <Path d="M5 3l14 9-14 9V3z" fill="none" />
  </Svg>
);

const EditIcon = ({ color = dark.text, size = 12 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
    <Path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </Svg>
);

const DeleteIcon = ({ color = dark.danger, size = 12 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
    <Path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </Svg>
);

const ExportIcon = ({ color = dark.text, size = 14 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
    <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <Path d="M17 8l-5-5-5 5" />
    <Path d="M12 3v12" />
  </Svg>
);

const PlusIcon = ({ color = dark.bg, size = 14 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M12 5v14M5 12h14" />
  </Svg>
);

// =============================================================================
// TYPES
// =============================================================================

type BookmarkType = 'all' | 'bookmark' | 'note';

interface BookmarksSheetProps {
  bookmarks: Bookmark[];
  bookTitle?: string;
  onClose: () => void;
  onSeekTo: (time: number) => void;
  onEditBookmark?: (bookmark: Bookmark) => void;
  onDeleteBookmark?: (bookmark: Bookmark) => void;
  onAddBookmark?: () => void;
  onAddBookmarkWithDetails?: () => void;
}

// =============================================================================
// HELPERS
// =============================================================================

function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatDate(timestamp: number | Date | string): string {
  const d = typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `Added ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function generateExportText(bookmarks: Bookmark[], bookTitle?: string): string {
  const lines: string[] = [];

  if (bookTitle) {
    lines.push(`Bookmarks for "${bookTitle}"`);
    lines.push('='.repeat(40));
    lines.push('');
  }

  const sorted = [...bookmarks].sort((a, b) => a.time - b.time);

  sorted.forEach((bookmark, index) => {
    lines.push(`${index + 1}. ${formatTime(bookmark.time)}`);
    if (bookmark.chapterTitle) {
      lines.push(`   Chapter: ${bookmark.chapterTitle}`);
    }
    if (bookmark.note && bookmark.note.trim()) {
      lines.push(`   Note: ${bookmark.note.trim()}`);
    }
    lines.push('');
  });

  lines.push(`Total: ${bookmarks.length} bookmark${bookmarks.length !== 1 ? 's' : ''}`);

  return lines.join('\n');
}

// =============================================================================
// COMPONENTS
// =============================================================================

function FilterTab({
  label,
  count,
  isActive,
  onPress,
}: {
  label: string;
  count: number;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.filterTab, isActive && styles.filterTabActive]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="tab"
      accessibilityLabel={`${label}, ${count}`}
      accessibilityState={{ selected: isActive }}
    >
      <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
        {label}
        <Text style={styles.filterTabCount}> {count}</Text>
      </Text>
    </TouchableOpacity>
  );
}

function BookmarkItem({
  bookmark,
  onPlay,
  onEdit,
  onDelete,
}: {
  bookmark: Bookmark;
  onPlay: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const hasNote = bookmark.note && bookmark.note.trim().length > 0;
  const iconBgStyle = hasNote ? styles.bookmarkIconNote : styles.bookmarkIconDefault;

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Bookmark',
      `Delete bookmark at ${formatTime(bookmark.time)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ]
    );
  }, [bookmark.time, onDelete]);

  return (
    <TouchableOpacity
      style={styles.bookmarkItem}
      onPress={onPlay}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`Bookmark at ${formatTime(bookmark.time)}, ${bookmark.chapterTitle || 'Unknown Chapter'}${hasNote ? `, note: ${bookmark.note}` : ''}`}
      accessibilityHint="Double tap to play from this bookmark"
    >
      <View style={styles.bookmarkHeader}>
        <View style={[styles.bookmarkIcon, iconBgStyle]} accessible={false}>
          {hasNote ? (
            <NoteIcon color={dark.noteText} size={14} />
          ) : (
            <BookmarkIcon color={dark.textSecondary} size={14} />
          )}
        </View>
        <View style={styles.bookmarkMeta}>
          <Text style={styles.bookmarkChapter} numberOfLines={1}>
            {bookmark.chapterTitle || 'Unknown Chapter'}
          </Text>
          <Text style={styles.bookmarkTimestamp}>{formatTime(bookmark.time)}</Text>
        </View>
        <View style={styles.bookmarkActions}>
          <TouchableOpacity
            style={styles.bookmarkActionBtn}
            onPress={onPlay}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Play from bookmark"
          >
            <PlayIcon color={dark.text} size={12} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bookmarkActionBtn}
            onPress={onEdit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Edit bookmark"
          >
            <EditIcon color={dark.text} size={12} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bookmarkActionBtn, styles.bookmarkDeleteBtn]}
            onPress={handleDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Delete bookmark"
          >
            <DeleteIcon color={dark.danger} size={12} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.bookmarkContent}>
        {hasNote && (
          <Text style={styles.bookmarkNote} numberOfLines={3}>
            {bookmark.note}
          </Text>
        )}
        <Text style={styles.bookmarkDate}>{formatDate(bookmark.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function BookmarksSheet({
  bookmarks,
  bookTitle,
  onClose,
  onSeekTo,
  onEditBookmark,
  onDeleteBookmark,
  onAddBookmark,
  onAddBookmarkWithDetails,
}: BookmarksSheetProps) {
  const [activeFilter, setActiveFilter] = useState<BookmarkType>('all');

  // Filter bookmarks
  const filteredBookmarks = useMemo(() => {
    if (activeFilter === 'all') return bookmarks;
    if (activeFilter === 'note') {
      return bookmarks.filter(b => b.note && b.note.trim().length > 0);
    }
    return bookmarks.filter(b => !b.note || b.note.trim().length === 0);
  }, [bookmarks, activeFilter]);

  // Count by type
  const counts = useMemo(() => {
    const notes = bookmarks.filter(b => b.note && b.note.trim().length > 0).length;
    return {
      all: bookmarks.length,
      bookmark: bookmarks.length - notes,
      note: notes,
    };
  }, [bookmarks]);

  const handlePlay = useCallback((bookmark: Bookmark) => {
    haptics.selection();
    onSeekTo(bookmark.time);
    onClose();
  }, [onSeekTo, onClose]);

  const handleEdit = useCallback((bookmark: Bookmark) => {
    haptics.selection();
    onEditBookmark?.(bookmark);
  }, [onEditBookmark]);

  const handleDelete = useCallback((bookmark: Bookmark) => {
    haptics.warning();
    onDeleteBookmark?.(bookmark);
  }, [onDeleteBookmark]);

  const handleAddBookmark = useCallback(() => {
    haptics.selection();
    // Use the detailed add if available, otherwise fall back to simple add
    if (onAddBookmarkWithDetails) {
      onAddBookmarkWithDetails();
    } else {
      onAddBookmark?.();
    }
  }, [onAddBookmark, onAddBookmarkWithDetails]);

  const renderBookmarkItem = useCallback(({ item }: { item: Bookmark }) => (
    <BookmarkItem
      bookmark={item}
      onPlay={() => handlePlay(item)}
      onEdit={() => handleEdit(item)}
      onDelete={() => handleDelete(item)}
    />
  ), [handlePlay, handleEdit, handleDelete]);

  const bookmarkKeyExtractor = useCallback((item: Bookmark) => item.id, []);

  const handleExport = useCallback(async () => {
    if (bookmarks.length === 0) {
      Alert.alert('No Bookmarks', 'There are no bookmarks to export.');
      return;
    }

    const exportText = generateExportText(bookmarks, bookTitle);

    haptics.selection();

    Alert.alert(
      'Export Bookmarks',
      `Export ${bookmarks.length} bookmark${bookmarks.length !== 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Copy to Clipboard',
          onPress: () => {
            Clipboard.setString(exportText);
            haptics.success();
            Alert.alert('Copied', 'Bookmarks copied to clipboard.');
          },
        },
        {
          text: 'Share',
          onPress: async () => {
            try {
              await Share.share({
                message: exportText,
                title: bookTitle ? `Bookmarks - ${bookTitle}` : 'Bookmarks',
              });
            } catch (error) {
              console.error('Share error:', error);
            }
          },
        },
      ]
    );
  }, [bookmarks, bookTitle]);

  // Empty state
  if (bookmarks.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <Text style={styles.title}>Bookmarks</Text>
          <Text style={styles.subtitle}>None saved</Text>
        </View>

        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <BookmarkIcon color={dark.textSecondary} size={28} />
          </View>
          <Text style={styles.emptyTitle}>No bookmarks yet</Text>
          <Text style={styles.emptyText}>
            Tap the button below to add a{'\n'}bookmark at the current position
          </Text>
        </View>

        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonPrimary]}
            onPress={handleAddBookmark}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Add Bookmark"
          >
            <PlusIcon color={dark.bg} size={14} />
            <Text style={styles.actionButtonTextPrimary}>Add Bookmark</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.handle} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Bookmarks</Text>
        <Text style={styles.subtitle}>{bookmarks.length} saved</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <FilterTab
          label="All"
          count={counts.all}
          isActive={activeFilter === 'all'}
          onPress={() => setActiveFilter('all')}
        />
        <FilterTab
          label="Bookmarks"
          count={counts.bookmark}
          isActive={activeFilter === 'bookmark'}
          onPress={() => setActiveFilter('bookmark')}
        />
        <FilterTab
          label="Notes"
          count={counts.note}
          isActive={activeFilter === 'note'}
          onPress={() => setActiveFilter('note')}
        />
      </View>

      {/* Bookmarks List */}
      <FlatList
        data={filteredBookmarks}
        keyExtractor={bookmarkKeyExtractor}
        renderItem={renderBookmarkItem}
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleExport}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Export bookmarks"
        >
          <ExportIcon color={dark.text} size={14} />
          <Text style={styles.actionButtonText}>Export</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonPrimary]}
          onPress={handleAddBookmark}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Add Bookmark"
        >
          <PlusIcon color={dark.bg} size={14} />
          <Text style={styles.actionButtonTextPrimary}>Add Bookmark</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: dark.bg,
    paddingBottom: scale(40),
  },
  handle: {
    width: scale(36),
    height: scale(4),
    backgroundColor: dark.handle,
    borderRadius: scale(2),
    alignSelf: 'center',
    marginTop: scale(12),
    marginBottom: scale(16),
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginHorizontal: scale(28),
    marginBottom: scale(16),
    paddingBottom: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: dark.border,
  },
  title: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    fontSize: scale(28),
    fontWeight: '400',
    color: dark.text,
  },
  subtitle: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: scale(11),
    color: dark.textSecondary,
  },

  // Filter Tabs
  filterTabs: {
    flexDirection: 'row',
    gap: scale(8),
    marginHorizontal: scale(28),
    marginBottom: scale(20),
  },
  filterTab: {
    height: scale(32),
    paddingHorizontal: scale(14),
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: dark.accent,
    borderColor: dark.accent,
  },
  filterTabText: {
    fontSize: scale(12),
    fontWeight: '500',
    color: dark.textSecondary,
  },
  filterTabTextActive: {
    color: dark.bg,
  },
  filterTabCount: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: scale(10),
    opacity: 0.6,
  },

  // Scroll Content
  scrollContent: {
    maxHeight: scale(350),
    paddingHorizontal: scale(28),
  },

  // Bookmark Item
  bookmarkItem: {
    paddingVertical: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: dark.border,
  },
  bookmarkHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(12),
    marginBottom: scale(8),
  },
  bookmarkIcon: {
    width: scale(28),
    height: scale(28),
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  bookmarkIconDefault: {
    backgroundColor: dark.surface,
  },
  bookmarkIconNote: {
    backgroundColor: dark.noteBg,
  },
  bookmarkMeta: {
    flex: 1,
    minWidth: 0,
  },
  bookmarkChapter: {
    fontSize: scale(11),
    color: dark.textSecondary,
    marginBottom: scale(2),
  },
  bookmarkTimestamp: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: scale(13),
    fontWeight: '500',
    color: dark.text,
  },
  bookmarkActions: {
    flexDirection: 'row',
    gap: scale(4),
    flexShrink: 0,
  },
  bookmarkActionBtn: {
    width: scale(28),
    height: scale(28),
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookmarkDeleteBtn: {
    borderColor: dark.dangerBg,
    backgroundColor: dark.dangerBg,
  },
  bookmarkContent: {
    marginLeft: scale(40),
  },
  bookmarkNote: {
    fontSize: scale(13),
    color: dark.text,
    lineHeight: scale(20),
    marginBottom: scale(8),
  },
  bookmarkDate: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: scale(10),
    color: dark.textSecondary,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: scale(48),
    paddingHorizontal: scale(40),
  },
  emptyIcon: {
    width: scale(64),
    height: scale(64),
    backgroundColor: dark.surface,
    borderRadius: scale(32),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(20),
  },
  emptyTitle: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    fontSize: scale(18),
    color: dark.text,
    marginBottom: scale(8),
  },
  emptyText: {
    fontSize: scale(13),
    color: dark.textSecondary,
    textAlign: 'center',
    lineHeight: scale(20),
  },

  // Bottom Actions
  bottomActions: {
    paddingHorizontal: scale(28),
    paddingTop: scale(16),
    borderTopWidth: 1,
    borderTopColor: dark.border,
    flexDirection: 'row',
    gap: scale(8),
  },
  actionButton: {
    flex: 1,
    height: scale(44),
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surface,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: scale(8),
  },
  actionButtonPrimary: {
    backgroundColor: dark.accent,
    borderColor: dark.accent,
  },
  actionButtonText: {
    fontSize: scale(12),
    fontWeight: '500',
    color: dark.text,
  },
  actionButtonTextPrimary: {
    fontSize: scale(12),
    fontWeight: '500',
    color: dark.bg,
  },
});

export default BookmarksSheet;
