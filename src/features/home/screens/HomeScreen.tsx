/**
 * src/features/home/screens/HomeScreen.tsx
 *
 * Resume-focused Home Screen Dashboard
 * Design matches Browse page with blurred hero background and grid sections.
 *
 * Layout:
 * 1. Hero Section - Large centered cover (matches Browse's HeroSection)
 * 2. Continue Listening - 2x2 grid carousel
 * 3. Series In Progress - Enhanced series cards with progress
 * 4. Recently Added - 2x2 grid carousel
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Headphones, BookOpen, Library, Clock } from 'lucide-react-native';

import { apiClient } from '@/core/api';
import { useCoverUrl } from '@/core/cache';
import { LibraryItem, BookMedia, BookMetadata } from '@/core/types';

// Helper to get book metadata safely
function getBookMetadata(item: LibraryItem | null | undefined): BookMetadata | null {
  if (!item?.media?.metadata) return null;
  if (item.mediaType !== 'book') return null;
  return item.media.metadata as BookMetadata;
}

// Type guard for book media
function isBookMedia(media: LibraryItem['media'] | undefined): media is BookMedia {
  return media !== undefined && 'duration' in media;
}
import { usePlayerStore } from '@/features/player';
import { haptics } from '@/core/native/haptics';
import { spacing, scale, layout, wp, hp, useTheme } from '@/shared/theme';
import { useIsDarkMode } from '@/shared/theme/themeStore';
import { SkullRefreshControl } from '@/shared/components';
import { MINI_PLAYER_HEIGHT, TOP_NAV_HEIGHT } from '@/constants/layout';
import { useScreenLoadTime } from '@/core/hooks/useScreenLoadTime';

// Discover components (matching Browse page design)
import {
  HeroSection,
  ContentRowCarousel,
  HeroRecommendation,
  ContentRow,
  BookSummary,
  libraryItemToBookSummary,
} from '@/features/discover';

// Home components
import { SectionHeader } from '../components/SectionHeader';
import { SeriesCard } from '../components/SeriesCard';

// Types
import { EnhancedSeriesData } from '../types';

// Hooks
import { useHomeData } from '../hooks/useHomeData';

export function HomeScreen() {
  useScreenLoadTime('HomeScreen');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const isDarkMode = useIsDarkMode();

  // Home data
  const {
    heroBook,
    continueListeningGrid,
    seriesInProgress,
    recentlyAdded,
    viewMode,
    toggleViewMode,
    discoverBooks,
    isRefreshing,
    refresh,
  } = useHomeData();

  // Player state
  const { loadBook } = usePlayerStore();

  // Get cached cover URL for hero background
  const heroBookId = heroBook?.book.id || '';
  const heroCoverUrl = useCoverUrl(heroBookId);

  // Navigation handlers
  const handleLibraryPress = () => navigation.navigate('Main', { screen: 'LibraryTab' });

  // Navigate to series detail
  const handleSeriesPress = useCallback((series: EnhancedSeriesData) => {
    navigation.navigate('SeriesDetail', { seriesName: series.name });
  }, [navigation]);

  // Convert heroBook to HeroRecommendation format for HeroSection
  const heroRecommendation: HeroRecommendation | null = useMemo(() => {
    if (!heroBook) return null;

    const metadata = getBookMetadata(heroBook.book);
    const coverUrl = apiClient.getItemCoverUrl(heroBook.book.id);
    const duration = isBookMedia(heroBook.book.media) ? heroBook.book.media.duration || 0 : 0;

    return {
      book: {
        id: heroBook.book.id,
        title: metadata?.title || 'Untitled',
        author: metadata?.authorName || metadata?.authors?.[0]?.name || '',
        narrator: heroBook.narratorName || metadata?.narratorName || undefined,
        coverUrl,
        duration,
        genres: metadata?.genres || [],
        addedDate: heroBook.book.addedAt || 0,
        progress: heroBook.progress,
        isDownloaded: false,
      },
      reason: heroBook.state === 'almost-done' ? 'Almost finished!' :
              heroBook.state === 'final-chapter' ? 'Final chapter!' :
              heroBook.state === 'just-finished' ? 'Just finished' :
              'Continue listening',
      type: 'personalized' as const,
    };
  }, [heroBook]);

  // Convert continueListeningGrid to ContentRow format
  const continueListeningRow: ContentRow | null = useMemo(() => {
    if (continueListeningGrid.length === 0) return null;

    const items: BookSummary[] = continueListeningGrid.map((book) => {
      const coverUrl = apiClient.getItemCoverUrl(book.id);

      // ABS items-in-progress now has mediaProgress attached from /api/me
      // Access via typed properties on LibraryItem
      const progress = book.mediaProgress?.progress
        ?? book.userMediaProgress?.progress
        ?? 0;

      // Get lastUpdate from various possible locations in the API response
      const rawLastUpdate =
        book.mediaProgress?.lastUpdate ||
        book.userMediaProgress?.lastUpdate;

      // Convert to milliseconds if needed (ABS API returns seconds)
      let lastPlayedAt: number | undefined;
      if (rawLastUpdate && rawLastUpdate > 0) {
        lastPlayedAt = rawLastUpdate < 10000000000 ? rawLastUpdate * 1000 : rawLastUpdate;
      }

      return libraryItemToBookSummary(book, coverUrl, { progress, lastPlayedAt });
    });

    return {
      id: 'continue-listening',
      type: 'continue_listening',
      title: 'Continue Listening',
      items,
      totalCount: continueListeningGrid.length,
      seeAllRoute: 'LibraryTab',
      priority: 1,
      refreshPolicy: 'realtime',
      displayMode: 'grid',
    };
  }, [continueListeningGrid]);

  // Convert recentlyAdded to ContentRow format
  const recentlyAddedRow: ContentRow | null = useMemo(() => {
    if (recentlyAdded.length === 0) return null;

    const items: BookSummary[] = recentlyAdded.slice(0, 4).map((book) => {
      const coverUrl = apiClient.getItemCoverUrl(book.id);
      return libraryItemToBookSummary(book, coverUrl);
    });

    return {
      id: 'recently-added',
      type: 'new_this_week',
      title: 'Recently Added',
      items,
      totalCount: recentlyAdded.length,
      priority: 3,
      refreshPolicy: 'daily',
      displayMode: 'grid',
    };
  }, [recentlyAdded]);

  // Convert discoverBooks to ContentRow format for "Add to Library" view
  const discoverRow: ContentRow | null = useMemo(() => {
    if (discoverBooks.length === 0) return null;

    const items: BookSummary[] = discoverBooks.slice(0, 8).map((book) => {
      const coverUrl = apiClient.getItemCoverUrl(book.id);
      return libraryItemToBookSummary(book, coverUrl);
    });

    return {
      id: 'discover-books',
      type: 'new_this_week',
      title: 'Add to Your Library',
      items,
      totalCount: discoverBooks.length,
      priority: 1,
      refreshPolicy: 'daily',
      displayMode: 'grid',
    };
  }, [discoverBooks]);

  // Check if home screen is completely empty (new user)
  const isCompletelyEmpty = viewMode === 'lastPlayed'
    ? (!heroBook && continueListeningGrid.length === 0 && seriesInProgress.length === 0 && recentlyAdded.length === 0)
    : discoverBooks.length === 0;

  // Show hero background when we have a hero book (only in lastPlayed mode)
  const showHeroBackground = viewMode === 'lastPlayed' && !!heroBook;

  // Handle view mode toggle with haptic
  const handleToggleViewMode = useCallback(() => {
    haptics.selection();
    toggleViewMode();
  }, [toggleViewMode]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      <SkullRefreshControl refreshing={isRefreshing} onRefresh={refresh}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + TOP_NAV_HEIGHT + 8,
              paddingBottom: MINI_PLAYER_HEIGHT + insets.bottom ,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
        {/* Hero Background - scrolls with content (matches Browse page) */}
        {showHeroBackground && (
          <View style={styles.heroBackgroundScrollable}>
            <Image
              source={heroCoverUrl || heroBook?.book.media?.coverPath}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              blurRadius={50}
            />
            {/* BlurView for Android (blurRadius only works on iOS) */}
            <BlurView intensity={50} tint={isDarkMode ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
            {/* Dark overlay at top - feathered */}
            <LinearGradient
              colors={['rgba(0,0,0,0)',  'rgba(0,0,0,0)', 'transparent']}
              locations={[0, 1]}
              style={styles.topOverlay}
            />
            {/* Smooth fade at bottom */}
            <LinearGradient
              colors={
                isDarkMode
                  ? ['transparent', 'transparent', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.7)', colors.background.primary]
                  : ['transparent', 'transparent', 'rgba(255,255,255,0)', 'rgba(255,255,255,0.7)', colors.background.primary]
              }
              locations={[0, 0.5, 0.7, 0.85, 1]}
              style={StyleSheet.absoluteFill}
            />
          </View>
        )}

        {/* View Mode Toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewMode === 'discover' && styles.toggleButtonActive,
              { borderColor: colors.border.default },
              viewMode === 'discover' && { backgroundColor: colors.accent.primary, borderColor: colors.accent.primary },
            ]}
            onPress={handleToggleViewMode}
            activeOpacity={0.7}
          >
            <Library
              size={16}
              color={viewMode === 'discover' ? colors.accent.textOnAccent : colors.text.secondary}
              strokeWidth={2}
            />
            <Text
              style={[
                styles.toggleText,
                { color: viewMode === 'discover' ? colors.accent.textOnAccent : colors.text.secondary },
              ]}
            >
              Add to Library
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewMode === 'lastPlayed' && styles.toggleButtonActive,
              { borderColor: colors.border.default },
              viewMode === 'lastPlayed' && { backgroundColor: colors.accent.primary, borderColor: colors.accent.primary },
            ]}
            onPress={handleToggleViewMode}
            activeOpacity={0.7}
          >
            <Clock
              size={16}
              color={viewMode === 'lastPlayed' ? colors.accent.textOnAccent : colors.text.secondary}
              strokeWidth={2}
            />
            <Text
              style={[
                styles.toggleText,
                { color: viewMode === 'lastPlayed' ? colors.accent.textOnAccent : colors.text.secondary },
              ]}
            >
              Last Played
            </Text>
          </TouchableOpacity>
        </View>

        {/* Empty state for new users */}
        {isCompletelyEmpty ? (
          <View style={styles.emptyHomeContainer}>
            <View style={[styles.emptyHomeIcon, { backgroundColor: colors.border.default }]}>
              <Headphones size={48} color={colors.text.primary} strokeWidth={1.5} />
            </View>
            <Text style={[styles.emptyHomeTitle, { color: colors.text.primary }]}>
              {viewMode === 'discover' ? 'All Caught Up!' : 'Welcome'}
            </Text>
            <Text style={[styles.emptyHomeDescription, { color: colors.text.secondary }]}>
              {viewMode === 'discover'
                ? 'You\'ve added all available books to your library. Check back later for new additions!'
                : 'Your audiobook collection is waiting. Browse your library to start listening.'}
            </Text>
            <TouchableOpacity
              style={[styles.emptyHomeCTA, { backgroundColor: colors.text.primary }]}
              onPress={handleLibraryPress}
              activeOpacity={0.8}
            >
              <BookOpen size={18} color={colors.background.primary} strokeWidth={2} />
              <Text style={[styles.emptyHomeCTAText, { color: colors.background.primary }]}>Browse Library</Text>
            </TouchableOpacity>
          </View>
        ) : viewMode === 'discover' ? (
          /* DISCOVER VIEW - Add to Library */
          <>
            {/* Discover Books Grid */}
            {discoverRow && (
              <ContentRowCarousel row={discoverRow} />
            )}

            {/* Show more discover books in subsequent rows */}
            {discoverBooks.length > 8 && (
              <ContentRowCarousel
                row={{
                  id: 'discover-more',
                  type: 'new_this_week',
                  title: 'More to Discover',
                  items: discoverBooks.slice(8, 16).map((book) => {
                    const coverUrl = apiClient.getItemCoverUrl(book.id);
                    return libraryItemToBookSummary(book, coverUrl);
                  }),
                  totalCount: discoverBooks.length - 8,
                  priority: 2,
                  refreshPolicy: 'daily',
                  displayMode: 'grid',
                }}
              />
            )}
          </>
        ) : (
          /* LAST PLAYED VIEW - Continue Listening */
          <>
            {/* Hero Section - Large centered cover (matches Browse page) */}
            {heroRecommendation && (
              <HeroSection hero={heroRecommendation} />
            )}

            {/* Continue Listening - 2x2 grid (matches Browse page ContentRowCarousel) */}
            {continueListeningRow && (
              <ContentRowCarousel
                row={continueListeningRow}
                onSeeAll={() => navigation.navigate('Main', { screen: 'LibraryTab' })}
              />
            )}

            {/* Series In Progress - Enhanced series cards with progress */}
            {seriesInProgress.length > 0 && (
              <View style={styles.section}>
                <SectionHeader title="Series In Progress" />
                <View style={styles.seriesGrid}>
                  {seriesInProgress.slice(0, 4).map((series) => (
                    <SeriesCard
                      key={series.id}
                      series={series}
                      onPress={() => handleSeriesPress(series)}
                      showProgress={true}
                      enhancedData={series}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Recently Added - 2x2 grid (matches Browse page ContentRowCarousel) */}
            {recentlyAddedRow && (
              <ContentRowCarousel row={recentlyAddedRow} />
            )}
          </>
        )}
        </ScrollView>
      </SkullRefreshControl>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: scale(8),
  },
  // Hero background - matches Browse page
  // Extended up to cover pull-to-refresh area
  heroBackgroundScrollable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: scale(800),
    marginTop: -scale(350),
  },
  topOverlay: {
    position: 'absolute',
    top: scale(350),
    left: 0,
    right: 0,
    height: scale(200),
  },
  section: {
    marginBottom: spacing.xl,
  },
  seriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: layout.screenPaddingH,
    gap: spacing.md,
  },
  // View mode toggle
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: layout.screenPaddingH,
    marginBottom: spacing.lg,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: scale(20),
    borderWidth: 1,
  },
  toggleButtonActive: {
    // Colors applied inline
  },
  toggleText: {
    fontSize: scale(13),
    fontWeight: '600',
  },
  // Empty home state for new users
  emptyHomeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(10),
    paddingTop: hp(15),
    minHeight: hp(60),
  },
  emptyHomeIcon: {
    width: wp(24),
    height: wp(24),
    borderRadius: wp(12),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(3),
  },
  emptyHomeTitle: {
    fontSize: wp(7),
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: hp(1.5),
  },
  emptyHomeDescription: {
    fontSize: wp(3.8),
    textAlign: 'center',
    lineHeight: wp(5.5),
    maxWidth: wp(70),
    marginBottom: hp(4),
  },
  emptyHomeCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    paddingHorizontal: wp(6),
    paddingVertical: hp(1.5),
    borderRadius: wp(10),
  },
  emptyHomeCTAText: {
    fontSize: wp(4),
    fontWeight: '600',
  },
});

export { HomeScreen as default };
