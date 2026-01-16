import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { NarratorCard } from '@/features/narrator';
import { useNarrators, NarratorInfo } from '@/features/narrator';
import { useDefaultLibrary } from '@/features/library/hooks/useDefaultLibrary';
import { SearchBar } from '@/features/search/components/SearchBar';
import { Loading, EmptyState, ErrorView, SkullRefreshControl } from '@/shared/components';
import { spacing, useTheme } from '@/shared/theme';

export function NarratorsListContent() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const { library, isLoading: isLoadingLibrary } = useDefaultLibrary();
  const { narrators, narratorCount, isLoading, error, refetch } = useNarrators(
    library?.id || '',
    { sortBy: 'name-asc', searchQuery }
  );

  if (isLoadingLibrary || isLoading) {
    return <Loading text="Loading narrators..." />;
  }

  if (error) {
    return <ErrorView message="Failed to load narrators" onRetry={refetch} />;
  }

  if (narratorCount === 0 && !searchQuery) {
    return (
      <EmptyState
        icon="🎙️"
        title="No narrators found"
        description="Your library doesn't have any narrators"
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search narrators..."
          autoFocus={false}
        />
      </View>

      <SkullRefreshControl refreshing={isLoading} onRefresh={refetch}>
        <FlashList
          data={narrators}
          renderItem={({ item }) => (
            <View style={styles.itemWrapper}>
              <NarratorCard narrator={item} />
            </View>
          )}
          keyExtractor={(item: NarratorInfo) => item.id}
          numColumns={2}
          estimatedItemSize={200}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="🔍"
              title="No narrators found"
              description={`No narrators match "${searchQuery}"`}
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