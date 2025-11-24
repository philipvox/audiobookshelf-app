/**
 * src/features/series/screens/SeriesListScreen.tsx
 *
 * Screen displaying all series from AudiobookShelf API.
 */

import React, { useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SeriesCard } from '../components/SeriesCard';
import { useSeries } from '../hooks/useSeries';
import { useDefaultLibrary } from '@/features/library/hooks/useDefaultLibrary';
import { SearchBar } from '@/features/search/components/SearchBar';
import { LoadingSpinner, EmptyState, ErrorView } from '@/shared/components';
import { SeriesInfo } from '../services/seriesAdapter';
import { theme } from '@/shared/theme';

export function SeriesListScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'bookCount' | 'recent'>('name');

  // Get library
  const { library, isLoading: isLoadingLibrary } = useDefaultLibrary();

  // Fetch series from API
  const { series, seriesCount, isLoading, error, refetch } = useSeries(
    library?.id || '',
    { sortBy, searchQuery }
  );

  if (isLoadingLibrary || isLoading) {
    return <LoadingSpinner text="Loading series..." />;
  }

  if (error) {
    return (
      <ErrorView
        message="Failed to load series"
        onRetry={refetch}
      />
    );
  }

  if (seriesCount === 0 && !searchQuery) {
    return (
      <EmptyState
        icon="📚"
        message="No series found"
        description="Your library doesn't have any series"
      />
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background.primary} />

      <View style={styles.header}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search series..."
          autoFocus={false}
        />
      </View>

      <FlatList
        data={series}
        renderItem={({ item }) => <SeriesCard series={item} />}
        keyExtractor={(item: SeriesInfo) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={theme.colors.primary[500]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="🔍"
            message="No series found"
            description={`No series match "${searchQuery}"`}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    paddingHorizontal: theme.spacing[5],
    paddingVertical: theme.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  listContent: {
    paddingHorizontal: theme.spacing[5],
    paddingTop: theme.spacing[4],
    paddingBottom: theme.spacing[32] + 60,
  },
  row: {
    justifyContent: 'space-between',
  },
});