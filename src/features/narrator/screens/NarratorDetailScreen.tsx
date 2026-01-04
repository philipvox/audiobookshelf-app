/**
 * src/features/narrator/screens/NarratorDetailScreen.tsx
 *
 * Narrator detail screen redesigned to match SeriesDetailScreen pattern.
 * Features:
 * - Blurred hero background with gradient fade
 * - Stacked book covers
 * - FlatList with ListHeaderComponent for performance
 * - Clean title section with book count and duration
 * - Progress stats (completed/in-progress)
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
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
  ChevronRight,
  Mic,
  User,
  CheckCircle,
  BookOpen,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useLibraryCache } from '@/core/cache';
import { apiClient } from '@/core/api';
import { LibraryItem } from '@/core/types';
import { usePlayerStore } from '@/features/player';
import { SCREEN_BOTTOM_PADDING } from '@/constants/layout';
import { scale, wp, radius } from '@/shared/theme';
import { useThemeColors, useIsDarkMode } from '@/shared/theme/themeStore';

type NarratorDetailRouteParams = {
  NarratorDetail: { narratorName: string } | { name: string };
};

// Screen dimensions
const SCREEN_WIDTH = wp(100);

// Stacked covers constants
const STACK_COVER_SIZE = SCREEN_WIDTH * 0.38;
const STACK_OFFSET = SCREEN_WIDTH * 0.12;
const STACK_ROTATION = 8;
const STACK_VERTICAL_OFFSET = scale(12);
const MAX_STACK_COVERS = 5;

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

// Stacked book covers component with optional narrator initials as center cover
interface StackedCoversProps {
  bookIds: string[];
  narratorName?: string;  // For initials in center
}

const StackedCovers = React.memo(function StackedCovers({ bookIds, narratorName }: StackedCoversProps) {
  const themeColors = useThemeColors();

  // Max 5 total cards: narrator in center + up to 4 books (2 on each side)
  // Books must be even for symmetric display
  const stackBooks = useMemo(() => {
    // Cap at 4 books (for max 5 total with narrator)
    let maxBooks = Math.min(4, bookIds.length);
    // Make even (so we have equal books on each side)
    if (maxBooks % 2 !== 0) maxBooks -= 1;
    // If only 1 book, show just narrator (can't be symmetric)
    if (bookIds.length === 1) maxBooks = 0;
    return bookIds.slice(0, maxBooks);
  }, [bookIds]);

  const count = stackBooks.length;

  const coverUrls = useMemo(() =>
    stackBooks.map(id => apiClient.getItemCoverUrl(id)),
    [stackBooks]
  );

  // Generate initials from narrator name
  const initials = useMemo(() => {
    if (!narratorName) return '';
    return narratorName
      .split(' ')
      .map((word) => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }, [narratorName]);

  // Generate a consistent color based on name
  const avatarColor = useMemo(() => {
    if (!narratorName) return '#9C27B0';
    const colorIndex = narratorName.charCodeAt(0) % 5;
    const avatarColors = ['#9C27B0', '#2196F3', '#FF9800', '#4CAF50', '#F3B60C'];
    return avatarColors[colorIndex];
  }, [narratorName]);

  // If no books to show (0 or 1 book), just show narrator initials
  if (count === 0) {
    return (
      <View style={stackStyles.container}>
        <View style={[stackStyles.cover, stackStyles.narratorCover, stackStyles.placeholder, { backgroundColor: avatarColor }]}>
          {initials ? (
            <Text style={stackStyles.initialsText}>{initials}</Text>
          ) : (
            <Mic size={scale(48)} color="#FFFFFF" strokeWidth={1.5} />
          )}
        </View>
      </View>
    );
  }

  // Narrator is always in the center
  // Books split evenly: half on left, half on right
  const booksPerSide = count / 2;
  const totalCovers = count + 1;  // Book covers + narrator
  const centerIndex = booksPerSide;  // Narrator position

  // Dynamic container width
  const containerWidth = STACK_COVER_SIZE + (totalCovers - 1) * STACK_OFFSET;

  return (
    <View style={[stackStyles.container, { width: containerWidth }]}>
      {/* Render book covers with narrator in center */}
      {stackBooks.map((bookId, index) => {
        // Position: 0,1 are left of narrator, 2,3 are right of narrator
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

      {/* Narrator initials in the center (highest z-index) */}
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
        <View
          style={[
            stackStyles.cover,
            stackStyles.narratorCover,
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
            <Mic size={scale(48)} color="#FFFFFF" strokeWidth={1.5} />
          )}
        </View>
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
  narratorCover: {
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

export function NarratorDetailScreen() {
  const route = useRoute<RouteProp<NarratorDetailRouteParams, 'NarratorDetail'>>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  const themeColors = useThemeColors();
  const isDarkMode = useIsDarkMode();

  // Handle both param formats - with null safety
  const narratorName = (route.params as any).narratorName || (route.params as any).name || '';

  const [isRefreshing, setIsRefreshing] = useState(false);

  const { getNarrator, getAuthor, isLoaded, refreshCache } = useLibraryCache();
  const currentBookId = usePlayerStore((s) => s.currentBook?.id);

  // Get narrator data from cache
  const narratorInfo = useMemo(() => {
    if (!isLoaded || !narratorName) return null;
    return getNarrator(narratorName);
  }, [isLoaded, narratorName, getNarrator]);

  // Sort books by title
  const sortedBooks = useMemo(() => {
    if (!narratorInfo?.books) return [];
    return [...narratorInfo.books].sort((a, b) => {
      const titleA = (getMetadata(a)?.title || '').toLowerCase();
      const titleB = (getMetadata(b)?.title || '').toLowerCase();
      return titleA.localeCompare(titleB);
    });
  }, [narratorInfo?.books]);

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

  // Get first book cover URL for hero background
  const bookIds = useMemo(() => sortedBooks.map(b => b.id), [sortedBooks]);
  const firstBookCoverUrl = useMemo(() => bookIds[0] ? apiClient.getItemCoverUrl(bookIds[0]) : null, [bookIds]);

  // Extract unique authors from narrator's books
  const narratorAuthors = useMemo(() => {
    const authorMap = new Map<string, { name: string; id?: string; bookCount: number; bookIds: string[] }>();

    sortedBooks.forEach(book => {
      const metadata = getMetadata(book);
      const authorName = metadata?.authorName;

      if (authorName) {
        const existing = authorMap.get(authorName);
        if (existing) {
          existing.bookCount++;
          if (existing.bookIds.length < 3) {
            existing.bookIds.push(book.id);
          }
        } else {
          // Try to get author ID from cache for image URL
          const authorInfo = getAuthor(authorName);
          authorMap.set(authorName, {
            name: authorName,
            id: authorInfo?.id,
            bookCount: 1,
            bookIds: [book.id],
          });
        }
      }
    });

    return Array.from(authorMap.values()).sort((a, b) => b.bookCount - a.bookCount);
  }, [sortedBooks, getAuthor]);

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

  const handleAuthorPress = useCallback((authorName: string) => {
    navigation.navigate('AuthorDetail', { authorName });
  }, [navigation]);

  // Early return if no narrator name provided
  if (!narratorName) {
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
          <Mic size={48} color={themeColors.textTertiary} strokeWidth={1.5} />
          <Text style={[styles.emptyTitle, { color: themeColors.text }]}>Narrator not found</Text>
          <Text style={[styles.emptySubtitle, { color: themeColors.textSecondary }]}>
            This narrator may have been removed
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
  if (!narratorInfo) {
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
          <Mic size={48} color={themeColors.textTertiary} strokeWidth={1.5} />
          <Text style={[styles.emptyTitle, { color: themeColors.text }]}>Narrator not found</Text>
          <Text style={[styles.emptySubtitle, { color: themeColors.textSecondary }]}>
            This narrator may have been removed
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
            {metadata?.authorName && (
              <>
                <Text style={[styles.bookMetaDot, { color: themeColors.textTertiary }]}>·</Text>
                <TouchableOpacity onPress={() => handleAuthorPress(metadata.authorName)}>
                  <Text style={[styles.bookAuthor, { color: themeColors.accent }]} numberOfLines={1}>
                    {metadata.authorName}
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
  }, [currentBookId, handleBookPress, handleAuthorPress, themeColors, isDarkMode]);

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

        {/* Placeholder for symmetry */}
        <View style={styles.headerActions} />
      </View>

      {/* Narrator Info with Stacked Covers */}
      <View style={styles.narratorHeader}>
        <StackedCovers
          bookIds={bookIds}
          narratorName={narratorInfo?.name}
        />
        <Text style={[styles.narratorName, { color: themeColors.text }]}>{narratorInfo?.name}</Text>

        <Text style={[styles.bookCount, { color: themeColors.textSecondary }]}>
          {narratorInfo?.bookCount} {narratorInfo?.bookCount === 1 ? 'book' : 'books'} · {formatTotalDuration()}
        </Text>

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
      </View>

      {/* Authors section (above books) */}
      {narratorAuthors.length > 0 && (
        <View style={styles.authorsSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
              Authors
            </Text>
            <Text style={[styles.sectionCount, { color: themeColors.textSecondary }]}>
              {narratorAuthors.length}
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.authorsScrollContent}
          >
            {narratorAuthors.map((author) => {
              // Generate initials for author avatar fallback
              const authorInitials = author.name
                .split(' ')
                .map((word) => word[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();
              // Generate consistent avatar color
              const colorIndex = author.name.charCodeAt(0) % 5;
              const avatarColors = ['#F3B60C', '#4CAF50', '#FF9800', '#2196F3', '#9C27B0'];
              const authorAvatarColor = avatarColors[colorIndex];
              // Get author image URL if available
              const authorImageUrl = author.id ? apiClient.getAuthorImageUrl(author.id) : null;

              return (
                <TouchableOpacity
                  key={author.name}
                  style={[styles.authorCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}
                  onPress={() => handleAuthorPress(author.name)}
                  activeOpacity={0.7}
                >
                  {/* Author avatar with image or initials fallback */}
                  {authorImageUrl ? (
                    <Image
                      source={authorImageUrl}
                      style={[styles.authorAvatar, { backgroundColor: themeColors.surfaceElevated }]}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[styles.authorAvatar, { backgroundColor: authorAvatarColor }]}>
                      <Text style={styles.authorInitials}>{authorInitials}</Text>
                    </View>
                  )}
                  <Text style={[styles.authorCardName, { color: themeColors.text }]} numberOfLines={2}>
                    {author.name}
                  </Text>
                  <Text style={[styles.authorBookCount, { color: themeColors.textSecondary }]}>
                    {author.bookCount} {author.bookCount === 1 ? 'book' : 'books'}
                  </Text>
                  <ChevronRight size={scale(14)} color={themeColors.textTertiary} style={styles.authorChevron} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Books section header */}
      <View style={styles.booksSection}>
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
          All Books
        </Text>
      </View>
    </>
  ), [
    firstBookCoverUrl, isDarkMode, themeColors, bookIds, narratorInfo,
    progressStats, narratorAuthors, handleBack, handleAuthorPress
  ]);

  const ListEmpty = () => (
    <View style={styles.emptyListContainer}>
      <Mic size={scale(40)} color={themeColors.textTertiary} strokeWidth={1.5} />
      <Text style={[styles.emptyListTitle, { color: themeColors.text }]}>No books found</Text>
      <Text style={[styles.emptyListSubtitle, { color: themeColors.textSecondary }]}>
        This narrator has no books in your library
      </Text>
    </View>
  );

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
    width: scale(36), // Match button width for symmetry
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
  narratorHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },
  narratorName: {
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
  // Authors section
  authorsSection: {
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
  authorsScrollContent: {
    paddingHorizontal: scale(16),
    gap: scale(12),
  },
  authorCard: {
    width: scale(120),
    paddingVertical: scale(12),
    paddingHorizontal: scale(12),
    borderRadius: scale(12),
    alignItems: 'center',
  },
  authorAvatar: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(6),  // Square with rounded corners like book covers
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(10),
    overflow: 'hidden',
  },
  authorInitials: {
    fontSize: scale(20),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  authorCardName: {
    fontSize: scale(13),
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: scale(4),
  },
  authorBookCount: {
    fontSize: scale(11),
    textAlign: 'center',
  },
  authorChevron: {
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
  bookAuthor: {
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
});
