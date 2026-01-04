/**
 * src/features/library/screens/AuthorsListScreen.tsx
 *
 * Browse all authors with:
 * - A-Z scrubber (iOS Contacts pattern)
 * - "Your Authors" section (based on listening history)
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
  RefreshControl,
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLibraryCache, getAllAuthors } from '@/core/cache';
import { useContinueListening } from '@/features/home/hooks/useContinueListening';
import { apiClient } from '@/core/api';
import { Icon } from '@/shared/components/Icon';
import { AlphabetScrubber } from '@/shared/components/AlphabetScrubber';
import { SCREEN_BOTTOM_PADDING } from '@/constants/layout';
import { accentColors, spacing, radius } from '@/shared/theme';
import { useThemeColors } from '@/shared/theme/themeStore';

const ACCENT = accentColors.red;

type SortType = 'name' | 'bookCount' | 'recent';

interface AuthorWithGenres {
  id?: string;
  name: string;
  bookCount: number;
  imagePath?: string;
  description?: string;
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

export function AuthorsListScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const themeColors = useThemeColors();
  const sectionListRef = useRef<SectionList>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortType>('name');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { refreshCache, isLoaded, filterItems } = useLibraryCache();
  const { items: inProgressItems } = useContinueListening();

  // Get all authors with genre info
  const authorsWithGenres = useMemo((): AuthorWithGenres[] => {
    const allAuthors = getAllAuthors();
    return allAuthors.map(author => {
      // Get top genres from this author's books
      const genreCounts = new Map<string, number>();
      author.books?.forEach(book => {
        const genres = (book.media?.metadata as any)?.genres || [];
        genres.forEach((genre: string) => {
          genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
        });
      });
      const topGenres = [...genreCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([genre]) => genre);

      return {
        id: author.id,
        name: author.name,
        bookCount: author.bookCount,
        imagePath: author.imagePath,
        description: author.description,
        topGenres,
        addedAt: (author as any).addedAt,
      };
    });
  }, [isLoaded]);

  // Filter by search query
  const filteredAuthors = useMemo(() => {
    if (!searchQuery.trim()) return authorsWithGenres;
    const lowerQuery = searchQuery.toLowerCase();
    return authorsWithGenres.filter(a => a.name.toLowerCase().includes(lowerQuery));
  }, [authorsWithGenres, searchQuery]);

  // Sort authors
  const sortedAuthors = useMemo(() => {
    const sorted = [...filteredAuthors];
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
  }, [filteredAuthors, sortBy]);

  // Get "Your Authors" - authors from books user is listening to
  const yourAuthors = useMemo((): AuthorWithGenres[] => {
    const listenedBookIds = new Set(inProgressItems.map(item => item.id));
    if (listenedBookIds.size === 0) return [];

    const authorCounts = new Map<string, number>();
    authorsWithGenres.forEach(author => {
      const listenedCount = author.bookCount > 0 ?
        (filterItems({ authors: [author.name] }) || []).filter(b => listenedBookIds.has(b.id)).length : 0;
      if (listenedCount > 0) {
        authorCounts.set(author.name, listenedCount);
      }
    });

    return authorsWithGenres
      .filter(a => authorCounts.has(a.name))
      .sort((a, b) => (authorCounts.get(b.name) || 0) - (authorCounts.get(a.name) || 0))
      .slice(0, 8);
  }, [authorsWithGenres, inProgressItems, filterItems]);

  // Create sections for A-Z list
  const sections = useMemo(() => {
    if (sortBy !== 'name') {
      // Non-alphabetical sort - single section
      return [{ title: '', data: sortedAuthors }];
    }

    const sectionMap = new Map<string, AuthorWithGenres[]>();
    sortedAuthors.forEach(author => {
      const letter = author.name[0].toUpperCase();
      const section = sectionMap.get(letter) || [];
      section.push(author);
      sectionMap.set(letter, section);
    });

    return [...sectionMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([title, data]) => ({ title, data }));
  }, [sortedAuthors, sortBy]);

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

  const handleAuthorPress = (authorName: string) => {
    navigation.navigate('AuthorDetail', { authorName });
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

  // Render author list item
  const renderAuthorItem = ({ item }: { item: AuthorWithGenres }) => (
    <TouchableOpacity
      style={styles.authorRow}
      onPress={() => handleAuthorPress(item.name)}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.name) }]}>
        {item.id && item.imagePath ? (
          <Image
            source={apiClient.getAuthorImageUrl(item.id)}
            style={styles.avatarImage}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
        )}
      </View>

      {/* Info */}
      <View style={styles.authorInfo}>
        <Text style={[styles.authorName, { color: themeColors.text }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.bookCount, { color: themeColors.textSecondary }]}>{item.bookCount} books in library</Text>
        {item.topGenres.length > 0 && (
          <Text style={[styles.genres, { color: themeColors.textTertiary }]} numberOfLines={1}>
            {item.topGenres.join(', ')}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  // Render "Your Authors" card
  const renderYourAuthorCard = (author: AuthorWithGenres) => (
    <TouchableOpacity
      key={author.name}
      style={styles.yourAuthorCard}
      onPress={() => handleAuthorPress(author.name)}
      activeOpacity={0.7}
    >
      <View style={[styles.yourAuthorAvatar, { backgroundColor: getAvatarColor(author.name) }]}>
        {author.id && author.imagePath ? (
          <Image
            source={apiClient.getAuthorImageUrl(author.id)}
            style={styles.yourAuthorAvatarImage}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <Text style={styles.yourAuthorAvatarText}>{getInitials(author.name)}</Text>
        )}
      </View>
      <Text style={[styles.yourAuthorName, { color: themeColors.text }]} numberOfLines={2}>{author.name}</Text>
      <Text style={[styles.yourAuthorBooks, { color: themeColors.textSecondary }]}>{author.bookCount} books</Text>
    </TouchableOpacity>
  );

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
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
          <Icon name="ChevronLeft" size={24} color={themeColors.text} />
        </TouchableOpacity>
        <View style={[styles.searchContainer, { backgroundColor: themeColors.border }]}>
          <Icon name="Search" size={18} color={themeColors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: themeColors.text }]}
            placeholder="Search authors..."
            placeholderTextColor={themeColors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Icon name="XCircle" size={18} color={themeColors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Sort Bar */}
      <View style={styles.sortBar}>
        <Text style={[styles.resultCount, { color: themeColors.textSecondary }]}>{filteredAuthors.length} authors</Text>
        <View style={styles.sortButtons}>
          {(['name', 'bookCount', 'recent'] as SortType[]).map(type => (
            <TouchableOpacity
              key={type}
              style={[styles.sortButton, { backgroundColor: themeColors.border }, sortBy === type && styles.sortButtonActive]}
              onPress={() => setSortBy(type)}
            >
              <Text style={[styles.sortButtonText, { color: themeColors.textSecondary }, sortBy === type && styles.sortButtonTextActive]}>
                {type === 'name' ? 'A-Z' : type === 'bookCount' ? 'Books' : 'Recent'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <SectionList
          ref={sectionListRef}
          sections={sections}
          keyExtractor={(item) => item.name}
          stickySectionHeadersEnabled={sortBy === 'name'}
          contentContainerStyle={{ paddingBottom: SCREEN_BOTTOM_PADDING + insets.bottom, paddingRight: sortBy === 'name' ? 28 : 0 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={ACCENT}
            />
          }
          ListHeaderComponent={
            !isSearching && yourAuthors.length > 0 ? (
              <View style={styles.yourAuthorsSection}>
                <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>Your Authors</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.yourAuthorsScroll}
                >
                  {yourAuthors.map(renderYourAuthorCard)}
                </ScrollView>
              </View>
            ) : null
          }
          renderSectionHeader={({ section }) =>
            section.title ? (
              <View style={[styles.letterHeader, { backgroundColor: themeColors.background }]}>
                <Text style={styles.letterText}>{section.title}</Text>
              </View>
            ) : null
          }
          renderItem={renderAuthorItem}
          onScrollToIndexFailed={() => {}}
          getItemLayout={(data, index) => ({
            length: 72,
            offset: 72 * index,
            index,
          })}
        />

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
    backgroundColor: ACCENT,
  },
  sortButtonText: {
    fontSize: 12,
    // color set via themeColors.textSecondary in JSX
    fontWeight: '500',
  },
  sortButtonTextActive: {
    color: '#000', // Black on gold accent (intentional)
  },
  content: {
    flex: 1,
  },
  // Your Authors section
  yourAuthorsSection: {
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
  yourAuthorsScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  yourAuthorCard: {
    width: 100,
    alignItems: 'center',
  },
  yourAuthorAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  yourAuthorAvatarImage: {
    width: '100%',
    height: '100%',
  },
  yourAuthorAvatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000', // Black on colored avatar (intentional)
  },
  yourAuthorName: {
    fontSize: 13,
    fontWeight: '600',
    // color set via themeColors.text in JSX
    textAlign: 'center',
    marginBottom: 2,
  },
  yourAuthorBooks: {
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
    color: ACCENT,
  },
  // Author row
  authorRow: {
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
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000', // Black on colored avatar (intentional)
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
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
