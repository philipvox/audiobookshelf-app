/**
 * src/features/home/components/CoverArtwork.tsx
 *
 * Cover artwork - Anima: 263x264px, rounded-[8.79px], shadow
 */

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Image } from 'expo-image';
import {
  spacing,
  radius,
  scale,
  elevation,
  useThemeColors,
  accentColors,
} from '@/shared/theme';

interface CoverArtworkProps {
  coverUrl?: string;
  size?: number;
  seriesSequence?: number | string;  // Series number to show in top-right corner
}

export function CoverArtwork({
  coverUrl,
  size = scale(263),
  seriesSequence,
}: CoverArtworkProps) {
  const themeColors = useThemeColors();

  // Anima: 263x264 (slightly taller than wide)
  const width = size;
  const height = size * (264 / 263);
  const borderRadius = scale(8.79);

  return (
    <View
      style={[
        styles.container,
        {
          width,
          height,
          borderRadius,
        }
      ]}
    >
      {coverUrl ? (
        <Image
          source={{ uri: coverUrl }}
          style={[styles.image, { width, height, borderRadius, backgroundColor: themeColors.backgroundSecondary }]}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View style={[styles.placeholder, { width, height, borderRadius, backgroundColor: themeColors.backgroundSecondary }]} />
      )}

      {/* Series sequence badge */}
      {seriesSequence !== undefined && (
        <View style={[styles.seriesBadge, { backgroundColor: accentColors.gold }]}>
          <Text style={[styles.seriesText, { color: themeColors.background }]}>#{seriesSequence}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...elevation.large,
    zIndex: 100,
    position: 'relative',
  },
  image: {
    // backgroundColor set via themeColors in JSX
  },
  placeholder: {
    // backgroundColor set via themeColors in JSX
  },
  seriesBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    // backgroundColor set via accentColors in JSX
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  seriesText: {
    fontSize: scale(14),
    fontWeight: '700',
    // color set via themeColors in JSX
  },
});
