/**
 * src/features/library/components/SortPicker.tsx
 *
 * Sort picker/dropdown for My Library screen
 * Options: Recently Played, Recently Added, Title A-Z, etc.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
} from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scale, spacing, radius, useTheme } from '@/shared/theme';

export type SortOption =
  | 'recently-played'
  | 'recently-added'
  | 'title-asc'
  | 'title-desc'
  | 'author-asc'
  | 'duration-asc'
  | 'duration-desc';

interface SortPickerProps {
  selected: SortOption;
  onSelect: (sort: SortOption) => void;
  bookCount: number;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'recently-played', label: 'Recently Played' },
  { value: 'recently-added', label: 'Recently Added' },
  { value: 'title-asc', label: 'Title A-Z' },
  { value: 'title-desc', label: 'Title Z-A' },
  { value: 'author-asc', label: 'Author A-Z' },
  { value: 'duration-asc', label: 'Duration (Short to Long)' },
  { value: 'duration-desc', label: 'Duration (Long to Short)' },
];

export function SortPicker({ selected, onSelect, bookCount }: SortPickerProps) {
  const { colors } = useTheme();
  const accent = colors.accent.primary;
  const [isOpen, setIsOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const selectedLabel = SORT_OPTIONS.find((o) => o.value === selected)?.label || 'Sort';

  const handleSelect = (value: SortOption) => {
    onSelect(value);
    setIsOpen(false);
  };

  return (
    <>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setIsOpen(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.sortLabel, { color: colors.text.tertiary }]}>Sort: </Text>
          <Text style={[styles.sortValue, { color: colors.text.secondary }]}>{selectedLabel}</Text>
          <ChevronDown size={16} color={colors.text.tertiary} strokeWidth={2} />
        </TouchableOpacity>

        <Text style={[styles.bookCount, { color: colors.text.tertiary }]}>
          {bookCount} {bookCount === 1 ? 'book' : 'books'}
        </Text>
      </View>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setIsOpen(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.background.elevated, paddingBottom: insets.bottom + 20 }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.text.tertiary }]} />
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Sort By</Text>

            {SORT_OPTIONS.map((option) => {
              const isSelected = selected === option.value;

              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.optionRow, isSelected && { backgroundColor: `${accent}20` }]}
                  onPress={() => handleSelect(option.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.optionText, { color: colors.text.secondary }, isSelected && { color: accent, fontWeight: '600' }]}>
                    {option.label}
                  </Text>
                  {isSelected && (
                    <Check size={20} color={accent} strokeWidth={2.5} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(3),
  },
  sortLabel: {
    fontSize: scale(12),
  },
  sortValue: {
    fontSize: scale(12),
    fontWeight: '500',
  },
  bookCount: {
    fontSize: scale(12),
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    // backgroundColor set via themeColors in JSX
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.md,
  },
  modalHandle: {
    width: scale(40),
    height: scale(4),
    // backgroundColor set via themeColors in JSX
    borderRadius: radius.xs,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    // color set via themeColors in JSX
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: scale(14),
    paddingHorizontal: spacing.xl,
  },
  // optionRowSelected set inline with ACCENT color
  optionText: {
    fontSize: scale(15),
    // color set via themeColors in JSX
  },
  // optionTextSelected set inline
});
