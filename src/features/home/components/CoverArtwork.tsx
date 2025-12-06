/**
 * src/features/home/components/CoverArtwork.tsx
 *
 * Cover artwork - Anima: 263x264px, rounded-[8.79px], shadow
 */

import React from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import { Image } from 'expo-image';
import { COLORS } from '../homeDesign';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (size / 402) * SCREEN_WIDTH;

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
          style={[styles.image, { width, height, borderRadius }]}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View style={[styles.placeholder, { width, height, borderRadius }]} />
      )}

      {/* Series sequence badge */}
      {seriesSequence !== undefined && (
        <View style={styles.seriesBadge}>
          <Text style={styles.seriesText}>#{seriesSequence}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // Anima shadow: 0px 8px 20px rgba(0,0,0,0.45)
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 12,
    zIndex: 100,
    position: 'relative',
  },
  image: {
    backgroundColor: '#7D7D7D',
  },
  placeholder: {
    backgroundColor: '#7D7D7D',
  },
  seriesBadge: {
    position: 'absolute',
    top: scale(8),
    right: scale(8),
    backgroundColor: '#CCFF00',
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(6),
  },
  seriesText: {
    fontSize: scale(14),
    fontWeight: '700',
    color: '#000000',
  },
});
