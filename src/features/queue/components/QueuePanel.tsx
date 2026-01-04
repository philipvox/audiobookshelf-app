/**
 * src/features/queue/components/QueuePanel.tsx
 *
 * Draggable queue panel for use in player screens.
 * Features drag-and-drop reordering, remove, and autoplay toggle.
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Pressable,
} from 'react-native';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { Image } from 'expo-image';
import { Menu, ArrowUp, X, Layers, SkipForward } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { useCoverUrl } from '@/core/cache';
import { LibraryItem } from '@/core/types';
import { useTheme, scale, spacing, radius, layout, hp, lightColors } from '@/shared/theme';
import {
  useQueueStore,
  useQueue,
  useAutoplayEnabled,
  QueueBook,
} from '../stores/queueStore';

interface QueuePanelProps {
  onClose: () => void;
  maxHeight?: number;
}

// Draggable queue item
interface DraggableQueueItemProps {
  item: QueueBook;
  drag: () => void;
  isActive: boolean;
  onRemove: () => void;
  onPlayNext: () => void;
  showPlayNext: boolean;
}

function DraggableQueueItem({
  item,
  drag,
  isActive,
  onRemove,
  onPlayNext,
  showPlayNext,
}: DraggableQueueItemProps) {
  const coverUrl = useCoverUrl(item.book.id);
  const metadata = item.book.media?.metadata as any;
  const title = metadata?.title || 'Untitled';
  const author =
    metadata?.authorName || metadata?.authors?.[0]?.name || 'Unknown Author';

  // Calculate duration
  const duration = (item.book.media as any)?.duration || 0;
  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  const durationText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  const subtitle = duration > 0 ? `${author} · ${durationText}` : author;

  const handleDrag = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    drag();
  }, [drag]);

  const handleRemove = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onRemove();
  }, [onRemove]);

  const handlePlayNext = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPlayNext();
  }, [onPlayNext]);

  return (
    <ScaleDecorator>
      <View style={[styles.itemContainer, isActive && styles.itemActive]}>
        {/* Drag handle */}
        <Pressable style={styles.dragHandle} onLongPress={handleDrag}>
          <Menu
            size={scale(18)}
            color={isActive ? lightColors.queue.text : lightColors.queue.subtext}
            strokeWidth={2}
          />
        </Pressable>

        {/* Cover */}
        <Image source={coverUrl} style={styles.cover} contentFit="cover" />

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          {showPlayNext && (
            <TouchableOpacity
              style={styles.playNextButton}
              onPress={handlePlayNext}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ArrowUp size={scale(16)} color={lightColors.queue.text} strokeWidth={2.5} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.removeButton}
            onPress={handleRemove}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={scale(18)} color={lightColors.queue.subtext} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>
    </ScaleDecorator>
  );
}

export function QueuePanel({ onClose, maxHeight = hp(50) }: QueuePanelProps) {
  const navigation = useNavigation<any>();
  const queue = useQueue();
  const autoplayEnabled = useAutoplayEnabled();
  const reorderQueue = useQueueStore((s) => s.reorderQueue);
  const removeFromQueue = useQueueStore((s) => s.removeFromQueue);
  const clearQueue = useQueueStore((s) => s.clearQueue);
  const setAutoplayEnabled = useQueueStore((s) => s.setAutoplayEnabled);

  // Calculate total duration
  const totalDuration = queue.reduce((acc, item) => {
    return acc + ((item.book.media as any)?.duration || 0);
  }, 0);
  const totalHours = Math.floor(totalDuration / 3600);
  const totalMinutes = Math.floor((totalDuration % 3600) / 60);
  const totalDurationText =
    totalHours > 0
      ? `${totalHours}h ${totalMinutes}m`
      : `${totalMinutes}m`;

  const handleDragEnd = useCallback(
    ({ from, to }: { from: number; to: number }) => {
      if (from !== to) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        reorderQueue(from, to);
      }
    },
    [reorderQueue]
  );

  const handleRemove = useCallback(
    (bookId: string) => {
      removeFromQueue(bookId);
    },
    [removeFromQueue]
  );

  const handlePlayNext = useCallback(
    (fromIndex: number) => {
      if (fromIndex > 0) {
        reorderQueue(fromIndex, 0);
      }
    },
    [reorderQueue]
  );

  const handleClearQueue = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    clearQueue();
  }, [clearQueue]);

  const handleAutoplayToggle = useCallback(
    (value: boolean) => {
      Haptics.selectionAsync();
      setAutoplayEnabled(value);
    },
    [setAutoplayEnabled]
  );

  const handleBrowseLibrary = useCallback(() => {
    onClose();
    // Small delay to let the sheet close
    setTimeout(() => {
      navigation.navigate('Main', { screen: 'LibraryTab' });
    }, 200);
  }, [onClose, navigation]);

  const renderItem = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<QueueBook>) => {
      const index = getIndex() ?? 0;
      return (
        <DraggableQueueItem
          item={item}
          drag={drag}
          isActive={isActive}
          onRemove={() => handleRemove(item.bookId)}
          onPlayNext={() => handlePlayNext(index)}
          showPlayNext={index > 0}
        />
      );
    },
    [handleRemove, handlePlayNext]
  );

  const keyExtractor = useCallback((item: QueueBook) => item.id, []);

  // Empty state
  if (queue.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Up Next</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={lightColors.queue.text} strokeWidth={2} />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Layers
            size={scale(48)}
            color={lightColors.icon.disabled}
            strokeWidth={1.5}
          />
          <Text style={styles.emptyText}>Your queue is empty</Text>
          <Text style={styles.emptySubtext}>
            Add audiobooks to play them next
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={handleBrowseLibrary}
          >
            <Text style={styles.browseButtonText}>Browse Library</Text>
          </TouchableOpacity>
        </View>
        {/* Autoplay toggle even when empty */}
        <View style={styles.autoplayRow}>
          <View style={styles.autoplayInfo}>
            <SkipForward
              size={scale(18)}
              color={lightColors.icon.secondary}
              strokeWidth={2}
            />
            <Text style={styles.autoplayLabel}>Autoplay series</Text>
          </View>
          <Switch
            value={autoplayEnabled}
            onValueChange={handleAutoplayToggle}
            trackColor={{ false: lightColors.queue.itemActive, true: lightColors.queue.text }}
            thumbColor={lightColors.queue.background}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Up Next</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{queue.length}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <X size={24} color={lightColors.queue.text} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <Text style={styles.statsText}>
          {queue.length} {queue.length === 1 ? 'audiobook' : 'audiobooks'} ·{' '}
          {totalDurationText}
        </Text>
        <TouchableOpacity onPress={handleClearQueue}>
          <Text style={styles.clearText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      {/* Draggable list */}
      <View style={{ maxHeight: maxHeight - scale(180) }}>
        <DraggableFlatList
          data={queue}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          onDragEnd={handleDragEnd}
          showsVerticalScrollIndicator={false}
          containerStyle={styles.listContainer}
          activationDistance={10}
        />
      </View>

      {/* Autoplay toggle */}
      <View style={styles.autoplayRow}>
        <View style={styles.autoplayInfo}>
          <SkipForward
            size={scale(18)}
            color={lightColors.icon.secondary}
            strokeWidth={2}
          />
          <View>
            <Text style={styles.autoplayLabel}>Autoplay series</Text>
            <Text style={styles.autoplayHint}>
              Automatically add next book in series
            </Text>
          </View>
        </View>
        <Switch
          value={autoplayEnabled}
          onValueChange={handleAutoplayToggle}
          trackColor={{ false: lightColors.queue.itemActive, true: lightColors.queue.text }}
          thumbColor={lightColors.queue.background}
        />
      </View>
    </View>
  );
}

// =============================================================================
// QUEUE PANEL COLORS (always light-themed panel)
// =============================================================================

const QUEUE_COLORS = {
  background: lightColors.queue.background,
  text: lightColors.queue.text,
  subtext: lightColors.queue.subtext,
  badge: lightColors.queue.badge,
  badgeText: lightColors.queue.background,
  item: lightColors.queue.item,
  itemActive: lightColors.queue.itemActive,
  border: lightColors.queue.border,
  danger: lightColors.semantic.error,
  icon: '#888888',
  iconMuted: '#999999',
  iconEmpty: '#CCCCCC',
};

// Modernist white/black styles
const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    backgroundColor: QUEUE_COLORS.background,
    paddingTop: scale(20),
    paddingBottom: scale(24),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale(16),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: scale(20),
    fontWeight: '600',
    color: QUEUE_COLORS.text,
    letterSpacing: -0.5,
  },
  badge: {
    backgroundColor: QUEUE_COLORS.badge,
    borderRadius: scale(10),
    paddingHorizontal: scale(8),
    paddingVertical: scale(2),
    minWidth: scale(24),
    alignItems: 'center',
  },
  badgeText: {
    fontSize: scale(12),
    fontWeight: '700',
    color: QUEUE_COLORS.badgeText,
  },
  closeButton: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statsText: {
    fontSize: scale(13),
    color: QUEUE_COLORS.subtext,
  },
  clearText: {
    fontSize: scale(13),
    color: QUEUE_COLORS.danger,
    fontWeight: '500',
  },
  listContainer: {
    paddingBottom: spacing.sm,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(12),
    paddingHorizontal: scale(14),
    backgroundColor: QUEUE_COLORS.item,
    borderRadius: scale(12),
    marginBottom: scale(8),
    gap: scale(12),
  },
  itemActive: {
    backgroundColor: QUEUE_COLORS.itemActive,
    transform: [{ scale: 1.02 }],
  },
  dragHandle: {
    padding: scale(4),
    minWidth: layout.minTouchTarget,
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cover: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(8),
    backgroundColor: QUEUE_COLORS.itemActive,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: scale(14),
    fontWeight: '500',
    color: QUEUE_COLORS.text,
    marginBottom: scale(2),
  },
  subtitle: {
    fontSize: scale(12),
    color: QUEUE_COLORS.subtext,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  playNextButton: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: QUEUE_COLORS.itemActive,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButton: {
    width: scale(32),
    height: scale(32),
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: scale(48),
  },
  emptyText: {
    fontSize: scale(17),
    fontWeight: '600',
    color: QUEUE_COLORS.text,
    marginTop: scale(20),
  },
  emptySubtext: {
    fontSize: scale(14),
    color: QUEUE_COLORS.subtext,
    marginTop: scale(8),
    marginBottom: scale(24),
  },
  browseButton: {
    backgroundColor: QUEUE_COLORS.badge,
    paddingHorizontal: scale(24),
    paddingVertical: scale(12),
    borderRadius: scale(24),
  },
  browseButtonText: {
    fontSize: scale(14),
    fontWeight: '600',
    color: QUEUE_COLORS.badgeText,
  },
  autoplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: scale(16),
    borderTopWidth: 1,
    borderTopColor: QUEUE_COLORS.border,
    marginTop: scale(12),
  },
  autoplayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  autoplayLabel: {
    fontSize: scale(14),
    color: QUEUE_COLORS.text,
    fontWeight: '500',
  },
  autoplayHint: {
    fontSize: scale(11),
    color: QUEUE_COLORS.iconMuted,
    marginTop: 2,
  },
});

export default QueuePanel;
