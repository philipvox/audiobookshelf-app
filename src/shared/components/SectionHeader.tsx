/**
 * src/shared/components/SectionHeader.tsx
 *
 * Section header with title and "View All" button.
 * Moved from features/home to shared (used by 5+ features).
 *
 * NN/g UX: Clear visual hierarchy with larger, more prominent section titles
 * Touch targets: minimum 44×44px for "View All" button
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { scale, useTheme } from '@/shared/theme';

export interface SectionHeaderProps {
  title: string;
  onViewAll?: () => void;
  showViewAll?: boolean;
}

// NN/g: Larger section headers for clear content hierarchy
const SECTION_PADDING = scale(20);

export function SectionHeader({
  title,
  onViewAll,
  showViewAll = true,
}: SectionHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text.primary }]}>{title}</Text>
      {showViewAll && onViewAll && (
        <TouchableOpacity
          onPress={onViewAll}
          style={styles.viewAllButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.viewAll, { color: colors.text.secondary }]}>View All</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: SECTION_PADDING,
    marginBottom: scale(12),
  },
  title: {
    fontSize: scale(18),
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  viewAllButton: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  viewAll: {
    fontSize: scale(14),
    fontWeight: '500',
  },
});
