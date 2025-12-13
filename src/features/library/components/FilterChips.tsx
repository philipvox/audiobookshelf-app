/**
 * src/features/library/components/FilterChips.tsx
 *
 * Filter chips for My Library screen
 * Options: All, In Progress, Not Started, Completed
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (size / 402) * SCREEN_WIDTH;

const ACCENT = '#F4B60C';

export type FilterOption = 'all' | 'in-progress' | 'not-started' | 'completed';

interface FilterChipsProps {
  selected: FilterOption;
  onSelect: (filter: FilterOption) => void;
  counts?: {
    all: number;
    inProgress: number;
    notStarted: number;
    completed: number;
  };
}

const FILTERS: { value: FilterOption; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'not-started', label: 'Not Started' },
  { value: 'completed', label: 'Completed' },
];

export function FilterChips({ selected, onSelect, counts }: FilterChipsProps) {
  const getCount = (filter: FilterOption): number | undefined => {
    if (!counts) return undefined;
    switch (filter) {
      case 'all': return counts.all;
      case 'in-progress': return counts.inProgress;
      case 'not-started': return counts.notStarted;
      case 'completed': return counts.completed;
      default: return undefined;
    }
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {FILTERS.map((filter) => {
        const isSelected = selected === filter.value;
        const count = getCount(filter.value);

        return (
          <TouchableOpacity
            key={filter.value}
            style={[styles.chip, isSelected && styles.chipSelected]}
            onPress={() => onSelect(filter.value)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
              {filter.label}
              {count !== undefined && count > 0 && ` (${count})`}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: scale(20),
    paddingVertical: scale(12),
    gap: scale(8),
  },
  chip: {
    paddingHorizontal: scale(14),
    paddingVertical: scale(8),
    borderRadius: scale(20),
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: 'rgba(193, 244, 12, 0.15)',
    borderColor: ACCENT,
  },
  chipText: {
    fontSize: scale(13),
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
  },
  chipTextSelected: {
    color: ACCENT,
    fontWeight: '600',
  },
});
