/**
 * src/features/discover/components/QuickFilterChips.tsx
 *
 * Quick filter chips with white styling for hero overlay.
 * White text, white borders, white fill when selected.
 */

import React, { useCallback } from 'react';
import {
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { scale, layout } from '@/shared/theme';

interface QuickFilterChipsProps {
  chips: string[];
  selectedChip: string;
  onSelect: (chip: string) => void;
  showMoreButton?: boolean;
  onMorePress?: () => void;
}

interface ChipProps {
  label: string;
  isSelected: boolean;
  onPress: () => void;
}

const Chip = React.memo(function Chip({ label, isSelected, onPress }: ChipProps) {
  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  return (
    <TouchableOpacity
      style={[
        styles.chip,
        isSelected && styles.chipSelected,
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.chipText,
        isSelected && styles.chipTextSelected,
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
});

export function QuickFilterChips({
  chips,
  selectedChip,
  onSelect,
}: QuickFilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      style={styles.scrollView}
    >
      {chips.map((chip) => (
        <Chip
          key={chip}
          label={chip}
          isSelected={selectedChip === chip}
          onPress={() => onSelect(chip)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    marginBottom: scale(16),
  },
  container: {
    paddingHorizontal: layout.screenPaddingH,
    gap: scale(8),
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    borderRadius: scale(20),
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: '#E53935',
    borderColor: '#E53935',
  },
  chipText: {
    fontSize: scale(14),
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
