/**
 * src/features/search/screens/SearchScreen.tsx
 *
 * Search screen as a tab (no back button needed).
 */

import React from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SearchBar } from '../components/SearchBar';
import { SearchResultItem } from '../components/SearchResultItem';
import { useSearch } from '../hooks/useSearch';
import { useLibraryItems } from '@/features/library/hooks/useLibraryItems';
import { useDefaultLibrary } from '@/features/library/hooks/useDefaultLibrary';
import { Icon } from '@/shared/components/Icon';
import { EmptyState, LoadingSpinner } from '@/shared/components';
import { LibraryItem } from '@/core/types';
import { theme } from '@/shared/theme';

/**
 * Search screen component (tab)
 */
export function SearchScreen() {
  const insets = useSafeAreaInsets();
  
  // Get library items
  const { library } = useDefaultLibrary();
  const { items, isLoading } = useLibraryItems(library?.id || '', {
    limit: 500, // Load more items for comprehensive search
  });

  // Search hook
  const { query, setQuery, results, isSearching, hasSearched } = useSearch(items);

  // Show loading while fetching library
  if (isLoading) {
    return <LoadingSpinner text="Loading library..." />;
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          autoFocus={false}
        />
      </View>

      {/* Results */}
      <View style={styles.content}>
        {/* Searching Indicator */}
        {isSearching && query.length > 0 && (
          <View style={styles.searchingContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary[500]} />
            <Text style={styles.searchingText}>Searching...</Text>
          </View>
        )}

        {/* Results Count */}
        {!isSearching && hasSearched && results.length > 0 && (
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsCount}>
              {results.length} {results.length === 1 ? 'result' : 'results'}
            </Text>
          </View>
        )}

        {/* Results List */}
        {!isSearching && hasSearched && results.length > 0 ? (
          <FlatList
            data={results}
            renderItem={({ item }) => <SearchResultItem item={item} />}
            keyExtractor={(item: LibraryItem) => item.id}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            showsVerticalScrollIndicator={false}
          />
        ) : null}

        {/* No Results */}
        {!isSearching && hasSearched && results.length === 0 && (
          <EmptyState
            icon="🔍"
            message="No results found"
            description={`No books match "${query}"`}
          />
        )}

        {/* Initial State */}
        {!hasSearched && (
          <View style={styles.initialState}>
            <Icon
              name="search"
              size={64}
              color={theme.colors.neutral[300]}
              set="ionicons"
            />
            <Text style={styles.initialTitle}>Search your library</Text>
            <Text style={styles.initialSubtitle}>
              Find books by title, author, narrator, series, or genre
            </Text>
          </View>
        )}
      </View>
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
    paddingTop: theme.spacing[3],
    paddingBottom: theme.spacing[4],
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing[4],
    letterSpacing: -0.5,
  },
  content: {
    flex: 1,
  },
  searchingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing[4],
  },
  searchingText: {
    marginLeft: theme.spacing[2],
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  resultsHeader: {
    paddingHorizontal: theme.spacing[5],
    paddingVertical: theme.spacing[3],
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  listContent: {
    paddingBottom: theme.spacing[32] + 60, // Extra space for mini player + tab bar
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.border.light,
    marginLeft: theme.spacing[4] + 60 + theme.spacing[4],
  },
  initialState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[8],
    paddingBottom: theme.spacing[32] + 60,
  },
  initialTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[2],
  },
  initialSubtitle: {
    fontSize: 15,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
