/**
 * src/features/browse/components/BrowseFooter.tsx
 *
 * Footer section for the Browse screen with library stats.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { secretLibraryColors as staticColors, secretLibraryFonts } from '@/shared/theme/secretLibrary';
import { useLibraryStats, formatLibraryStats } from '../hooks/useLibraryStats';
import { scale, useSecretLibraryColors } from '@/shared/theme';

export function BrowseFooter() {
  // Theme-aware colors
  const colors = useSecretLibraryColors();

  const stats = useLibraryStats();
  const { titlesDisplay, hoursDisplay } = formatLibraryStats(stats);

  return (
    <View style={styles.container}>
      <Text style={[styles.text, { color: colors.gray }]}>
        {titlesDisplay} titles · {hoursDisplay} hours
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  text: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(9),
    textTransform: 'uppercase',
    letterSpacing: 1.35, // 0.15em at 9px
    color: staticColors.gray,
  },
});
