import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { CollectionCard } from '@/features/collections';
import { useCollections } from '@/features/collections/hooks/useCollections';
import { SearchBar } from '@/features/search/components/SearchBar';
import { Loading, EmptyState, ErrorView, SkullRefreshControl } from '@/shared/components';
import { Collection } from '@/core/types';
import { spacing, useTheme } from '@/shared/theme';

export function CollectionsListContent() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const { collections, isLoading, error, refetch } = useCollections();

  const filteredCollections = searchQuery
    ? collections.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : collections;

  if (isLoading) {
    return <Loading text="Loading collections..." />;
  }

  if (error) {
    return <ErrorView message="Failed to load collections" onRetry={refetch} />;
  }

  if (collections.length === 0 && !searchQuery) {
    return (
      <EmptyState
        icon="📁"
        title="No collections yet"
        description="Create collections in AudiobookShelf to organize your books"
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search collections..."
          autoFocus={false}
        />
      </View>

      <SkullRefreshControl refreshing={isLoading} onRefresh={refetch}>
        <FlashList
          data={filteredCollections}
          renderItem={({ item }) => (
            <View style={styles.itemWrapper}>
              <CollectionCard collection={item} />
            </View>
          )}
          keyExtractor={(item: Collection) => item.id}
          numColumns={2}
          estimatedItemSize={200}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="🔍"
              title="No collections found"
              description={`No collections match "${searchQuery}"`}
            />
          }
        />
      </SkullRefreshControl>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor set via themeColors in JSX
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 188,
  },
  itemWrapper: {
    flex: 1,
    paddingHorizontal: 4,
  },
});