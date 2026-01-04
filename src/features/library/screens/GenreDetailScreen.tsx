/**
 * src/features/library/screens/GenreDetailScreen.tsx
 *
 * Shows all books in a specific genre with search functionality
 * and comprehensive sort options.
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  TextInput,
  Modal,
  Pressable,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Search,
  XCircle,
  Music,
  Clock,
  ArrowUp,
  ArrowDown,
  User,
  Timer,
  ChevronDown,
  Check,
  X,
  BookOpen,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useLibraryCache, getCoverUrl } from '@/core/cache';
import { BookCard } from '@/shared/components/BookCard';
import { Image } from 'expo-image';
import { TOP_NAV_HEIGHT, SCREEN_BOTTOM_PADDING } from '@/constants/layout';
import { accentColors, scale, spacing, radius } from '@/shared/theme';
import { useThemeColors } from '@/shared/theme/themeStore';

const ACCENT = accentColors.red;
const PADDING = 16;

type SortOption =
  | 'recentlyAdded'
  | 'titleAsc'
  | 'titleDesc'
  | 'authorAsc'
  | 'authorDesc'
  | 'durationAsc'
  | 'durationDesc';

interface SortConfig {
  id: SortOption;
  label: string;
  Icon: LucideIcon;
}

type GenreDetailParams = {
  genreName: string;
};

const SORT_OPTIONS: SortConfig[] = [
  { id: 'recentlyAdded', label: 'Recently Added', Icon: Clock },
  { id: 'titleAsc', label: 'Title A-Z', Icon: ArrowUp },
  { id: 'titleDesc', label: 'Title Z-A', Icon: ArrowDown },
  { id: 'authorAsc', label: 'Author A-Z', Icon: User },
  { id: 'authorDesc', label: 'Author Z-A', Icon: User },
  { id: 'durationAsc', label: 'Duration (Short to Long)', Icon: Timer },
  { id: 'durationDesc', label: 'Duration (Long to Short)', Icon: Timer },
];

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

// Stacked covers component for genre header
interface StackedCoversProps {
  bookIds: string[];
  size?: number;
}

function StackedCovers({ bookIds, size = 32 }: StackedCoversProps) {
  const displayIds = bookIds.slice(0, 3);
  const offset = size * 0.35;
  const totalWidth = size + (displayIds.length - 1) * offset;

  if (displayIds.length === 0) {
    // Fallback to music icon if no books
    return (
      <View style={[stackedStyles.fallback, { width: scale(48), height: scale(48) }]}>
        <Music size={scale(24)} color={ACCENT} strokeWidth={2} />
      </View>
    );
  }

  return (
    <View style={[stackedStyles.container, { width: totalWidth, height: size }]}>
      {displayIds.map((bookId, index) => (
        <Image
          key={bookId}
          source={{ uri: getCoverUrl(bookId) }}
          style={[
            stackedStyles.cover,
            {
              width: size,
              height: size,
              left: index * offset,
              zIndex: displayIds.length - index,
            },
          ]}
          contentFit="cover"
          transition={200}
        />
      ))}
    </View>
  );
}

const stackedStyles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  cover: {
    position: 'absolute',
    borderRadius: scale(4),
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
    elevation: 3,
  },
  fallback: {
    borderRadius: scale(12),
    backgroundColor: 'rgba(193,244,12,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export function GenreDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ GenreDetail: GenreDetailParams }, 'GenreDetail'>>();
  const insets = useSafeAreaInsets();
  const themeColors = useThemeColors();
  const inputRef = useRef<TextInput>(null);

  const genreName = route.params?.genreName || '';

  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('recentlyAdded');
  const [showSortModal, setShowSortModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { refreshCache, isLoaded, filterItems } = useLibraryCache();

  // Get all books in this genre
  const genreBooks = useMemo(() => {
    if (!genreName) return [];
    return filterItems({ genres: [genreName] });
  }, [genreName, filterItems]);

  // Filter by search query
  const filteredBooks = useMemo(() => {
    if (!searchQuery.trim()) return genreBooks;
    const lowerQuery = searchQuery.toLowerCase();
    return genreBooks.filter((book) => {
      const metadata = book.media?.metadata as any;
      const title = metadata?.title || '';
      const author = metadata?.authorName || metadata?.authors?.[0]?.name || '';
      return (
        title.toLowerCase().includes(lowerQuery) ||
        author.toLowerCase().includes(lowerQuery)
      );
    });
  }, [genreBooks, searchQuery]);

  // Sort books based on selected option
  const sortedBooks = useMemo(() => {
    const sorted = [...filteredBooks];

    switch (sortOption) {
      case 'recentlyAdded':
        sorted.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
        break;
      case 'titleAsc':
        sorted.sort((a, b) => {
          const aTitle = (a.media?.metadata as any)?.title || '';
          const bTitle = (b.media?.metadata as any)?.title || '';
          return aTitle.localeCompare(bTitle);
        });
        break;
      case 'titleDesc':
        sorted.sort((a, b) => {
          const aTitle = (a.media?.metadata as any)?.title || '';
          const bTitle = (b.media?.metadata as any)?.title || '';
          return bTitle.localeCompare(aTitle);
        });
        break;
      case 'authorAsc':
        sorted.sort((a, b) => {
          const aAuthor = (a.media?.metadata as any)?.authorName || '';
          const bAuthor = (b.media?.metadata as any)?.authorName || '';
          return aAuthor.localeCompare(bAuthor);
        });
        break;
      case 'authorDesc':
        sorted.sort((a, b) => {
          const aAuthor = (a.media?.metadata as any)?.authorName || '';
          const bAuthor = (b.media?.metadata as any)?.authorName || '';
          return bAuthor.localeCompare(aAuthor);
        });
        break;
      case 'durationAsc':
        sorted.sort((a, b) => {
          const aDuration = (a.media as any)?.duration || 0;
          const bDuration = (b.media as any)?.duration || 0;
          return aDuration - bDuration;
        });
        break;
      case 'durationDesc':
        sorted.sort((a, b) => {
          const aDuration = (a.media as any)?.duration || 0;
          const bDuration = (b.media as any)?.duration || 0;
          return bDuration - aDuration;
        });
        break;
    }

    return sorted;
  }, [filteredBooks, sortOption]);

  // Get total duration for stats
  const totalDuration = useMemo(() => {
    return genreBooks.reduce((sum, book) => {
      return sum + ((book.media as any)?.duration || 0);
    }, 0);
  }, [genreBooks]);

  // Get book IDs for stacked covers header
  const coverBookIds = useMemo(() => {
    return genreBooks.slice(0, 3).map((book) => book.id);
  }, [genreBooks]);

  // Get current sort config
  const currentSortConfig = SORT_OPTIONS.find((opt) => opt.id === sortOption) || SORT_OPTIONS[0];

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Main');
    }
  };

  const handleBookPress = useCallback((bookId: string) => {
    navigation.navigate('BookDetail', { id: bookId });
  }, [navigation]);

  const handleOpenSortModal = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowSortModal(true);
  }, []);

  const handleSelectSort = useCallback((option: SortOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSortOption(option);
    setShowSortModal(false);
  }, []);

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
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: themeColors.background }]}>
        <StatusBar barStyle={themeColors.statusBar} backgroundColor={themeColors.background} />
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle={themeColors.statusBar} backgroundColor={themeColors.background} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + TOP_NAV_HEIGHT + scale(10) }]}>
        <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
          <ChevronLeft size={scale(24)} color={themeColors.text} strokeWidth={2} />
        </TouchableOpacity>
        <View style={[styles.searchContainer, { backgroundColor: themeColors.border }]}>
          <Search size={scale(18)} color={themeColors.textTertiary} strokeWidth={2} />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: themeColors.text }]}
            placeholder={`Search in ${genreName}...`}
            placeholderTextColor={themeColors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <XCircle size={scale(18)} color={themeColors.textTertiary} strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Genre Title and Stats */}
      <View style={styles.titleSection}>
        <StackedCovers bookIds={coverBookIds} size={scale(44)} />
        <View style={styles.titleInfo}>
          <Text style={[styles.genreTitle, { color: themeColors.text }]}>{genreName}</Text>
          <Text style={[styles.genreStats, { color: themeColors.textSecondary }]}>
            {sortedBooks.length} book{sortedBooks.length !== 1 ? 's' : ''} • {formatDuration(totalDuration)}
          </Text>
        </View>
      </View>

      {/* Sort Dropdown Button */}
      <View style={styles.sortBar}>
        <TouchableOpacity style={[styles.sortDropdown, { backgroundColor: themeColors.border }]} onPress={handleOpenSortModal}>
          <currentSortConfig.Icon size={scale(16)} color={ACCENT} strokeWidth={2} />
          <Text style={[styles.sortDropdownText, { color: themeColors.text }]}>{currentSortConfig.label}</Text>
          <ChevronDown size={scale(16)} color={themeColors.textSecondary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSortModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowSortModal(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: themeColors.backgroundSecondary }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>Sort By</Text>
              <TouchableOpacity onPress={() => setShowSortModal(false)}>
                <X size={scale(24)} color={themeColors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            {SORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[styles.sortOption, { borderBottomColor: themeColors.border }, sortOption === option.id && styles.sortOptionActive]}
                onPress={() => handleSelectSort(option.id)}
              >
                <View style={styles.sortOptionLeft}>
                  <option.Icon
                    size={scale(18)}
                    color={sortOption === option.id ? ACCENT : themeColors.textSecondary}
                    strokeWidth={2}
                  />
                  <Text
                    style={[
                      styles.sortOptionText,
                      { color: themeColors.textSecondary },
                      sortOption === option.id && styles.sortOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </View>
                {sortOption === option.id && (
                  <Check size={scale(20)} color={ACCENT} strokeWidth={2.5} />
                )}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.listContent, { paddingBottom: SCREEN_BOTTOM_PADDING + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={ACCENT}
          />
        }
      >
        {sortedBooks.map((book) => (
          <BookCard
            key={book.id}
            book={book}
            onPress={() => handleBookPress(book.id)}
            showListeningProgress={true}
          />
        ))}

        {sortedBooks.length === 0 && (
          <View style={styles.emptyState}>
            <BookOpen size={scale(48)} color={themeColors.textTertiary} strokeWidth={1.5} />
            <Text style={[styles.emptyTitle, { color: themeColors.text }]}>No books found</Text>
            <Text style={[styles.emptySubtitle, { color: themeColors.textSecondary }]}>
              {searchQuery ? 'Try a different search term' : 'No books in this genre'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor set via themeColors.background in JSX
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(12),
    paddingBottom: scale(12),
    gap: scale(8),
  },
  headerButton: {
    width: scale(36),
    height: scale(36),
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor set via themeColors.border in JSX
    borderRadius: scale(10),
    paddingHorizontal: scale(12),
    height: scale(40),
  },
  searchInput: {
    flex: 1,
    // color set via themeColors.text in JSX
    fontSize: scale(15),
    marginLeft: scale(8),
    paddingVertical: 0,
  },
  clearButton: {
    padding: scale(4),
  },
  // Title Section
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PADDING,
    marginBottom: scale(16),
    gap: scale(12),
  },
  titleInfo: {
    flex: 1,
  },
  genreTitle: {
    fontSize: scale(22),
    fontWeight: '700',
    // color set via themeColors.text in JSX
  },
  genreStats: {
    // color set via themeColors.textSecondary in JSX
    fontSize: scale(13),
    marginTop: scale(2),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    // color set via themeColors.textSecondary in JSX
    fontSize: scale(16),
  },
  // Sort Bar
  sortBar: {
    paddingHorizontal: PADDING,
    paddingBottom: scale(12),
  },
  sortDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: scale(6),
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    borderRadius: scale(8),
    // backgroundColor set via themeColors.border in JSX
  },
  sortDropdownText: {
    fontSize: scale(13),
    // color set via themeColors.text in JSX
    fontWeight: '500',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    // backgroundColor set via themeColors.backgroundSecondary in JSX
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    paddingBottom: scale(40),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scale(16),
    borderBottomWidth: 1,
    // borderBottomColor set via themeColors.border in JSX
  },
  modalTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    // color set via themeColors.text in JSX
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scale(14),
    paddingHorizontal: scale(16),
    borderBottomWidth: 1,
    // borderBottomColor set via themeColors.border in JSX
  },
  sortOptionActive: {
    backgroundColor: 'rgba(193,244,12,0.1)',
  },
  sortOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  sortOptionText: {
    fontSize: scale(15),
    // color set via themeColors.textSecondary in JSX
  },
  sortOptionTextActive: {
    color: ACCENT,
    fontWeight: '600',
  },
  // Content
  content: {
    flex: 1,
  },
  listContent: {
    paddingTop: scale(8),
  },
  emptyState: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    paddingTop: scale(60),
  },
  emptyTitle: {
    // color set via themeColors.text in JSX
    fontSize: scale(18),
    fontWeight: '600',
    marginTop: scale(16),
  },
  emptySubtitle: {
    // color set via themeColors.textSecondary in JSX
    fontSize: scale(14),
    marginTop: scale(4),
    textAlign: 'center',
  },
});
