/**
 * src/features/home/components/ContinueListeningCarousel.tsx
 *
 * Horizontal snap carousel using native FlatList.
 * Shows continue listening cards with peek of next card.
 */

import React, { useCallback, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ViewToken,
} from 'react-native';
import { LibraryItem } from '@/core/types';
import {
  ContinueListeningCard,
  CARD_WIDTH,
  CARD_HEIGHT,
  CARD_GAP,
} from './ContinueListeningCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Calculate padding to center the first card with peek
const SIDE_PADDING = (SCREEN_WIDTH - CARD_WIDTH) / 2;
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;

interface ContinueListeningCarouselProps {
  books: (LibraryItem & {
    userMediaProgress?: {
      progress?: number;
      currentTime?: number;
      duration?: number;
    };
  })[];
  onIndexChange?: (index: number) => void;
  onCardPress?: (book: LibraryItem) => void;
}

export function ContinueListeningCarousel({
  books,
  onIndexChange,
  onCardPress,
}: ContinueListeningCarouselProps) {
  const flatListRef = useRef<FlatList>(null);
  const currentIndexRef = useRef(0);

  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        const newIndex = viewableItems[0].index;
        if (newIndex !== currentIndexRef.current) {
          currentIndexRef.current = newIndex;
          onIndexChange?.(newIndex);
        }
      }
    },
    [onIndexChange]
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const renderItem = useCallback(
    ({ item, index }: { item: typeof books[0]; index: number }) => (
      <View style={styles.cardWrapper}>
        <ContinueListeningCard
          book={item}
          onPress={() => onCardPress?.(item)}
        />
      </View>
    ),
    [onCardPress]
  );

  const keyExtractor = useCallback(
    (item: typeof books[0]) => item.id,
    []
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: SNAP_INTERVAL,
      offset: SNAP_INTERVAL * index,
      index,
    }),
    []
  );

  if (books.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={books}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SNAP_INTERVAL}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={styles.contentContainer}
        getItemLayout={getItemLayout}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={3}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: CARD_HEIGHT,
  },
  contentContainer: {
    paddingHorizontal: SIDE_PADDING,
  },
  cardWrapper: {
    marginRight: CARD_GAP,
  },
});

export default ContinueListeningCarousel;
