// File: src/features/library/screens/LibraryItemsScreen.tsx
import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useAuth } from '@/core/auth';
import { useLibraryPrefetch } from '@/core/hooks';
import { BookCard } from '../components/BookCard';
import { useDefaultLibrary } from '../hooks/useDefaultLibrary';
import { useLibraryItems } from '../hooks/useLibraryItems';
import { TopNavBar } from '@/navigation/components/TopNavBar';
import { LoadingSpinner, ErrorView, EmptyState } from '@/shared/components';
import { LibraryItem } from '@/core/types';
import { theme } from '@/shared/theme';

const SCREEN_PADDING = theme.spacing[5];
const NUM_COLUMNS = 3;

function GreetingHeader() {
  const { user } = useAuth();
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    
    if (hour < 12) {
      return 'Good morning';
    } else if (hour < 18) {
      return 'Good afternoon';
    } else {
      return 'Good evening';
    }
  };

  return (
    <View style={styles.greetingContainer}>
      <Text style={styles.greeting}>{getGreeting()}</Text>
      <Text style={styles.subGreeting}>We have some fantastic books for you.</Text>
    </View>
  );
}

export function LibraryItemsScreen() {
  const { library, isLoading: isLoadingLibrary, error: libraryError } = useDefaultLibrary();
  const { items, isLoading: isLoadingItems, error: itemsError, refetch } = useLibraryItems(library?.id || '', {
    limit: 50,
  });

  // Prefetch all data for other tabs
  useLibraryPrefetch(library?.id);

  const renderItem = ({ item }: { item: LibraryItem }) => (
    <BookCard book={item} />
  );

  if (isLoadingLibrary || (isLoadingItems && items.length === 0)) {
    return <LoadingSpinner text="Loading library..." />;
  }

  if (libraryError) {
    return <ErrorView message="Failed to load library" onRetry={refetch} />;
  }

  if (!library) {
    return (
      <EmptyState
        message="No libraries found"
        description="Please add a library in AudiobookShelf"
        icon="📚"
      />
    );
  }

  if (itemsError) {
    return <ErrorView message="Failed to load books" onRetry={refetch} />;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        message="Your library is empty"
        description="Add some audiobooks to get started"
        icon="📖"
      />
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background.primary} />
      <TopNavBar />
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={NUM_COLUMNS}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<GreetingHeader />}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingItems}
            onRefresh={refetch}
            tintColor={theme.colors.primary[500]}
          />
        }
        removeClippedSubviews={true}
        maxToRenderPerBatch={12}
        updateCellsBatchingPeriod={50}
        windowSize={10}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  listContent: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: theme.spacing[2],
    paddingBottom: theme.spacing[32] + 80,
  },
  greetingContainer: {
    paddingBottom: theme.spacing[5],
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing[1],
    letterSpacing: -0.5,
  },
  subGreeting: {
    fontSize: 15,
    color: theme.colors.text.secondary,
    fontWeight: '400',
  },
  row: {
    justifyContent: 'space-between',
    paddingBottom: theme.spacing[3],
  },
});