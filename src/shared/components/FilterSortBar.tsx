import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Pressable } from 'react-native';
import { Icon } from './Icon';
import { theme } from '@/shared/theme';

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
  const [showSortModal, setShowSortModal] = useState(false);
  const [showGenreModal, setShowGenreModal] = useState(false);

  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label || 'Sort';

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={() => setShowSortModal(true)}>
        <Icon name="swap-vertical" size={18} color={theme.colors.text.secondary} set="ionicons" />
        <Text style={styles.buttonText}>{currentSortLabel}</Text>
        <Icon name="chevron-down" size={16} color={theme.colors.text.tertiary} set="ionicons" />
      </TouchableOpacity>

      {showGenreFilter && genres.length > 0 && (
        <TouchableOpacity
          style={[styles.button, selectedGenre && styles.buttonActive]}
          onPress={() => setShowGenreModal(true)}
        >
          <Icon name="filter" size={18} color={selectedGenre ? '#fff' : theme.colors.text.secondary} set="ionicons" />
          <Text style={[styles.buttonText, selectedGenre && styles.buttonTextActive]}>
            {selectedGenre || 'Genre'}
          </Text>
          <Icon name="chevron-down" size={16} color={selectedGenre ? '#fff' : theme.colors.text.tertiary} set="ionicons" />
        </TouchableOpacity>
      )}

      <Modal visible={showSortModal} transparent animationType="fade" onRequestClose={() => setShowSortModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowSortModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sort By</Text>
            {SORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.modalOption, sortBy === option.value && styles.modalOptionActive]}
                onPress={() => {
                  onSortChange(option.value);
                  setShowSortModal(false);
                }}
              >
                <Text style={[styles.modalOptionText, sortBy === option.value && styles.modalOptionTextActive]}>
                  {option.label}
                </Text>
                {sortBy === option.value && (
                  <Icon name="checkmark" size={20} color={theme.colors.primary[500]} set="ionicons" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal visible={showGenreModal} transparent animationType="fade" onRequestClose={() => setShowGenreModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowGenreModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filter by Genre</Text>
            <ScrollView style={styles.genreScroll}>
              <TouchableOpacity
                style={[styles.modalOption, !selectedGenre && styles.modalOptionActive]}
                onPress={() => {
                  onGenreChange?.(null);
                  setShowGenreModal(false);
                }}
              >
                <Text style={[styles.modalOptionText, !selectedGenre && styles.modalOptionTextActive]}>All Genres</Text>
                {!selectedGenre && <Icon name="checkmark" size={20} color={theme.colors.primary[500]} set="ionicons" />}
              </TouchableOpacity>
              {genres.map((genre) => (
                <TouchableOpacity
                  key={genre}
                  style={[styles.modalOption, selectedGenre === genre && styles.modalOptionActive]}
                  onPress={() => {
                    onGenreChange?.(genre);
                    setShowGenreModal(false);
                  }}
                >
                  <Text style={[styles.modalOptionText, selectedGenre === genre && styles.modalOptionTextActive]}>
                    {genre}
                  </Text>
                  {selectedGenre === genre && (
                    <Icon name="checkmark" size={20} color={theme.colors.primary[500]} set="ionicons" />
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
    gap: theme.spacing[2],
    marginTop: theme.spacing[3],
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.neutral[200],
    gap: theme.spacing[1],
  },
  buttonActive: {
    backgroundColor: theme.colors.primary[500],
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  buttonTextActive: {
    color: '#fff',
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
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.radius.lg,
    padding: theme.spacing[4],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing[4],
    textAlign: 'center',
  },
  genreScroll: {
    maxHeight: 300,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  modalOptionActive: {
    backgroundColor: theme.colors.primary[50],
  },
  modalOptionText: {
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  modalOptionTextActive: {
    color: theme.colors.primary[500],
    fontWeight: '600',
  },
});