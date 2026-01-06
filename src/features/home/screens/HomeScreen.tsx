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
  RefreshControl,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Headphones, BookOpen } from 'lucide-react-native';

import { apiClient } from '@/core/api';
import { useCoverUrl } from '@/core/cache';
import { LibraryItem } from '@/core/types';
import { usePlayerStore } from '@/features/player';
import { haptics } from '@/core/native/haptics';
import { spacing, scale, layout, wp, hp } from '@/shared/theme';
import { useThemeColors, useIsDarkMode } from '@/shared/theme/themeStore';
import { SCREEN_BOTTOM_PADDING, TOP_NAV_HEIGHT } from '@/constants/layout';
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
  const themeColors = useThemeColors();
  const isDarkMode = useIsDarkMode();

  // Home data
  const {
    heroBook,
    continueListeningGrid,
    seriesInProgress,
    recentlyAdded,
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

    const metadata = (heroBook.book.media?.metadata as any) || {};
    const coverUrl = apiClient.getItemCoverUrl(heroBook.book.id);

    return {
      book: {
        id: heroBook.book.id,
        title: metadata.title || 'Untitled',
        author: metadata.authorName || metadata.authors?.[0]?.name || '',
        narrator: heroBook.narratorName || metadata.narratorName || undefined,
        coverUrl,
        duration: (heroBook.book.media as any)?.duration || 0,
        genres: metadata.genres || [],
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
      const progress = (book as any).userMediaProgress?.progress || 0;
      return libraryItemToBookSummary(book, coverUrl, { progress });
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

  // Check if home screen is completely empty (new user)
  const isCompletelyEmpty = !heroBook && continueListeningGrid.length === 0 && seriesInProgress.length === 0 && recentlyAdded.length === 0;

  // Show hero background when we have a hero book
  const showHeroBackground = !!heroBook;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle={themeColors.statusBar} backgroundColor="transparent" translucent />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + TOP_NAV_HEIGHT + 8,
            paddingBottom: SCREEN_BOTTOM_PADDING + insets.bottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={themeColors.text}
          />
        }
      >
        {/* Hero Background - scrolls with content (matches Browse page) */}
        {showHeroBackground && (
          <View style={styles.heroBackgroundScrollable}>
            <Image
              source={heroCoverUrl || heroBook?.book.media?.coverPath}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              blurRadius={25}
            />
            {/* BlurView for Android (blurRadius only works on iOS) */}
            <BlurView intensity={30} tint={isDarkMode ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
            {/* Dark overlay at top - feathered */}
            <LinearGradient
              colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.2)', 'transparent']}
              locations={[0, 0.3, 0.6, 1]}
              style={styles.topOverlay}
            />
            {/* Smooth fade at bottom */}
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

        {/* Empty state for new users */}
        {isCompletelyEmpty ? (
          <View style={styles.emptyHomeContainer}>
            <View style={[styles.emptyHomeIcon, { backgroundColor: themeColors.border }]}>
              <Headphones size={48} color={themeColors.text} strokeWidth={1.5} />
            </View>
            <Text style={[styles.emptyHomeTitle, { color: themeColors.text }]}>Welcome</Text>
            <Text style={[styles.emptyHomeDescription, { color: themeColors.textSecondary }]}>
              Your audiobook collection is waiting. Browse your library to start listening.
            </Text>
            <TouchableOpacity
              style={[styles.emptyHomeCTA, { backgroundColor: themeColors.text }]}
              onPress={handleLibraryPress}
              activeOpacity={0.8}
            >
              <BookOpen size={18} color={themeColors.background} strokeWidth={2} />
              <Text style={[styles.emptyHomeCTAText, { color: themeColors.background }]}>Browse Library</Text>
            </TouchableOpacity>
          </View>
        ) : (
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
  heroBackgroundScrollable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: scale(550),
    marginTop: -scale(100),
  },
  topOverlay: {
    position: 'absolute',
    top: scale(100),
    left: 0,
    right: 0,
    height: scale(250),
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
