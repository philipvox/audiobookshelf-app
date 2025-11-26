// File: src/features/narrator/screens/NarratorDetailScreen.tsx
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api';
import { useDefaultLibrary } from '@/features/library/hooks/useDefaultLibrary';
import { HorizontalBookItem } from '@/features/library/components/HorizontalBookItem';
import { LoadingSpinner, EmptyState, ErrorView } from '@/shared/components';
import { Icon } from '@/shared/components/Icon';
import { theme } from '@/shared/theme';

type NarratorDetailRouteParams = {
  NarratorDetail: { narratorName: string };
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const AVATAR_SIZE = SCREEN_WIDTH * 0.35;

type TabType = 'overview' | 'details';
type SortType = 'title-asc' | 'title-desc' | 'recent';

export function NarratorDetailScreen() {
  const route = useRoute<RouteProp<NarratorDetailRouteParams, 'NarratorDetail'>>();
  const navigation = useNavigation();
  const narratorName = route.params?.narratorName || '';
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [sortBy, setSortBy] = useState<SortType>('title-asc');

  const { library } = useDefaultLibrary();

  const { data: books = [], isLoading, error, refetch } = useQuery({
    queryKey: ['narrator-books', narratorName, library?.id],
    queryFn: async () => {
      if (!library?.id || !narratorName) return [];
      
      try {
        const response = await apiClient.getLibraryItems(library.id, { 
          limit: 500,
          page: 0 
        });
        
        console.log('🔍 Searching for narrator:', narratorName);
        console.log('📚 Total items to search:', response.results.length);
        
        const searchName = narratorName.toLowerCase().trim();
        
        const filtered = response.results.filter((item: any, index: number) => {
          const narratorField = item.media?.metadata?.narratorName || '';
          
          // Log first 3 items to see format
          if (index < 3) {
            console.log(`Item ${index}: "${item.media?.metadata?.title}" - Narrator: "${narratorField}"`);
          }
          
          if (!narratorField) return false;
          
          // Split by comma and check if any narrator matches
          const narrators = narratorField.split(',').map((n: string) => n.trim().toLowerCase());
          const matches = narrators.some((narrator: string) => 
            narrator === searchName || 
            narrator.includes(searchName) || 
            searchName.includes(narrator)
          );
          
          if (matches) {
            console.log('✅ Match found:', item.media?.metadata?.title);
          }
          
          return matches;
        });
        
        console.log('✨ Total matches:', filtered.length);
        return filtered;
      } catch (err) {
        console.error('Failed to fetch narrator books:', err);
        throw err;
      }
    },
    enabled: !!library?.id && !!narratorName,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const sortedBooks = useMemo(() => {
    const sorted = [...books];
    switch (sortBy) {
      case 'title-asc':
        return sorted.sort((a, b) => 
          (a.media?.metadata?.title || '').localeCompare(b.media?.metadata?.title || '')
        );
      case 'title-desc':
        return sorted.sort((a, b) => 
          (b.media?.metadata?.title || '').localeCompare(a.media?.metadata?.title || '')
        );
      case 'recent':
        return sorted.sort((a, b) => 
          (b.addedAt || 0) - (a.addedAt || 0)
        );
      default:
        return sorted;
    }
  }, [books, sortBy]);

  if (!narratorName) {
    return (
      <EmptyState
        icon="❌"
        message="Invalid narrator"
        description="Narrator name not provided"
      />
    );
  }

  if (isLoading) {
    return <LoadingSpinner text="Loading narrator..." />;
  }

  if (error) {
    return <ErrorView message="Failed to load narrator" onRetry={refetch} />;
  }

  const initials = narratorName
    .split(' ')
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background.primary} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={22} color={theme.colors.text.primary} set="ionicons" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Narrator</Text>
        <TouchableOpacity style={styles.headerButton}>
          <Icon name="heart-outline" size={22} color={theme.colors.primary[500]} set="ionicons" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.topSection}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, styles.placeholderAvatar]}>
              <Text style={styles.initialsText}>{initials}</Text>
            </View>
          </View>

          <View style={styles.infoSide}>
            <Text style={styles.name} numberOfLines={2}>{narratorName}</Text>
            <Text style={styles.bookCount}>
              {books.length} {books.length === 1 ? 'book' : 'books'}
            </Text>
          </View>
        </View>

        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
              Overview
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'details' && styles.tabActive]}
            onPress={() => setActiveTab('details')}
          >
            <Text style={[styles.tabText, activeTab === 'details' && styles.tabTextActive]}>
              Details
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabContent}>
          {activeTab === 'overview' && (
            <View style={styles.overviewContent}>
              {sortedBooks.length > 0 ? (
                <View style={styles.booksSection}>
                  <View style={styles.booksSectionHeader}>
                    <Text style={styles.sectionTitle}>All Books</Text>
                    <View style={styles.sortButtons}>
                      <TouchableOpacity
                        style={[styles.sortButton, sortBy === 'title-asc' && styles.sortButtonActive]}
                        onPress={() => setSortBy('title-asc')}
                      >
                        <Icon name="arrow-up" size={14} color={sortBy === 'title-asc' ? theme.colors.text.primary : theme.colors.text.tertiary} set="ionicons" />
                        <Text style={[styles.sortButtonText, sortBy === 'title-asc' && styles.sortButtonTextActive]}>A-Z</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.sortButton, sortBy === 'title-desc' && styles.sortButtonActive]}
                        onPress={() => setSortBy('title-desc')}
                      >
                        <Icon name="arrow-down" size={14} color={sortBy === 'title-desc' ? theme.colors.text.primary : theme.colors.text.tertiary} set="ionicons" />
                        <Text style={[styles.sortButtonText, sortBy === 'title-desc' && styles.sortButtonTextActive]}>Z-A</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.sortButton, sortBy === 'recent' && styles.sortButtonActive]}
                        onPress={() => setSortBy('recent')}
                      >
                        <Icon name="time-outline" size={14} color={sortBy === 'recent' ? theme.colors.text.primary : theme.colors.text.tertiary} set="ionicons" />
                        <Text style={[styles.sortButtonText, sortBy === 'recent' && styles.sortButtonTextActive]}>Recent</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  {sortedBooks.map((book: any) => (
                    <HorizontalBookItem key={book.id} book={book} />
                  ))}
                </View>
              ) : (
                <EmptyState
                  icon="🎙️"
                  message="No books found"
                  description="This narrator doesn't have any books yet"
                />
              )}
            </View>
          )}

          {activeTab === 'details' && (
            <View style={styles.detailsContent}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Name</Text>
                <Text style={styles.detailValue}>{narratorName}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Books Narrated</Text>
                <Text style={styles.detailValue}>{books.length}</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  topSection: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing[5],
    paddingTop: theme.spacing[2],
    paddingBottom: theme.spacing[4],
  },
  avatarContainer: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: theme.colors.neutral[200],
    ...theme.elevation.medium,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  placeholderAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.semantic.info,
  },
  initialsText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  infoSide: {
    flex: 1,
    marginLeft: theme.spacing[4],
    paddingTop: theme.spacing[1],
    justifyContent: 'center',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing[1],
    lineHeight: 28,
  },
  bookCount: {
    fontSize: 15,
    color: theme.colors.text.secondary,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing[5],
    paddingTop: theme.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  tab: {
    paddingVertical: theme.spacing[3],
    marginRight: theme.spacing[6],
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: theme.colors.text.primary,
  },
  tabText: {
    fontSize: 14,
    color: theme.colors.text.tertiary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: theme.colors.text.primary,
    fontWeight: '600',
  },
  tabContent: {
    paddingTop: theme.spacing[4],
    paddingBottom: theme.spacing[32] + 80,
  },
  overviewContent: {
    paddingHorizontal: theme.spacing[5],
  },
  booksSection: {
    marginTop: theme.spacing[2],
  },
  booksSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[3],
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: theme.spacing[2],
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.radius.small,
    backgroundColor: theme.colors.neutral[100],
  },
  sortButtonActive: {
    backgroundColor: theme.colors.primary[100],
  },
  sortButtonText: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
    fontWeight: '500',
  },
  sortButtonTextActive: {
    color: theme.colors.text.primary,
    fontWeight: '600',
  },
  detailsContent: {
    paddingHorizontal: theme.spacing[5],
  },
  detailRow: {
    marginBottom: theme.spacing[4],
  },
  detailLabel: {
    fontSize: 13,
    color: theme.colors.text.tertiary,
    marginBottom: theme.spacing[1],
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 15,
    color: theme.colors.text.primary,
    lineHeight: 22,
  },
});