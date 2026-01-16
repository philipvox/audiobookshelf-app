/**
 * src/features/browse/components/BrowseGrid.tsx
 *
 * 2x2 grid of browse categories.
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { secretLibraryColors as staticColors, secretLibraryFonts } from '@/shared/theme/secretLibrary';
import { useBrowseCounts } from '../hooks/useBrowseCounts';
import { BrowseGridItem, BrowseItemType } from './BrowseGridItem';
import { scale, useSecretLibraryColors } from '@/shared/theme';

interface BrowseGridProps {
  onItemPress?: (type: BrowseItemType) => void;
}

export function BrowseGrid({ onItemPress }: BrowseGridProps) {
  // Theme-aware colors
  const colors = useSecretLibraryColors();

  const counts = useBrowseCounts();

  const handleItemPress = useCallback(
    (type: BrowseItemType) => {
      onItemPress?.(type);
    },
    [onItemPress]
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.black }]}>Browse</Text>
        <Text style={[styles.subtitle, { color: colors.gray }]}>Explore your collection</Text>
      </View>

      {/* 2x2 Grid */}
      <View style={[styles.grid, { borderColor: colors.grayLine }]}>
        {/* Row 1 */}
        <View style={styles.row}>
          <BrowseGridItem
            type="genres"
            title="Genres"
            count={`${counts.genreCount} categories`}
            iconName="Layers"
            onPress={() => handleItemPress('genres')}
          />
          <View style={[styles.verticalDivider, { backgroundColor: colors.grayLine }]} />
          <BrowseGridItem
            type="narrators"
            title="Narrators"
            count={`${counts.narratorCount} voices`}
            iconName="Mic"
            onPress={() => handleItemPress('narrators')}
          />
        </View>

        {/* Horizontal divider */}
        <View style={[styles.horizontalDivider, { backgroundColor: colors.grayLine }]} />

        {/* Row 2 */}
        <View style={styles.row}>
          <BrowseGridItem
            type="series"
            title="Series"
            count={`${counts.seriesCount} collections`}
            iconName="BookOpen"
            onPress={() => handleItemPress('series')}
          />
          <View style={[styles.verticalDivider, { backgroundColor: colors.grayLine }]} />
          <BrowseGridItem
            type="duration"
            title="Duration"
            count={`${counts.durationRanges} ranges`}
            iconName="Clock"
            onPress={() => handleItemPress('duration')}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontFamily: secretLibraryFonts.playfair.regular,
    fontSize: scale(24),
    fontWeight: '400',
    color: staticColors.black,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(9),
    textTransform: 'uppercase',
    letterSpacing: 1.35, // 0.15em at 9px
    color: staticColors.gray,
  },
  grid: {
    borderWidth: 1,
    borderColor: staticColors.grayLine,
  },
  row: {
    flexDirection: 'row',
  },
  horizontalDivider: {
    height: 1,
    backgroundColor: staticColors.grayLine,
  },
  verticalDivider: {
    width: 1,
    backgroundColor: staticColors.grayLine,
  },
});
