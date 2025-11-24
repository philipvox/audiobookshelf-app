import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCollectionDetails } from '../hooks/useCollectionDetails';
import { BookCard } from '@/features/library/components/BookCard';
import { LoadingSpinner, EmptyState, ErrorView } from '@/shared/components';
import { Icon } from '@/shared/components/Icon';
import { theme } from '@/shared/theme';

type CollectionDetailRouteParams = {
  CollectionDetail: {
    collectionId: string;
  };
};

type CollectionDetailRouteProp = RouteProp<CollectionDetailRouteParams, 'CollectionDetail'>;

export function CollectionDetailScreen() {
  const route = useRoute<CollectionDetailRouteProp>();
  const navigation = useNavigation();
  const { collectionId } = route.params;
  const { collection, isLoading, error, refetch } = useCollectionDetails(collectionId);

  if (isLoading) {
    return <LoadingSpinner text="Loading collection..." />;
  }

  if (error) {
    return <ErrorView message="Failed to load collection" onRetry={refetch} />;
  }

  if (!collection) {
    return (
      <EmptyState
        icon="❌"
        message="Collection not found"
        description="This collection may have been removed"
      />
    );
  }

  const books = collection.books || [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="chevron-back" size={24} color={theme.colors.text.primary} set="ionicons" />
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <Text style={styles.collectionName}>{collection.name}</Text>
        <Text style={styles.bookCount}>
          {books.length} {books.length === 1 ? 'book' : 'books'}
        </Text>
        {collection.description && (
          <Text style={styles.description} numberOfLines={3}>
            {collection.description}
          </Text>
        )}
      </View>

      {books.length > 0 ? (
        <FlatList
          data={books}
          renderItem={({ item }) => <BookCard book={item} />}
          keyExtractor={(item) => item.id}
          numColumns={3}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <EmptyState
          icon="📚"
          message="No books in collection"
          description="Add books to this collection in AudiobookShelf"
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
  collectionName: {
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