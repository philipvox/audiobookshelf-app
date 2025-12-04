/**
 * src/features/home/components/HomeBackground.tsx
 *
 * Background with blurred cover art
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
  blurIntensity = 50, // Reduced from 80 for brighter background
}: HomeBackgroundProps) {
  return (
    <View style={styles.container}>
      {/* Base color */}
      <View style={styles.baseColor} />

      {/* Blurred cover image - brighter */}
      {coverUrl && (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: coverUrl }}
            style={styles.image}
            resizeMode="cover"
            blurRadius={15} // Reduced from 25 for more visible colors
          />
          <BlurView intensity={blurIntensity} style={styles.blur} tint="dark" />
          {/* Brightness overlay */}
          <View style={styles.brightnessOverlay} />
        </View>
      )}

      {/* Lighter overlay gradient - more transparent at top */}
      <LinearGradient
        colors={[
          'rgba(0, 0, 0, 0.1)', // More transparent at top
          'rgba(0, 0, 0, 0.3)',
          'rgba(0, 0, 0, 0.7)',
          COLORS.background,
        ]}
        locations={[0, 0.35, 0.75, 1]}
        style={styles.gradient}
      />
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
    height: SCREEN_HEIGHT * 0.65, // Taller for more visible background
    overflow: 'hidden',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.65,
    transform: [{ scale: 1.1 }],
    opacity: 0.8, // Brighter image
  },
  blur: {
    ...StyleSheet.absoluteFillObject,
  },
  brightnessOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.05)', // Slight brightness boost
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
});
