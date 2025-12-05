/**
 * src/features/home/components/HomeBackground.tsx
 *
 * Background with blurred cover art that fades to transparent at bottom
 */

import React from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { COLORS } from '../homeDesign';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface HomeBackgroundProps {
  coverUrl?: string;
  blurIntensity?: number;
}

export function HomeBackground({
  coverUrl,
  blurIntensity = 50,
}: HomeBackgroundProps) {
  return (
    <View style={styles.container}>
      {/* Base color */}
      <View style={styles.baseColor} />

      {/* Blurred cover image */}
      {coverUrl && (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: coverUrl }}
            style={styles.image}
            resizeMode="cover"
            blurRadius={15}
          />
          <BlurView intensity={blurIntensity} style={styles.blur} tint="dark" />
          {/* Brightness overlay */}
          <View style={styles.brightnessOverlay} />
          {/* Fade to transparent gradient overlay */}
          <LinearGradient
            colors={['transparent', 'transparent', COLORS.background]}
            locations={[0, 0.4, 1]}
            style={styles.fadeGradient}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  baseColor: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background,
  },
  imageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.65,
    overflow: 'hidden',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.65,
    transform: [{ scale: 1.1 }],
    opacity: 0.8,
  },
  blur: {
    ...StyleSheet.absoluteFillObject,
  },
  brightnessOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  fadeGradient: {
    ...StyleSheet.absoluteFillObject,
  },
});
