/**
 * src/features/queue/screens/QueueScreen.tsx
 *
 * Full queue management screen with reordering and removal.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { useQueue, useQueueStore } from '../stores/queueStore';
import { SwipeableQueueItem } from '../components/SwipeableQueueItem';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (size / 402) * SCREEN_WIDTH;

const COLORS = {
  background: '#000000',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.6)',
  accent: '#4ADE80',
  danger: '#DC2626',
};

// Back arrow icon
const BackIcon = ({ size = 24, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M19 12H5M12 19l-7-7 7-7"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export function QueueScreen() {
  const navigation = useNavigation();
  const queue = useQueue();
  const removeFromQueue = useQueueStore((state) => state.removeFromQueue);
  const clearQueue = useQueueStore((state) => state.clearQueue);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRemove = useCallback(
    (bookId: string) => {
      removeFromQueue(bookId);
    },
    [removeFromQueue]
  );

  const handleClearAll = useCallback(() => {
    clearQueue();
  }, [clearQueue]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <BackIcon size={scale(24)} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Queue</Text>
        {queue.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={handleClearAll}>
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Queue list */}
      {queue.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Queue is empty</Text>
          <Text style={styles.emptySubtitle}>
            Add books to your queue and they'll play automatically when the current book ends.
            {'\n\n'}
            Tip: Swipe left on items to remove them quickly.
          </Text>
        </View>
      ) : (
        <FlatList
          data={queue}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => (
            <SwipeableQueueItem
              book={item.book}
              position={index}
              onRemove={() => handleRemove(item.bookId)}
            />
          )}
          ListFooterComponent={
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {queue.length} {queue.length === 1 ? 'book' : 'books'} in queue
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
  },
  backButton: {
    padding: scale(4),
    marginRight: scale(12),
  },
  headerTitle: {
    flex: 1,
    fontSize: scale(20),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  clearButton: {
    padding: scale(8),
  },
  clearButtonText: {
    fontSize: scale(14),
    fontWeight: '600',
    color: COLORS.danger,
  },
  listContent: {
    paddingHorizontal: scale(16),
    paddingTop: scale(8),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(40),
  },
  emptyTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: scale(8),
  },
  emptySubtitle: {
    fontSize: scale(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: scale(20),
  },
  footer: {
    alignItems: 'center',
    paddingVertical: scale(20),
  },
  footerText: {
    fontSize: scale(13),
    color: COLORS.textSecondary,
  },
});
