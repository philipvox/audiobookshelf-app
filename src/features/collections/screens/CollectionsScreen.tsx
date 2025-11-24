import React, { useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  StatusBar,
  Text,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CollectionCard } from '../components/CollectionCard';
import { useCollections } from '../hooks/useCollections';
import { SearchBar } from '@/features/search/components/SearchBar';
import { LoadingSpinner, EmptyState, ErrorView } from '@/shared/components';
import { Collection } from '@/core/types';
import { theme } from '@/shared/theme';

export function CollectionsScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const { collections, isLoading, error, refetch } = useCollections();

  const filteredCollections = searchQuery
    ? collections.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : collections;

  if (isLoading) {
    return <LoadingSpinner text="Loading collections..." />;
  }

  if (error) {
    return <ErrorView message="Failed to load collections" onRetry={refetch} />;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background.primary} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Collections</Text>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search collections..."
          autoFocus={false}
        />
      </View>

      {collections.length === 0 && !searchQuery ? (
        <EmptyState
          icon="📁"
          message="No collections yet"
          description="Create collections in AudiobookShelf to organize your books"
        />
      ) : (
        <FlatList
          data={filteredCollections}
          renderItem={({ item }) => <CollectionCard collection={item} />}
          keyExtractor={(item: Collection) => item.id}
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
              message="No collections found"
              description={`No collections match "${searchQuery}"`}
            />
          }
        />
      )}
    </View>
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
  listContent: {
    paddingHorizontal: theme.spacing[5],
    paddingTop: theme.spacing[4],
    paddingBottom: theme.spacing[32] + 60,
  },
  row: {
    justifyContent: 'space-between',
  },
});