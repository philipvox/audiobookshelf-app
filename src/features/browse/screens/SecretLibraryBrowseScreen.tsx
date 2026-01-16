/**
 * src/features/browse/screens/SecretLibraryBrowseScreen.tsx
 *
 * Secret Library Browse screen with editorial design.
 * Features collections, personalized recommendations, series gallery,
 * top authors, and browse grid.
 */

import React, { useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { secretLibraryColors as staticColors } from '@/shared/theme/secretLibrary';
import { useSecretLibraryColors } from '@/shared/theme';
import { useLibraryCache } from '@/core/cache';
import { useSpineCacheStatus } from '@/features/home';

// Components
import { BrowseTopNav } from '../components/BrowseTopNav';
import { TasteTextList } from '../components/TasteTextList';
import { SeriesGallery } from '../components/SeriesGallery';
import { AuthorsTextList } from '../components/AuthorsTextList';
import { BrowseGrid } from '../components/BrowseGrid';
import { BrowseFooter } from '../components/BrowseFooter';

// Bottom padding for mini player
const MINI_PLAYER_HEIGHT = 80;

export function SecretLibraryBrowseScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const scrollRef = useRef<ScrollView>(null);

  // Theme-aware colors
  const colors = useSecretLibraryColors();
  const isDarkMode = colors.isDark;

  // Data hooks
  const { refreshCache, isLoading: cacheLoading } = useLibraryCache();
  const { isPopulated: spineCacheReady, cacheSize: spineCacheSize } = useSpineCacheStatus();

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
    navigation.navigate('SeriesList');
  }, [navigation]);

  const handleViewAllAuthors = useCallback(() => {
    navigation.navigate('AuthorsList');
  }, [navigation]);

  const handleBrowseItemPress = useCallback((type: 'genres' | 'narrators' | 'series' | 'duration') => {
    switch (type) {
      case 'genres':
        navigation.navigate('GenresList');
        break;
      case 'narrators':
        navigation.navigate('NarratorsList');
        break;
      case 'series':
        navigation.navigate('SeriesList');
        break;
      case 'duration':
        navigation.navigate('DurationFilter');
        break;
    }
  }, [navigation]);

  const isRefreshing = cacheLoading;

  return (
    <View style={[styles.container, { backgroundColor: colors.white }]}>
      <StatusBar barStyle="light-content" backgroundColor={staticColors.black} />

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
        />

        {/* Based on Your Taste - Hero section */}
        <TasteTextList
          onBookPress={handleBookPress}
        />

        {/* Top Authors */}
        <AuthorsTextList
          onAuthorPress={handleAuthorPress}
          onViewAll={handleViewAllAuthors}
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
});
