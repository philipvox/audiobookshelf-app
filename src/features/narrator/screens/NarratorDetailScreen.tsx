/**
 * src/features/narrator/screens/NarratorDetailScreen.tsx
 *
 * Enhanced narrator detail screen with genre chips and view by series option.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLibraryCache } from '@/core/cache';
import { BookCard } from '@/shared/components/BookCard';
import { LibraryItem } from '@/core/types';
import { TOP_NAV_HEIGHT } from '@/constants/layout';

type NarratorDetailRouteParams = {
  NarratorDetail: { narratorName: string };
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (size / 402) * SCREEN_WIDTH;

const BG_COLOR = '#1a1a1a';
const ACCENT = '#c1f40c';
const NARRATOR_COLOR = '#4A90D9';
const AVATAR_SIZE = scale(100);

type SortType = 'title' | 'recent' | 'published';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'all' | 'series';

export function NarratorDetailScreen() {
  const route = useRoute<RouteProp<NarratorDetailRouteParams, 'NarratorDetail'>>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { narratorName } = route.params;

  const [sortBy, setSortBy] = useState<SortType>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>('all');

  const { getNarrator, isLoaded } = useLibraryCache();

  // Get narrator data from cache
  const narratorInfo = useMemo(() => {
    if (!isLoaded || !narratorName) return null;
    return getNarrator(narratorName);
  }, [isLoaded, narratorName, getNarrator]);

  // Extract unique genres from narrator's books
  const genres = useMemo(() => {
    if (!narratorInfo?.books) return [];
    const genreSet = new Set<string>();
    narratorInfo.books.forEach(book => {
      const metadata = book.media?.metadata as any;
      if (metadata?.genres) {
        metadata.genres.forEach((g: string) => genreSet.add(g));
      }
    });
    return Array.from(genreSet).slice(0, 5);
  }, [narratorInfo?.books]);

  // Group books by series
  const booksBySeries = useMemo(() => {
    if (!narratorInfo?.books) return [];

    const seriesMap = new Map<string, LibraryItem[]>();
    const standalone: LibraryItem[] = [];

    narratorInfo.books.forEach(book => {
      const metadata = book.media?.metadata as any;
      const seriesName = metadata?.seriesName;

      if (seriesName) {
        const cleanSeriesName = seriesName.split('#')[0].trim();
        if (!seriesMap.has(cleanSeriesName)) {
          seriesMap.set(cleanSeriesName, []);
        }
        seriesMap.get(cleanSeriesName)!.push(book);
      } else {
        standalone.push(book);
      }
    });

    const sections: { title: string; data: LibraryItem[] }[] = [];

    seriesMap.forEach((books, seriesName) => {
      const sortedBooks = books.sort((a, b) => {
        const aSeq = parseFloat(((a.media?.metadata as any)?.seriesName || '').match(/#([\d.]+)/)?.[1] || '999');
        const bSeq = parseFloat(((b.media?.metadata as any)?.seriesName || '').match(/#([\d.]+)/)?.[1] || '999');
        return aSeq - bSeq;
      });
      sections.push({ title: seriesName, data: sortedBooks });
    });

    sections.sort((a, b) => a.title.localeCompare(b.title));

    if (standalone.length > 0) {
      sections.push({ title: 'Other Books', data: standalone });
    }

    return sections;
  }, [narratorInfo?.books]);

  // Sorted books for flat list view
  const sortedBooks = useMemo(() => {
    if (!narratorInfo?.books) return [];
    const sorted = [...narratorInfo.books];
    const direction = sortDirection === 'asc' ? 1 : -1;

    switch (sortBy) {
      case 'title':
        return sorted.sort((a, b) =>
          direction * ((a.media?.metadata as any)?.title || '').localeCompare(
            (b.media?.metadata as any)?.title || ''
          )
        );
      case 'recent':
        return sorted.sort((a, b) => direction * ((a.addedAt || 0) - (b.addedAt || 0)));
      case 'published':
        return sorted.sort((a, b) => {
          const aYear = parseInt((a.media?.metadata as any)?.publishedYear || '0', 10);
          const bYear = parseInt((b.media?.metadata as any)?.publishedYear || '0', 10);
          return direction * (aYear - bYear);
        });
      default:
        return sorted;
    }
  }, [narratorInfo?.books, sortBy, sortDirection]);

  const handleSortPress = (type: SortType) => {
    if (sortBy === type) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(type);
      setSortDirection('asc');
    }
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Main');
    }
  };

  const handleBookPress = useCallback((book: LibraryItem) => {
    navigation.navigate('BookDetail', { id: book.id });
  }, [navigation]);

  const handleGenrePress = useCallback((genre: string) => {
    navigation.navigate('GenreDetail', { genre });
  }, [navigation]);

  const handleSeriesPress = useCallback((seriesName: string) => {
    navigation.navigate('SeriesDetail', { seriesName });
  }, [navigation]);

  // Generate initials
  const initials = narratorName
    .split(' ')
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Loading state
  if (!isLoaded) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor={BG_COLOR} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  // Not found state
  if (!narratorInfo) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor={BG_COLOR} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
            <Ionicons name="chevron-back" size={scale(24)} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Narrator</Text>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="mic-outline" size={scale(48)} color="rgba(255,255,255,0.3)" />
          <Text style={styles.emptyTitle}>Narrator not found</Text>
          <Text style={styles.emptySubtitle}>This narrator may have been removed</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BG_COLOR} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + TOP_NAV_HEIGHT + scale(10) }]}>
        <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={scale(24)} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Narrator</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Narrator Info */}
        <View style={styles.narratorHeader}>
          <View style={styles.avatarContainer}>
            <Text style={styles.initialsText}>{initials}</Text>
          </View>
          <Text style={styles.narratorName}>{narratorInfo.name}</Text>
          <Text style={styles.bookCount}>
            {narratorInfo.bookCount} {narratorInfo.bookCount === 1 ? 'book' : 'books'} narrated
          </Text>
        </View>

        {/* Genre Chips */}
        {genres.length > 0 && (
          <View style={styles.genreSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genreScroll}>
              {genres.map(genre => (
                <TouchableOpacity
                  key={genre}
                  style={styles.genreChip}
                  onPress={() => handleGenrePress(genre)}
                >
                  <Ionicons name="pricetag-outline" size={scale(12)} color="rgba(255,255,255,0.6)" />
                  <Text style={styles.genreChipText}>{genre}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* View Toggle & Sort */}
        <View style={styles.controlsSection}>
          <View style={styles.viewToggle}>
            <Text style={styles.viewLabel}>View:</Text>
            <TouchableOpacity
              style={[styles.viewButton, viewMode === 'all' && styles.viewButtonActive]}
              onPress={() => setViewMode('all')}
            >
              <Text style={[styles.viewButtonText, viewMode === 'all' && styles.viewButtonTextActive]}>
                All Books
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewButton, viewMode === 'series' && styles.viewButtonActive]}
              onPress={() => setViewMode('series')}
            >
              <Text style={[styles.viewButtonText, viewMode === 'series' && styles.viewButtonTextActive]}>
                By Series
              </Text>
            </TouchableOpacity>
          </View>

          {viewMode === 'all' && (
            <View style={styles.sortRow}>
              <Text style={styles.sortLabel}>Sort:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.sortButtons}>
                  {(['title', 'recent', 'published'] as SortType[]).map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.sortButton, sortBy === type && styles.sortButtonActive]}
                      onPress={() => handleSortPress(type)}
                    >
                      {sortBy === type && (
                        <Ionicons
                          name={sortDirection === 'asc' ? 'arrow-up' : 'arrow-down'}
                          size={scale(12)}
                          color="#000"
                        />
                      )}
                      <Text style={[styles.sortButtonText, sortBy === type && styles.sortButtonTextActive]}>
                        {type === 'title' ? (sortDirection === 'asc' && sortBy === 'title' ? 'A-Z' : sortDirection === 'desc' && sortBy === 'title' ? 'Z-A' : 'Title') :
                         type === 'recent' ? 'Recent' : 'Published'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
        </View>

        {/* Book List */}
        {viewMode === 'all' ? (
          <View style={styles.bookList}>
            {sortedBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onPress={() => handleBookPress(book)}
                showListeningProgress={true}
              />
            ))}
          </View>
        ) : (
          <View style={styles.seriesList}>
            {booksBySeries.map((section) => (
              <View key={section.title} style={styles.seriesSection}>
                <TouchableOpacity
                  style={styles.seriesSectionHeader}
                  onPress={() => section.title !== 'Other Books' && handleSeriesPress(section.title)}
                  disabled={section.title === 'Other Books'}
                >
                  <Text style={styles.seriesSectionTitle}>{section.title}</Text>
                  <Text style={styles.seriesSectionCount}>
                    {section.data.length} book{section.data.length !== 1 ? 's' : ''}
                  </Text>
                  {section.title !== 'Other Books' && (
                    <Ionicons name="chevron-forward" size={scale(16)} color="rgba(255,255,255,0.4)" />
                  )}
                </TouchableOpacity>
                {section.data.map((book) => {
                  const metadata = book.media?.metadata as any;
                  const sequence = metadata?.seriesName?.match(/#([\d.]+)/)?.[1];
                  return (
                    <BookCard
                      key={book.id}
                      book={book}
                      onPress={() => handleBookPress(book)}
                      showListeningProgress={true}
                      sequenceNumber={sequence ? parseFloat(sequence) : undefined}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(12),
    paddingBottom: scale(12),
  },
  headerButton: {
    width: scale(40),
    height: scale(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: scale(17),
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: scale(16),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(40),
  },
  emptyTitle: {
    color: '#fff',
    fontSize: scale(18),
    fontWeight: '600',
    marginTop: scale(16),
  },
  emptySubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: scale(14),
    marginTop: scale(4),
    textAlign: 'center',
  },
  narratorHeader: {
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingTop: scale(10),
    paddingBottom: scale(16),
  },
  avatarContainer: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: NARRATOR_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(16),
  },
  initialsText: {
    fontSize: scale(40),
    fontWeight: '700',
    color: '#fff',
  },
  narratorName: {
    fontSize: scale(22),
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: scale(4),
  },
  bookCount: {
    fontSize: scale(14),
    color: 'rgba(255,255,255,0.5)',
  },
  // Genre chips
  genreSection: {
    marginBottom: scale(16),
  },
  genreScroll: {
    paddingHorizontal: scale(16),
    gap: scale(8),
    flexDirection: 'row',
  },
  genreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: scale(16),
  },
  genreChipText: {
    fontSize: scale(13),
    color: 'rgba(255,255,255,0.8)',
  },
  // Controls
  controlsSection: {
    paddingHorizontal: scale(16),
    marginBottom: scale(16),
  },
  viewToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: scale(12),
  },
  viewLabel: {
    fontSize: scale(14),
    color: 'rgba(255,255,255,0.5)',
  },
  viewButton: {
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: scale(8),
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  viewButtonActive: {
    backgroundColor: ACCENT,
  },
  viewButtonText: {
    fontSize: scale(13),
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  viewButtonTextActive: {
    color: '#000',
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  sortLabel: {
    fontSize: scale(14),
    color: 'rgba(255,255,255,0.5)',
  },
  sortButtons: {
    flexDirection: 'row',
    gap: scale(8),
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderRadius: scale(8),
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  sortButtonActive: {
    backgroundColor: ACCENT,
  },
  sortButtonText: {
    fontSize: scale(12),
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  sortButtonTextActive: {
    color: '#000',
  },
  // Book list
  bookList: {
    // BookCard handles its own styling
  },
  // Series list
  seriesList: {
    paddingHorizontal: scale(16),
  },
  seriesSection: {
    marginBottom: scale(20),
  },
  seriesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(10),
    paddingHorizontal: scale(12),
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: scale(10),
    marginBottom: scale(8),
  },
  seriesSectionTitle: {
    flex: 1,
    fontSize: scale(15),
    fontWeight: '600',
    color: '#fff',
  },
  seriesSectionCount: {
    fontSize: scale(12),
    color: 'rgba(255,255,255,0.5)',
    marginRight: scale(4),
  },
});
