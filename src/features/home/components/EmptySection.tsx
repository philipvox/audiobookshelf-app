/**
 * src/features/home/components/EmptySection.tsx
 *
 * Empty state component for Home screen sections
 * Provides consistent styling for empty Continue Listening, Queue, Series sections
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { COLORS } from '../homeDesign';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (size / 402) * SCREEN_WIDTH;

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
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {ctaLabel && onCTAPress && (
        <TouchableOpacity style={styles.ctaButton} onPress={onCTAPress}>
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: scale(20),
    paddingVertical: scale(24),
    alignItems: 'center',
  },
  title: {
    fontSize: scale(14),
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: scale(4),
  },
  description: {
    fontSize: scale(12),
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: scale(18),
    maxWidth: scale(280),
  },
  ctaButton: {
    marginTop: scale(12),
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
    borderRadius: scale(16),
  },
  ctaText: {
    fontSize: scale(12),
    fontWeight: '600',
    color: '#F4B60C',
  },
});
