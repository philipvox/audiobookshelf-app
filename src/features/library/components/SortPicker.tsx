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
  Dimensions,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (size / 402) * SCREEN_WIDTH;

const ACCENT = '#F4B60C';

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
          <Text style={styles.sortLabel}>Sort: </Text>
          <Text style={styles.sortValue}>{selectedLabel}</Text>
          <Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>

        <Text style={styles.bookCount}>
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
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Sort By</Text>

            {SORT_OPTIONS.map((option) => {
              const isSelected = selected === option.value;

              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                  onPress={() => handleSelect(option.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                    {option.label}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={20} color={ACCENT} />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingBottom: scale(12),
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  sortLabel: {
    fontSize: scale(13),
    color: 'rgba(255,255,255,0.5)',
  },
  sortValue: {
    fontSize: scale(13),
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
  bookCount: {
    fontSize: scale(13),
    color: 'rgba(255,255,255,0.5)',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    paddingTop: scale(12),
  },
  modalHandle: {
    width: scale(40),
    height: scale(4),
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: scale(2),
    alignSelf: 'center',
    marginBottom: scale(16),
  },
  modalTitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: scale(16),
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: scale(14),
    paddingHorizontal: scale(20),
  },
  optionRowSelected: {
    backgroundColor: 'rgba(193, 244, 12, 0.1)',
  },
  optionText: {
    fontSize: scale(15),
    color: 'rgba(255,255,255,0.8)',
  },
  optionTextSelected: {
    color: ACCENT,
    fontWeight: '600',
  },
});
