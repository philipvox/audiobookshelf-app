import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Pressable } from 'react-native';
import { Icon } from './Icon';
import { spacing, radius, scale, accentColors } from '@/shared/theme';
import { useThemeColors } from '@/shared/theme/themeStore';

export type SortOption = 'name-asc' | 'name-desc' | 'bookCount-asc' | 'bookCount-desc';

interface FilterSortBarProps {
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  genres?: string[];
  selectedGenre?: string | null;
  onGenreChange?: (genre: string | null) => void;
  showGenreFilter?: boolean;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'name-asc', label: 'A → Z' },
  { value: 'name-desc', label: 'Z → A' },
  { value: 'bookCount-desc', label: 'Most Books' },
  { value: 'bookCount-asc', label: 'Fewest Books' },
];

export function FilterSortBar({
  sortBy,
  onSortChange,
  genres = [],
  selectedGenre,
  onGenreChange,
  showGenreFilter = false,
}: FilterSortBarProps) {
  const themeColors = useThemeColors();
  const [showSortModal, setShowSortModal] = useState(false);
  const [showGenreModal, setShowGenreModal] = useState(false);

  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label || 'Sort';

  return (
    <View style={styles.container}>
      <TouchableOpacity style={[styles.button, { backgroundColor: themeColors.backgroundSecondary }]} onPress={() => setShowSortModal(true)}>
        <Icon name="ArrowUpDown" size={18} color={themeColors.textSecondary} />
        <Text style={[styles.buttonText, { color: themeColors.textSecondary }]}>{currentSortLabel}</Text>
        <Icon name="ChevronDown" size={16} color={themeColors.textTertiary} />
      </TouchableOpacity>

      {showGenreFilter && genres.length > 0 && (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: selectedGenre ? accentColors.gold : themeColors.backgroundSecondary }]}
          onPress={() => setShowGenreModal(true)}
        >
          <Icon name="Filter" size={18} color={selectedGenre ? themeColors.background : themeColors.textSecondary} />
          <Text style={[styles.buttonText, { color: selectedGenre ? themeColors.background : themeColors.textSecondary }]}>
            {selectedGenre || 'Genre'}
          </Text>
          <Icon name="ChevronDown" size={16} color={selectedGenre ? themeColors.background : themeColors.textTertiary} />
        </TouchableOpacity>
      )}

      <Modal visible={showSortModal} transparent animationType="fade" onRequestClose={() => setShowSortModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowSortModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.surfaceElevated }]}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>Sort By</Text>
            {SORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.modalOption, { borderBottomColor: themeColors.border }, sortBy === option.value && { backgroundColor: `${accentColors.gold}20` }]}
                onPress={() => {
                  onSortChange(option.value);
                  setShowSortModal(false);
                }}
              >
                <Text style={[styles.modalOptionText, { color: themeColors.text }, sortBy === option.value && { color: accentColors.gold, fontWeight: '600' }]}>
                  {option.label}
                </Text>
                {sortBy === option.value && (
                  <Icon name="Check" size={20} color={accentColors.gold} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal visible={showGenreModal} transparent animationType="fade" onRequestClose={() => setShowGenreModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowGenreModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.surfaceElevated }]}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>Filter by Genre</Text>
            <ScrollView style={styles.genreScroll}>
              <TouchableOpacity
                style={[styles.modalOption, { borderBottomColor: themeColors.border }, !selectedGenre && { backgroundColor: `${accentColors.gold}20` }]}
                onPress={() => {
                  onGenreChange?.(null);
                  setShowGenreModal(false);
                }}
              >
                <Text style={[styles.modalOptionText, { color: themeColors.text }, !selectedGenre && { color: accentColors.gold, fontWeight: '600' }]}>All Genres</Text>
                {!selectedGenre && <Icon name="Check" size={20} color={accentColors.gold} />}
              </TouchableOpacity>
              {genres.map((genre) => (
                <TouchableOpacity
                  key={genre}
                  style={[styles.modalOption, { borderBottomColor: themeColors.border }, selectedGenre === genre && { backgroundColor: `${accentColors.gold}20` }]}
                  onPress={() => {
                    onGenreChange?.(genre);
                    setShowGenreModal(false);
                  }}
                >
                  <Text style={[styles.modalOptionText, { color: themeColors.text }, selectedGenre === genre && { color: accentColors.gold, fontWeight: '600' }]}>
                    {genre}
                  </Text>
                  {selectedGenre === genre && (
                    <Icon name="Check" size={20} color={accentColors.gold} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.xl,
    gap: scale(4),
  },
  buttonText: {
    fontSize: scale(13),
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxHeight: '70%',
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  modalTitle: {
    fontSize: scale(18),
    fontWeight: '700',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  genreScroll: {
    maxHeight: 300,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  modalOptionText: {
    fontSize: scale(16),
  },
});