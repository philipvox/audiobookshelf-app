/**
 * src/features/browse/screens/SecretLibraryBrowseScreen.tsx
 *
 * Secret Library Browse screen with editorial design.
 * Features collections, personalized recommendations, series gallery,
 * top authors, and browse grid.
 */

import React, { useCallback, useRef, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  StatusBar,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { secretLibraryColors as staticColors, secretLibraryFonts } from '@/shared/theme/secretLibrary';
import { useSecretLibraryColors } from '@/shared/theme';
import { useLibraryCache } from '@/core/cache';
import { useSpineCacheStatus } from '@/features/home';
import { logger } from '@/shared/utils/logger';
import { scale } from '@/shared/theme';
import { useActiveSession, useMoodSessionStore } from '@/features/mood-discovery/stores/moodSessionStore';
import { MOODS, MOOD_FLAVORS, Mood } from '@/features/mood-discovery/types';

// Components
import { BrowseTopNav } from '../components/BrowseTopNav';
import { TopPickHero } from '../components/TopPickHero';
import { TasteTextList } from '../components/TasteTextList';
import { RecentlyAddedSection } from '../components/RecentlyAddedSection';
import { ListenAgainSection } from '../components/ListenAgainSection';
import { BecauseYouListenedSection } from '../components/BecauseYouListenedSection';
import { RecentSeriesSection } from '../components/RecentSeriesSection';
import { SeriesGallery } from '../components/SeriesGallery';
import { CollectionsSection } from '../components/CollectionsSection';
import { AuthorsTextList } from '../components/AuthorsTextList';
import { BrowseGrid } from '../components/BrowseGrid';
import { BrowseFooter } from '../components/BrowseFooter';
import { ContentFilterSheet } from '../components/ContentFilterSheet';
import { TagFilterSheet } from '../components/TagFilterSheet';
import { ScreenLoadingOverlay } from '@/shared/components';
import { useNavigationWithLoading, useAutoHideLoading } from '@/shared/hooks';

// Performance timing
const PERF_TAG = '[Browse Perf]';

// Bottom padding for mini player
const MINI_PLAYER_HEIGHT = 80;

export function SecretLibraryBrowseScreen() {
  const [mounted, setMounted] = useState(false);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [tagFilterSheetVisible, setTagFilterSheetVisible] = useState(false);

  const insets = useSafeAreaInsets();
  const { navigateWithLoading, navigation } = useNavigationWithLoading();
  const scrollRef = useRef<ScrollView>(null);

  // Theme-aware colors
  const colors = useSecretLibraryColors();

  // Mood session hooks
  const activeSession = useActiveSession();
  const clearSession = useMoodSessionStore((s) => s.clearSession);

  // Get mood and flavor labels for display
  const moodLabel = activeSession?.mood
    ? MOODS.find(m => m.id === activeSession.mood)?.label || activeSession.mood
    : null;
  const flavorLabel = activeSession?.mood && activeSession?.flavor
    ? MOOD_FLAVORS[activeSession.mood as Mood]?.find(f => f.id === activeSession.flavor)?.label || activeSession.flavor
    : null;

  // Data hooks
  const { refreshCache, isLoading: cacheLoading } = useLibraryCache();
  const { isPopulated: spineCacheReady } = useSpineCacheStatus();

  // Set mounted on first render
  useEffect(() => {
    logger.debug(`${PERF_TAG} Screen mounted`);
    setMounted(true);

    return () => {
      logger.debug(`${PERF_TAG} Screen unmounted`);
    };
  }, []);

  // Hide global loading when data is ready AND screen is focused
  // This is essential for tab screens that stay mounted
  const isDataReady = mounted && spineCacheReady && !cacheLoading;
  useAutoHideLoading(isDataReady, { debug: false, debugTag: 'BrowsePage' });

  // Safety timeout - force hide loading after 5 seconds if something is stuck
  useEffect(() => {
    const timeout = setTimeout(() => {
      import('@/shared/stores/globalLoadingStore').then(({ globalLoading }) => {
        globalLoading.hide();
      });
    }, 5000);
    return () => clearTimeout(timeout);
  }, []);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    await refreshCache();
  }, [refreshCache]);

  // Navigation handlers
  const handleMoodPress = useCallback(() => {
    navigation.navigate('MoodDiscovery');
  }, [navigation]);

  const handleSearchPress = useCallback(() => {
    navigation.navigate('Search');
  }, [navigation]);

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleLogoPress = useCallback(() => {
    navigation.navigate('Main', { screen: 'HomeTab' });
  }, [navigation]);

  const handleLogoLongPress = useCallback(() => {
    navigation.navigate('Main', { screen: 'ProfileTab' });
  }, [navigation]);

  const handleBookPress = useCallback((bookId: string) => {
    navigation.navigate('BookDetail', { id: bookId });
  }, [navigation]);

  const handleSeriesPress = useCallback((seriesName: string) => {
    navigation.navigate('SeriesDetail', { seriesName });
  }, [navigation]);

  const handleAuthorPress = useCallback((authorName: string) => {
    navigation.navigate('AuthorDetail', { authorName });
  }, [navigation]);

  const handleViewAllSeries = useCallback(() => {
    navigateWithLoading('SeriesList');
  }, [navigateWithLoading]);

  const handleCollectionPress = useCallback((collectionId: string) => {
    navigation.navigate('CollectionDetail', { collectionId });
  }, [navigation]);

  const handleViewAllCollections = useCallback(() => {
    navigateWithLoading('CollectionsList');
  }, [navigateWithLoading]);

  const handleViewAllAuthors = useCallback(() => {
    navigateWithLoading('AuthorsList');
  }, [navigateWithLoading]);

  const handleViewAllBooks = useCallback(() => {
    navigateWithLoading('AllBooks');
  }, [navigateWithLoading]);

  const handleBrowseItemPress = useCallback((type: 'genres' | 'narrators' | 'series' | 'duration') => {
    switch (type) {
      case 'genres':
        navigateWithLoading('GenresList');
        break;
      case 'narrators':
        navigateWithLoading('NarratorsList');
        break;
      case 'series':
        navigateWithLoading('SeriesList');
        break;
      case 'duration':
        navigateWithLoading('DurationFilter');
        break;
    }
  }, [navigateWithLoading]);

  const handleClearMoodSession = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const handleKidsFilterPress = useCallback(() => {
    setFilterSheetVisible(true);
  }, []);

  const handleCloseFilterSheet = useCallback(() => {
    setFilterSheetVisible(false);
  }, []);

  const handleTagFilterPress = useCallback(() => {
    setTagFilterSheetVisible(true);
  }, []);

  const handleCloseTagFilterSheet = useCallback(() => {
    setTagFilterSheetVisible(false);
  }, []);

  const isRefreshing = cacheLoading;

  return (
    <View style={[styles.container, { backgroundColor: colors.white }]}>
      <StatusBar barStyle="light-content" backgroundColor={staticColors.black} />

      {/* Loading overlay for initial load */}
      <ScreenLoadingOverlay visible={!mounted} />

      {/* Safe area for top nav - always dark to match header */}
      <View style={[styles.safeAreaTop, { height: insets.top, backgroundColor: staticColors.black }]} />

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: MINI_PLAYER_HEIGHT + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.gray}
          />
        }
      >
        {/* Top Navigation */}
        <BrowseTopNav
          onMoodPress={handleMoodPress}
          onClose={handleClose}
          onLogoPress={handleLogoPress}
          onLogoLongPress={handleLogoLongPress}
          onKidsFilterPress={handleKidsFilterPress}
          onTagFilterPress={handleTagFilterPress}
        />

        {/* Active Mood Session Banner */}
        {activeSession && moodLabel && (
          <View style={styles.moodBanner}>
            <View style={styles.moodBannerContent}>
              <Text style={styles.moodBannerLabel}>YOUR MOOD</Text>
              <Text style={styles.moodBannerTitle}>
                {flavorLabel ? `${moodLabel}: ${flavorLabel}` : moodLabel}
              </Text>
              <Text style={styles.moodBannerSubtitle}>
                Recommendations tuned to your mood
              </Text>
            </View>
            <TouchableOpacity
              style={styles.moodBannerClose}
              onPress={handleClearMoodSession}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={scale(16)} color={staticColors.gray} />
            </TouchableOpacity>
          </View>
        )}

        {/* Top Pick Hero */}
        <TopPickHero onBookPress={handleBookPress} />

        {/* Newest Releases */}
        <TasteTextList
          onBookPress={handleBookPress}
        />

        {/* Because You Listened To - most recent first */}
        <BecauseYouListenedSection
          onBookPress={handleBookPress}
          sourceIndex={0}
        />

        {/* Recently Added */}
        <RecentlyAddedSection
          onBookPress={handleBookPress}
          onViewAll={handleViewAllBooks}
        />

        {/* Listen Again */}
        <ListenAgainSection
          onBookPress={handleBookPress}
        />

        {/* More Because You Listened To sections */}
        <BecauseYouListenedSection
          onBookPress={handleBookPress}
          sourceIndex={1}
        />
        <BecauseYouListenedSection
          onBookPress={handleBookPress}
          sourceIndex={2}
        />

        {/* Recent Series */}
        <RecentSeriesSection
          onSeriesPress={handleSeriesPress}
        />

        {/* Top Authors */}
        <AuthorsTextList
          onAuthorPress={handleAuthorPress}
          onViewAll={handleViewAllAuthors}
        />

        {/* Collections */}
        <CollectionsSection
          onCollectionPress={handleCollectionPress}
          onBookPress={handleBookPress}
          onViewAll={handleViewAllCollections}
        />

        {/* Series Gallery */}
        <SeriesGallery
          onSeriesPress={handleSeriesPress}
          onViewAll={handleViewAllSeries}
        />

        {/* Browse Grid */}
        <BrowseGrid
          onItemPress={handleBrowseItemPress}
        />

        {/* Footer */}
        <BrowseFooter />
      </ScrollView>

      {/* Kids Filter Sheet */}
      <ContentFilterSheet
        visible={filterSheetVisible}
        onClose={handleCloseFilterSheet}
      />

      {/* Tag Filter Sheet */}
      <TagFilterSheet
        visible={tagFilterSheetVisible}
        onClose={handleCloseTagFilterSheet}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: staticColors.white,
  },
  safeAreaTop: {
    backgroundColor: staticColors.black,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  // Mood session banner
  moodBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: staticColors.black,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  moodBannerContent: {
    flex: 1,
  },
  moodBannerLabel: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(9),
    color: staticColors.gold,
    letterSpacing: 1,
    marginBottom: 4,
  },
  moodBannerTitle: {
    fontFamily: secretLibraryFonts.playfair.regular,
    fontSize: scale(18),
    color: staticColors.white,
    fontStyle: 'italic',
  },
  moodBannerSubtitle: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(10),
    color: staticColors.gray,
    marginTop: 4,
  },
  moodBannerClose: {
    padding: 8,
  },
});
