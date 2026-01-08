/**
 * src/features/home/components/EmptySection.tsx
 *
 * Empty state component for Home screen sections
 * Provides consistent styling for empty Continue Listening, Queue, Series sections
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  spacing,
  radius,
  scale,
  layout,
  useThemeColors,
  accentColors,
} from '@/shared/theme';

interface EmptySectionProps {
  title: string;
  description: string;
  ctaLabel?: string;
  onCTAPress?: () => void;
}

export function EmptySection({
  title,
  description,
  ctaLabel,
  onCTAPress,
}: EmptySectionProps) {
  const themeColors = useThemeColors();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: themeColors.textSecondary }]}>{title}</Text>
      <Text style={[styles.description, { color: themeColors.textTertiary }]}>{description}</Text>
      {ctaLabel && onCTAPress && (
        <TouchableOpacity style={[styles.ctaButton, { backgroundColor: themeColors.card }]} onPress={onCTAPress}>
          <Text style={[styles.ctaText, { color: accentColors.gold }]}>{ctaLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: layout.screenPaddingH,
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  title: {
    fontSize: scale(14),
    fontWeight: '500',
    // color set via themeColors.textSecondary in JSX
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: scale(12),
    // color set via themeColors.textTertiary in JSX
    textAlign: 'center',
    lineHeight: scale(18),
    maxWidth: scale(280),
  },
  ctaButton: {
    marginTop: spacing.md,
    // backgroundColor set via themeColors.card in JSX
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  ctaText: {
    fontSize: scale(12),
    fontWeight: '600',
    // color set via accentColors.gold in JSX
  },
});
