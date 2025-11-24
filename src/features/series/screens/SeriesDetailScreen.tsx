/**
 * src/features/series/screens/SeriesDetailScreen.tsx
 *
 * Screen showing all books in a series from API.
 */

import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api';
import { BookCard } from '@/features/library/components/BookCard';
import { LoadingSpinner, EmptyState, ErrorView } from '@/shared/components';
import { Icon } from '@/shared/components/Icon';
import { LibraryItem } from '@/core/types';
import { theme } from '@/shared/theme';

type SeriesDetailRouteParams = {
  SeriesDetail: {
    seriesId: string;
  };
};

type SeriesDetailRouteProp = RouteProp<SeriesDetailRouteParams, 'SeriesDetail'>;

export function SeriesDetailScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<SeriesDetailRouteProp>();
  const navigation = useNavigation();
  const { seriesId } = route.params;

  // Fetch series details from API
  const { data: series, isLoading, error, refetch } = useQuery({
    queryKey: ['series', seriesId],
    queryFn: () => apiClient.getSeries(seriesId),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
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

  if (!series) {
    return (
      <EmptyState
        icon="❌"
        message="Series not found"
        description="This series may have been removed"
      />
    );
  }

  const books = series.books || [];

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background.primary} />

      {/* Header with Back Button */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="chevron-back" size={24} color={theme.colors.text.primary} set="ionicons" />
        </TouchableOpacity>
      </View>

      {/* Series Header */}
      <View style={styles.header}>
        <Text style={styles.seriesName}>{series.name}</Text>
        <Text style={styles.bookCount}>
          {books.length} {books.length === 1 ? 'book' : 'books'}
        </Text>
        {series.description && (
          <Text style={styles.description} numberOfLines={3}>
            {series.description}
          </Text>
        )}
      </View>

      {/* Books Grid */}
      {books.length > 0 ? (
        <FlatList
          data={books}
          renderItem={({ item }) => <BookCard book={item} />}
          keyExtractor={(item: LibraryItem) => item.id}
          numColumns={3}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <EmptyState
          icon="📚"
          message="No books in series"
          description="This series doesn't have any books yet"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  headerBar: {
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[2],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.neutral[200],
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.elevation.small,
  },
  header: {
    paddingHorizontal: theme.spacing[5],
    paddingVertical: theme.spacing[5],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  seriesName: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing[2],
    letterSpacing: -0.5,
  },
  bookCount: {
    fontSize: 15,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing[2],
  },
  description: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 20,
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