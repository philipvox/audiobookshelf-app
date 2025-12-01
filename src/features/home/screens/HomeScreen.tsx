/**
 * src/features/home/screens/HomeScreen.tsx
 *
 * Redesigned home screen with:
 * - Horizontal snap carousel for continue listening
 * - Card actions row (View Series / Restart)
 * - Simplified dark layout
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiClient } from '@/core/api';
import { usePlayerStore } from '@/features/player';
import { theme } from '@/shared/theme';
import { useContinueListening } from '../hooks/useContinueListening';
import {
  ContinueListeningCarousel,
  CardActionsRow,
  CARD_HEIGHT,
} from '../components';

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { items: continueListeningItems, isLoading: isLoadingContinue } = useContinueListening();
  const { loadBook } = usePlayerStore();

  // Track current carousel index
  const [currentIndex, setCurrentIndex] = useState(0);

  // Get the current book based on carousel index
  const currentBook = continueListeningItems[currentIndex] || null;

  // Handle card press - open player without autoplay
  const handleCardPress = useCallback(
    async (book: any) => {
      try {
        const fullBook = await apiClient.getItem(book.id);
        await loadBook(fullBook, { autoPlay: false });
      } catch (err) {
        console.error('Failed to open player:', err);
        try {
          await loadBook(book, { autoPlay: false });
        } catch (e) {
          console.error('Fallback failed:', e);
        }
      }
    },
    [loadBook]
  );

  // Handle carousel index change
  const handleIndexChange = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <View style={[styles.content, { paddingTop: insets.top + 20 }]}>
        {/* Continue Listening Section */}
        {isLoadingContinue ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          </View>
        ) : continueListeningItems.length > 0 ? (
          <>
            <ContinueListeningCarousel
              books={continueListeningItems}
              onIndexChange={handleIndexChange}
              onCardPress={handleCardPress}
            />
            <CardActionsRow book={currentBook} />
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🎧</Text>
            <Text style={styles.emptyTitle}>Start listening</Text>
            <Text style={styles.emptySubtitle}>
              Your audiobooks will appear here
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  loadingContainer: {
    height: CARD_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    height: CARD_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#888888',
    textAlign: 'center',
  },
});

export default HomeScreen;
