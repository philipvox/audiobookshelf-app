/**
 * src/features/queue/components/QueueItem.tsx
 *
 * Single queue item for full queue list view.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';
import { useCoverUrl } from '@/core/cache';
import { CoverStars } from '@/shared/components/CoverStars';
import { QueueBookMeta } from '../stores/queueStore';
import { scale, useTheme } from '@/shared/theme';
import { formatDuration } from '@/shared/utils/format';

// Drag handle icon
const DragIcon = ({ size = 20, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M8 6h2M8 10h2M8 14h2M8 18h2M14 6h2M14 10h2M14 14h2M14 18h2"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);

// Remove icon
const RemoveIcon = ({ size = 20, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 6L6 18M6 6l12 12"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

interface QueueItemProps {
  bookId: string;
  meta: QueueBookMeta;
  position: number;
  onRemove: () => void;
  onDragStart?: () => void;
}

export const QueueItem = React.memo(function QueueItem({ bookId, meta, position, onRemove, onDragStart }: QueueItemProps) {
  const { colors } = useTheme();
  const coverUrl = useCoverUrl(bookId);
  const title = meta.title;
  const author = meta.authorName;

  const durationText = formatDuration(meta.duration);

  return (
    <View style={[styles.container, { backgroundColor: colors.background.secondary }]}>
      {/* Drag handle */}
      <Pressable style={styles.dragHandle} onLongPress={onDragStart} accessibilityRole="button" accessibilityLabel={`Reorder ${title}`} accessibilityHint="Long press to drag and reorder">
        <DragIcon size={scale(18)} color={colors.text.secondary} />
      </Pressable>

      {/* Position number */}
      <View style={styles.positionContainer}>
        <Text style={[styles.positionNumber, { color: colors.accent.primary }]}>{position + 1}</Text>
      </View>

      {/* Cover */}
      <View style={{ width: scale(50), height: scale(50), borderRadius: scale(6), overflow: 'hidden' }}>
        <Image source={coverUrl} style={[styles.cover, { backgroundColor: colors.background.secondary }]} contentFit="cover" />
        <CoverStars bookId={bookId} starSize={scale(14)} />
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.text.primary }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.author, { color: colors.text.secondary }]} numberOfLines={1}>
          {author}
        </Text>
        <Text style={[styles.duration, { color: colors.text.secondary }]}>{durationText}</Text>
      </View>

      {/* Remove button */}
      <Pressable style={styles.removeButton} onPress={onRemove} accessibilityRole="button" accessibilityLabel={`Remove ${title} from queue`}>
        <RemoveIcon size={scale(18)} color={colors.text.secondary} />
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(10),
    paddingHorizontal: scale(12),
    borderRadius: scale(12),
    marginBottom: scale(8),
    gap: scale(10),
  },
  dragHandle: {
    padding: scale(4),
  },
  positionContainer: {
    width: scale(24),
    alignItems: 'center',
  },
  positionNumber: {
    fontSize: scale(14),
    fontWeight: '600',
  },
  cover: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(6),
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: scale(14),
    fontWeight: '500',
    marginBottom: scale(2),
  },
  author: {
    fontSize: scale(12),
    marginBottom: scale(2),
  },
  duration: {
    fontSize: scale(11),
  },
  removeButton: {
    padding: scale(8),
  },
});
