/**
 * src/features/browse/components/BrowseHero.tsx
 *
 * Hero section for the Browse screen with library stats and title.
 * Editorial design with Playfair Display and JetBrains Mono typography.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { secretLibraryColors, secretLibraryFonts } from '@/shared/theme/secretLibrary';
import { useLibraryStats, formatLibraryStats } from '../hooks/useLibraryStats';
import { scale } from '@/shared/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BrowseHeroProps {
  onStartExploring?: () => void;
}

export function BrowseHero({ onStartExploring }: BrowseHeroProps) {
  const stats = useLibraryStats();
  const { titlesDisplay } = formatLibraryStats(stats);

  return (
    <View style={styles.container}>
      {/* Top section - Title */}
      <View style={styles.topSection}>
        {/* Eyebrow with stats */}
        <Text style={styles.eyebrow}>
          Your Library · {titlesDisplay} titles
        </Text>

        {/* Main title */}
        <Text style={styles.title}>
          Curated{'\n'}
          <Text style={styles.titleItalic}>Library</Text>
        </Text>
      </View>

      {/* Bottom section - CTA */}
      <View style={styles.bottomSection}>
        {onStartExploring && (
          <Pressable onPress={onStartExploring} style={styles.ctaContainer}>
            <Text style={styles.cta}>Start Exploring</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: SCREEN_HEIGHT * 0.45,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 48,
    justifyContent: 'space-between', // Title at top, CTA at bottom
  },
  topSection: {
    // Title content at top
  },
  bottomSection: {
    // CTA at bottom
  },
  eyebrow: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(9),
    textTransform: 'uppercase',
    letterSpacing: 1.35, // 0.15em at 9px
    color: secretLibraryColors.gray,
    marginBottom: 8,
  },
  title: {
    fontFamily: secretLibraryFonts.playfair.regular,
    fontSize: scale(42),
    fontWeight: '400',
    lineHeight: scale(42) * 1.05,
    color: secretLibraryColors.black,
    marginBottom: 6,
  },
  titleItalic: {
    fontStyle: 'italic',
  },
  ctaContainer: {
    minHeight: scale(44), // Touch target
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  cta: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(10),
    textTransform: 'uppercase',
    letterSpacing: 1, // 0.1em at 10px
    color: secretLibraryColors.black,
    textDecorationLine: 'underline',
    textDecorationStyle: 'solid',
  },
});
