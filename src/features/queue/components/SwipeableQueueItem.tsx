/**
 * src/features/queue/components/SwipeableQueueItem.tsx
 *
 * Swipeable queue item with delete action.
 * Swipe left to reveal remove button.
 */

import React, { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable, Animated as RNAnimated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useCoverUrl } from '@/core/cache';
import { LibraryItem } from '@/core/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (size / 402) * SCREEN_WIDTH;

const ACTION_WIDTH = 80;

const COLORS = {
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.6)',
  accent: '#4ADE80',
  cardBg: 'rgba(255, 255, 255, 0.08)',
  danger: '#F44336',
};

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

// Trash icon
const TrashIcon = ({ size = 22, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

interface SwipeableQueueItemProps {
  book: LibraryItem;
  position: number;
  onRemove: () => void;
  onPress?: () => void;
  onDragStart?: () => void;
}

export function SwipeableQueueItem({
  book,
  position,
  onRemove,
  onPress,
  onDragStart,
}: SwipeableQueueItemProps) {
  const swipeableRef = useRef<Swipeable>(null);
  const coverUrl = useCoverUrl(book.id);
  const metadata = book.media?.metadata as any;
  const title = metadata?.title || 'Untitled';
  const author = metadata?.authorName || metadata?.authors?.[0]?.name || 'Unknown Author';

  // Calculate duration
  const duration = (book.media as any)?.duration || 0;
  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  const durationText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  const handleRemove = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    swipeableRef.current?.close();
    onRemove();
  }, [onRemove]);

  const renderRightActions = useCallback(
    (
      progress: RNAnimated.AnimatedInterpolation<number>,
      dragX: RNAnimated.AnimatedInterpolation<number>
    ) => {
      const translateX = dragX.interpolate({
        inputRange: [-ACTION_WIDTH, 0],
        outputRange: [0, ACTION_WIDTH],
        extrapolate: 'clamp',
      });

      const opacity = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
      });

      return (
        <RNAnimated.View
          style={[styles.rightAction, { transform: [{ translateX }], opacity }]}
        >
          <Pressable style={styles.removeAction} onPress={handleRemove}>
            <TrashIcon size={scale(22)} color="#fff" />
            <Text style={styles.actionText}>Remove</Text>
          </Pressable>
        </RNAnimated.View>
      );
    },
    [handleRemove]
  );

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      overshootRight={false}
      friction={2}
      onSwipeableWillOpen={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
    >
      <Pressable style={styles.container} onPress={onPress}>
        {/* Drag handle */}
        <Pressable style={styles.dragHandle} onLongPress={onDragStart}>
          <DragIcon size={scale(18)} color={COLORS.textSecondary} />
        </Pressable>

        {/* Position number */}
        <View style={styles.positionContainer}>
          <Text style={styles.positionNumber}>{position + 1}</Text>
        </View>

        {/* Cover */}
        <Image source={coverUrl} style={styles.cover} contentFit="cover" />

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.author} numberOfLines={1}>
            {author}
          </Text>
          <Text style={styles.duration}>{durationText}</Text>
        </View>

        {/* Swipe indicator */}
        <View style={styles.swipeIndicator}>
          <Text style={styles.swipeText}>←</Text>
        </View>
      </Pressable>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(10),
    paddingHorizontal: scale(12),
    backgroundColor: COLORS.cardBg,
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
    color: COLORS.accent,
  },
  cover: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(6),
    backgroundColor: '#262626',
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: scale(14),
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: scale(2),
  },
  author: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginBottom: scale(2),
  },
  duration: {
    fontSize: scale(11),
    color: COLORS.textSecondary,
  },
  swipeIndicator: {
    paddingHorizontal: scale(4),
  },
  swipeText: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    opacity: 0.5,
  },
  rightAction: {
    width: ACTION_WIDTH,
    marginBottom: scale(8),
  },
  removeAction: {
    flex: 1,
    backgroundColor: COLORS.danger,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: scale(12),
    borderBottomRightRadius: scale(12),
  },
  actionText: {
    fontSize: scale(11),
    fontWeight: '500',
    color: '#fff',
    marginTop: 4,
  },
});

export default SwipeableQueueItem;
