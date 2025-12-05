/**
 * src/shared/components/BookListItem.tsx
 *
 * Shared list item component for displaying individual books
 * Used across all screens where books are shown (home, library, search, etc.)
 *
 * Design: Cover (50x50) | Title + heart | Author | Progress | Play button
 * Swipeable left for delete action (optional)
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, {
  SharedValue,
  useAnimatedStyle,
  interpolate,
} from 'react-native-reanimated';
import { useCoverUrl } from '@/core/cache';
import type { LibraryItem } from '@/core/types';
import { HeartIcon } from './HeartButton';
import { useMyLibraryStore } from '@/features/library/stores/myLibraryStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (size / 402) * SCREEN_WIDTH;

// Colors
const COLORS = {
  background: 'transparent',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.6)',
  textTertiary: 'rgba(255, 255, 255, 0.4)',
  heart: '#4ADE80',
  playButton: '#CCFF00',
  deleteAction: '#DC2626',
  heartAction: '#4ADE80',
};

// Play icon SVG
const PlayIcon = ({ size = 24, color = '#CCFF00' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M8 5.14v14.72a1 1 0 001.5.86l11.57-7.36a1 1 0 000-1.72L9.5 4.28a1 1 0 00-1.5.86z"
      fill={color}
    />
  </Svg>
);

// Trash icon SVG
const TrashIcon = ({ size = 24, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Heart icon SVG for swipe action
const HeartActionIcon = ({ size = 24, color = '#FFFFFF', filled = false }: { size?: number; color?: string; filled?: boolean }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
      fill={filled ? color : 'none'}
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export interface BookListItemProps {
  book: LibraryItem;
  onPress: () => void;
  onPlayPress?: () => void;
  onDelete?: () => void;
  showProgress?: boolean;
  showSwipe?: boolean;
  seriesName?: string;       // Series name to display
  seriesSequence?: number;   // Sequence number (#1, #2, etc.)
  hideTitle?: boolean;       // Hide book title (for series page)
}

// Right action component (delete)
function RightAction({
  drag,
  onPress
}: {
  drag: SharedValue<number>;
  onPress: () => void;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      drag.value,
      [-80, 0],
      [1, 0.5],
      'clamp'
    );
    return { transform: [{ scale }] };
  });

  return (
    <Pressable style={styles.deleteAction} onPress={onPress}>
      <Reanimated.View style={animatedStyle}>
        <TrashIcon size={24} color="#FFFFFF" />
      </Reanimated.View>
    </Pressable>
  );
}

// Left action component (heart)
function LeftAction({
  drag,
  onPress,
  filled,
}: {
  drag: SharedValue<number>;
  onPress: () => void;
  filled: boolean;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      drag.value,
      [0, 80],
      [0.5, 1],
      'clamp'
    );
    return { transform: [{ scale }] };
  });

  return (
    <Pressable style={styles.heartAction} onPress={onPress}>
      <Reanimated.View style={animatedStyle}>
        <HeartActionIcon size={24} color="#FFFFFF" filled={filled} />
      </Reanimated.View>
    </Pressable>
  );
}

export function BookListItem({
  book,
  onPress,
  onPlayPress,
  onDelete,
  showProgress = true,
  showSwipe = true,
  seriesName,
  seriesSequence,
  hideTitle = false,
}: BookListItemProps) {
  const coverUrl = useCoverUrl(book.id);
  const metadata = book.media?.metadata as any;
  const title = metadata?.title || 'Untitled';
  const author = metadata?.authorName || metadata?.authors?.[0]?.name || 'Unknown Author';

  // Get favorite status and toggle function from store
  const isInLibrary = useMyLibraryStore((state) => state.libraryIds.includes(book.id));
  const addToLibrary = useMyLibraryStore((state) => state.addToLibrary);
  const removeFromLibrary = useMyLibraryStore((state) => state.removeFromLibrary);

  // Get progress info
  const progress = (book as any).userMediaProgress;
  const progressPercent = progress?.progress ? Math.round(progress.progress * 100) : 0;

  const handleDelete = useCallback(() => {
    onDelete?.();
  }, [onDelete]);

  const handleHeart = useCallback(() => {
    if (isInLibrary) {
      removeFromLibrary(book.id);
    } else {
      addToLibrary(book.id);
    }
  }, [isInLibrary, book.id, addToLibrary, removeFromLibrary]);

  const renderRightActions = useCallback(
    (_prog: SharedValue<number>, drag: SharedValue<number>) => (
      <RightAction drag={drag} onPress={handleDelete} />
    ),
    [handleDelete]
  );

  const renderLeftActions = useCallback(
    (_prog: SharedValue<number>, drag: SharedValue<number>) => (
      <LeftAction drag={drag} onPress={handleHeart} filled={isInLibrary} />
    ),
    [handleHeart, isInLibrary]
  );

  const content = (
    <Pressable style={styles.container} onPress={onPress}>
      {/* Cover with optional sequence badge */}
      <View style={styles.coverContainer}>
        <Image source={coverUrl} style={styles.cover} contentFit="cover" />
        {seriesSequence !== undefined && (
          <View style={styles.sequenceBadge}>
            <Text style={styles.sequenceText}>#{seriesSequence}</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        {/* Title row with heart (conditionally shown) */}
        {!hideTitle && (
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            {isInLibrary && (
              <HeartIcon size={scale(10)} color={COLORS.heart} filled />
            )}
          </View>
        )}
        <Text style={styles.author} numberOfLines={1}>{author}</Text>
        {seriesName && (
          <Text style={styles.seriesNameText} numberOfLines={1}>{seriesName}</Text>
        )}
        {showProgress && (
          <Text style={styles.progress}>{progressPercent}% complete</Text>
        )}
      </View>

      {/* Play button */}
      <Pressable
        style={styles.playButton}
        onPress={onPlayPress}
      >
        <PlayIcon size={scale(20)} color={COLORS.playButton} />
      </Pressable>
    </Pressable>
  );

  if (showSwipe) {
    return (
      <ReanimatedSwipeable
        renderLeftActions={renderLeftActions}
        renderRightActions={onDelete ? renderRightActions : undefined}
        leftThreshold={30}
        rightThreshold={30}
        friction={2}
        overshootFriction={8}
        enableTrackpadTwoFingerGesture
        containerStyle={styles.swipeableContainer}
      >
        {content}
      </ReanimatedSwipeable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(8),
    paddingHorizontal: scale(10),
    backgroundColor: COLORS.background,
  },
  coverContainer: {
    position: 'relative',
  },
  cover: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(5),
    backgroundColor: '#262626',
  },
  sequenceBadge: {
    position: 'absolute',
    top: scale(2),
    left: scale(2),
    backgroundColor: COLORS.playButton,
    paddingHorizontal: scale(4),
    paddingVertical: scale(1),
    borderRadius: scale(3),
  },
  sequenceText: {
    fontSize: scale(9),
    fontWeight: '700',
    color: '#000000',
  },
  info: {
    flex: 1,
    marginLeft: scale(12),
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    marginBottom: scale(2),
  },
  title: {
    fontSize: scale(14),
    fontWeight: '500',
    color: COLORS.textPrimary,
    flexShrink: 1,
  },
  author: {
    fontSize: scale(12),
    color: COLORS.textSecondary,
    marginBottom: scale(2),
  },
  seriesNameText: {
    fontSize: scale(11),
    color: COLORS.textTertiary,
    marginBottom: scale(2),
  },
  progress: {
    fontSize: scale(11),
    color: COLORS.textTertiary,
  },
  playButton: {
    padding: scale(-10),
  },
  deleteAction: {
    backgroundColor: COLORS.deleteAction,
    justifyContent: 'center',
    alignItems: 'center',
    width: scale(80),
  },
  heartAction: {
    backgroundColor: COLORS.heartAction,
    justifyContent: 'center',
    alignItems: 'center',
    width: scale(80),
  },
  swipeableContainer: {
    overflow: 'visible',
  },
});
