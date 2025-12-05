/**
 * src/features/library/components/LibraryBackground.tsx
 *
 * Background with blurred cover art from multiple books that fades to transparent at bottom
 */

import React from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BG_COLOR = '#000000';

interface LibraryBackgroundProps {
  coverUrls: string[];
  blurIntensity?: number;
}

export function LibraryBackground({
  coverUrls,
  blurIntensity = 50,
}: LibraryBackgroundProps) {
  // Take up to 3 covers
  const covers = coverUrls.slice(0, 3);

  if (covers.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.baseColor} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Base color */}
      <View style={styles.baseColor} />

      {/* Blurred cover images */}
      <View style={styles.imageContainer}>
        {/* Layer the images with different positions and opacities */}
        {covers.map((coverUrl, index) => (
          <Image
            key={index}
            source={{ uri: coverUrl }}
            style={[
              styles.image,
              {
                opacity: 0.6 - index * 0.15,
                transform: [
                  { scale: 1.2 },
                  { translateX: (index - 1) * SCREEN_WIDTH * 0.2 },
                ],
              },
            ]}
            resizeMode="cover"
            blurRadius={20}
          />
        ))}
        <BlurView intensity={blurIntensity} style={styles.blur} tint="dark" />
        {/* Brightness overlay */}
        <View style={styles.brightnessOverlay} />
        {/* Fade to transparent gradient overlay */}
        <LinearGradient
          colors={['transparent', 'transparent', BG_COLOR]}
          locations={[0, 0.4, 1]}
          style={styles.fadeGradient}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  baseColor: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BG_COLOR,
  },
  imageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.5,
    overflow: 'hidden',
  },
  image: {
    position: 'absolute',
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.5,
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
