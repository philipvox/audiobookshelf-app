/**
 * src/features/home/components/SeriesCard.tsx
 *
 * Series card with 5 horizontal stacked covers
 * Anima: 110x86.5px total
 * 5 covers at left: 0, 17, 34, 51, 68 (17px offset)
 * Each cover: 35x51px rounded-[5px] shadow-[9px_4px_2px_#00000075]
 * Title at top:60, heart at top:66 left:89
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { apiClient } from '@/core/api';
import { COLORS } from '../homeDesign';
import { SeriesCardProps } from '../types';
import { HeartIcon } from './icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (size / 402) * SCREEN_WIDTH;

export function SeriesCard({ series, onPress, onLongPress }: SeriesCardProps) {
  // Get cover URLs for up to 5 books
  const coverUrls = series.books.slice(0, 5).map((book) => apiClient.getItemCoverUrl(book.id));

  // Anima positions: left 0, 17, 34, 51, 68
  const positions = [0, 17, 34, 51, 68];

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
    >
      {/* 5 Stacked Covers */}
      <View style={styles.stackContainer}>
        {positions.map((left, index) => (
          <View
            key={index}
            style={[
              styles.coverWrapper,
              {
                left: scale(left),
                zIndex: 5 - index, // First cover on top
              },
            ]}
          >
            {coverUrls[index] ? (
              <Image
                source={{ uri: coverUrls[index] }}
                style={styles.cover}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={styles.placeholder} />
            )}
          </View>
        ))}
      </View>

      {/* Title at top:60, left:2 */}
      <Text style={styles.title} numberOfLines={2}>
        {series.name}
      </Text>

      {/* Heart icon at top:66, left:89 */}
      {series.isFavorite && (
        <View style={styles.heartContainer}>
          <HeartIcon size={scale(14)} color={COLORS.heart} filled />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: scale(110),
    height: scale(86.5),
    position: 'relative',
  },
  stackContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: scale(103), // 68 + 35 = 103
    height: scale(51),
  },
  coverWrapper: {
    position: 'absolute',
    top: 0,
    width: scale(35),
    height: scale(51),
    borderRadius: scale(5),
    overflow: 'hidden',
    backgroundColor: '#7D7D7D',
    // Anima shadow: 9px 4px 2px rgba(0,0,0,0.46)
    shadowColor: '#000000',
    shadowOffset: { width: 9, height: 4 },
    shadowOpacity: 0.46,
    shadowRadius: 2,
    elevation: 4,
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#7D7D7D',
  },
  title: {
    position: 'absolute',
    top: scale(60),
    left: scale(2),
    width: scale(106),
    fontFamily: 'System', // TODO: Change to 'GothicA1' when font loaded
    fontSize: scale(12),
    fontWeight: '400',
    color: COLORS.textPrimary,
    lineHeight: scale(12.4),
  },
  heartContainer: {
    position: 'absolute',
    top: scale(66),
    left: scale(89),
    width: scale(17),
    height: scale(14),
  },
});
