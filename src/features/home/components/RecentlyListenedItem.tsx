/**
 * src/features/home/components/RecentlyListenedItem.tsx
 *
 * List item for recently listened books
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';
import { apiClient } from '@/core/api';
import type { LibraryItem } from '@/core/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (size / 402) * SCREEN_WIDTH;

interface RecentlyListenedItemProps {
  book: LibraryItem;
  onPress: () => void;
  onHeartPress?: () => void;
  isFavorite?: boolean;
}

const HeartIcon = ({ size = 18, color = '#34C759', filled = false }) => (
  <Svg width={size} height={size} viewBox="0 0 18 15" fill="none">
    <Path
      d="M15.9611 1.25119C15.5385 0.854523 15.0367 0.539863 14.4845 0.32518C13.9323 0.110498 13.3404 0 12.7426 0C12.1448 0 11.5529 0.110498 11.0007 0.32518C10.4484 0.539863 9.9467 0.854523 9.52412 1.25119L8.6471 2.07401L7.77009 1.25119C6.9165 0.450331 5.75878 0.000415111 4.55161 0.000415119C3.34445 0.000415128 2.18673 0.450331 1.33314 1.25119C0.479544 2.05204 8.99406e-09 3.13823 0 4.27081C-8.99406e-09 5.40339 0.479544 6.48958 1.33314 7.29044L8.6471 14.1525L15.9611 7.29044C16.3839 6.89396 16.7192 6.42322 16.9481 5.9051C17.1769 5.38698 17.2947 4.83164 17.2947 4.27081C17.2947 3.70998 17.1769 3.15464 16.9481 2.63652C16.7192 2.1184 16.3839 1.64766 15.9611 1.25119Z"
      fill={filled ? color : 'none'}
      stroke={filled ? 'none' : color}
      strokeWidth={1.5}
    />
  </Svg>
);

export function RecentlyListenedItem({
  book,
  onPress,
  onHeartPress,
  isFavorite = false,
}: RecentlyListenedItemProps) {
  const coverUrl = apiClient.getItemCoverUrl(book.id);
  const metadata = book.media?.metadata as any;
  const title = metadata?.title || 'Untitled';
  const author = metadata?.authorName || metadata?.authors?.[0]?.name || 'Unknown Author';

  // Get progress info
  const progress = (book as any).userMediaProgress;
  const progressPercent = progress?.progress ? Math.round(progress.progress * 100) : 0;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      {/* Cover */}
      <Image source={coverUrl} style={styles.cover} contentFit="cover" />

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.author} numberOfLines={1}>{author}</Text>
        <Text style={styles.progress}>{progressPercent}% complete</Text>
      </View>

      {/* Heart button */}
      <TouchableOpacity style={styles.heartButton} onPress={onHeartPress}>
        <HeartIcon size={scale(16)} color="#34C759" filled={isFavorite} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(8),
    paddingHorizontal: scale(29),
  },
  cover: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(4),
    backgroundColor: '#262626',
  },
  info: {
    flex: 1,
    marginLeft: scale(12),
  },
  title: {
    fontSize: scale(14),
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: scale(2),
  },
  author: {
    fontSize: scale(12),
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: scale(2),
  },
  progress: {
    fontSize: scale(11),
    color: 'rgba(255, 255, 255, 0.4)',
  },
  heartButton: {
    padding: scale(8),
  },
});
