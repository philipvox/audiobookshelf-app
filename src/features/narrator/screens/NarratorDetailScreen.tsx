import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useDefaultLibrary } from '@/features/library/hooks/useDefaultLibrary';
import { BookCard } from '@/features/library/components/BookCard';
import { LoadingSpinner, EmptyState } from '@/shared/components';
import { Icon } from '@/shared/components/Icon';
import { theme } from '@/shared/theme';
import { NarratorInfo } from '../hooks/useNarrators';

type NarratorDetailRouteParams = {
  NarratorDetail: { narratorId: string; narratorName: string };
};

export function NarratorDetailScreen() {
  const route = useRoute<RouteProp<NarratorDetailRouteParams, 'NarratorDetail'>>();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { narratorId, narratorName } = route.params;
  const { library } = useDefaultLibrary();

  // Get narrator from cached data
  const narrators = queryClient.getQueryData<NarratorInfo[]>(['narrators', library?.id]) || [];
  const narrator = narrators.find((n) => n.id === narratorId);
  const books = narrator?.books || [];

  if (!library) {
    return <LoadingSpinner text="Loading..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={24} color={theme.colors.text.primary} set="ionicons" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={books}
        keyExtractor={(item) => item.id}
        numColumns={3}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.avatar}>
              <Icon name="mic" size={48} color={theme.colors.text.tertiary} set="ionicons" />
            </View>
            <Text style={styles.narratorName}>{narratorName}</Text>
            <Text style={styles.bookCount}>
              {books.length} {books.length === 1 ? 'book' : 'books'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.bookWrapper}>
            <BookCard book={item} />
          </View>
        )}
        ListEmptyComponent={
          <EmptyState icon="📚" message="No books found" description="No books by this narrator" />
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
  headerBar: {
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[2],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.neutral[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    paddingVertical: theme.spacing[5],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
    marginBottom: theme.spacing[4],
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing[3],
  },
  narratorName: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing[1],
    textAlign: 'center',
  },
  bookCount: {
    fontSize: 15,
    color: theme.colors.text.secondary,
  },
  listContent: {
    paddingHorizontal: theme.spacing[4],
    paddingBottom: theme.spacing[32] + 60,
  },
  row: {
    justifyContent: 'flex-start',
    gap: theme.spacing[3],
  },
  bookWrapper: {
    width: '31%',
    marginBottom: theme.spacing[4],
  },
});