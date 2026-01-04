/**
 * src/features/browse/screens/BrowseScreen.tsx
 *
 * Discover page using app design system.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useCoverUrl } from '@/core/cache';
import { Icon } from '@/shared/components/Icon';
import { Shimmer } from '@/shared/components';
import { useTheme, scale, spacing, layout } from '@/shared/theme';
import { useThemeColors, useIsDarkMode } from '@/shared/theme/themeStore';
import {
  useDiscoverData,
  HeroSection,
  QuickFilterChips,
  BrowsePills,
  ContentRowCarousel,
  CategoryGrid,
  PopularSeriesSection,
  TopAuthorsSection,
  MoodFilterPills,
  PreferencesPromoCard,
  GENRE_CHIPS,
} from '@/features/discover';
import {
  MoodDiscoveryCard,
  useHasActiveSession,
  useActiveSession,
} from '@/features/mood-discovery';
import { TOP_NAV_HEIGHT, SCREEN_BOTTOM_PADDING } from '@/constants/layout';
import { useScreenLoadTime } from '@/core/hooks/useScreenLoadTime';

export function BrowseScreen() {
  useScreenLoadTime('BrowseScreen');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const themeColors = useThemeColors();
  const isDarkMode = useIsDarkMode();

  // Selected genre filter
  const [selectedGenre, setSelectedGenre] = useState('All');

  // Mood session state
  const hasMoodSession = useHasActiveSession();
  const moodSession = useActiveSession();

  // Discover data (mood-aware when session active)
  const {
    rows,
    hero,
    availableGenres,
    isLoading,
    isRefreshing,
    refresh,
    hasPreferences,
  } = useDiscoverData(selectedGenre, moodSession);

  // Navigation handlers
  const handleSearchPress = useCallback(() => {
    navigation.navigate('Search');
  }, [navigation]);

  const handleGenreSelect = useCallback((genre: string) => {
    setSelectedGenre(genre);
  }, []);

  const handleMoodEdit = useCallback(() => {
    navigation.navigate('MoodDiscovery');
  }, [navigation]);

  const handleMoodClear = useCallback(() => {
    // Session cleared - browse returns to default state
    // No additional action needed, hasMoodSession will become false
  }, []);

  // Show skeleton only on true first load (no cached data exists)
  const showSkeleton = isLoading && rows.length === 0 && !hero;

  // Empty state
  const hasContent = hero || rows.length > 0;

  // Get first book from rows for genre background
  const firstRowBook = rows[0]?.items?.[0];

  // Get cached cover URL for hero background (use hero for 'All', first book for genres)
  const backgroundBookId = selectedGenre === 'All'
    ? (hero?.book.id || '')
    : (firstRowBook?.id || '');
  const backgroundCoverUrl = useCoverUrl(backgroundBookId);

  // Show background when we have a book to display (either hero or first row book)
  const showHeroBackground = selectedGenre === 'All'
    ? !!hero
    : !!firstRowBook;

  // Create genre-specific hero when a genre is selected
  const genreHero = useMemo(() => {
    if (selectedGenre === 'All' || !firstRowBook) return null;
    return {
      book: firstRowBook,
      reason: `Top ${selectedGenre} pick`,
      type: 'personalized' as const,
    };
  }, [selectedGenre, firstRowBook]);

  // Use appropriate hero based on selected tab
  const currentHero = selectedGenre === 'All' ? hero : genreHero;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle={themeColors.statusBar} backgroundColor="transparent" translucent />

      {/* Main Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + TOP_NAV_HEIGHT + 8, paddingBottom: SCREEN_BOTTOM_PADDING + insets.bottom },
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
        {/* Hero Background - scrolls with content */}
        {showHeroBackground && (
          <View style={styles.heroBackgroundScrollable}>
            <Image
              source={backgroundCoverUrl || (selectedGenre === 'All' ? hero?.book.coverUrl : firstRowBook?.coverUrl)}
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

        {/* Quick Filter Chips OR Mood Filter Pills */}
        {hasMoodSession && moodSession ? (
          <MoodFilterPills
            session={moodSession}
            onEditPress={handleMoodEdit}
            onClear={handleMoodClear}
          />
        ) : (
          <QuickFilterChips
            chips={availableGenres.length > 0 ? availableGenres : GENRE_CHIPS}
            selectedChip={selectedGenre}
            onSelect={handleGenreSelect}
          />
        )}

        {/* Mood Discovery Entry Point - only show when NO mood session */}
        {!showSkeleton && selectedGenre === 'All' && !hasMoodSession && (
          <MoodDiscoveryCard />
        )}

        {/* Skeleton Loading State */}
        {showSkeleton && (
          <View style={styles.skeletonContainer}>
            {/* Hero skeleton */}
            <View style={styles.heroSkeleton}>
              <Shimmer width={scale(160)} height={scale(240)} borderRadius={scale(12)} />
              <View style={styles.heroSkeletonText}>
                <Shimmer width={scale(200)} height={scale(24)} style={{ marginTop: scale(16) }} />
                <Shimmer width={scale(140)} height={scale(16)} style={{ marginTop: scale(8) }} />
              </View>
            </View>
            {/* Row skeletons */}
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.rowSkeleton}>
                <Shimmer width={scale(120)} height={scale(20)} style={{ marginBottom: scale(12), marginLeft: scale(16) }} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: scale(16) }}>
                  {[1, 2, 3, 4].map((j) => (
                    <View key={j} style={{ marginRight: scale(12) }}>
                      <Shimmer width={scale(140)} height={scale(140)} borderRadius={scale(8)} />
                      <Shimmer width={scale(100)} height={scale(14)} style={{ marginTop: scale(8) }} />
                    </View>
                  ))}
                </ScrollView>
              </View>
            ))}
          </View>
        )}

        {/* Hero Recommendation Content */}
        {!showSkeleton && showHeroBackground && currentHero && (
          <HeroSection hero={currentHero} />
        )}

        {/* Browse Pills - Category Navigation (hidden when mood active) */}
        {!showSkeleton && selectedGenre === 'All' && !hasMoodSession && (
          <BrowsePills />
        )}

        {/* Content Rows - show all rows sorted by priority */}
        {!showSkeleton && rows.map((row) => (
          <ContentRowCarousel key={row.id} row={row} />
        ))}

        {/* Popular Series */}
        {selectedGenre === 'All' && (
          <PopularSeriesSection limit={10} />
        )}

        {/* Top Authors */}
        {selectedGenre === 'All' && (
          <TopAuthorsSection limit={10} />
        )}

        {/* Browse by Category */}
        {selectedGenre === 'All' && (
          <CategoryGrid />
        )}

        {/* Preferences Promo - show when user hasn't set preferences and has no reading history */}
        {!showSkeleton && selectedGenre === 'All' && !hasPreferences && (
          <PreferencesPromoCard />
        )}

        {/* Empty State - only show when not loading and no content */}
        {!showSkeleton && !hasContent && (
          <View style={styles.emptyState}>
            <Icon name="Library" size={scale(48)} color={themeColors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: themeColors.text }]}>Your library is waiting</Text>
            <Text style={[styles.emptySubtitle, { color: themeColors.textTertiary }]}>
              Add audiobooks to your server to start discovering.
            </Text>
          </View>
        )}

        {/* No Results for Filter */}
        {hasContent && rows.length === 0 && selectedGenre !== 'All' && (
          <View style={styles.emptyState}>
            <Icon name="Search" size={scale(48)} color={themeColors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: themeColors.text }]}>No books match "{selectedGenre}"</Text>
            <TouchableOpacity
              style={[styles.clearFilterButton, { backgroundColor: themeColors.text }]}
              onPress={() => setSelectedGenre('All')}
            >
              <Text style={[styles.clearFilterText, { color: themeColors.background }]}>Show All</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor set via colors.background.primary in JSX
  },
  topOverlay: {
    position: 'absolute',
    top: scale(100), // Offset for the negative margin on parent
    left: 0,
    right: 0,
    height: scale(250),
  },
  heroBackgroundScrollable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: scale(550), // Height of hero section
    marginTop: -scale(100), // Pull up behind nav
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: scale(8),
  },

  // Header (not currently used in JSX, but kept for reference)
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPaddingH,
    paddingBottom: spacing.md,
    zIndex: 1,
  },
  headerTitle: {
    fontSize: scale(28),
    fontWeight: '700',
    // color set dynamically
  },
  headerButton: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    borderRadius: scale(20),
    // backgroundColor set dynamically
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: scale(60),
    paddingHorizontal: scale(40),
  },
  emptyTitle: {
    marginTop: spacing.lg,
    fontSize: scale(16),
    fontWeight: '600',
    // color set via colors.text.primary in JSX
    textAlign: 'center',
  },
  emptySubtitle: {
    marginTop: spacing.sm,
    fontSize: scale(13),
    // color set via colors.text.tertiary in JSX
    textAlign: 'center',
    lineHeight: scale(18),
  },
  clearFilterButton: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: scale(20),
  },
  clearFilterText: {
    fontSize: scale(14),
    fontWeight: '600',
  },

  // Skeleton styles
  skeletonContainer: {
    paddingTop: spacing.lg,
  },
  heroSkeleton: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xxl,
  },
  heroSkeletonText: {
    alignItems: 'center',
  },
  rowSkeleton: {
    marginBottom: spacing.xxl,
  },
});
