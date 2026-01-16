/**
 * src/features/library/screens/NarratorsListScreen.tsx
 *
 * Browse all narrators with:
 * - A-Z scrubber (iOS Contacts pattern)
 * - "Your Narrators" section (based on listening history)
 * - Search functionality
 * - Sort by name, book count, recently added
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLibraryCache, getAllNarrators } from '@/core/cache';
import { useContinueListening } from '@/shared/hooks/useContinueListening';
import { Icon } from '@/shared/components/Icon';
import { AlphabetScrubber, SkullRefreshControl, TopNav, TopNavBackIcon, MicIcon } from '@/shared/components';
import { SCREEN_BOTTOM_PADDING } from '@/constants/layout';
import { useTheme } from '@/shared/theme';

type SortType = 'name' | 'bookCount' | 'recent';

interface NarratorWithGenres {
  name: string;
  bookCount: number;
  topGenres: string[];
  addedAt?: number;
}

// Avatar color generator based on name
const AVATAR_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#22C55E', '#14B8A6',
  '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#EC4899',
];

function getAvatarColor(name: string): string {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export function NarratorsListScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const accent = colors.accent.primary;
  const sectionListRef = useRef<SectionList>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortType>('name');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { refreshCache, isLoaded, filterItems } = useLibraryCache();
  const { items: inProgressItems } = useContinueListening();

  // Get all narrators with genre info
  const narratorsWithGenres = useMemo((): NarratorWithGenres[] => {
    const allNarrators = getAllNarrators();
    return allNarrators.map(narrator => {
      // Get top genres from this narrator's books
      const genreCounts = new Map<string, number>();
      let latestAddedAt = 0;
      narrator.books?.forEach(book => {
        const genres = (book.media?.metadata as any)?.genres || [];
        genres.forEach((genre: string) => {
          genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
        });
        if (book.addedAt && book.addedAt > latestAddedAt) {
          latestAddedAt = book.addedAt;
        }
      });
      const topGenres = [...genreCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([genre]) => genre);

      return {
        name: narrator.name,
        bookCount: narrator.bookCount,
        topGenres,
        addedAt: latestAddedAt || undefined,
      };
    });
  }, [isLoaded]);

  // Filter by search query
  const filteredNarrators = useMemo(() => {
    if (!searchQuery.trim()) return narratorsWithGenres;
    const lowerQuery = searchQuery.toLowerCase();
    return narratorsWithGenres.filter(n => n.name.toLowerCase().includes(lowerQuery));
  }, [narratorsWithGenres, searchQuery]);

  // Sort narrators
  const sortedNarrators = useMemo(() => {
    const sorted = [...filteredNarrators];
    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'bookCount':
        sorted.sort((a, b) => b.bookCount - a.bookCount);
        break;
      case 'recent':
        sorted.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
        break;
    }
    return sorted;
  }, [filteredNarrators, sortBy]);

  // Get "Your Narrators" - narrators from books user is listening to
  const yourNarrators = useMemo((): NarratorWithGenres[] => {
    const listenedBookIds = new Set(inProgressItems.map(item => item.id));
    if (listenedBookIds.size === 0) return [];

    const narratorCounts = new Map<string, number>();
    narratorsWithGenres.forEach(narrator => {
      // Get books that match this narrator from cache
      const narratorBooks = filterItems({ narrators: [narrator.name] }) || [];
      const listenedCount = narratorBooks.filter(b => listenedBookIds.has(b.id)).length;
      if (listenedCount > 0) {
        narratorCounts.set(narrator.name, listenedCount);
      }
    });

    return narratorsWithGenres
      .filter(n => narratorCounts.has(n.name))
      .sort((a, b) => (narratorCounts.get(b.name) || 0) - (narratorCounts.get(a.name) || 0))
      .slice(0, 8);
  }, [narratorsWithGenres, inProgressItems, filterItems]);

  // Create sections for A-Z list
  const sections = useMemo(() => {
    if (sortBy !== 'name') {
      // Non-alphabetical sort - single section
      return [{ title: '', data: sortedNarrators }];
    }

    const sectionMap = new Map<string, NarratorWithGenres[]>();
    sortedNarrators.forEach(narrator => {
      const letter = narrator.name[0].toUpperCase();
      const section = sectionMap.get(letter) || [];
      section.push(narrator);
      sectionMap.set(letter, section);
    });

    return [...sectionMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([title, data]) => ({ title, data }));
  }, [sortedNarrators, sortBy]);

  // Available letters for scrubber
  const availableLetters = useMemo(() => {
    if (sortBy !== 'name') return [];
    return sections.filter(s => s.title).map(s => s.title);
  }, [sections, sortBy]);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Main');
    }
  };

  const handleNarratorPress = (narratorName: string) => {
    navigation.navigate('NarratorDetail', { narratorName });
  };

  const handleLetterPress = useCallback((letter: string) => {
    const sectionIndex = sections.findIndex(s => s.title === letter);
    if (sectionIndex >= 0 && sectionListRef.current) {
      sectionListRef.current.scrollToLocation({
        sectionIndex,
        itemIndex: 0,
        animated: true,
        viewPosition: 0,
      });
    }
  }, [sections]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshCache();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshCache]);

  const isSearching = searchQuery.trim().length > 0;

  // Render narrator list item
  const renderNarratorItem = ({ item }: { item: NarratorWithGenres }) => (
    <TouchableOpacity
      style={styles.narratorRow}
      onPress={() => handleNarratorPress(item.name)}
      activeOpacity={0.7}
    >
      {/* Avatar - Narrators don't have images, always use initials */}
      <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.name) }]}>
        <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
      </View>

      {/* Info */}
      <View style={styles.narratorInfo}>
        <Text style={[styles.narratorName, { color: colors.text.primary }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.bookCount, { color: colors.text.secondary }]}>{item.bookCount} books in library</Text>
        {item.topGenres.length > 0 && (
          <Text style={[styles.genres, { color: colors.text.tertiary }]} numberOfLines={1}>
            {item.topGenres.join(', ')}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  // Render "Your Narrators" card
  const renderYourNarratorCard = (narrator: NarratorWithGenres) => (
    <TouchableOpacity
      key={narrator.name}
      style={styles.yourNarratorCard}
      onPress={() => handleNarratorPress(narrator.name)}
      activeOpacity={0.7}
    >
      <View style={[styles.yourNarratorAvatar, { backgroundColor: getAvatarColor(narrator.name) }]}>
        <Text style={styles.yourNarratorAvatarText}>{getInitials(narrator.name)}</Text>
      </View>
      <Text style={[styles.yourNarratorName, { color: colors.text.primary }]} numberOfLines={2}>{narrator.name}</Text>
      <Text style={[styles.yourNarratorBooks, { color: colors.text.secondary }]}>{narrator.bookCount} books</Text>
    </TouchableOpacity>
  );

  if (!isLoaded) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background.primary }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background.primary} />
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Loading...</Text>
        </View>
      </View>
    );
  }

  const handleLogoPress = useCallback(() => {
    navigation.navigate('Main', { screen: 'HomeTab' });
  }, [navigation]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background.primary} />

      {/* TopNav with skull logo and integrated search bar */}
      <TopNav
        variant={isDark ? 'dark' : 'light'}
        showLogo={true}
        onLogoPress={handleLogoPress}
        style={{ backgroundColor: colors.background.primary }}
        pills={[
          {
            key: 'narrators',
            label: 'Narrators',
            icon: <MicIcon size={10} color={colors.text.primary} />,
          },
        ]}
        circleButtons={[
          {
            key: 'back',
            icon: <TopNavBackIcon color={colors.text.primary} size={14} />,
            onPress: handleBack,
          },
        ]}
        searchBar={{
          value: searchQuery,
          onChangeText: setSearchQuery,
          placeholder: 'Search narrators...',
        }}
      />

      {/* Sort Bar */}
      <View style={styles.sortBar}>
        <Text style={[styles.resultCount, { color: colors.text.secondary }]}>{filteredNarrators.length} narrators</Text>
        <View style={styles.sortButtons}>
          {(['name', 'bookCount', 'recent'] as SortType[]).map(type => (
            <TouchableOpacity
              key={type}
              style={[styles.sortButton, { backgroundColor: colors.border.default }, sortBy === type && { backgroundColor: accent }]}
              onPress={() => setSortBy(type)}
            >
              <Text style={[styles.sortButtonText, { color: colors.text.secondary }, sortBy === type && [styles.sortButtonTextActive, { color: colors.text.inverse }]]}>
                {type === 'name' ? 'A-Z' : type === 'bookCount' ? 'Books' : 'Recent'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <SkullRefreshControl refreshing={isRefreshing} onRefresh={handleRefresh}>
          <SectionList
            ref={sectionListRef}
            sections={sections}
            keyExtractor={(item) => item.name}
            stickySectionHeadersEnabled={sortBy === 'name'}
            contentContainerStyle={{ paddingBottom: SCREEN_BOTTOM_PADDING + insets.bottom, paddingRight: sortBy === 'name' ? 28 : 0 }}
            showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            !isSearching && yourNarrators.length > 0 ? (
              <View style={styles.yourNarratorsSection}>
                <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>Your Narrators</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.yourNarratorsScroll}
                >
                  {yourNarrators.map(renderYourNarratorCard)}
                </ScrollView>
              </View>
            ) : null
          }
          renderSectionHeader={({ section }) =>
            section.title ? (
              <View style={[styles.letterHeader, { backgroundColor: colors.background.primary }]}>
                <Text style={[styles.letterText, { color: accent }]}>{section.title}</Text>
              </View>
            ) : null
          }
          renderItem={renderNarratorItem}
          onScrollToIndexFailed={() => {}}
          getItemLayout={(data, index) => ({
            length: 72,
            offset: 72 * index,
            index,
          })}
          />
        </SkullRefreshControl>

        {/* A-Z Scrubber */}
        <AlphabetScrubber
          letters={availableLetters}
          onLetterSelect={handleLetterPress}
          visible={availableLetters.length > 1 && !isSearching}
          style={{ bottom: SCREEN_BOTTOM_PADDING + insets.bottom + 60 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor set via themeColors.background in JSX
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor set via themeColors.border in JSX
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    // color set via themeColors.text in JSX
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
    // color set via themeColors.textSecondary in JSX
    fontSize: 16,
  },
  sortBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  resultCount: {
    // color set via themeColors.textSecondary in JSX
    fontSize: 14,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    // backgroundColor set via themeColors.border in JSX
  },
  sortButtonActive: {
    // backgroundColor set dynamically via accent in JSX
  },
  sortButtonText: {
    fontSize: 12,
    // color set via themeColors.textSecondary in JSX
    fontWeight: '500',
  },
  sortButtonTextActive: {
    // color applied inline via colors.text.inverse
  },
  content: {
    flex: 1,
  },
  // Your Narrators section
  yourNarratorsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    // color set via themeColors.textSecondary in JSX
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  yourNarratorsScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  yourNarratorCard: {
    width: 100,
    alignItems: 'center',
  },
  yourNarratorAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  yourNarratorAvatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000', // Intentional: black text on colored avatar
  },
  yourNarratorName: {
    fontSize: 13,
    fontWeight: '600',
    // color set via themeColors.text in JSX
    textAlign: 'center',
    marginBottom: 2,
  },
  yourNarratorBooks: {
    fontSize: 11,
    // color set via themeColors.textSecondary in JSX
  },
  // Letter header
  letterHeader: {
    // backgroundColor set via themeColors.background in JSX
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  letterText: {
    fontSize: 14,
    fontWeight: '700',
    // color set dynamically via accent in JSX
  },
  // Narrator row
  narratorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 72,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000', // Intentional: black text on colored avatar
  },
  narratorInfo: {
    flex: 1,
  },
  narratorName: {
    fontSize: 16,
    fontWeight: '500',
    // color set via themeColors.text in JSX
    marginBottom: 2,
  },
  bookCount: {
    fontSize: 14,
    // color set via themeColors.textSecondary in JSX
    marginBottom: 2,
  },
  genres: {
    fontSize: 12,
    // color set via themeColors.textTertiary in JSX
  },
});
