/**
 * src/features/library/components/GenreCards.tsx
 *
 * Genre card components in multiple variants:
 * - GenreCardLarge: For "Your Genres" section (150×120)
 * - GenreCardCompact: For within meta-categories (half-width×60)
 * - GenreListItem: For A-Z flat view (text-primary)
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@/core/api';
import { GenreWithData, getMetaCategoryForGenre } from '../constants/genreCategories';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ACCENT = '#F4B60C';

// =============================================================================
// GenreCardLarge - For "Your Genres" section
// =============================================================================

interface GenreCardLargeProps {
  genre: GenreWithData;
  onPress: () => void;
}

export function GenreCardLarge({ genre, onPress }: GenreCardLargeProps) {
  const metaCategory = getMetaCategoryForGenre(genre.name);
  const accentColor = metaCategory?.color || ACCENT;

  // Get up to 3 covers for the fan effect
  const covers = useMemo(() => {
    return genre.coverIds.slice(0, 3).map(id => apiClient.getItemCoverUrl(id));
  }, [genre.coverIds]);

  return (
    <TouchableOpacity
      style={styles.largeCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Cover Fan */}
      <View style={styles.coverFan}>
        {covers.length > 0 ? (
          covers.map((url, index) => (
            <Image
              key={index}
              source={url}
              style={[
                styles.fanCover,
                {
                  left: index * 20,
                  zIndex: covers.length - index,
                  transform: [{ rotate: `${(index - 1) * 5}deg` }],
                },
              ]}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ))
        ) : (
          <View style={[styles.fanPlaceholder, { backgroundColor: accentColor + '30' }]}>
            <Ionicons name="library-outline" size={32} color={accentColor} />
          </View>
        )}
      </View>

      {/* Genre Info */}
      <Text style={styles.largeName} numberOfLines={1}>
        {genre.name}
      </Text>
      <Text style={styles.largeCount}>{genre.bookCount} books</Text>
    </TouchableOpacity>
  );
}

// =============================================================================
// GenreCardCompact - For within meta-categories
// =============================================================================

interface GenreCardCompactProps {
  genre: GenreWithData;
  onPress: () => void;
}

export function GenreCardCompact({ genre, onPress }: GenreCardCompactProps) {
  const coverUrl = genre.coverIds[0]
    ? apiClient.getItemCoverUrl(genre.coverIds[0])
    : null;

  return (
    <TouchableOpacity
      style={styles.compactCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Single Cover */}
      <View style={styles.compactCoverContainer}>
        {coverUrl ? (
          <Image
            source={coverUrl}
            style={styles.compactCover}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={styles.compactPlaceholder}>
            <Ionicons name="book-outline" size={20} color="rgba(255,255,255,0.3)" />
          </View>
        )}
      </View>

      {/* Genre Info */}
      <View style={styles.compactInfo}>
        <Text style={styles.compactName} numberOfLines={1}>
          {genre.name}
        </Text>
      </View>

      {/* Book Count */}
      <Text style={styles.compactCount}>{genre.bookCount}</Text>
    </TouchableOpacity>
  );
}

// =============================================================================
// GenreListItem - For A-Z flat view with tiny fanned covers
// =============================================================================

interface GenreListItemProps {
  genre: GenreWithData;
  onPress: () => void;
}

export function GenreListItem({ genre, onPress }: GenreListItemProps) {
  const coverUrl = genre.coverIds[0]
    ? apiClient.getItemCoverUrl(genre.coverIds[0])
    : null;

  return (
    <TouchableOpacity
      style={styles.listItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Single Cover */}
      <View style={styles.listCoverContainer}>
        {coverUrl ? (
          <Image
            source={coverUrl}
            style={styles.listCover}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={styles.listCoverPlaceholder}>
            <Ionicons name="book-outline" size={16} color="rgba(255,255,255,0.3)" />
          </View>
        )}
      </View>
      <Text style={styles.listName} numberOfLines={2}>
        {genre.name}
      </Text>
      <Text style={styles.listCount}>{genre.bookCount}</Text>
    </TouchableOpacity>
  );
}

// =============================================================================
// PopularGenreCard - Medium size for popular section
// =============================================================================

interface PopularGenreCardProps {
  genre: GenreWithData;
  onPress: () => void;
}

export function PopularGenreCard({ genre, onPress }: PopularGenreCardProps) {
  const metaCategory = getMetaCategoryForGenre(genre.name);
  const accentColor = metaCategory?.color || ACCENT;

  // Get up to 2 covers
  const covers = useMemo(() => {
    return genre.coverIds.slice(0, 2).map(id => apiClient.getItemCoverUrl(id));
  }, [genre.coverIds]);

  return (
    <TouchableOpacity
      style={[styles.popularCard, { borderColor: accentColor + '40' }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Stacked Covers */}
      <View style={styles.popularCovers}>
        {covers.length > 0 ? (
          covers.map((url, index) => (
            <Image
              key={index}
              source={url}
              style={[
                styles.popularCover,
                { left: index * 12, zIndex: covers.length - index },
              ]}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ))
        ) : (
          <View style={[styles.popularPlaceholder, { backgroundColor: accentColor + '20' }]}>
            <Ionicons name="library-outline" size={24} color={accentColor} />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.popularInfo}>
        <Text style={styles.popularName} numberOfLines={1}>
          {genre.name}
        </Text>
        <Text style={styles.popularCount}>{genre.bookCount} books</Text>
      </View>
    </TouchableOpacity>
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  // Large Card Styles (Your Genres)
  largeCard: {
    width: 150,
    marginRight: 12,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
  },
  coverFan: {
    height: 70,
    marginBottom: 12,
    position: 'relative',
  },
  fanCover: {
    position: 'absolute',
    width: 50,
    height: 70,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fanPlaceholder: {
    width: 50,
    height: 70,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  largeName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  largeCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },

  // Compact Card Styles (Within Meta-categories)
  compactCard: {
    width: (SCREEN_WIDTH - 48) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    marginBottom: 8,
  },
  compactCoverContainer: {
    width: 40,
    height: 56,
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 10,
  },
  compactCover: {
    width: '100%',
    height: '100%',
  },
  compactPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  compactName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  compactCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    minWidth: 30,
    textAlign: 'right',
  },

  // List Item Styles (A-Z View)
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingLeft: 16,
    paddingRight: 36, // Extra space for alphabet index
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    minHeight: 56,
  },
  listCoverContainer: {
    width: 32,
    height: 44,
    marginRight: 12,
    borderRadius: 4,
    overflow: 'hidden',
  },
  listCover: {
    width: '100%',
    height: '100%',
  },
  listCoverPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listName: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    marginRight: 8,
    lineHeight: 20,
  },
  listCount: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
  },

  // Popular Card Styles
  popularCard: {
    width: (SCREEN_WIDTH - 48) / 2,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    borderWidth: 1,
  },
  popularCovers: {
    height: 56,
    marginBottom: 10,
    position: 'relative',
  },
  popularCover: {
    position: 'absolute',
    width: 40,
    height: 56,
    borderRadius: 4,
  },
  popularPlaceholder: {
    width: 40,
    height: 56,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  popularInfo: {
    gap: 2,
  },
  popularName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  popularCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
});
