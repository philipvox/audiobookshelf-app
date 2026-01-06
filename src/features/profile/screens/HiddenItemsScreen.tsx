/**
 * src/features/profile/screens/HiddenItemsScreen.tsx
 *
 * Screen to manage hidden/dismissed books.
 * Users can view books they've marked as "Not Interested"
 * and restore them to recommendations.
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Undo2, Trash2 } from 'lucide-react-native';
import { useThemeColors } from '@/shared/theme/themeStore';
import { scale, spacing, radius, layout, typography, fontWeight } from '@/shared/theme';
import { TOP_NAV_HEIGHT, SCREEN_BOTTOM_PADDING } from '@/constants/layout';
import { useDismissedItemsStore } from '@/features/recommendations/stores/dismissedItemsStore';
import { useLibraryCache, useCoverUrl } from '@/core/cache';
import { haptics } from '@/core/native/haptics';

interface HiddenBookItemProps {
  bookId: string;
  onRestore: (id: string) => void;
  themeColors: ReturnType<typeof useThemeColors>;
}

function HiddenBookItem({ bookId, onRestore, themeColors }: HiddenBookItemProps) {
  const { items } = useLibraryCache();
  const coverUrl = useCoverUrl(bookId);
  const navigation = useNavigation<any>();

  // Find the book in library cache
  const book = useMemo(() => items.find(item => item.id === bookId), [items, bookId]);
  const metadata = (book?.media?.metadata as any) || {};
  const title = metadata.title || 'Unknown Book';
  const author = metadata.authorName || metadata.authors?.[0]?.name || 'Unknown Author';

  const handlePress = useCallback(() => {
    navigation.navigate('BookDetail', { id: bookId });
  }, [navigation, bookId]);

  const handleRestore = useCallback(() => {
    haptics.selection();
    onRestore(bookId);
  }, [bookId, onRestore]);

  return (
    <TouchableOpacity
      style={[styles.bookItem, { borderBottomColor: themeColors.border }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Image
        source={coverUrl}
        style={styles.cover}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
      <View style={styles.bookInfo}>
        <Text style={[styles.bookTitle, { color: themeColors.text }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.bookAuthor, { color: themeColors.textSecondary }]} numberOfLines={1}>
          {author}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.restoreButton, { backgroundColor: themeColors.backgroundSecondary }]}
        onPress={handleRestore}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Undo2 size={scale(18)} color={themeColors.accent} strokeWidth={2} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export function HiddenItemsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const themeColors = useThemeColors();

  const dismissedItems = useDismissedItemsStore((s) => s.dismissedItems);
  const undismissItem = useDismissedItemsStore((s) => s.undismissItem);
  const clearAllDismissals = useDismissedItemsStore((s) => s.clearAllDismissals);

  const dismissedIds = useMemo(() => Object.keys(dismissedItems), [dismissedItems]);
  const isEmpty = dismissedIds.length === 0;

  const handleRestore = useCallback((id: string) => {
    undismissItem(id);
  }, [undismissItem]);

  const handleClearAll = useCallback(() => {
    Alert.alert(
      'Restore All Books',
      'This will restore all hidden books back to your recommendations. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore All',
          onPress: () => {
            haptics.selection();
            clearAllDismissals();
          },
        },
      ]
    );
  }, [clearAllDismissals]);

  const renderItem = useCallback(({ item }: { item: string }) => (
    <HiddenBookItem
      bookId={item}
      onRestore={handleRestore}
      themeColors={themeColors}
    />
  ), [handleRestore, themeColors]);

  const keyExtractor = useCallback((item: string) => item, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top + TOP_NAV_HEIGHT, backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: themeColors.text }]}>Hidden Books</Text>
        {!isEmpty && (
          <TouchableOpacity
            style={[styles.clearButton, { backgroundColor: themeColors.backgroundSecondary }]}
            onPress={handleClearAll}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Trash2 size={scale(16)} color={themeColors.textSecondary} strokeWidth={2} />
            <Text style={[styles.clearButtonText, { color: themeColors.textSecondary }]}>
              Clear All
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Description */}
      <Text style={[styles.description, { color: themeColors.textSecondary }]}>
        These books won't appear in your recommendations. Tap the restore button to bring them back.
      </Text>

      {isEmpty ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
            No Hidden Books
          </Text>
          <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
            Swipe left on any book card in the Browse tab to hide it from recommendations.
          </Text>
        </View>
      ) : (
        <FlatList
          data={dismissedIds}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: layout.screenPaddingH,
    paddingVertical: spacing.md,
  },
  title: {
    ...typography.displayMedium,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.3,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  clearButtonText: {
    ...typography.bodyMedium,
    fontWeight: fontWeight.medium,
  },
  description: {
    ...typography.bodyLarge,
    paddingHorizontal: layout.screenPaddingH,
    marginBottom: spacing.lg,
  },
  listContent: {
    paddingBottom: SCREEN_BOTTOM_PADDING,
  },
  bookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.screenPaddingH,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  cover: {
    width: scale(48),
    height: scale(48),
    borderRadius: radius.sm,
  },
  bookInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  bookTitle: {
    ...typography.headlineMedium,
    fontWeight: fontWeight.semibold,
    marginBottom: scale(2),
  },
  bookAuthor: {
    ...typography.bodyMedium,
  },
  restoreButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    ...typography.headlineLarge,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.bodyLarge,
    textAlign: 'center',
    lineHeight: scale(20),
  },
});
