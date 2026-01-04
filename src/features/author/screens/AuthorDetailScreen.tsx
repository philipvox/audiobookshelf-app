/**
 * src/features/author/screens/AuthorDetailScreen.tsx
 *
 * Author detail screen redesigned to match SeriesDetailScreen pattern.
 * Features:
 * - Blurred hero background with gradient fade
 * - Stacked book covers
 * - FlatList with ListHeaderComponent for performance
 * - Clean title section with book count and duration
 * - Progress stats (completed/in-progress)
 * - Follow button in header
 * - Expandable bio section
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  FlatList,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  User,
  CheckCircle,
  Bell,
  BellOff,
  BookOpen,
  ChevronRight,
  Play,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useLibraryCache, getAllAuthors } from '@/core/cache';
import { apiClient } from '@/core/api';
import { LibraryItem } from '@/core/types';
import { usePlayerStore } from '@/features/player';
import { useWishlistStore, useIsAuthorFollowed } from '@/features/wishlist';
import { SCREEN_BOTTOM_PADDING } from '@/constants/layout';
import { scale, wp, radius } from '@/shared/theme';
import { useThemeColors, useIsDarkMode } from '@/shared/theme/themeStore';

type AuthorDetailRouteParams = {
  AuthorDetail: { authorName: string } | { name: string };
};

// Screen dimensions
const SCREEN_WIDTH = wp(100);

// Stacked covers constants
const STACK_COVER_SIZE = SCREEN_WIDTH * 0.38;
const STACK_OFFSET = SCREEN_WIDTH * 0.12;
const STACK_ROTATION = 8;
const STACK_VERTICAL_OFFSET = scale(12);
const MAX_STACK_COVERS = 5;

const BIO_TRUNCATE_LENGTH = 200;

// Helper to get metadata
const getMetadata = (item: LibraryItem) => item.media?.metadata as any;

// Helper to get progress
const getProgress = (item: LibraryItem): number => {
  const progress = (item as any).userMediaProgress;
  if (!progress) return 0;
  return progress.progress || 0;
};

// Helper to format duration
const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

// Helper to format time remaining
const formatTimeRemaining = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m left`;
  }
  return `${minutes}m left`;
};

// Stacked book covers component with optional author image as center cover
interface StackedCoversProps {
  bookIds: string[];
  authorImageUrl?: string | null;  // Author image to show as center/top cover
  authorName?: string;             // For initials fallback
}

const StackedCovers = React.memo(function StackedCovers({ bookIds, authorImageUrl, authorName }: StackedCoversProps) {
  const themeColors = useThemeColors();

  // Max 5 total cards: author in center + up to 4 books (2 on each side)
  // Books must be even for symmetric display
  const stackBooks = useMemo(() => {
    // Cap at 4 books (for max 5 total with author)
    let maxBooks = Math.min(4, bookIds.length);
    // Make even (so we have equal books on each side)
    if (maxBooks % 2 !== 0) maxBooks -= 1;
    // If only 1 book, show just author (can't be symmetric)
    if (bookIds.length === 1) maxBooks = 0;
    return bookIds.slice(0, maxBooks);
  }, [bookIds]);

  const count = stackBooks.length;

  const coverUrls = useMemo(() =>
    stackBooks.map(id => apiClient.getItemCoverUrl(id)),
    [stackBooks]
  );

  // Generate initials from author name
  const initials = useMemo(() => {
    if (!authorName) return '';
    return authorName
      .split(' ')
      .map((word) => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }, [authorName]);

  // Generate a consistent color based on name
  const avatarColor = useMemo(() => {
    if (!authorName) return '#F3B60C';
    const colorIndex = authorName.charCodeAt(0) % 5;
    const avatarColors = ['#F3B60C', '#4CAF50', '#FF9800', '#2196F3', '#9C27B0'];
    return avatarColors[colorIndex];
  }, [authorName]);

  // If no books to show (0 or 1 book), just show author image
  if (count === 0) {
    return (
      <View style={stackStyles.container}>
        {authorImageUrl ? (
          <Image
            source={authorImageUrl}
            style={[stackStyles.cover, { backgroundColor: themeColors.surfaceElevated }]}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[stackStyles.cover, stackStyles.placeholder, { backgroundColor: avatarColor }]}>
            {initials ? (
              <Text style={stackStyles.initialsText}>{initials}</Text>
            ) : (
              <User size={scale(48)} color="#FFFFFF" strokeWidth={1.5} />
            )}
          </View>
        )}
      </View>
    );
  }

  // Author is always in the center
  // Books split evenly: half on left, half on right
  const booksPerSide = count / 2;
  const totalCovers = count + 1;  // Book covers + author
  const centerIndex = booksPerSide;  // Author position

  // Dynamic container width
  const containerWidth = STACK_COVER_SIZE + (totalCovers - 1) * STACK_OFFSET;

  return (
    <View style={[stackStyles.container, { width: containerWidth }]}>
      {/* Render book covers with author in center */}
      {stackBooks.map((bookId, index) => {
        // Position: 0,1 are left of author, 2,3 are right of author
        const adjustedIndex = index < booksPerSide ? index : index + 1;

        // Fan rotation: left books tilt left, right books tilt right
        const rotation = (adjustedIndex - centerIndex) * STACK_ROTATION;
        // Z-index: center is highest, sides go down
        const distanceFromCenter = Math.abs(adjustedIndex - centerIndex);
        const zIndex = totalCovers - Math.floor(distanceFromCenter);
        // Scale: center is biggest, sides get smaller
        const scaleValue = 1 - (distanceFromCenter * 0.08);
        const coverSize = STACK_COVER_SIZE * scaleValue;
        // Horizontal offset
        const sizeDiff = (STACK_COVER_SIZE - coverSize) / 2;
        const horizontalOffset = adjustedIndex * STACK_OFFSET + sizeDiff;
        // Vertical offset
        const verticalOffset = sizeDiff + (distanceFromCenter * STACK_VERTICAL_OFFSET);

        return (
          <View
            key={bookId}
            style={[
              stackStyles.coverWrapper,
              {
                left: horizontalOffset,
                top: verticalOffset,
                zIndex,
                transform: [{ rotate: `${rotation}deg` }],
              },
            ]}
          >
            <Image
              source={coverUrls[index]}
              style={[
                stackStyles.cover,
                {
                  width: coverSize,
                  height: coverSize,
                  backgroundColor: themeColors.surfaceElevated,
                },
              ]}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          </View>
        );
      })}

      {/* Author image/initials in the center (highest z-index) */}
      <View
        style={[
          stackStyles.coverWrapper,
          {
            left: centerIndex * STACK_OFFSET,
            top: 0,
            zIndex: totalCovers + 1,
            transform: [{ rotate: '0deg' }],
          },
        ]}
      >
        {authorImageUrl ? (
          <Image
            source={authorImageUrl}
            style={[
              stackStyles.cover,
              stackStyles.authorCover,
              {
                width: STACK_COVER_SIZE,
                height: STACK_COVER_SIZE,
                backgroundColor: themeColors.surfaceElevated,
              },
            ]}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <View
            style={[
              stackStyles.cover,
              stackStyles.authorCover,
              stackStyles.placeholder,
              {
                width: STACK_COVER_SIZE,
                height: STACK_COVER_SIZE,
                backgroundColor: avatarColor,
              },
            ]}
          >
            {initials ? (
              <Text style={stackStyles.initialsText}>{initials}</Text>
            ) : (
              <User size={scale(48)} color="#FFFFFF" strokeWidth={1.5} />
            )}
          </View>
        )}
      </View>
    </View>
  );
});

const stackStyles = StyleSheet.create({
  container: {
    height: STACK_COVER_SIZE + STACK_VERTICAL_OFFSET * 2 + 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: scale(40),
    marginBottom: 24,
  },
  coverWrapper: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  cover: {
    width: STACK_COVER_SIZE,
    height: STACK_COVER_SIZE,
    borderRadius: radius.sm,
  },
  authorCover: {
    borderRadius: radius.sm,  // Square with same radius as book covers
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    fontSize: scale(36),
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export function AuthorDetailScreen() {
  const route = useRoute<RouteProp<AuthorDetailRouteParams, 'AuthorDetail'>>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  const themeColors = useThemeColors();
  const isDarkMode = useIsDarkMode();

  // Handle both param formats - with null safety
  const authorName = (route.params as any).authorName || (route.params as any).name || '';

  const [bioExpanded, setBioExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [authorBooks, setAuthorBooks] = useState<LibraryItem[]>([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState(false);
  const [sortOption, setSortOption] = useState<'recent' | 'title' | 'duration' | 'series'>('title');

  const { getAuthor, isLoaded, refreshCache } = useLibraryCache();
  const currentBookId = usePlayerStore((s) => s.currentBook?.id);

  // Follow author functionality
  const isFollowing = useIsAuthorFollowed(authorName);
  const { followAuthor, unfollowAuthor } = useWishlistStore();

  const handleFollowToggle = useCallback(() => {
    if (isFollowing) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      unfollowAuthor(authorName);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      followAuthor(authorName);
    }
  }, [isFollowing, authorName, followAuthor, unfollowAuthor]);

  // Get author data from cache
  const authorInfo = useMemo(() => {
    if (!isLoaded || !authorName) return null;
    return getAuthor(authorName);
  }, [isLoaded, authorName, getAuthor]);

  // Fetch author books from API when we have an author ID
  // This is more reliable than cache name-matching because the server knows
  // the true book-to-author relationships (handles name variations, co-authors, etc.)
  useEffect(() => {
    const fetchAuthorBooks = async () => {
      if (!authorInfo?.id) return;

      setIsLoadingBooks(true);
      try {
        const authorData = await apiClient.getAuthor(authorInfo.id, { include: 'items' });
        if (authorData?.libraryItems) {
          setAuthorBooks(authorData.libraryItems as LibraryItem[]);
        }
      } catch (error) {
        console.warn('[AuthorDetail] Failed to fetch author books from API:', error);
        // Will fall back to cache-based books
      } finally {
        setIsLoadingBooks(false);
      }
    };

    fetchAuthorBooks();
  }, [authorInfo?.id]);

  // All books (unsorted) - prefer API-fetched books, fall back to cache
  const allBooks = useMemo(() => {
    const books = authorBooks.length > 0 ? authorBooks : (authorInfo?.books || []);
    return books;
  }, [authorBooks, authorInfo?.books]);

  // Continue Listening books - in-progress, sorted by highest progress first (Goal Gradient)
  const continueListeningBooks = useMemo(() => {
    return allBooks
      .filter(book => {
        const progress = getProgress(book);
        return progress > 0 && progress < 0.95; // In progress, not finished
      })
      .sort((a, b) => getProgress(b) - getProgress(a)); // Highest progress first
  }, [allBooks]);

  // Sorted books for All Books section (excludes in-progress books if they're in Continue Listening)
  const sortedBooks = useMemo(() => {
    if (allBooks.length === 0) return [];

    // Sort based on selected option
    return [...allBooks].sort((a, b) => {
      switch (sortOption) {
        case 'title':
          return (getMetadata(a)?.title || '').toLowerCase()
            .localeCompare((getMetadata(b)?.title || '').toLowerCase());
        case 'duration':
          return ((a.media as any)?.duration || 0) - ((b.media as any)?.duration || 0);
        case 'recent':
          return ((b as any).addedAt || 0) - ((a as any).addedAt || 0);
        case 'series':
          // Group by series, then by sequence
          const seriesA = getMetadata(a)?.seriesName || 'zzz';
          const seriesB = getMetadata(b)?.seriesName || 'zzz';
          if (seriesA !== seriesB) return seriesA.localeCompare(seriesB);
          const seqA = parseFloat(getMetadata(a)?.seriesName?.match(/#([\d.]+)/)?.[1] || '999');
          const seqB = parseFloat(getMetadata(b)?.seriesName?.match(/#([\d.]+)/)?.[1] || '999');
          return seqA - seqB;
        default:
          return 0;
      }
    });
  }, [allBooks, sortOption]);

  // Aggregate genres from all books
  const authorGenres = useMemo(() => {
    const genreCount = new Map<string, number>();
    allBooks.forEach(book => {
      const genres = getMetadata(book)?.genres || [];
      genres.forEach((genre: string) => {
        genreCount.set(genre, (genreCount.get(genre) || 0) + 1);
      });
    });
    // Return top 3 genres sorted by frequency
    return Array.from(genreCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([genre]) => genre);
  }, [allBooks]);

  // Similar Authors - based on genre overlap
  const similarAuthors = useMemo(() => {
    if (authorGenres.length === 0 || !authorName) return [];

    const allAuthorsData = getAllAuthors();
    const currentAuthorGenresSet = new Set(authorGenres.map(g => g.toLowerCase()));

    return allAuthorsData
      .filter(a => a.name.toLowerCase() !== authorName.toLowerCase())
      .map(author => {
        // Get genres from author's books
        const authorBooksGenres = new Set<string>();
        author.books.forEach(book => {
          const genres = getMetadata(book)?.genres || [];
          genres.forEach((g: string) => authorBooksGenres.add(g.toLowerCase()));
        });

        // Calculate genre overlap score
        let overlapCount = 0;
        currentAuthorGenresSet.forEach(g => {
          if (authorBooksGenres.has(g)) overlapCount++;
        });

        const score = overlapCount / Math.max(currentAuthorGenresSet.size, 1);
        return { author, score };
      })
      .filter(a => a.score > 0.3) // At least 30% genre overlap
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(a => a.author);
  }, [authorGenres, authorName]);

  // Progress stats
  const progressStats = useMemo(() => {
    let completed = 0;
    let inProgress = 0;

    sortedBooks.forEach(book => {
      const progress = getProgress(book);
      if (progress >= 0.95) {
        completed++;
      } else if (progress > 0) {
        inProgress++;
      }
    });

    return { completed, inProgress };
  }, [sortedBooks]);

  // Total duration
  const totalDuration = useMemo(() => {
    return sortedBooks.reduce((sum, book) => sum + ((book.media as any)?.duration || 0), 0);
  }, [sortedBooks]);

  const formatTotalDuration = () => {
    const hours = Math.floor(totalDuration / 3600);
    return `${hours}h`;
  };

  // Extract unique series from author's books
  const authorSeries = useMemo(() => {
    const seriesMap = new Map<string, { name: string; bookCount: number; bookIds: string[] }>();

    sortedBooks.forEach(book => {
      const metadata = getMetadata(book);
      // Check for series info in metadata
      const seriesName = metadata?.series?.name || metadata?.seriesName?.replace(/\s*#[\d.]+$/, '');

      if (seriesName) {
        const existing = seriesMap.get(seriesName);
        if (existing) {
          existing.bookCount++;
          if (existing.bookIds.length < 3) {
            existing.bookIds.push(book.id);
          }
        } else {
          seriesMap.set(seriesName, {
            name: seriesName,
            bookCount: 1,
            bookIds: [book.id],
          });
        }
      }
    });

    return Array.from(seriesMap.values()).sort((a, b) => b.bookCount - a.bookCount);
  }, [sortedBooks]);

  // Handle series press
  const handleSeriesPress = useCallback((seriesName: string) => {
    navigation.navigate('SeriesDetail', { seriesName });
  }, [navigation]);

  // Get author image URL
  const authorImageUrl = useMemo(() => {
    return authorInfo?.id ? apiClient.getAuthorImageUrl(authorInfo.id) : null;
  }, [authorInfo?.id]);

  // Get first book cover URL for hero background
  const bookIds = useMemo(() => sortedBooks.map(b => b.id), [sortedBooks]);
  const firstBookCoverUrl = useMemo(() => bookIds[0] ? apiClient.getItemCoverUrl(bookIds[0]) : null, [bookIds]);

  // Bio handling
  const shouldTruncateBio = (authorInfo?.description?.length || 0) > BIO_TRUNCATE_LENGTH;
  const displayBio = bioExpanded || !shouldTruncateBio
    ? authorInfo?.description
    : authorInfo?.description?.slice(0, BIO_TRUNCATE_LENGTH) + '...';

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshCache();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshCache]);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Main' as never);
    }
  };

  const handleBookPress = useCallback((bookId: string) => {
    navigation.navigate('BookDetail', { id: bookId });
  }, [navigation]);

  const handleNarratorPress = useCallback((narratorName: string) => {
    navigation.navigate('NarratorDetail', { narratorName });
  }, [navigation]);

  const handleAuthorPress = useCallback((targetAuthorName: string) => {
    navigation.navigate('AuthorDetail', { authorName: targetAuthorName });
  }, [navigation]);

  // Early return if no author name provided
  if (!authorName) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <StatusBar barStyle={themeColors.statusBar} backgroundColor={themeColors.background} />
        <View style={[styles.scrollHeader, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={styles.headerActionButton} onPress={() => navigation.goBack()}>
            <ChevronLeft size={scale(18)} color="#000" strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={styles.headerActions} />
        </View>
        <View style={styles.emptyContainer}>
          <User size={48} color={themeColors.textTertiary} strokeWidth={1.5} />
          <Text style={[styles.emptyTitle, { color: themeColors.text }]}>Author not found</Text>
          <Text style={[styles.emptySubtitle, { color: themeColors.textSecondary }]}>
            This author may have been removed
          </Text>
        </View>
      </View>
    );
  }

  // Loading state
  if (!isLoaded) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <StatusBar barStyle={themeColors.statusBar} backgroundColor={themeColors.background} />
        <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
          <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>Loading...</Text>
        </View>
      </View>
    );
  }

  // Not found state
  if (!authorInfo) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <StatusBar barStyle={themeColors.statusBar} backgroundColor={themeColors.background} />
        <View style={[styles.scrollHeader, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={styles.headerActionButton} onPress={handleBack}>
            <ChevronLeft size={scale(18)} color="#000" strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={styles.headerActions} />
        </View>
        <View style={styles.emptyContainer}>
          <User size={48} color={themeColors.textTertiary} strokeWidth={1.5} />
          <Text style={[styles.emptyTitle, { color: themeColors.text }]}>Author not found</Text>
          <Text style={[styles.emptySubtitle, { color: themeColors.textSecondary }]}>
            This author may have been removed
          </Text>
        </View>
      </View>
    );
  }

  const renderBookItem = useCallback(({ item }: { item: LibraryItem }) => {
    const metadata = getMetadata(item);
    const progress = getProgress(item);
    const duration = (item.media as any)?.duration || 0;
    const isCompleted = progress >= 0.95;
    const isNowPlaying = item.id === currentBookId;
    const seriesMatch = metadata?.seriesName?.match(/^(.+?)\s*#([\d.]+)$/);
    const seriesName = seriesMatch ? seriesMatch[1] : null;
    const sequence = seriesMatch ? seriesMatch[2] : null;

    return (
      <TouchableOpacity
        style={[
          styles.bookItem,
          { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
          isNowPlaying && { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }
        ]}
        onPress={() => handleBookPress(item.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.bookCoverContainer, { backgroundColor: themeColors.surfaceElevated }]}>
          <Image
            source={apiClient.getItemCoverUrl(item.id)}
            style={styles.bookCover}
            contentFit="cover"
          />
          {isCompleted && (
            <View style={styles.completedBadge}>
              <CheckCircle size={scale(16)} color="#4CAF50" strokeWidth={2} />
            </View>
          )}
        </View>

        <View style={styles.bookInfo}>
          <Text style={[styles.bookTitle, { color: themeColors.text }]} numberOfLines={1}>
            {metadata?.title}
          </Text>
          {seriesName && (
            <Text style={[styles.bookSeries, { color: themeColors.textSecondary }]} numberOfLines={1}>
              {seriesName} #{sequence}
            </Text>
          )}
          <View style={styles.bookMetaRow}>
            <Text style={[styles.bookMeta, { color: themeColors.textSecondary }]}>
              {formatDuration(duration)}
            </Text>
            {metadata?.narratorName && (
              <>
                <Text style={[styles.bookMetaDot, { color: themeColors.textTertiary }]}>·</Text>
                <TouchableOpacity onPress={() => handleNarratorPress(metadata.narratorName)}>
                  <Text style={[styles.bookNarrator, { color: themeColors.accent }]} numberOfLines={1}>
                    {metadata.narratorName}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Progress bar */}
          {progress > 0 && !isCompleted && (
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]}>
                <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: themeColors.accent }]} />
              </View>
              <Text style={[styles.progressText, { color: themeColors.textSecondary }]}>
                {formatTimeRemaining(duration * (1 - progress))}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [currentBookId, handleBookPress, handleNarratorPress, themeColors, isDarkMode]);

  const ListHeader = useMemo(() => (
    <>
      {/* Scrollable blurred background */}
      {firstBookCoverUrl && (
        <View style={styles.heroBackgroundScrollable}>
          <Image
            source={firstBookCoverUrl}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            blurRadius={25}
          />
          <BlurView intensity={30} tint={isDarkMode ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={
              isDarkMode
                ? ['transparent', 'transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)', themeColors.background]
                : ['transparent', 'transparent', 'rgba(255,255,255,0.3)', 'rgba(255,255,255,0.7)', themeColors.background]
            }
            locations={[0, 0.5, 0.7, 0.85, 1]}
            style={StyleSheet.absoluteFill}
          />
        </View>
      )}

      {/* Header - scrolls with content */}
      <View style={styles.scrollHeader}>
        <TouchableOpacity style={styles.headerActionButton} onPress={handleBack}>
          <ChevronLeft size={scale(18)} color="#000" strokeWidth={2.5} />
        </TouchableOpacity>

        {/* Action Buttons in Header */}
        <View style={styles.headerActions}>
          {/* Follow Button */}
          <TouchableOpacity
            style={[
              styles.headerActionButton,
              isFollowing && { backgroundColor: '#000' }
            ]}
            onPress={handleFollowToggle}
            activeOpacity={0.7}
          >
            {isFollowing ? (
              <BellOff size={scale(16)} color="#fff" strokeWidth={2} />
            ) : (
              <Bell size={scale(16)} color="#000" strokeWidth={2} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Author Info with Stacked Covers */}
      <View style={styles.authorHeader}>
        <StackedCovers
          bookIds={bookIds}
          authorImageUrl={authorImageUrl}
          authorName={authorInfo?.name}
        />
        <Text style={[styles.authorName, { color: themeColors.text }]}>{authorInfo?.name}</Text>

        <Text style={[styles.bookCount, { color: themeColors.textSecondary }]}>
          {authorInfo?.bookCount} {authorInfo?.bookCount === 1 ? 'book' : 'books'} · {formatTotalDuration()}
        </Text>

        {/* Genre tags */}
        {authorGenres.length > 0 && (
          <View style={styles.genreTagsRow}>
            {authorGenres.map((genre) => (
              <View key={genre} style={[styles.genreTag, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
                <Text style={[styles.genreTagText, { color: themeColors.textSecondary }]}>{genre}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Progress stats */}
        {(progressStats.completed > 0 || progressStats.inProgress > 0) && (
          <View style={styles.progressStatsRow}>
            {progressStats.completed > 0 && (
              <View style={[styles.progressStat, { backgroundColor: isDarkMode ? 'rgba(76, 175, 80, 0.2)' : 'rgba(76, 175, 80, 0.15)' }]}>
                <CheckCircle size={scale(14)} color="#4CAF50" strokeWidth={2} />
                <Text style={[styles.progressStatText, { color: themeColors.text }]}>
                  {progressStats.completed} completed
                </Text>
              </View>
            )}
            {progressStats.inProgress > 0 && (
              <View style={[styles.progressStat, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
                <BookOpen size={scale(14)} color={themeColors.textSecondary} strokeWidth={2} />
                <Text style={[styles.progressStatText, { color: themeColors.text }]}>
                  {progressStats.inProgress} in progress
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Bio with Read more */}
        {authorInfo?.description && (
          <View style={styles.bioContainer}>
            <Text style={[styles.bioText, { color: themeColors.textSecondary }]}>{displayBio}</Text>
            {shouldTruncateBio && (
              <TouchableOpacity onPress={() => setBioExpanded(!bioExpanded)}>
                <Text style={[styles.bioToggle, { color: themeColors.accent }]}>
                  {bioExpanded ? 'Read less' : 'Read more'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Continue Listening section - Zeigarnik Effect: show incomplete first */}
      {continueListeningBooks.length > 0 && (
        <View style={styles.continueListeningSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
              Continue Listening
            </Text>
          </View>
          {continueListeningBooks.map((book) => {
            const metadata = getMetadata(book);
            const progress = getProgress(book);
            const duration = (book.media as any)?.duration || 0;
            const remaining = duration * (1 - progress);

            return (
              <TouchableOpacity
                key={book.id}
                style={[styles.continueListeningItem, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
                onPress={() => handleBookPress(book.id)}
                activeOpacity={0.7}
              >
                <Image
                  source={apiClient.getItemCoverUrl(book.id)}
                  style={[styles.continueListeningCover, { backgroundColor: themeColors.surfaceElevated }]}
                  contentFit="cover"
                />
                <View style={styles.continueListeningInfo}>
                  <Text style={[styles.continueListeningTitle, { color: themeColors.text }]} numberOfLines={1}>
                    {metadata?.title}
                  </Text>
                  {metadata?.seriesName && (
                    <Text style={[styles.continueListeningSeries, { color: themeColors.textSecondary }]} numberOfLines={1}>
                      {metadata.seriesName}
                    </Text>
                  )}
                  {metadata?.narratorName && (
                    <TouchableOpacity onPress={() => handleNarratorPress(metadata.narratorName)}>
                      <Text style={[styles.continueListeningNarrator, { color: themeColors.accent }]} numberOfLines={1}>
                        {metadata.narratorName}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {/* Progress bar */}
                  <View style={styles.continueListeningProgressRow}>
                    <View style={[styles.continueListeningProgressTrack, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]}>
                      <View style={[styles.continueListeningProgressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: themeColors.accent }]} />
                    </View>
                    <Text style={[styles.continueListeningProgressText, { color: themeColors.textSecondary }]}>
                      {Math.round(progress * 100)}%
                    </Text>
                  </View>
                  {/* Time remaining - Goal Gradient effect */}
                  <Text style={[styles.continueListeningRemaining, { color: themeColors.text }]}>
                    {formatTimeRemaining(remaining)}
                  </Text>
                </View>
                <TouchableOpacity style={[styles.continueListeningPlayButton, { backgroundColor: themeColors.accent }]}>
                  <Play size={scale(16)} color="#000" fill="#000" strokeWidth={0} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Series section (above books) */}
      {authorSeries.length > 0 && (
        <View style={styles.seriesSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
              Series
            </Text>
            <Text style={[styles.sectionCount, { color: themeColors.textSecondary }]}>
              {authorSeries.length}
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.seriesScrollContent}
          >
            {authorSeries.map((series) => (
              <TouchableOpacity
                key={series.name}
                style={[styles.seriesCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}
                onPress={() => handleSeriesPress(series.name)}
                activeOpacity={0.7}
              >
                {/* Fanned mini covers */}
                <View style={styles.seriesCoverStack}>
                  {series.bookIds.slice(0, 3).map((bookId, idx) => (
                    <Image
                      key={bookId}
                      source={apiClient.getItemCoverUrl(bookId)}
                      style={[
                        styles.seriesMiniCover,
                        {
                          left: idx * scale(14),
                          zIndex: 3 - idx,
                          transform: [{ rotate: `${(idx - 1) * 5}deg` }],
                          backgroundColor: themeColors.surfaceElevated,
                        },
                      ]}
                      contentFit="cover"
                    />
                  ))}
                </View>
                <Text style={[styles.seriesName, { color: themeColors.text }]} numberOfLines={2}>
                  {series.name}
                </Text>
                <Text style={[styles.seriesBookCount, { color: themeColors.textSecondary }]}>
                  {series.bookCount} {series.bookCount === 1 ? 'book' : 'books'}
                </Text>
                <ChevronRight size={scale(14)} color={themeColors.textTertiary} style={styles.seriesChevron} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Books section header with sort controls */}
      <View style={styles.booksSection}>
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
          All Books ({sortedBooks.length})
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sortControlsScroll}>
          <View style={styles.sortControls}>
            {(['title', 'recent', 'duration', 'series'] as const).map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.sortButton,
                  { backgroundColor: sortOption === option
                    ? themeColors.accent
                    : isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'
                  }
                ]}
                onPress={() => setSortOption(option)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.sortButtonText,
                  { color: sortOption === option ? '#000' : themeColors.textSecondary }
                ]}>
                  {option === 'title' ? 'Title' : option === 'recent' ? 'Recent' : option === 'duration' ? 'Duration' : 'Series'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </>
  ), [
    firstBookCoverUrl, isDarkMode, themeColors, bookIds, authorInfo, authorImageUrl,
    progressStats, displayBio, shouldTruncateBio, bioExpanded, authorSeries, authorGenres,
    continueListeningBooks, sortedBooks.length, sortOption,
    isFollowing, handleFollowToggle, handleBack, handleSeriesPress, handleBookPress, handleNarratorPress
  ]);

  const ListEmpty = () => (
    <View style={styles.emptyListContainer}>
      <User size={scale(40)} color={themeColors.textTertiary} strokeWidth={1.5} />
      <Text style={[styles.emptyListTitle, { color: themeColors.text }]}>No books found</Text>
      <Text style={[styles.emptyListSubtitle, { color: themeColors.textSecondary }]}>
        This author has no books in your library
      </Text>
    </View>
  );

  // Similar Authors footer component
  const ListFooter = useMemo(() => {
    if (similarAuthors.length === 0) return null;

    return (
      <View style={styles.similarAuthorsSection}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            Readers Also Enjoy
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.similarAuthorsScrollContent}
        >
          {similarAuthors.map((author) => {
            // Generate initials
            const initials = author.name
              .split(' ')
              .map((word) => word[0])
              .slice(0, 2)
              .join('')
              .toUpperCase();

            // Generate a consistent color based on name
            const colorIndex = author.name.charCodeAt(0) % 5;
            const avatarColors = ['#F3B60C', '#4CAF50', '#FF9800', '#2196F3', '#9C27B0'];
            const avatarColor = avatarColors[colorIndex];

            const authorImageUrl = author.id ? apiClient.getAuthorImageUrl(author.id) : null;

            return (
              <TouchableOpacity
                key={author.name}
                style={styles.similarAuthorCard}
                onPress={() => handleAuthorPress(author.name)}
                activeOpacity={0.7}
              >
                {authorImageUrl ? (
                  <Image
                    source={authorImageUrl}
                    style={[styles.similarAuthorImage, { backgroundColor: themeColors.surfaceElevated }]}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[styles.similarAuthorImage, { backgroundColor: avatarColor }]}>
                    <Text style={styles.similarAuthorInitials}>{initials}</Text>
                  </View>
                )}
                <Text style={[styles.similarAuthorName, { color: themeColors.text }]} numberOfLines={2}>
                  {author.name}
                </Text>
                <Text style={[styles.similarAuthorCount, { color: themeColors.textSecondary }]}>
                  {author.bookCount} {author.bookCount === 1 ? 'book' : 'books'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  }, [similarAuthors, themeColors, handleAuthorPress]);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle={themeColors.statusBar} backgroundColor="transparent" translucent />

      <FlatList
        ref={flatListRef}
        data={sortedBooks}
        renderItem={renderBookItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter}
        style={{ backgroundColor: themeColors.background }}
        contentContainerStyle={{
          paddingTop: insets.top,
          paddingBottom: SCREEN_BOTTOM_PADDING + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        windowSize={5}
        maxToRenderPerBatch={5}
        initialNumToRender={10}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={themeColors.text}
            progressViewOffset={20}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroBackgroundScrollable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: scale(550),
    marginTop: -scale(100),
  },
  scrollHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  headerActionButton: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  authorHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },
  authorName: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: scale(4),
  },
  bookCount: {
    fontSize: 14,
    marginTop: scale(4),
  },
  progressStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    marginTop: scale(12),
  },
  progressStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: scale(16),
  },
  progressStatText: {
    fontSize: scale(13),
    fontWeight: '500',
  },
  bioContainer: {
    marginTop: scale(16),
    paddingHorizontal: scale(10),
  },
  bioText: {
    fontSize: scale(14),
    lineHeight: scale(20),
    textAlign: 'center',
  },
  bioToggle: {
    fontSize: scale(14),
    fontWeight: '500',
    marginTop: scale(4),
    textAlign: 'center',
  },
  // Series section
  seriesSection: {
    paddingTop: scale(16),
    paddingBottom: scale(8),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    marginBottom: scale(12),
    gap: scale(8),
  },
  sectionCount: {
    fontSize: scale(14),
    fontWeight: '500',
  },
  seriesScrollContent: {
    paddingHorizontal: scale(16),
    gap: scale(12),
  },
  seriesCard: {
    width: scale(140),
    paddingVertical: scale(12),
    paddingHorizontal: scale(12),
    borderRadius: scale(12),
    alignItems: 'center',
  },
  seriesCoverStack: {
    width: scale(70),
    height: scale(70),
    marginBottom: scale(10),
    position: 'relative',
  },
  seriesMiniCover: {
    position: 'absolute',
    width: scale(48),
    height: scale(48),
    borderRadius: scale(4),
  },
  seriesName: {
    fontSize: scale(13),
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: scale(4),
  },
  seriesBookCount: {
    fontSize: scale(11),
    textAlign: 'center',
  },
  seriesChevron: {
    position: 'absolute',
    top: scale(8),
    right: scale(8),
  },

  // Books section
  booksSection: {
    paddingTop: scale(8),
    paddingHorizontal: scale(16),
    paddingBottom: scale(8),
  },
  sectionTitle: {
    fontSize: scale(18),
    fontWeight: '700',
  },
  bookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(12),
    paddingHorizontal: scale(16),
    borderBottomWidth: 1,
  },
  bookCoverContainer: {
    position: 'relative',
    width: scale(60),
    height: scale(60),
    borderRadius: scale(6),
    overflow: 'hidden',
    marginRight: scale(12),
  },
  bookCover: {
    width: '100%',
    height: '100%',
  },
  completedBadge: {
    position: 'absolute',
    top: scale(2),
    right: scale(2),
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: scale(8),
  },
  bookInfo: {
    flex: 1,
  },
  bookTitle: {
    fontSize: scale(15),
    fontWeight: '500',
    marginBottom: scale(2),
  },
  bookSeries: {
    fontSize: scale(12),
    marginBottom: scale(2),
  },
  bookMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  bookMeta: {
    fontSize: scale(12),
  },
  bookMetaDot: {
    fontSize: scale(12),
    marginHorizontal: scale(6),
  },
  bookNarrator: {
    fontSize: scale(12),
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scale(6),
    gap: scale(8),
  },
  progressBar: {
    flex: 1,
    height: scale(4),
    borderRadius: scale(2),
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: scale(2),
  },
  progressText: {
    fontSize: scale(11),
  },
  emptyListContainer: {
    alignItems: 'center',
    paddingVertical: scale(40),
    paddingHorizontal: scale(20),
  },
  emptyListTitle: {
    fontSize: scale(16),
    fontWeight: '600',
    marginTop: scale(12),
  },
  emptyListSubtitle: {
    fontSize: scale(13),
    marginTop: scale(4),
    textAlign: 'center',
  },

  // Genre tags
  genreTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: scale(8),
    marginTop: scale(8),
    paddingHorizontal: scale(16),
  },
  genreTag: {
    paddingHorizontal: scale(12),
    paddingVertical: scale(4),
    borderRadius: scale(12),
  },
  genreTagText: {
    fontSize: scale(12),
    fontWeight: '500',
  },

  // Continue Listening section
  continueListeningSection: {
    paddingTop: scale(16),
    paddingBottom: scale(8),
    paddingHorizontal: scale(16),
  },
  continueListeningItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(12),
    borderRadius: scale(12),
    marginTop: scale(8),
  },
  continueListeningCover: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(6),
  },
  continueListeningInfo: {
    flex: 1,
    marginLeft: scale(12),
    marginRight: scale(12),
  },
  continueListeningTitle: {
    fontSize: scale(15),
    fontWeight: '600',
    marginBottom: scale(2),
  },
  continueListeningSeries: {
    fontSize: scale(12),
    marginBottom: scale(2),
  },
  continueListeningNarrator: {
    fontSize: scale(12),
    marginBottom: scale(4),
  },
  continueListeningProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: scale(2),
  },
  continueListeningProgressTrack: {
    flex: 1,
    height: scale(4),
    borderRadius: scale(2),
    overflow: 'hidden',
  },
  continueListeningProgressFill: {
    height: '100%',
    borderRadius: scale(2),
  },
  continueListeningProgressText: {
    fontSize: scale(11),
    fontWeight: '500',
  },
  continueListeningRemaining: {
    fontSize: scale(12),
    fontWeight: '600',
  },
  continueListeningPlayButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Sort controls
  sortControlsScroll: {
    marginTop: scale(8),
    marginHorizontal: scale(-16),
  },
  sortControls: {
    flexDirection: 'row',
    gap: scale(8),
    paddingHorizontal: scale(16),
  },
  sortButton: {
    paddingHorizontal: scale(14),
    paddingVertical: scale(6),
    borderRadius: scale(16),
  },
  sortButtonText: {
    fontSize: scale(13),
    fontWeight: '500',
  },

  // Similar Authors section
  similarAuthorsSection: {
    paddingTop: scale(24),
    paddingBottom: scale(16),
  },
  similarAuthorsScrollContent: {
    paddingHorizontal: scale(16),
    gap: scale(16),
  },
  similarAuthorCard: {
    width: scale(100),
    alignItems: 'center',
  },
  similarAuthorImage: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(8),
  },
  similarAuthorInitials: {
    fontSize: scale(24),
    fontWeight: '700',
    color: '#fff',
  },
  similarAuthorName: {
    fontSize: scale(13),
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: scale(2),
  },
  similarAuthorCount: {
    fontSize: scale(11),
    textAlign: 'center',
  },
});
