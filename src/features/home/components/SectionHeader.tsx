/**
 * src/features/home/components/SectionHeader.tsx
 *
 * Section header with title and "View All" button
 * NN/g UX: Clear visual hierarchy with larger, more prominent section titles
 * Touch targets: minimum 44×44px for "View All" button
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { COLORS } from '../homeDesign';
import { SectionHeaderProps } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (size / 402) * SCREEN_WIDTH;

// NN/g: Larger section headers for clear content hierarchy
const SECTION_PADDING = scale(20);

export function SectionHeader({
  title,
  onViewAll,
  showViewAll = true,
}: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {showViewAll && onViewAll && (
        <TouchableOpacity
          onPress={onViewAll}
          style={styles.viewAllButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.viewAll}>View All</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SECTION_PADDING,
    marginBottom: scale(12),
  },
  title: {
    // NN/g: Larger, bolder section titles for visual hierarchy
    fontSize: scale(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  viewAllButton: {
    // NN/g: Minimum 44×44px touch target
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  viewAll: {
    fontSize: scale(14),
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
});
