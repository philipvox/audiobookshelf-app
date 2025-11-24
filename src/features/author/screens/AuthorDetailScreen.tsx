/**
 * src/features/authors/screens/AuthorDetailScreen.tsx
 *
 * Screen showing author details and their books.
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api';
import { BookCard } from '@/features/library/components/BookCard';
import { LoadingSpinner, EmptyState, ErrorView } from '@/shared/components';
import { Icon } from '@/shared/components/Icon';
import { theme } from '@/shared/theme';

type AuthorDetailRouteParams = {
  AuthorDetail: {
    authorId: string;
  };
};

type AuthorDetailRouteProp = RouteProp<AuthorDetailRouteParams, 'AuthorDetail'>;

export function AuthorDetailScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<AuthorDetailRouteProp>();
  const navigation = useNavigation();
  const { authorId } = route.params;

  const { data: author, isLoading, error, refetch } = useQuery({
    queryKey: ['author', authorId],
    queryFn: () => apiClient.getAuthor(authorId, { include: 'items' }),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return <LoadingSpinner text="Loading author..." />;
  }

  if (error) {
    return (
      <ErrorView
        message="Failed to load author"
        onRetry={refetch}
      />
    );
  }

  if (!author) {
    return (
      <EmptyState
        icon="❌"
        message="Author not found"
        description="This author may have been removed"
      />
    );
  }

  const books = (author as any).libraryItems || [];
  const imageUrl = author.imagePath ? apiClient.getAuthorImageUrl(author.id) : undefined;

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

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.imageContainer}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
            ) : (
              <View style={[styles.image, styles.placeholderImage]}>
                <Text style={styles.placeholderText}>👤</Text>
              </View>
            )}
          </View>

          <Text style={styles.authorName}>{author.name}</Text>
          <Text style={styles.bookCount}>
            {books.length} {books.length === 1 ? 'book' : 'books'}
          </Text>

          {author.description && (
            <Text style={styles.description} numberOfLines={6}>
              {author.description}
            </Text>
          )}
        </View>

        {books.length > 0 && (
          <View style={styles.booksSection}>
            <Text style={styles.sectionTitle}>Books</Text>
            <View style={styles.booksGrid}>
              {books.map((book: any) => (
                <View key={book.id} style={styles.bookWrapper}>
                  <BookCard book={book} />
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing[5],
    paddingVertical: theme.spacing[5],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  imageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.neutral[200],
    overflow: 'hidden',
    marginBottom: theme.spacing[4],
    ...theme.elevation.medium,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.neutral[300],
  },
  placeholderText: {
    fontSize: 48,
  },
  authorName: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing[1],
    textAlign: 'center',
  },
  bookCount: {
    fontSize: 15,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing[3],
  },
  description: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 20,
    textAlign: 'center',
  },
  booksSection: {
    paddingHorizontal: theme.spacing[5],
    paddingTop: theme.spacing[5],
    paddingBottom: theme.spacing[32] + 60,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing[4],
  },
  booksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  bookWrapper: {
    width: '31%',
    marginBottom: theme.spacing[4],
  },
});
