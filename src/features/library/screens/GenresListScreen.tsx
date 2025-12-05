/**
 * src/features/library/screens/GenresListScreen.tsx
 *
 * Browse all genres from the library.
 * Uses library cache for instant loading.
 * Shows genre cards with 4 book cover grid.
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  RefreshControl,
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLibraryCache, getAllGenres } from '@/core/cache';
import { apiClient } from '@/core/api';
import { Icon } from '@/shared/components/Icon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BG_COLOR = '#000000';
const CARD_COLOR = '#2a2a2a';
const ACCENT = '#CCFF00';
const PADDING = 16;
const GAP = 12;
const COLUMNS = 2;
const CARD_WIDTH = (SCREEN_WIDTH - PADDING * 2 - GAP) / COLUMNS;
const COVER_GRID_SIZE = CARD_WIDTH - 24; // Padding inside card
const COVER_SIZE = (COVER_GRID_SIZE - 8) / 2; // 2x2 grid with gap

type SortType = 'name' | 'count';
type SortDirection = 'asc' | 'desc';

export function GenresListScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortType>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { refreshCache, isLoaded, filterItems } = useLibraryCache();

  const allGenres = useMemo(() => getAllGenres(), [isLoaded]);

  // Filter genres by search query
  const filteredGenres = useMemo(() => {
    if (!searchQuery.trim()) return allGenres;
    const lowerQuery = searchQuery.toLowerCase();
    return allGenres.filter(g => g.toLowerCase().includes(lowerQuery));
  }, [allGenres, searchQuery]);

  // Get book counts and covers for each genre
  const genresWithData = useMemo(() => {
    return filteredGenres.map((genre) => {
      const books = filterItems({ genres: [genre] });
      // Get up to 4 book covers
      const coverIds = books.slice(0, 4).map(b => b.id);
      return {
        name: genre,
        bookCount: books.length,
        coverIds,
      };
    });
  }, [filteredGenres, filterItems]);

  const sortedGenres = useMemo(() => {
    const sorted = [...genresWithData];
    const direction = sortDirection === 'asc' ? 1 : -1;

    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => direction * a.name.localeCompare(b.name));
        break;
      case 'count':
        sorted.sort((a, b) => direction * (a.bookCount - b.bookCount));
        break;
    }

    return sorted;
  }, [genresWithData, sortBy, sortDirection]);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Main');
    }
  };

  const handleGenrePress = (genreName: string) => {
    navigation.navigate('GenreDetail', { genreName });
  };

  const handleSortPress = (type: SortType) => {
    if (sortBy === type) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(type);
      setSortDirection('asc');
    }
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshCache();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshCache]);

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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BG_COLOR} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
          <Icon name="chevron-back" size={24} color="#FFFFFF" set="ionicons" />
        </TouchableOpacity>
        <View style={styles.searchContainer}>
          <Icon name="search" size={18} color="rgba(255,255,255,0.5)" set="ionicons" />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search genres..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Icon name="close-circle" size={18} color="rgba(255,255,255,0.5)" set="ionicons" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Sort Bar */}
      <View style={styles.sortBar}>
        <Text style={styles.resultCount}>{sortedGenres.length} genres</Text>
        <View style={styles.sortButtons}>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'name' && styles.sortButtonActive]}
            onPress={() => handleSortPress('name')}
          >
            <Icon
              name={sortBy === 'name' ? (sortDirection === 'asc' ? 'arrow-up' : 'arrow-down') : 'swap-vertical'}
              size={14}
              color={sortBy === 'name' ? '#000' : 'rgba(255,255,255,0.6)'}
              set="ionicons"
            />
            <Text style={[styles.sortButtonText, sortBy === 'name' && styles.sortButtonTextActive]}>
              {sortBy === 'name' ? (sortDirection === 'asc' ? 'A-Z' : 'Z-A') : 'Name'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'count' && styles.sortButtonActive]}
            onPress={() => handleSortPress('count')}
          >
            <Icon
              name={sortBy === 'count' ? (sortDirection === 'asc' ? 'arrow-up' : 'arrow-down') : 'library-outline'}
              size={14}
              color={sortBy === 'count' ? '#000' : 'rgba(255,255,255,0.6)'}
              set="ionicons"
            />
            <Text style={[styles.sortButtonText, sortBy === 'count' && styles.sortButtonTextActive]}>Books</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={sortedGenres}
        keyExtractor={(item) => item.name}
        numColumns={2}
        contentContainerStyle={[styles.grid, { paddingBottom: 100 + insets.bottom }]}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={6}
        windowSize={5}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={ACCENT}
          />
        }
        renderItem={({ item: genre }) => (
          <TouchableOpacity
            style={styles.genreCard}
            onPress={() => handleGenrePress(genre.name)}
            activeOpacity={0.7}
          >
            {/* 2x2 Cover Grid */}
            <View style={styles.coverGrid}>
              {[0, 1, 2, 3].map((idx) => (
                <View key={idx} style={styles.coverSlot}>
                  {genre.coverIds[idx] ? (
                    <Image
                      source={apiClient.getItemCoverUrl(genre.coverIds[idx])}
                      style={styles.coverImage}
                      contentFit="cover"
                      transition={150}
                    />
                  ) : (
                    <View style={styles.coverPlaceholder} />
                  )}
                </View>
              ))}
            </View>

            {/* Genre Name and Count */}
            <View style={styles.cardFooter}>
              <Text style={styles.genreName} numberOfLines={1}>{genre.name}</Text>
              <Text style={styles.bookCount}>{genre.bookCount}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
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
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  headerButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_COLOR,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    marginLeft: 8,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
  },
  sortBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: PADDING,
    paddingBottom: 12,
  },
  resultCount: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: CARD_COLOR,
  },
  sortButtonActive: {
    backgroundColor: ACCENT,
  },
  sortButtonText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  sortButtonTextActive: {
    color: '#000',
  },
  content: {
    flex: 1,
  },
  grid: {
    paddingHorizontal: PADDING,
  },
  columnWrapper: {
    gap: GAP,
    marginBottom: GAP,
  },
  genreCard: {
    width: CARD_WIDTH,
    marginBottom: 8,
  },
  coverGrid: {
    width: COVER_GRID_SIZE,
    height: COVER_GRID_SIZE,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  coverSlot: {
    width: COVER_SIZE,
    height: COVER_SIZE,
    borderRadius: 4,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  genreName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    flex: 1,
  },
  bookCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
});
