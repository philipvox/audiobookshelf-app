/**
 * src/features/narrators/screens/NarratorDetailScreen.tsx
 *
 * Screen showing narrator details and their books.
 */

import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNarrators } from '../hooks/useNarrators';
import { useDefaultLibrary } from '@/features/library/hooks/useDefaultLibrary';
import { BookCard } from '@/features/library/components/BookCard';
import { LoadingSpinner, EmptyState, ErrorView } from '@/shared/components';
import { Icon } from '@/shared/components/Icon';
import { theme } from '@/shared/theme';

type NarratorDetailRouteParams = {
  NarratorDetail: {
    narratorId: string;
  };
};

type NarratorDetailRouteProp = RouteProp<NarratorDetailRouteParams, 'NarratorDetail'>;

export function NarratorDetailScreen() {
  const route = useRoute<NarratorDetailRouteProp>();
  const navigation = useNavigation();
  const { narratorId } = route.params;

  const { library } = useDefaultLibrary();
  const { narrators, isLoading, error, refetch } = useNarrators(library?.id || '');

  const narrator = narrators.find((n) => n.id === narratorId);
  const books = narrator?.books || [];

  if (isLoading) {
    return <LoadingSpinner text="Loading narrator..." />;
  }

  if (error) {
    return <ErrorView message="Failed to load narrator" onRetry={refetch} />;
  }

  if (!narrator) {
    return (
      <EmptyState
        icon="❌"
        message="Narrator not found"
        description="This narrator may have been removed"
      />
    );
  }

  // Generate initials for avatar
  const initials = narrator.name
    .split(' ')
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Generate a consistent color based on name
  const colorIndex = narrator.name.charCodeAt(0) % 5;
  const avatarColors = [
    theme.colors.primary[500],
    theme.colors.semantic.success,
    theme.colors.semantic.warning,
    theme.colors.semantic.info,
    theme.colors.neutral[600],
  ];

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
          <View style={[styles.avatar, { backgroundColor: avatarColors[colorIndex] }]}>
            <Text style={styles.initials}>{initials}</Text>
          </View>

          <Text style={styles.narratorName}>{narrator.name}</Text>
          <Text style={styles.bookCount}>
            {books.length} {books.length === 1 ? 'book' : 'books'}
          </Text>
        </View>

        {books.length > 0 && (
          <View style={styles.booksSection}>
            <Text style={styles.sectionTitle}>Books</Text>
            <View style={styles.booksGrid}>
              {books.map((book) => (
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
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing[4],
    ...theme.elevation.medium,
  },
  initials: {
    fontSize: 48,
    fontWeight: '700',
    color: theme.colors.text.inverse,
  },
  narratorName: {
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