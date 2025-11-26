// File: src/features/series/screens/SeriesDetailScreen.tsx
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
import { useLibrarySeries } from '../hooks/useLibrarySeries';
import { useDefaultLibrary } from '@/features/library/hooks/useDefaultLibrary';
import { HorizontalBookItem } from '@/features/library/components/HorizontalBookItem';
import { StackedBookCovers } from '../components/StackedBookCovers';
import { LoadingSpinner, EmptyState, ErrorView } from '@/shared/components';
import { Icon } from '@/shared/components/Icon';
import { theme } from '@/shared/theme';

type SeriesDetailRouteParams = {
  SeriesDetail: { seriesId: string };
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const FAN_WIDTH = SCREEN_WIDTH * 0.88;

type TabType = 'overview' | 'details';
type SortType = 'series-asc' | 'series-desc';

function getBookSequence(book: any, seriesId: string): number {
  const metadata = book.media?.metadata;
  if (!metadata) return 999999;
  
  if (metadata.series && Array.isArray(metadata.series)) {
    const matchingSeries = metadata.series.find((s: any) => s.id === seriesId);
    if (matchingSeries?.sequence !== undefined && matchingSeries?.sequence !== null) {
      const parsed = parseFloat(String(matchingSeries.sequence));
      if (!isNaN(parsed)) return parsed;
    }
  }
  
  if (metadata.sequence !== undefined && metadata.sequence !== null) {
    const parsed = parseFloat(String(metadata.sequence));
    if (!isNaN(parsed)) return parsed;
  }
  
  const title = metadata.title || '';
  const bookNumberMatch = title.match(/Book\s+(\d+)/i);
  if (bookNumberMatch) {
    return parseInt(bookNumberMatch[1], 10);
  }
  
  return 999999;
}

export function SeriesDetailScreen() {
  const route = useRoute<RouteProp<SeriesDetailRouteParams, 'SeriesDetail'>>();
  const navigation = useNavigation();
  const { seriesId } = route.params;
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [sortBy, setSortBy] = useState<SortType>('series-asc');

  const { library } = useDefaultLibrary();
  const { series: allSeries, isLoading, error, refetch } = useLibrarySeries(library?.id || '');

  const series = allSeries.find(s => s.id === seriesId);
  const books = series?.books || [];

  const sortedBooks = useMemo(() => {
    const sorted = [...books];
    
    sorted.sort((a, b) => {
      const seqA = getBookSequence(a, seriesId);
      const seqB = getBookSequence(b, seriesId);
      
      if (seqA !== seqB) {
        return sortBy === 'series-asc' ? seqA - seqB : seqB - seqA;
      }
      
      const titleA = (a.media?.metadata?.title || '').toLowerCase();
      const titleB = (b.media?.metadata?.title || '').toLowerCase();
      return titleA.localeCompare(titleB);
    });
    
    return sorted;
  }, [books, sortBy, seriesId]);

  if (isLoading) {
    return <LoadingSpinner text="Loading series..." />;
  }

  if (error) {
    return <ErrorView message="Failed to load series" onRetry={refetch} />;
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

  const bookIds = sortedBooks.map(b => b.id);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background.primary} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={22} color={theme.colors.text.primary} set="ionicons" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Series</Text>
        <TouchableOpacity style={styles.headerButton}>
          <Icon name="heart-outline" size={22} color={theme.colors.primary[500]} set="ionicons" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.coverSection}>
          {bookIds.length > 0 ? (
            <StackedBookCovers bookIds={bookIds} size={FAN_WIDTH} />
          ) : (
            <View style={styles.placeholderCover}>
              <Text style={styles.placeholderText}>📚</Text>
            </View>
          )}
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.name} numberOfLines={2}>{series.name}</Text>
          <Text style={styles.bookCount}>
            {books.length} {books.length === 1 ? 'book' : 'books'}
          </Text>
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
              {series.description && (
                <Text style={styles.description}>{series.description}</Text>
              )}

              {sortedBooks.length > 0 && (
                <View style={styles.booksSection}>
                  <View style={styles.booksSectionHeader}>
                    <Text style={styles.sectionTitle}>All Books</Text>
                    <View style={styles.sortButtons}>
                      <TouchableOpacity
                        style={[styles.sortButton, sortBy === 'series-asc' && styles.sortButtonActive]}
                        onPress={() => setSortBy('series-asc')}
                      >
                        <Icon name="arrow-up" size={14} color={sortBy === 'series-asc' ? theme.colors.text.primary : theme.colors.text.tertiary} set="ionicons" />
                        <Text style={[styles.sortButtonText, sortBy === 'series-asc' && styles.sortButtonTextActive]}>1-{books.length}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.sortButton, sortBy === 'series-desc' && styles.sortButtonActive]}
                        onPress={() => setSortBy('series-desc')}
                      >
                        <Icon name="arrow-down" size={14} color={sortBy === 'series-desc' ? theme.colors.text.primary : theme.colors.text.tertiary} set="ionicons" />
                        <Text style={[styles.sortButtonText, sortBy === 'series-desc' && styles.sortButtonTextActive]}>{books.length}-1</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  {sortedBooks.map((book: any) => (
                    <HorizontalBookItem key={book.id} book={book} />
                  ))}
                </View>
              )}

              {!series.description && sortedBooks.length === 0 && (
                <EmptyState
                  icon="📝"
                  message="No information available"
                  description="Series description and books not found"
                />
              )}
            </View>
          )}

          {activeTab === 'details' && (
            <View style={styles.detailsContent}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Series Name</Text>
                <Text style={styles.detailValue}>{series.name}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Books</Text>
                <Text style={styles.detailValue}>{books.length}</Text>
              </View>
              {series.description && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={styles.detailValue}>{series.description}</Text>
                </View>
              )}
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
  coverSection: {
    alignItems: 'center',
    paddingTop: theme.spacing[2],
    paddingBottom: theme.spacing[4],
  },
  placeholderCover: {
    width: 100,
    height: 150,
    borderRadius: theme.radius.large,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.neutral[300],
  },
  placeholderText: {
    fontSize: 56,
  },
  infoSection: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing[5],
    paddingBottom: theme.spacing[3],
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing[1],
    textAlign: 'center',
    lineHeight: 26,
  },
  bookCount: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing[5],
    paddingTop: theme.spacing[2],
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
  description: {
    fontSize: 15,
    color: theme.colors.text.secondary,
    lineHeight: 22,
    marginBottom: theme.spacing[5],
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