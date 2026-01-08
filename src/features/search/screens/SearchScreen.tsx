/**
 * src/features/search/screens/SearchScreen.tsx
 *
 * Enhanced search screen based on NNGroup/Baymard UX research:
 * - Autocomplete with author thumbnails (enhanced from simple text)
 * - Darkened background when autocomplete active
 * - Debounced search (300ms)
 * - Typo tolerance with fuzzy matching
 * - "Did you mean" suggestions for no results
 * - Audiobook-specific metadata (narrator, duration, download status)
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Keyboard,
  Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useLibraryCache, getAllGenres, getAllAuthors, getAllSeries, getAllNarrators, useCoverUrl, type FilterOptions } from '@/core/cache';
import { usePlayerStore } from '@/features/player';
import { apiClient } from '@/core/api';
import { downloadManager, DownloadTask } from '@/core/services/downloadManager';
import { Icon } from '@/shared/components/Icon';
import { HeartButton, SeriesHeartButton, SearchResultsSkeleton, AuthorRowSkeleton } from '@/shared/components';
import { BookCard } from '@/shared/components/BookCard';
import { LibraryItem } from '@/core/types';
import { TOP_NAV_HEIGHT, SCREEN_BOTTOM_PADDING } from '@/constants/layout';
import { fuzzyMatch, findSuggestions, expandAbbreviations } from '../utils/fuzzySearch';
import { useTheme, wp, spacing, radius } from '@/shared/theme';
import { useThemeColors, useIsDarkMode, useColors } from '@/shared/theme/themeStore';
import { useKidModeStore } from '@/shared/stores/kidModeStore';
import { filterForKidMode } from '@/shared/utils/kidModeFilter';
import { logger } from '@/shared/utils/logger';
import { useToast } from '@/shared/hooks/useToast';

const SCREEN_WIDTH = wp(100);
const GAP = spacing.sm;
const CARD_RADIUS = radius.sm;
const PADDING = spacing.lg;

const SEARCH_HISTORY_KEY = 'search_history_v1';
const MAX_HISTORY = 10;
const DEBOUNCE_MS = 300; // Debounce delay for search

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Series card constants - fanned cover design (matches genre cards)
const SERIES_CARD_WIDTH = (SCREEN_WIDTH - PADDING * 2 - GAP) / 2;
const SERIES_COVER_WIDTH = 65;
const SERIES_COVER_HEIGHT = 95;
// Fanned cover dimensions matching SeriesListScreen
const COVER_SIZE = 60;
const FAN_OFFSET = 18;
const FAN_ROTATION = 8;
const FAN_VERTICAL_OFFSET = 6;
const MAX_VISIBLE_BOOKS = 5;

type SortOption = 'title' | 'author' | 'dateAdded' | 'duration';
type FilterTab = 'all' | 'genres' | 'authors' | 'series' | 'duration';

// Quick duration filters
const DURATION_FILTERS = [
  { label: 'Any', min: undefined, max: undefined },
  { label: '< 5h', min: undefined, max: 5 },
  { label: '5-10h', min: 5, max: 10 },
  { label: '10-20h', min: 10, max: 20 },
  { label: '20h+', min: 20, max: undefined },
];

// SeriesCard component is now defined inside SearchScreen to access styles

type SearchScreenParams = {
  genre?: string;
};

export function SearchScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ Search: SearchScreenParams }, 'Search'>>();
  const inputRef = useRef<TextInput>(null);
  const { loadBook, isLoading: isPlayerLoading, currentBook } = usePlayerStore();

  // Theme-aware colors
  const { colors: themeColors } = useTheme();
  const storeColors = useThemeColors();
  const isDarkMode = useIsDarkMode();
  const BG_COLOR = storeColors.background;
  // In dark mode, use transparent/subtle backgrounds - content floats on black
  const CARD_COLOR = isDarkMode ? 'rgba(255,255,255,0.06)' : '#F5F5F5';
  const SURFACE_ELEVATED = isDarkMode ? 'rgba(255,255,255,0.08)' : '#FFFFFF';
  const colorsHook = useColors();
  const ACCENT = colorsHook.accent.primary; // Dynamic accent from theme
  const TEXT_PRIMARY = storeColors.text;
  const TEXT_SECONDARY = storeColors.textSecondary;
  const TEXT_TERTIARY = storeColors.textTertiary;
  const BORDER_DEFAULT = storeColors.border;

  // Theme-aware styles
  const styles = useMemo(() => createStyles({
    BG_COLOR,
    CARD_COLOR,
    SURFACE_ELEVATED,
    ACCENT,
    TEXT_PRIMARY,
    TEXT_SECONDARY,
    TEXT_TERTIARY,
    BORDER_DEFAULT,
    isDarkMode,
  }), [BG_COLOR, CARD_COLOR, SURFACE_ELEVATED, ACCENT, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, BORDER_DEFAULT, isDarkMode]);

  // SeriesCard component - fanned cover design (matches SeriesListScreen)
  const SeriesCard = useCallback(({
    series,
    onPress,
  }: {
    series: { name: string; bookCount: number; books: LibraryItem[] };
    onPress: () => void;
  }) => {
    const bookCovers = series.books.slice(0, MAX_VISIBLE_BOOKS).map(b => apiClient.getItemCoverUrl(b.id));
    const numCovers = bookCovers.length;

    return (
      <TouchableOpacity
        style={styles.seriesCard}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityLabel={`${series.name}, ${series.bookCount} books`}
        accessibilityRole="button"
      >
        {/* Heart button - top right */}
        <SeriesHeartButton
          seriesName={series.name}
          size={10}
          showCircle
          style={styles.seriesHeartButton}
        />

        {/* Fanned cover stack */}
        <View style={styles.coverFan}>
          {numCovers > 0 ? (
            <View style={[styles.fanContainer, { width: COVER_SIZE + (numCovers - 1) * FAN_OFFSET }]}>
              {bookCovers.map((coverUrl, idx) => {
                const middleIndex = (numCovers - 1) / 2;
                const rotation = (idx - middleIndex) * FAN_ROTATION;
                const distanceFromCenter = Math.abs(idx - middleIndex);
                const zIndex = numCovers - Math.floor(distanceFromCenter);
                const scaleValue = 1 - (distanceFromCenter * 0.12);
                const coverSize = COVER_SIZE * scaleValue;
                const sizeOffset = (COVER_SIZE - coverSize) / 2;
                const verticalOffset = sizeOffset + (distanceFromCenter * FAN_VERTICAL_OFFSET);
                const horizontalOffset = idx * FAN_OFFSET + sizeOffset;

                return (
                  <Image
                    key={idx}
                    source={coverUrl}
                    style={[
                      styles.fanCover,
                      {
                        width: coverSize,
                        height: coverSize,
                        left: horizontalOffset,
                        top: verticalOffset,
                        zIndex,
                        transform: [{ rotate: `${rotation}deg` }],
                      },
                    ]}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                );
              })}
            </View>
          ) : (
            <View style={styles.fanPlaceholder} />
          )}
        </View>

        {/* Series Info */}
        <Text style={styles.seriesName} numberOfLines={2}>{series.name}</Text>
        <Text style={styles.seriesCount}>{series.bookCount} {series.bookCount === 1 ? 'book' : 'books'}</Text>
      </TouchableOpacity>
    );
  }, [styles]);

  // Search state
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState<FilterTab>('all');
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Debounced query for search (300ms delay per research)
  const debouncedQuery = useDebounce(query, DEBOUNCE_MS);

  // Show autocomplete when typing (but not for committed searches)
  const [hasCommittedSearch, setHasCommittedSearch] = useState(false);
  const showAutocomplete = query.length > 0 && isInputFocused && !hasCommittedSearch;

  // Previous searches
  const [previousSearches, setPreviousSearches] = useState<string[]>([]);

  // Filter state - initialize with route params if present
  const [selectedGenres, setSelectedGenres] = useState<string[]>(() => {
    return route.params?.genre ? [route.params.genre] : [];
  });
  const [selectedAuthors, setSelectedAuthors] = useState<string[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<string[]>([]);
  const [durationFilter, setDurationFilter] = useState<{ min?: number; max?: number }>({});

  // Sort state
  const [sortBy, setSortBy] = useState<SortOption>('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Kid Mode filter state
  const kidModeEnabled = useKidModeStore((state) => state.enabled);

  // Toast for error feedback
  const { showError } = useToast();

  // Get cached data
  const { filterItems, isLoaded } = useLibraryCache();

  // Get filter options from cache
  const allGenres = useMemo(() => getAllGenres(), [isLoaded]);
  const allAuthors = useMemo(() => getAllAuthors(), [isLoaded]);
  const allNarrators = useMemo(() => getAllNarrators(), [isLoaded]);
  const allSeries = useMemo(() => getAllSeries(), [isLoaded]);

  // Download status tracking
  const [downloadTasks, setDownloadTasks] = useState<Map<string, DownloadTask>>(new Map());

  // Subscribe to download status changes
  useEffect(() => {
    const unsubscribe = downloadManager.subscribe((tasks) => {
      const taskMap = new Map<string, DownloadTask>();
      for (const task of tasks) {
        taskMap.set(task.itemId, task);
      }
      setDownloadTasks(taskMap);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Load previous searches on mount
  useEffect(() => {
    loadPreviousSearches();
  }, []);

  const loadPreviousSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
      if (stored) {
        setPreviousSearches(JSON.parse(stored));
      }
    } catch (err) {
      logger.error('Failed to load search history:', err);
    }
  };

  const saveSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    try {
      const updated = [searchQuery, ...previousSearches.filter(s => s !== searchQuery)].slice(0, MAX_HISTORY);
      setPreviousSearches(updated);
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
    } catch (err) {
      logger.error('Failed to save search:', err);
    }
  };

  const clearSearchHistory = async () => {
    try {
      setPreviousSearches([]);
      await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch (err) {
      logger.error('Failed to clear search history:', err);
      showError('Failed to clear search history. Please try again.');
    }
  };

  const removeFromHistory = async (searchToRemove: string) => {
    try {
      const updated = previousSearches.filter(s => s !== searchToRemove);
      setPreviousSearches(updated);
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
    } catch (err) {
      logger.error('Failed to remove from history:', err);
      showError('Failed to remove search item. Please try again.');
    }
  };

  // Build filter options - use debounced query for full results
  const filters: FilterOptions = useMemo(() => ({
    query: debouncedQuery.trim(),
    genres: selectedGenres.length > 0 ? selectedGenres : undefined,
    authors: selectedAuthors.length > 0 ? selectedAuthors : undefined,
    series: selectedSeries.length > 0 ? selectedSeries : undefined,
    minDuration: durationFilter.min,
    maxDuration: durationFilter.max,
    sortBy,
    sortOrder,
  }), [debouncedQuery, selectedGenres, selectedAuthors, selectedSeries, durationFilter, sortBy, sortOrder]);

  // Check if we have any active search/filters (use debounced for results)
  const hasActiveSearch = debouncedQuery.trim().length > 0 || selectedGenres.length > 0 ||
    selectedAuthors.length > 0 || selectedSeries.length > 0 ||
    durationFilter.min !== undefined || durationFilter.max !== undefined;

  // Filter book results with fuzzy matching
  const bookResults = useMemo(() => {
    if (!hasActiveSearch) return [];

    // Get base results from cache
    let results = filterItems(filters);

    // If query has results, use them; otherwise try fuzzy matching
    if (results.length === 0 && debouncedQuery.trim()) {
      // Try expanded abbreviations
      const expanded = expandAbbreviations(debouncedQuery);
      for (const term of expanded) {
        if (term !== debouncedQuery) {
          const expandedResults = filterItems({ ...filters, query: term });
          if (expandedResults.length > 0) {
            results = expandedResults;
            break;
          }
        }
      }
    }

    // Apply Kid Mode filter
    results = filterForKidMode(results, kidModeEnabled);

    return results.slice(0, 100);
  }, [filterItems, filters, hasActiveSearch, debouncedQuery, kidModeEnabled]);

  // Filter authors matching query (with fuzzy matching)
  const authorResults = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    return allAuthors
      .filter(a => fuzzyMatch(debouncedQuery, a.name, 0.6))
      .slice(0, 20);
  }, [debouncedQuery, allAuthors]);

  // Filter narrators matching query (with fuzzy matching)
  const narratorResults = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    return allNarrators
      .filter(n => fuzzyMatch(debouncedQuery, n.name, 0.6))
      .slice(0, 20);
  }, [debouncedQuery, allNarrators]);

  // Filter series matching query (with fuzzy matching)
  const seriesResults = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    return allSeries
      .filter(s => fuzzyMatch(debouncedQuery, s.name, 0.6))
      .slice(0, 20);
  }, [debouncedQuery, allSeries]);

  // ============================================================================
  // AUTOCOMPLETE SUGGESTIONS (simple text, max 6 on mobile per research)
  // ============================================================================

  // Autocomplete uses instant query (not debounced) for responsiveness
  const autocompleteSuggestions = useMemo(() => {
    if (!query.trim() || query.length < 2) return { books: [], authors: [], series: [], narrators: [] };

    const lowerQuery = query.toLowerCase();

    // Books - simple text, max 2 (per research: 4-6 total suggestions)
    // Apply Kid Mode filter to autocomplete results
    const filteredBooks = filterForKidMode(filterItems({ query: query.trim() }), kidModeEnabled);
    const books = filteredBooks
      .slice(0, 2)
      .map(book => {
        const metadata = book.media?.metadata as any;
        const media = book.media as any;
        const duration = media?.duration || 0;
        const hours = Math.floor(duration / 3600);
        const mins = Math.floor((duration % 3600) / 60);
        const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        return {
          id: book.id,
          title: metadata?.title || 'Unknown',
          author: metadata?.authorName || metadata?.authors?.[0]?.name || 'Unknown',
          duration: durationStr,
        };
      });

    // Authors - max 2 (with image data for thumbnails)
    // FIX 3: Use fuzzyMatch for consistent matching (accent/space-insensitive)
    const authors = allAuthors
      .filter(a => fuzzyMatch(query, a.name))
      .slice(0, 2)
      .map(a => ({
        name: a.name,
        bookCount: a.bookCount,
        id: a.id,
        imagePath: a.imagePath,
      }));

    // Series - max 1
    // FIX 3: Use fuzzyMatch for consistent matching
    const series = allSeries
      .filter(s => fuzzyMatch(query, s.name))
      .slice(0, 1)
      .map(s => ({ name: s.name, bookCount: s.bookCount }));

    // Narrators - max 1
    // FIX 3: Use fuzzyMatch for consistent matching
    const narrators = allNarrators
      .filter(n => fuzzyMatch(query, n.name))
      .slice(0, 1)
      .map(n => ({ name: n.name, bookCount: n.bookCount }));

    return { books, authors, series, narrators };
  }, [query, filterItems, allAuthors, allSeries, allNarrators, kidModeEnabled]);

  // "Did you mean" suggestions when no results
  const spellingSuggestions = useMemo(() => {
    if (!hasActiveSearch || bookResults.length > 0 || authorResults.length > 0) {
      return [];
    }

    // Find similar author names
    const authorNames = allAuthors.map(a => a.name);
    const authorSuggestions = findSuggestions(debouncedQuery, authorNames, 2, 0.5);

    // Find similar series names
    const seriesNames = allSeries.map(s => s.name);
    const seriesSuggestions = findSuggestions(debouncedQuery, seriesNames, 1, 0.5);

    return [...authorSuggestions, ...seriesSuggestions].slice(0, 3);
  }, [hasActiveSearch, bookResults, authorResults, debouncedQuery, allAuthors, allSeries]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedGenres.length > 0) count++;
    if (selectedAuthors.length > 0) count++;
    if (selectedSeries.length > 0) count++;
    if (durationFilter.min || durationFilter.max) count++;
    return count;
  }, [selectedGenres, selectedAuthors, selectedSeries, durationFilter]);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleClear = () => {
    setQuery('');
    setSelectedGenres([]);
    setSelectedAuthors([]);
    setSelectedSeries([]);
    setDurationFilter({});
    setHasCommittedSearch(false);
    inputRef.current?.focus();
  };

  const handleSearch = () => {
    if (query.trim()) {
      saveSearch(query.trim());
      setHasCommittedSearch(true);
      Keyboard.dismiss();
    }
  };

  const handlePreviousSearchPress = (search: string) => {
    setQuery(search);
    setHasCommittedSearch(true);
    saveSearch(search);
    Keyboard.dismiss();
  };

  const handleInputFocus = () => {
    setIsInputFocused(true);
    setHasCommittedSearch(false);
  };

  const handleInputBlur = () => {
    // Small delay to allow taps on autocomplete items
    setTimeout(() => setIsInputFocused(false), 150);
  };

  const dismissAutocomplete = () => {
    setIsInputFocused(false);
    setHasCommittedSearch(true);
    Keyboard.dismiss();
  };

  // Handle autocomplete selection
  const handleAutocompleteBook = (bookId: string) => {
    setHasCommittedSearch(true);
    Keyboard.dismiss();
    navigation.navigate('BookDetail', { id: bookId });
  };

  const handleAutocompleteAuthor = (authorName: string) => {
    setQuery(authorName);
    setHasCommittedSearch(true);
    saveSearch(authorName);
    Keyboard.dismiss();
    navigation.navigate('AuthorDetail', { authorName });
  };

  const handleAutocompleteSeries = (seriesName: string) => {
    setQuery(seriesName);
    setHasCommittedSearch(true);
    saveSearch(seriesName);
    Keyboard.dismiss();
    navigation.navigate('SeriesDetail', { seriesName });
  };

  const handleAutocompleteNarrator = (narratorName: string) => {
    setQuery(narratorName);
    setHasCommittedSearch(true);
    saveSearch(narratorName);
    Keyboard.dismiss();
    navigation.navigate('NarratorDetail', { narratorName });
  };

  // Handle "Did you mean" suggestion tap
  const handleSpellingSuggestion = (text: string) => {
    setQuery(text);
    setHasCommittedSearch(false);
    saveSearch(text);
  };

  const handleBookPress = useCallback((book: LibraryItem) => {
    Keyboard.dismiss();
    if (query.trim()) saveSearch(query.trim());
    navigation.navigate('BookDetail', { id: book.id });
  }, [navigation, query]);

  const handlePlayBook = useCallback(async (book: LibraryItem) => {
    Keyboard.dismiss();
    if (query.trim()) saveSearch(query.trim());
    try {
      const fullBook = await apiClient.getItem(book.id);
      await loadBook(fullBook, { autoPlay: true, showPlayer: false });
    } catch {
      await loadBook(book, { autoPlay: true, showPlayer: false });
    }
  }, [loadBook, query]);

  const handleAuthorPress = (authorName: string) => {
    Keyboard.dismiss();
    if (query.trim()) saveSearch(query.trim());
    navigation.navigate('AuthorDetail', { authorName });
  };

  const handleNarratorPress = (narratorName: string) => {
    Keyboard.dismiss();
    if (query.trim()) saveSearch(query.trim());
    navigation.navigate('NarratorDetail', { narratorName });
  };

  const handleSeriesPress = (seriesName: string) => {
    Keyboard.dismiss();
    if (query.trim()) saveSearch(query.trim());
    navigation.navigate('SeriesDetail', { seriesName });
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  };

  const toggleAuthor = (author: string) => {
    setSelectedAuthors(prev =>
      prev.includes(author) ? prev.filter(a => a !== author) : [...prev, author]
    );
  };

  const toggleSeries = (series: string) => {
    setSelectedSeries(prev =>
      prev.includes(series) ? prev.filter(s => s !== series) : [...prev, series]
    );
  };

  const handleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(option);
      setSortOrder('asc');
    }
  };

  // Get initials for avatar
  const getInitials = (name: string) => name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  // Check if we have any results
  const hasResults = bookResults.length > 0 || seriesResults.length > 0 ||
    authorResults.length > 0 || narratorResults.length > 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle={storeColors.statusBar} backgroundColor={BG_COLOR} />

      {/* Header - stays above autocomplete overlay */}
      <View style={[styles.header, { paddingTop: insets.top + TOP_NAV_HEIGHT + 10, zIndex: 30, backgroundColor: BG_COLOR }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Icon name="ChevronLeft" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>

        <View style={styles.searchContainer}>
          <Icon name="Search" size={18} color={TEXT_TERTIARY} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search books, authors, series..."
            placeholderTextColor={TEXT_TERTIARY}
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              setHasCommittedSearch(false);
            }}
            onSubmitEditing={handleSearch}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            autoFocus
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Search"
            accessibilityHint="Search books, authors, series, or narrators"
          />
          {(query.length > 0 || activeFilterCount > 0) && (
            <TouchableOpacity
              onPress={handleClear}
              style={styles.clearButton}
              accessibilityLabel="Clear search"
              accessibilityRole="button"
            >
              <Icon name="XCircle" size={18} color={TEXT_TERTIARY} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.filterButton, showFilters && styles.filterButtonActive]}
          onPress={() => setShowFilters(!showFilters)}
          accessibilityLabel={`Filters${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ''}`}
          accessibilityRole="button"
          accessibilityState={{ expanded: showFilters }}
        >
          <Icon name="Settings" size={20} color={showFilters ? '#000' : TEXT_PRIMARY} />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Filter Panel */}
      {showFilters && (
        <View style={styles.filterPanel}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterTabs}>
            {(['all', 'genres', 'authors', 'series', 'duration'] as FilterTab[]).map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.filterTab, activeFilterTab === tab && styles.filterTabActive]}
                onPress={() => setActiveFilterTab(tab)}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeFilterTab === tab }}
                accessibilityLabel={tab.charAt(0).toUpperCase() + tab.slice(1)}
              >
                <Text style={[styles.filterTabText, activeFilterTab === tab && styles.filterTabTextActive]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {activeFilterTab === 'all' && (
            <View style={styles.sortSection}>
              <Text style={styles.sortLabel}>Sort by:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {(['title', 'author', 'dateAdded', 'duration'] as SortOption[]).map(option => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.sortChip, sortBy === option && styles.sortChipActive]}
                    onPress={() => handleSort(option)}
                  >
                    <Text style={[styles.sortChipText, sortBy === option && styles.sortChipTextActive]}>
                      {option === 'dateAdded' ? 'Date' : option.charAt(0).toUpperCase() + option.slice(1)}
                    </Text>
                    {sortBy === option && (
                      <Icon name={sortOrder === 'asc' ? 'ArrowUp' : 'ArrowDown'} size={12} color="#000" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {activeFilterTab === 'genres' && (
            <ScrollView style={styles.filterContent} showsVerticalScrollIndicator={false}>
              <View style={styles.chipGrid}>
                {allGenres.map(genre => (
                  <TouchableOpacity
                    key={genre}
                    style={[styles.chip, selectedGenres.includes(genre) && styles.chipActive]}
                    onPress={() => toggleGenre(genre)}
                  >
                    <Text style={[styles.chipText, selectedGenres.includes(genre) && styles.chipTextActive]}>
                      {genre}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}

          {activeFilterTab === 'authors' && (
            <ScrollView style={styles.filterContent} showsVerticalScrollIndicator={false}>
              <View style={styles.chipGrid}>
                {allAuthors.slice(0, 50).map(author => (
                  <TouchableOpacity
                    key={author.name}
                    style={[styles.chip, selectedAuthors.includes(author.name) && styles.chipActive]}
                    onPress={() => toggleAuthor(author.name)}
                  >
                    <Text style={[styles.chipText, selectedAuthors.includes(author.name) && styles.chipTextActive]}>
                      {author.name} ({author.bookCount})
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}

          {activeFilterTab === 'series' && (
            <ScrollView style={styles.filterContent} showsVerticalScrollIndicator={false}>
              <View style={styles.chipGrid}>
                {allSeries.slice(0, 50).map(series => (
                  <TouchableOpacity
                    key={series.name}
                    style={[styles.chip, selectedSeries.includes(series.name) && styles.chipActive]}
                    onPress={() => toggleSeries(series.name)}
                  >
                    <Text style={[styles.chipText, selectedSeries.includes(series.name) && styles.chipTextActive]}>
                      {series.name} ({series.bookCount})
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}

          {activeFilterTab === 'duration' && (
            <View style={styles.durationFilters}>
              {DURATION_FILTERS.map((df, idx) => {
                const isActive = durationFilter.min === df.min && durationFilter.max === df.max;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.durationChip, isActive && styles.durationChipActive]}
                    onPress={() => setDurationFilter({ min: df.min, max: df.max })}
                  >
                    <Text style={[styles.durationChipText, isActive && styles.durationChipTextActive]}>
                      {df.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* Autocomplete Overlay (with author thumbnails for enhanced discoverability) */}
      {showAutocomplete && (
        <>
          {/* Darkened background per Baymard research */}
          <Pressable style={styles.autocompleteBackdrop} onPress={dismissAutocomplete} />

          <View style={[styles.autocompleteContainer, { top: insets.top + TOP_NAV_HEIGHT + 10 + 44 + 12 }]}>
            {/* Books */}
            {autocompleteSuggestions.books.length > 0 && (
              <View style={styles.autocompleteSectionContainer}>
                <Text style={styles.autocompleteSection}>BOOKS</Text>
                {autocompleteSuggestions.books.map((book) => (
                  <TouchableOpacity
                    key={book.id}
                    style={styles.autocompleteItem}
                    onPress={() => handleAutocompleteBook(book.id)}
                    accessibilityLabel={`${book.title} by ${book.author}, ${book.duration}`}
                    accessibilityRole="button"
                    accessibilityHint="Double tap to view book"
                  >
                    <View style={styles.autocompleteItemContent}>
                      <Text style={styles.autocompleteTitle} numberOfLines={1}>{book.title}</Text>
                      <Text style={styles.autocompleteMeta}>{book.author} · {book.duration}</Text>
                    </View>
                    <Icon name="ChevronRight" size={16} color={TEXT_TERTIARY} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Authors */}
            {autocompleteSuggestions.authors.length > 0 && (
              <View style={styles.autocompleteSectionContainer}>
                <Text style={styles.autocompleteSection}>AUTHORS</Text>
                {autocompleteSuggestions.authors.map((author) => {
                  const imageUrl = author.id && author.imagePath
                    ? apiClient.getAuthorImageUrl(author.id)
                    : null;
                  const initials = author.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
                  return (
                    <TouchableOpacity
                      key={author.name}
                      style={styles.autocompleteItem}
                      onPress={() => handleAutocompleteAuthor(author.name)}
                      accessibilityLabel={`Author: ${author.name}, ${author.bookCount} books`}
                      accessibilityRole="button"
                      accessibilityHint="Double tap to view author"
                    >
                      {/* Author Thumbnail */}
                      {imageUrl ? (
                        <Image source={imageUrl} style={styles.autocompleteThumbnail} contentFit="cover" />
                      ) : (
                        <View style={[styles.autocompleteThumbnail, styles.autocompleteThumbnailPlaceholder]}>
                          <Text style={styles.autocompleteThumbnailInitials}>{initials}</Text>
                        </View>
                      )}
                      <View style={styles.autocompleteItemContent}>
                        <Text style={styles.autocompleteTitle}>{author.name}</Text>
                        <Text style={styles.autocompleteMeta}>{author.bookCount} books</Text>
                      </View>
                      <Icon name="ChevronRight" size={16} color={TEXT_TERTIARY} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Series */}
            {autocompleteSuggestions.series.length > 0 && (
              <View style={styles.autocompleteSectionContainer}>
                <Text style={styles.autocompleteSection}>SERIES</Text>
                {autocompleteSuggestions.series.map((series) => (
                  <TouchableOpacity
                    key={series.name}
                    style={styles.autocompleteItem}
                    onPress={() => handleAutocompleteSeries(series.name)}
                    accessibilityLabel={`Series: ${series.name}, ${series.bookCount} books`}
                    accessibilityRole="button"
                    accessibilityHint="Double tap to view series"
                  >
                    <View style={styles.autocompleteItemContent}>
                      <Text style={styles.autocompleteTitle}>{series.name}</Text>
                      <Text style={styles.autocompleteMeta}>{series.bookCount} books</Text>
                    </View>
                    <Icon name="ChevronRight" size={16} color={TEXT_TERTIARY} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Narrators */}
            {autocompleteSuggestions.narrators.length > 0 && (
              <View style={styles.autocompleteSectionContainer}>
                <Text style={styles.autocompleteSection}>NARRATORS</Text>
                {autocompleteSuggestions.narrators.map((narrator) => (
                  <TouchableOpacity
                    key={narrator.name}
                    style={styles.autocompleteItem}
                    onPress={() => handleAutocompleteNarrator(narrator.name)}
                    accessibilityLabel={`Narrator: ${narrator.name}, ${narrator.bookCount} books`}
                    accessibilityRole="button"
                    accessibilityHint="Double tap to view narrator"
                  >
                    <View style={styles.autocompleteItemContent}>
                      <Text style={styles.autocompleteTitle}>{narrator.name}</Text>
                      <Text style={styles.autocompleteMeta}>{narrator.bookCount} books narrated</Text>
                    </View>
                    <Icon name="ChevronRight" size={16} color={TEXT_TERTIARY} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* No autocomplete results */}
            {autocompleteSuggestions.books.length === 0 &&
              autocompleteSuggestions.authors.length === 0 &&
              autocompleteSuggestions.series.length === 0 &&
              autocompleteSuggestions.narrators.length === 0 && (
                <View style={styles.noAutocomplete}>
                  <Text style={styles.noAutocompleteText}>Press search to find results</Text>
                </View>
              )}
          </View>
        </>
      )}

      {/* Results */}
      <ScrollView
        style={styles.results}
        contentContainerStyle={[styles.resultsContent, { paddingBottom: SCREEN_BOTTOM_PADDING + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Loading state - show skeleton while cache loads */}
        {!isLoaded && (
          <View style={styles.emptyStateContainer}>
            <SearchResultsSkeleton count={5} />
            <View style={{ marginTop: 24 }}>
              <AuthorRowSkeleton />
              <AuthorRowSkeleton style={{ marginTop: 8 }} />
            </View>
          </View>
        )}

        {/* Empty state - show previous searches */}
        {isLoaded && !hasActiveSearch && (
          <View style={styles.emptyStateContainer}>
            {previousSearches.length > 0 ? (
              <View style={styles.previousSearches}>
                <View style={styles.previousSearchesHeader}>
                  <Text style={styles.previousSearchesTitle}>Recent Searches</Text>
                  <TouchableOpacity onPress={clearSearchHistory}>
                    <Text style={styles.clearHistoryText}>Clear</Text>
                  </TouchableOpacity>
                </View>
                {previousSearches.map((search, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.previousSearchItem}
                    onPress={() => handlePreviousSearchPress(search)}
                  >
                    <Icon name="Clock" size={18} color={TEXT_TERTIARY} />
                    <Text style={styles.previousSearchText}>{search}</Text>
                    <TouchableOpacity
                      style={styles.removeSearchButton}
                      onPress={() => removeFromHistory(search)}
                    >
                      <Icon name="X" size={16} color={TEXT_TERTIARY} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Icon name="Search" size={48} color={TEXT_TERTIARY} />
                <Text style={styles.emptyTitle}>Search your library</Text>
                <Text style={styles.emptySubtitle}>Find books by title, author, narrator, or series</Text>
              </View>
            )}

            {/* Quick browse section */}
            <View style={styles.quickBrowse}>
              <Text style={styles.quickBrowseTitle}>Quick Browse</Text>
              <View style={styles.quickBrowseRow}>
                <TouchableOpacity style={styles.quickBrowseItem} onPress={() => navigation.navigate('GenresList')}>
                  <Icon name="Layers" size={24} color={ACCENT} />
                  <Text style={styles.quickBrowseItemText}>Genres</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickBrowseItem} onPress={() => navigation.navigate('AuthorsList')}>
                  <Icon name="User" size={24} color={ACCENT} />
                  <Text style={styles.quickBrowseItemText}>Authors</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.quickBrowseRow}>
                <TouchableOpacity style={styles.quickBrowseItem} onPress={() => navigation.navigate('SeriesList')}>
                  <Icon name="Library" size={24} color={ACCENT} />
                  <Text style={styles.quickBrowseItemText}>Series</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickBrowseItem} onPress={() => navigation.navigate('NarratorList')}>
                  <Icon name="Mic" size={24} color={ACCENT} />
                  <Text style={styles.quickBrowseItemText}>Narrators</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* No results - with "Did you mean" recovery (per NNGroup: never leave at dead end) */}
        {isLoaded && hasActiveSearch && !hasResults && (
          <View style={styles.noResultsContainer}>
            <View style={styles.noResultsHeader}>
              <Icon name="Search" size={40} color={TEXT_TERTIARY} />
              <Text style={styles.noResultsTitle}>No results for "{debouncedQuery}"</Text>
            </View>

            {/* Spelling suggestions */}
            {spellingSuggestions.length > 0 && (
              <View style={styles.spellingSuggestions}>
                <Text style={styles.didYouMean}>Did you mean:</Text>
                {spellingSuggestions.map((suggestion, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.suggestionItem}
                    onPress={() => handleSpellingSuggestion(suggestion.text)}
                  >
                    <Text style={styles.suggestionText}>{suggestion.text}</Text>
                    <Icon name="ArrowRight" size={16} color={ACCENT} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Browse categories recovery */}
            <View style={styles.browseRecovery}>
              <Text style={styles.browseRecoveryTitle}>Or browse popular categories</Text>
              <View style={styles.browseRecoveryGrid}>
                <TouchableOpacity
                  style={styles.browseRecoveryItem}
                  onPress={() => navigation.navigate('GenresList')}
                >
                  <Icon name="Layers" size={20} color={ACCENT} />
                  <Text style={styles.browseRecoveryText}>Genres</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.browseRecoveryItem}
                  onPress={() => navigation.navigate('AuthorsList')}
                >
                  <Icon name="User" size={20} color={ACCENT} />
                  <Text style={styles.browseRecoveryText}>Authors</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.browseRecoveryItem}
                  onPress={() => navigation.navigate('SeriesList')}
                >
                  <Icon name="Library" size={20} color={ACCENT} />
                  <Text style={styles.browseRecoveryText}>Series</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Tips */}
            <View style={styles.searchTips}>
              <Text style={styles.searchTipsTitle}>Search tips:</Text>
              <Text style={styles.searchTip}>• Check spelling of author/narrator names</Text>
              <Text style={styles.searchTip}>• Try searching by series name</Text>
              <Text style={styles.searchTip}>• Use fewer keywords</Text>
            </View>
          </View>
        )}

        {/* Unified Results - Books Section */}
        {hasActiveSearch && bookResults.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Books</Text>
              {bookResults.length > 5 && (
                <Text style={styles.sectionCount}>{bookResults.length} results</Text>
              )}
            </View>
            <View>
              {bookResults.slice(0, 5).map(book => (
                <BookCard
                  key={book.id}
                  book={book}
                  onPress={() => handleBookPress(book)}
                  onPlayPress={() => handlePlayBook(book)}
                  showListeningProgress={false}
                  layout="search"
                  showPlayOverlay={true}
                />
              ))}
            </View>
          </View>
        )}

        {/* Series Section (top 2 with fanned covers) */}
        {hasActiveSearch && seriesResults.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Series</Text>
              {seriesResults.length > 2 && (
                <TouchableOpacity onPress={() => navigation.navigate('SeriesList')}>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.seriesRow}>
              {seriesResults.slice(0, 2).map(series => (
                <SeriesCard
                  key={series.name}
                  series={series}
                  onPress={() => handleSeriesPress(series.name)}
                />
              ))}
            </View>
          </View>
        )}

        {/* Authors Section (top 2) - with thumbnails per UX research */}
        {hasActiveSearch && authorResults.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Authors</Text>
              {authorResults.length > 2 && (
                <TouchableOpacity onPress={() => navigation.navigate('AuthorList')}>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.entityList}>
              {authorResults.slice(0, 2).map(author => {
                const imageUrl = author.id && author.imagePath
                  ? apiClient.getAuthorImageUrl(author.id)
                  : null;
                return (
                  <TouchableOpacity
                    key={author.name}
                    style={styles.entityItem}
                    onPress={() => handleAuthorPress(author.name)}
                    accessibilityLabel={`${author.name}, ${author.bookCount} books`}
                    accessibilityRole="button"
                    accessibilityHint="Double tap to view author"
                  >
                    {imageUrl ? (
                      <Image source={imageUrl} style={styles.entityAvatarImage} contentFit="cover" />
                    ) : (
                      <View style={[styles.entityAvatar, { backgroundColor: ACCENT }]}>
                        <Text style={styles.entityAvatarText}>{getInitials(author.name)}</Text>
                      </View>
                    )}
                    <View style={styles.entityInfo}>
                      <Text style={styles.entityName}>{author.name}</Text>
                      <Text style={styles.entityMeta}>{author.bookCount} books</Text>
                    </View>
                    <Icon name="ChevronRight" size={20} color={TEXT_TERTIARY} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Narrators Section (top 2) */}
        {hasActiveSearch && narratorResults.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Narrators</Text>
              {narratorResults.length > 2 && (
                <TouchableOpacity onPress={() => navigation.navigate('NarratorList')}>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.entityList}>
              {narratorResults.slice(0, 2).map(narrator => (
                <TouchableOpacity
                  key={narrator.name}
                  style={styles.entityItem}
                  onPress={() => handleNarratorPress(narrator.name)}
                  accessibilityLabel={`${narrator.name}, ${narrator.bookCount} books narrated`}
                  accessibilityRole="button"
                  accessibilityHint="Double tap to view narrator"
                >
                  <View style={[styles.entityAvatar, { backgroundColor: '#4A90D9' }]}>
                    <Text style={styles.entityAvatarText}>{getInitials(narrator.name)}</Text>
                  </View>
                  <View style={styles.entityInfo}>
                    <Text style={styles.entityName}>{narrator.name}</Text>
                    <Text style={styles.entityMeta}>{narrator.bookCount} books narrated</Text>
                  </View>
                  <Icon name="ChevronRight" size={20} color={TEXT_TERTIARY} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// Theme colors interface for createStyles
interface ThemeColors {
  BG_COLOR: string;
  CARD_COLOR: string;
  SURFACE_ELEVATED: string;
  ACCENT: string;
  TEXT_PRIMARY: string;
  TEXT_SECONDARY: string;
  TEXT_TERTIARY: string;
  BORDER_DEFAULT: string;
  isDarkMode: boolean;
}

// Factory function for theme-aware styles
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.BG_COLOR,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.isDarkMode ? 'rgba(255,255,255,0.06)' : '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    color: colors.TEXT_PRIMARY,
    fontSize: 15,
    marginLeft: 8,
    paddingVertical: 8,
  },
  clearButton: {
    padding: 4,
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.isDarkMode ? 'rgba(255,255,255,0.06)' : '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: colors.ACCENT,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },

  // Filter Panel
  filterPanel: {
    backgroundColor: colors.isDarkMode ? 'transparent' : colors.CARD_COLOR,
    borderBottomWidth: 1,
    borderBottomColor: colors.BORDER_DEFAULT,
  },
  filterTabs: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 14,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.isDarkMode ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)',
  },
  filterTabActive: {
    backgroundColor: colors.ACCENT,
    borderColor: colors.ACCENT,
  },
  filterTabText: {
    color: colors.TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: '#000',
  },
  filterContent: {
    maxHeight: 150,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.isDarkMode ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)',
  },
  chipActive: {
    backgroundColor: colors.ACCENT,
    borderColor: colors.ACCENT,
  },
  chipText: {
    color: colors.TEXT_PRIMARY,
    fontSize: 12,
  },
  chipTextActive: {
    color: '#000',
  },
  sortSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  sortLabel: {
    color: colors.TEXT_TERTIARY,
    fontSize: 13,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.isDarkMode ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)',
    marginRight: 6,
    gap: 4,
  },
  sortChipActive: {
    backgroundColor: colors.ACCENT,
    borderColor: colors.ACCENT,
  },
  sortChipText: {
    color: colors.TEXT_PRIMARY,
    fontSize: 12,
  },
  sortChipTextActive: {
    color: '#000',
  },
  durationFilters: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  durationChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.isDarkMode ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)',
  },
  durationChipActive: {
    backgroundColor: colors.ACCENT,
    borderColor: colors.ACCENT,
  },
  durationChipText: {
    color: colors.TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '500',
  },
  durationChipTextActive: {
    color: '#000',
  },

  // Results
  results: {
    flex: 1,
    zIndex: 1,
  },
  resultsContent: {
    paddingTop: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: PADDING,
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: '700',
  },
  sectionCount: {
    color: colors.TEXT_TERTIARY,
    fontSize: 13,
  },
  viewAllText: {
    color: colors.TEXT_TERTIARY,
    fontSize: 14,
  },
  emptyStateContainer: {
    paddingHorizontal: PADDING,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    color: colors.TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    color: colors.TEXT_TERTIARY,
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },

  // Previous searches
  previousSearches: {
    marginBottom: 24,
  },
  previousSearchesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  previousSearchesTitle: {
    color: colors.TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '600',
  },
  clearHistoryText: {
    color: colors.ACCENT,
    fontSize: 14,
  },
  previousSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.BORDER_DEFAULT,
  },
  previousSearchText: {
    flex: 1,
    color: colors.TEXT_SECONDARY,
    fontSize: 15,
    marginLeft: 12,
  },
  removeSearchButton: {
    padding: 4,
  },

  // Quick browse
  quickBrowse: {
    marginTop: 8,
  },
  quickBrowseTitle: {
    color: colors.TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  quickBrowseRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  quickBrowseItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: CARD_RADIUS,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: colors.isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
  },
  quickBrowseItemText: {
    color: colors.TEXT_SECONDARY,
    fontSize: 13,
    marginTop: 8,
  },

  // Series row with fanned covers (matches genre cards)
  seriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: PADDING,
    gap: GAP,
  },
  seriesCard: {
    width: SERIES_CARD_WIDTH,
    padding: spacing.md,
    backgroundColor: colors.isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    borderRadius: radius.lg,
  },
  seriesHeartButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
  coverFan: {
    height: COVER_SIZE + 10,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fanContainer: {
    position: 'relative',
    height: COVER_SIZE,
  },
  fanCover: {
    position: 'absolute',
    width: COVER_SIZE,
    height: COVER_SIZE,
    borderRadius: 5,
    backgroundColor: 'rgba(128,128,128,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  fanPlaceholder: {
    width: COVER_SIZE,
    height: COVER_SIZE,
    borderRadius: 5,
    backgroundColor: colors.isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
  },
  seriesName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.TEXT_PRIMARY,
    lineHeight: 17,
    textAlign: 'center',
  },
  seriesCount: {
    fontSize: 11,
    color: colors.TEXT_TERTIARY,
    textAlign: 'center',
    marginTop: 2,
  },

  // Entity list (authors, narrators)
  entityList: {
    paddingHorizontal: PADDING,
  },
  entityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 0,
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
  },
  entityAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  entityAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.BORDER_DEFAULT,
  },
  entityAvatarText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  entityInfo: {
    flex: 1,
    marginLeft: 12,
  },
  entityName: {
    color: colors.TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '600',
  },
  entityMeta: {
    color: colors.TEXT_TERTIARY,
    fontSize: 13,
    marginTop: 2,
  },

  // Autocomplete styles
  autocompleteBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 10,
  },
  autocompleteContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: colors.isDarkMode ? '#1A1A1A' : colors.CARD_COLOR,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    maxHeight: 400,
    zIndex: 20,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: colors.isDarkMode ? 1 : 0,
    borderTopWidth: 0,
    borderColor: colors.isDarkMode ? 'rgba(255,255,255,0.1)' : 'transparent',
  },
  autocompleteSectionContainer: {
    marginBottom: 4,
  },
  autocompleteSection: {
    color: colors.TEXT_TERTIARY,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  autocompleteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  autocompleteItemContent: {
    flex: 1,
  },
  autocompleteTitle: {
    color: colors.TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '500',
  },
  autocompleteMeta: {
    color: colors.TEXT_TERTIARY,
    fontSize: 13,
    marginTop: 2,
  },
  autocompleteThumbnail: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    backgroundColor: colors.BORDER_DEFAULT,
  },
  autocompleteThumbnailPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.ACCENT,
  },
  autocompleteThumbnailInitials: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '700',
  },
  noAutocomplete: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  noAutocompleteText: {
    color: colors.TEXT_TERTIARY,
    fontSize: 14,
  },

  // No results recovery styles
  noResultsContainer: {
    paddingHorizontal: PADDING,
    paddingTop: 40,
  },
  noResultsHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  noResultsTitle: {
    color: colors.TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },

  // Spelling suggestions
  spellingSuggestions: {
    backgroundColor: colors.isDarkMode ? 'rgba(255,255,255,0.04)' : colors.CARD_COLOR,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: colors.isDarkMode ? 1 : 0,
    borderColor: colors.isDarkMode ? 'rgba(255,255,255,0.08)' : 'transparent',
  },
  didYouMean: {
    color: colors.TEXT_SECONDARY,
    fontSize: 14,
    marginBottom: 12,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.BORDER_DEFAULT,
  },
  suggestionText: {
    color: colors.ACCENT,
    fontSize: 16,
    fontWeight: '600',
  },

  // Browse recovery
  browseRecovery: {
    marginBottom: 24,
  },
  browseRecoveryTitle: {
    color: colors.TEXT_SECONDARY,
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  browseRecoveryGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  browseRecoveryItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.isDarkMode ? 'rgba(255,255,255,0.04)' : colors.CARD_COLOR,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 6,
    borderWidth: colors.isDarkMode ? 1 : 0,
    borderColor: colors.isDarkMode ? 'rgba(255,255,255,0.08)' : 'transparent',
  },
  browseRecoveryText: {
    color: colors.TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: '500',
  },

  // Search tips
  searchTips: {
    backgroundColor: colors.isDarkMode ? 'rgba(255,255,255,0.03)' : colors.BORDER_DEFAULT,
    borderRadius: 12,
    padding: 16,
    borderWidth: colors.isDarkMode ? 1 : 0,
    borderColor: colors.isDarkMode ? 'rgba(255,255,255,0.06)' : 'transparent',
  },
  searchTipsTitle: {
    color: colors.TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  searchTip: {
    color: colors.TEXT_TERTIARY,
    fontSize: 13,
    lineHeight: 20,
  },
});
