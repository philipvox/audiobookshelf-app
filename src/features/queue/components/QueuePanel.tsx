/**
 * src/features/queue/components/QueuePanel.tsx
 *
 * Queue panel with editorial design - Now Playing and Up Next list.
 * Features drag-and-drop reordering, move up/down controls, and shuffle.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { useCoverUrl } from '@/core/cache';
import { LibraryItem, BookMedia, BookMetadata } from '@/core/types';
import { usePlayerStore } from '@/features/player/stores';
import { useCurrentChapter, useTimeRemaining } from '@/features/player/stores/playerSelectors';
import { scale } from '@/shared/theme';
import {
  secretLibraryColors as colors,
  secretLibraryFonts as fonts,
} from '@/shared/theme/secretLibrary';
import {
  useQueueStore,
  useQueue,
  QueueBook,
} from '../stores/queueStore';

// Type guard for FULL book media with audioFiles (needed for chapters)
function isBookMedia(media: LibraryItem['media'] | undefined): media is BookMedia {
  return media !== undefined && 'audioFiles' in media && Array.isArray(media.audioFiles);
}

// Helper to get book metadata safely
// Note: Does NOT require audioFiles - works with cache items that only have metadata
function getBookMetadata(book: LibraryItem | null | undefined): BookMetadata | null {
  if (!book?.media?.metadata) return null;
  // This app only handles books, so metadata is always BookMetadata
  if (book.mediaType !== 'book') return null;
  return book.media.metadata as BookMetadata;
}

// Helper to get book duration safely
// Note: Does NOT require audioFiles - works with cache items that only have duration
function getBookDuration(book: LibraryItem | null | undefined): number {
  return book?.media?.duration || 0;
}

// Helper to get chapter count
// Note: Chapters require full book data (not available in cache items)
function getChapterCount(book: LibraryItem | null | undefined): number {
  if (!book?.media || !isBookMedia(book.media)) return 0;
  return book.media.chapters?.length || 0;
}

// =============================================================================
// ICONS
// =============================================================================

const ChevronDownIcon = ({ color = colors.black, size = 14 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
    <Path d="M6 9l6 6 6-6" />
  </Svg>
);

const ChevronUpIcon = ({ color = colors.black, size = 12 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
    <Path d="M5 15l7-7 7 7" />
  </Svg>
);

const CloseIcon = ({ color = colors.black, size = 12 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
    <Path d="M18 6L6 18M6 6l12 12" />
  </Svg>
);

const PlusIcon = ({ color = colors.black, size = 14 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
    <Path d="M12 5v14M5 12h14" />
  </Svg>
);

const ShuffleIcon = ({ color = colors.black, size = 14 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
    <Path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
  </Svg>
);

const LayersIcon = ({ color = colors.gray, size = 48 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
    <Path d="M12 2L2 7l10 5 10-5-10-5z" />
    <Path d="M2 17l10 5 10-5" />
    <Path d="M2 12l10 5 10-5" />
  </Svg>
);

// =============================================================================
// TYPES
// =============================================================================

interface QueuePanelProps {
  onClose: () => void;
  maxHeight?: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function formatTimeRemaining(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `-${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `-${mins}:${String(secs).padStart(2, '0')}`;
}

function getBookInitials(title: string): string {
  return title
    .split(' ')
    .slice(0, 3)
    .map(word => word[0]?.toUpperCase() || '')
    .join('');
}

// Color palette for book covers
const COVER_COLORS = [colors.orange, colors.coral, colors.purple, colors.green, colors.olive, colors.blue];

function getCoverColor(bookId: string): string {
  let hash = 0;
  for (let i = 0; i < bookId.length; i++) {
    hash = bookId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COVER_COLORS[Math.abs(hash) % COVER_COLORS.length];
}

// =============================================================================
// COMPONENTS
// =============================================================================

// Book cover component with fallback initials
function BookCover({
  bookId,
  title,
  size = 56
}: {
  bookId: string;
  title: string;
  size?: number;
}) {
  const coverUrl = useCoverUrl(bookId);
  const [imageError, setImageError] = useState(false);
  const initials = getBookInitials(title);
  const bgColor = getCoverColor(bookId);

  if (!coverUrl || imageError) {
    return (
      <View style={[styles.coverFallback, { width: size, height: size, backgroundColor: bgColor }]}>
        <Text style={styles.coverInitials}>{initials}</Text>
      </View>
    );
  }

  return (
    <Image
      source={coverUrl}
      style={{ width: size, height: size }}
      contentFit="cover"
      onError={() => setImageError(true)}
    />
  );
}

// Now Playing section
function NowPlayingSection() {
  const currentBook = usePlayerStore((s) => s.currentBook);
  const chapters = usePlayerStore((s) => s.chapters);
  const currentChapter = useCurrentChapter();
  const timeRemaining = useTimeRemaining();

  if (!currentBook) return null;

  const metadata = getBookMetadata(currentBook);
  const title = metadata?.title || 'Untitled';
  const chapterTitle = currentChapter?.title || `Chapter ${chapters.findIndex(c => c === currentChapter) + 1}`;

  return (
    <View style={styles.nowPlaying}>
      <BookCover bookId={currentBook.id} title={title} size={scale(56)} />
      <View style={styles.nowPlayingInfo}>
        <Text style={styles.nowPlayingLabel}>Now Playing</Text>
        <Text style={styles.nowPlayingTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.nowPlayingChapter} numberOfLines={1}>{chapterTitle}</Text>
      </View>
      <View style={styles.nowPlayingTime}>
        <Text style={styles.nowPlayingTimeValue}>{formatTimeRemaining(timeRemaining)}</Text>
        <Text style={styles.nowPlayingTimeLabel}>remaining</Text>
      </View>
    </View>
  );
}

// NOTE: ChaptersAccordion removed - chapters are already visible in the player's chapters sheet

// Up Next expanded book (first in queue)
function UpNextExpandedBook({
  item,
  onMoveUp,
  onRemove
}: {
  item: QueueBook;
  onMoveUp: () => void;
  onRemove: () => void;
}) {
  const metadata = getBookMetadata(item.book);
  const title = metadata?.title || 'Untitled';
  const author = metadata?.authorName || metadata?.authors?.[0]?.name || 'Unknown Author';
  const duration = getBookDuration(item.book) || 0;
  const chapters = getChapterCount(item.book);

  return (
    <View style={styles.upNextBook}>
      <BookCover bookId={item.book.id} title={title} size={scale(64)} />
      <View style={styles.upNextInfo}>
        <Text style={styles.upNextTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.upNextAuthor} numberOfLines={1}>{author}</Text>
        <Text style={styles.upNextMeta}>
          {formatDuration(duration)} {chapters > 0 ? `· ${chapters} chapters` : ''}
        </Text>
      </View>
      <View style={styles.upNextActions}>
        <TouchableOpacity
          style={styles.upNextBtn}
          onPress={onMoveUp}
          activeOpacity={0.7}
        >
          <ChevronUpIcon color={colors.black} size={scale(12)} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.upNextBtn}
          onPress={onRemove}
          activeOpacity={0.7}
        >
          <CloseIcon color={colors.black} size={scale(12)} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Compact queue item (remaining queue items) with move controls
function QueueItem({
  item,
  index,
  drag,
  isActive,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast
}: {
  item: QueueBook;
  index: number;
  drag: () => void;
  isActive: boolean;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const metadata = getBookMetadata(item.book);
  const title = metadata?.title || 'Untitled';
  const author = metadata?.authorName || metadata?.authors?.[0]?.name || 'Unknown Author';
  const duration = getBookDuration(item.book) || 0;

  const handleDrag = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    drag();
  }, [drag]);

  const handleMoveUp = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onMoveUp();
  }, [onMoveUp]);

  const handleMoveDown = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onMoveDown();
  }, [onMoveDown]);

  return (
    <ScaleDecorator>
      <View style={[styles.queueItem, isActive && styles.queueItemActive]}>
        <Text style={styles.queueItemNumber}>{index + 2}</Text>
        <BookCover bookId={item.book.id} title={title} size={scale(44)} />
        <View style={styles.queueItemInfo}>
          <Text style={styles.queueItemTitle} numberOfLines={1}>{title}</Text>
          <Text style={styles.queueItemMeta} numberOfLines={1}>
            {author} · {formatDuration(duration)}
          </Text>
        </View>
        <View style={styles.queueItemControls}>
          {/* Move up button */}
          <TouchableOpacity
            style={[styles.moveBtn, isFirst && styles.moveBtnDisabled]}
            onPress={handleMoveUp}
            disabled={isFirst}
            activeOpacity={0.7}
          >
            <ChevronUpIcon color={isFirst ? colors.grayLine : colors.black} size={scale(10)} />
          </TouchableOpacity>
          {/* Move down button */}
          <TouchableOpacity
            style={[styles.moveBtn, isLast && styles.moveBtnDisabled]}
            onPress={handleMoveDown}
            disabled={isLast}
            activeOpacity={0.7}
          >
            <ChevronDownIcon color={isLast ? colors.grayLine : colors.black} size={scale(10)} />
          </TouchableOpacity>
          {/* Remove button */}
          <TouchableOpacity
            style={styles.moveBtn}
            onPress={onRemove}
            activeOpacity={0.7}
          >
            <CloseIcon color={colors.black} size={scale(10)} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.queueItemHandle}
          onLongPress={handleDrag}
          delayLongPress={150}
        >
          <View style={styles.handleLine} />
          <View style={styles.handleLine} />
          <View style={styles.handleLine} />
        </TouchableOpacity>
      </View>
    </ScaleDecorator>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function QueuePanel({ onClose }: QueuePanelProps) {
  const navigation = useNavigation<any>();
  const queue = useQueue();
  const reorderQueue = useQueueStore((s) => s.reorderQueue);
  const removeFromQueue = useQueueStore((s) => s.removeFromQueue);
  const clearQueue = useQueueStore((s) => s.clearQueue);

  // Calculate total duration
  const totalDuration = queue.reduce((acc, item) => {
    return acc + (getBookDuration(item.book) || 0);
  }, 0);

  const handleDragEnd = useCallback(
    ({ from, to }: { from: number; to: number }) => {
      // Offset by 1 since first item is rendered separately
      const actualFrom = from + 1;
      const actualTo = to + 1;
      if (actualFrom !== actualTo) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        reorderQueue(actualFrom, actualTo);
      }
    },
    [reorderQueue]
  );

  const handleRemove = useCallback((bookId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    removeFromQueue(bookId);
  }, [removeFromQueue]);

  const handleMoveToTop = useCallback((fromIndex: number) => {
    if (fromIndex > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      reorderQueue(fromIndex, 0);
    }
  }, [reorderQueue]);

  const handleClearQueue = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    clearQueue();
  }, [clearQueue]);

  const handleShuffle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Shuffle queue implementation
    const shuffled = [...queue].sort(() => Math.random() - 0.5);
    shuffled.forEach((item, index) => {
      const currentIndex = queue.findIndex(q => q.id === item.id);
      if (currentIndex !== index) {
        reorderQueue(currentIndex, index);
      }
    });
  }, [queue, reorderQueue]);

  const handleAddBook = useCallback(() => {
    onClose();
    setTimeout(() => {
      navigation.navigate('Main', { screen: 'HomeTab' });
    }, 200);
  }, [onClose, navigation]);

  // First item in queue (expanded view)
  const firstQueueItem = queue[0];
  // Remaining items in queue (compact list)
  const remainingQueue = queue.slice(1);

  const handleMoveDown = useCallback((fromIndex: number) => {
    if (fromIndex < remainingQueue.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Offset by 1 since first item is rendered separately
      reorderQueue(fromIndex + 1, fromIndex + 2);
    }
  }, [remainingQueue.length, reorderQueue]);

  const renderQueueItem = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<QueueBook>) => {
      const index = getIndex() ?? 0;
      return (
        <QueueItem
          item={item}
          index={index}
          drag={drag}
          isActive={isActive}
          onRemove={() => handleRemove(item.bookId)}
          onMoveUp={() => handleMoveToTop(index + 1)}
          onMoveDown={() => handleMoveDown(index)}
          isFirst={index === 0}
          isLast={index === remainingQueue.length - 1}
        />
      );
    },
    [handleRemove, handleMoveToTop, handleMoveDown, remainingQueue.length]
  );

  const keyExtractor = useCallback((item: QueueBook) => item.id, []);

  // Empty state
  if (queue.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <Text style={styles.title}>Queue</Text>
          <Text style={styles.subtitle}>Empty</Text>
        </View>

        {/* Now Playing */}
        <NowPlayingSection />

        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.emptyContainer}>
            <LayersIcon color={colors.grayLine} size={scale(48)} />
            <Text style={styles.emptyText}>Your queue is empty</Text>
            <Text style={styles.emptySubtext}>Add audiobooks to play them next</Text>
          </View>
        </ScrollView>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleAddBook}
              activeOpacity={0.7}
            >
              <PlusIcon color={colors.black} size={scale(14)} />
              <Text style={styles.actionButtonText}>Add Book</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.handle} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Queue</Text>
        <Text style={styles.subtitle}>
          {queue.length} {queue.length === 1 ? 'book' : 'books'} · {formatDuration(totalDuration)}
        </Text>
      </View>

      {/* Now Playing */}
      <NowPlayingSection />

      {/* Scrollable Content */}
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Up Next Section */}
        <View style={styles.queueSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Up Next</Text>
            <TouchableOpacity onPress={handleClearQueue}>
              <Text style={styles.sectionAction}>Clear</Text>
            </TouchableOpacity>
          </View>

          {/* First book - expanded */}
          {firstQueueItem && (
            <UpNextExpandedBook
              item={firstQueueItem}
              onMoveUp={() => {}} // Already first
              onRemove={() => handleRemove(firstQueueItem.bookId)}
            />
          )}

          {/* Remaining books - compact draggable list */}
          {remainingQueue.length > 0 && (
            <DraggableFlatList
              data={remainingQueue}
              renderItem={renderQueueItem}
              keyExtractor={keyExtractor}
              onDragEnd={handleDragEnd}
              showsVerticalScrollIndicator={false}
              activationDistance={10}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleAddBook}
            activeOpacity={0.7}
          >
            <PlusIcon color={colors.black} size={scale(14)} />
            <Text style={styles.actionButtonText}>Add Book</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleShuffle}
            activeOpacity={0.7}
          >
            <ShuffleIcon color={colors.black} size={scale(14)} />
            <Text style={styles.actionButtonText}>Shuffle</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.creamGray,
  },
  handle: {
    width: scale(36),
    height: scale(4),
    backgroundColor: colors.grayLine,
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
    borderBottomColor: colors.black,
  },
  title: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    fontSize: scale(28),
    fontWeight: '400',
    color: colors.black,
  },
  subtitle: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: scale(11),
    color: colors.gray,
  },

  // Now Playing
  nowPlaying: {
    marginHorizontal: scale(28),
    marginBottom: scale(20),
    padding: scale(16),
    backgroundColor: colors.black,
    flexDirection: 'row',
    gap: scale(14),
  },
  nowPlayingInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nowPlayingLabel: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: scale(9),
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: scale(4),
  },
  nowPlayingTitle: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    fontSize: scale(16),
    color: colors.white,
    marginBottom: scale(2),
  },
  nowPlayingChapter: {
    fontSize: scale(12),
    color: 'rgba(255,255,255,0.7)',
  },
  nowPlayingTime: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  nowPlayingTimeValue: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: scale(11),
    color: 'rgba(255,255,255,0.5)',
  },
  nowPlayingTimeLabel: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: scale(9),
    color: 'rgba(255,255,255,0.35)',
  },

  // Scroll Content
  scrollContent: {
    maxHeight: scale(350),
    paddingHorizontal: scale(28),
  },

  // Queue Section
  queueSection: {
    marginBottom: scale(24),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  sectionTitle: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: scale(10),
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.gray,
  },
  sectionAction: {
    fontSize: scale(11),
    fontWeight: '500',
    color: colors.black,
    textDecorationLine: 'underline',
  },

  // Up Next Expanded Book
  upNextBook: {
    flexDirection: 'row',
    gap: scale(14),
    padding: scale(16),
    backgroundColor: colors.grayLight,
    marginBottom: scale(12),
  },
  upNextInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  upNextTitle: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    fontSize: scale(16),
    color: colors.black,
    marginBottom: scale(2),
  },
  upNextAuthor: {
    fontSize: scale(12),
    color: colors.gray,
    marginBottom: scale(6),
  },
  upNextMeta: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: scale(10),
    color: colors.gray,
  },
  upNextActions: {
    flexDirection: 'column',
    gap: scale(4),
  },
  upNextBtn: {
    width: scale(28),
    height: scale(28),
    borderWidth: 1,
    borderColor: colors.grayLine,
    backgroundColor: colors.grayLight,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Queue Item (compact)
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: colors.grayLine,
  },
  queueItemActive: {
    backgroundColor: colors.grayLight,
  },
  queueItemNumber: {
    width: scale(24),
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: scale(11),
    color: colors.gray,
    textAlign: 'center',
  },
  queueItemInfo: {
    flex: 1,
  },
  queueItemTitle: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    fontSize: scale(14),
    color: colors.black,
    marginBottom: scale(2),
  },
  queueItemMeta: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: scale(11),
    color: colors.gray,
  },
  queueItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    marginRight: scale(8),
  },
  moveBtn: {
    width: scale(24),
    height: scale(24),
    borderWidth: 1,
    borderColor: colors.grayLine,
    backgroundColor: colors.grayLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moveBtnDisabled: {
    opacity: 0.3,
  },
  queueItemHandle: {
    width: scale(20),
    paddingVertical: scale(8),
    alignItems: 'center',
    gap: scale(2),
  },
  handleLine: {
    width: scale(12),
    height: scale(2),
    backgroundColor: colors.grayLine,
    borderRadius: scale(1),
  },

  // Cover Fallback
  coverFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverInitials: {
    fontSize: scale(14),
    fontWeight: '800',
    color: 'rgba(255,255,255,0.15)',
    letterSpacing: -1,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: scale(48),
  },
  emptyText: {
    fontSize: scale(17),
    fontWeight: '600',
    color: colors.black,
    marginTop: scale(20),
  },
  emptySubtext: {
    fontSize: scale(14),
    color: colors.gray,
    marginTop: scale(8),
  },

  // Bottom Actions
  bottomActions: {
    paddingHorizontal: scale(28),
    paddingVertical: scale(16),
    paddingBottom: scale(24),
    borderTopWidth: 1,
    borderTopColor: colors.grayLine,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: scale(8),
  },
  actionButton: {
    flex: 1,
    height: scale(44),
    borderWidth: 1,
    borderColor: colors.grayLine,
    backgroundColor: colors.grayLight,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: scale(8),
  },
  actionButtonText: {
    fontSize: scale(12),
    fontWeight: '500',
    color: colors.black,
  },
});

export default QueuePanel;
