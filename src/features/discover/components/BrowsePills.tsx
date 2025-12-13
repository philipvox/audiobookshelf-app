/**
 * src/features/discover/components/BrowsePills.tsx
 *
 * Navigation pills for quick access to browse categories.
 * Shows Genres, Authors, Series, Narrators with counts.
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Icon } from '@/shared/components/Icon';
import { useLibraryCache, getAllAuthors, getAllSeries, getAllNarrators, getAllGenres } from '@/core/cache';
import { COLORS, LAYOUT } from '@/features/home/homeDesign';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (size / 402) * SCREEN_WIDTH;

interface BrowseCategory {
  id: string;
  name: string;
  icon: string;
  count: number;
  route: string;
}

interface PillProps {
  category: BrowseCategory;
  onPress: () => void;
}

const BrowsePill = React.memo(function BrowsePill({ category, onPress }: PillProps) {
  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  return (
    <TouchableOpacity
      style={styles.pill}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Icon name={category.icon} size={scale(16)} color={COLORS.playButton} set="ionicons" />
      <Text style={styles.pillText}>{category.name}</Text>
      {category.count > 0 && (
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{category.count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

export function BrowsePills() {
  const navigation = useNavigation<any>();
  const { isLoaded } = useLibraryCache();

  // Build categories with counts from cache
  const categories = useMemo((): BrowseCategory[] => {
    if (!isLoaded) {
      return [
        { id: 'genres', name: 'Genres', icon: 'albums-outline', count: 0, route: 'GenresList' },
        { id: 'authors', name: 'Authors', icon: 'person-outline', count: 0, route: 'AuthorsList' },
        { id: 'series', name: 'Series', icon: 'library-outline', count: 0, route: 'SeriesList' },
        { id: 'narrators', name: 'Narrators', icon: 'mic-outline', count: 0, route: 'NarratorsList' },
      ];
    }

    const genres = getAllGenres();
    const authors = getAllAuthors();
    const series = getAllSeries();
    const narrators = getAllNarrators();

    return [
      { id: 'genres', name: 'Genres', icon: 'albums-outline', count: genres.length, route: 'GenresList' },
      { id: 'authors', name: 'Authors', icon: 'person-outline', count: authors.length, route: 'AuthorsList' },
      { id: 'series', name: 'Series', icon: 'library-outline', count: series.length, route: 'SeriesList' },
      { id: 'narrators', name: 'Narrators', icon: 'mic-outline', count: narrators.length, route: 'NarratorsList' },
    ];
  }, [isLoaded]);

  const handleCategoryPress = useCallback((category: BrowseCategory) => {
    navigation.navigate(category.route);
  }, [navigation]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      style={styles.scrollView}
    >
      {categories.map((category) => (
        <BrowsePill
          key={category.id}
          category={category}
          onPress={() => handleCategoryPress(category)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    marginBottom: scale(8),
  },
  container: {
    paddingHorizontal: LAYOUT.carouselPaddingHorizontal,
    gap: scale(10),
    flexDirection: 'row',
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(14),
    paddingVertical: scale(10),
    borderRadius: scale(20),
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  pillText: {
    fontSize: scale(13),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  countBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
    borderRadius: scale(8),
    marginLeft: scale(2),
  },
  countText: {
    fontSize: scale(11),
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
});
