/**
 * src/features/search/components/SearchFilterSheet.tsx
 *
 * Bottom sheet modal for filtering search results.
 * Supports filtering by: Genre, Author, Narrator, Series, Duration
 * Sort options: Title, Author, Date Added, Duration
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { secretLibraryFonts, secretLibraryColors as staticColors } from '@/shared/theme/secretLibrary';
import { scale, useSecretLibraryColors } from '@/shared/theme';
import { Icon } from '@/shared/components/Icon';
import { DURATION_RANGES, type DurationRangeId } from '@/features/browse/hooks/useBrowseCounts';

// =============================================================================
// TYPES
// =============================================================================

export interface SearchFilterState {
  genres: string[];
  authors: string[];
  narrators: string[];
  series: string[];
  duration: DurationRangeId | null;
  sortBy: 'title' | 'author' | 'dateAdded' | 'duration';
  sortOrder: 'asc' | 'desc';
}

export interface AvailableFilters {
  genres: { id: string; name: string; count: number }[];
  authors: { id: string; name: string; count: number }[];
  narrators: { id: string; name: string; count: number }[];
  series: { id: string; name: string; count: number }[];
}

interface SearchFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  filters: SearchFilterState;
  onApply: (filters: SearchFilterState) => void;
  availableFilters: AvailableFilters;
  resultCount: number;
}

// =============================================================================
// SORT OPTIONS
// =============================================================================

const SORT_OPTIONS: { id: SearchFilterState['sortBy']; label: string }[] = [
  { id: 'title', label: 'Title' },
  { id: 'author', label: 'Author' },
  { id: 'dateAdded', label: 'Date Added' },
  { id: 'duration', label: 'Duration' },
];

// =============================================================================
// FILTER CHIP COMPONENT
// =============================================================================

interface FilterChipProps {
  label: string;
  count?: number;
  isSelected: boolean;
  onPress: () => void;
}

function FilterChip({ label, count, isSelected, onPress }: FilterChipProps) {
  const colors = useSecretLibraryColors();

  return (
    <TouchableOpacity
      style={[
        styles.chip,
        {
          backgroundColor: isSelected ? colors.black : colors.white,
          borderColor: isSelected ? colors.black : colors.grayLine,
        },
      ]}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.chipText,
          {
            color: isSelected ? colors.white : colors.black,
            fontWeight: isSelected ? '600' : '400',
          },
        ]}
        numberOfLines={1}
      >
        {label}
        {count !== undefined && ` (${count})`}
      </Text>
    </TouchableOpacity>
  );
}

// =============================================================================
// SECTION COMPONENT
// =============================================================================

interface SectionProps {
  title: string;
  children: React.ReactNode;
  onSeeAll?: () => void;
  showSeeAll?: boolean;
  collapsed?: boolean;
}

function Section({ title, children, onSeeAll, showSeeAll, collapsed }: SectionProps) {
  const colors = useSecretLibraryColors();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.black }]}>{title}</Text>
        {showSeeAll && onSeeAll && (
          <TouchableOpacity style={styles.seeAllButton} onPress={onSeeAll}>
            <Text style={[styles.seeAllText, { color: colors.gold }]}>See All</Text>
            <Icon name="ChevronRight" size={14} color={colors.gold} />
          </TouchableOpacity>
        )}
      </View>
      {!collapsed && <View style={styles.chipContainer}>{children}</View>}
    </View>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function SearchFilterSheet({
  visible,
  onClose,
  filters,
  onApply,
  availableFilters,
  resultCount,
}: SearchFilterSheetProps) {
  const insets = useSafeAreaInsets();
  const colors = useSecretLibraryColors();

  // Local state for editing filters
  const [localFilters, setLocalFilters] = useState<SearchFilterState>(filters);

  // Reset local state when sheet opens
  useEffect(() => {
    if (visible) {
      setLocalFilters(filters);
    }
  }, [visible, filters]);

  // Toggle helpers
  const toggleGenre = useCallback((genre: string) => {
    setLocalFilters((prev) => {
      const current = prev.genres;
      if (current.includes(genre)) {
        return { ...prev, genres: current.filter((g) => g !== genre) };
      }
      return { ...prev, genres: [...current, genre] };
    });
  }, []);

  const toggleAuthor = useCallback((author: string) => {
    setLocalFilters((prev) => {
      const current = prev.authors;
      if (current.includes(author)) {
        return { ...prev, authors: current.filter((a) => a !== author) };
      }
      return { ...prev, authors: [...current, author] };
    });
  }, []);

  const toggleNarrator = useCallback((narrator: string) => {
    setLocalFilters((prev) => {
      const current = prev.narrators;
      if (current.includes(narrator)) {
        return { ...prev, narrators: current.filter((n) => n !== narrator) };
      }
      return { ...prev, narrators: [...current, narrator] };
    });
  }, []);

  const toggleSeries = useCallback((series: string) => {
    setLocalFilters((prev) => {
      const current = prev.series;
      if (current.includes(series)) {
        return { ...prev, series: current.filter((s) => s !== series) };
      }
      return { ...prev, series: [...current, series] };
    });
  }, []);

  const toggleDuration = useCallback((duration: DurationRangeId) => {
    setLocalFilters((prev) => ({
      ...prev,
      duration: prev.duration === duration ? null : duration,
    }));
  }, []);

  const setSortBy = useCallback((sortBy: SearchFilterState['sortBy']) => {
    setLocalFilters((prev) => ({
      ...prev,
      sortBy,
    }));
  }, []);

  const toggleSortOrder = useCallback(() => {
    Haptics.selectionAsync();
    setLocalFilters((prev) => ({
      ...prev,
      sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const handleReset = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLocalFilters({
      genres: [],
      authors: [],
      narrators: [],
      series: [],
      duration: null,
      sortBy: 'title',
      sortOrder: 'asc',
    });
  }, []);

  const handleApply = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onApply(localFilters);
    onClose();
  }, [localFilters, onApply, onClose]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (localFilters.genres.length > 0) count++;
    if (localFilters.authors.length > 0) count++;
    if (localFilters.narrators.length > 0) count++;
    if (localFilters.series.length > 0) count++;
    if (localFilters.duration !== null) count++;
    return count;
  }, [localFilters]);

  const hasFilters = activeFilterCount > 0;

  // Limit displayed items (show first 6)
  const displayedGenres = availableFilters.genres.slice(0, 6);
  const displayedAuthors = availableFilters.authors.slice(0, 6);
  const displayedNarrators = availableFilters.narrators.slice(0, 6);
  const displayedSeries = availableFilters.series.slice(0, 6);

  const showSeeAllGenres = availableFilters.genres.length > 6;
  const showSeeAllAuthors = availableFilters.authors.length > 6;
  const showSeeAllNarrators = availableFilters.narrators.length > 6;
  const showSeeAllSeries = availableFilters.series.length > 6;

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        style={styles.overlay}
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
      >
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.white,
              paddingBottom: insets.bottom + 16,
            },
          ]}
          entering={SlideInDown.springify().damping(20)}
          exiting={SlideOutDown.duration(200)}
        >
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: colors.grayLine }]} />
          </View>

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.grayLine }]}>
            <Text style={[styles.headerTitle, { color: colors.black }]}>Filters</Text>
            {hasFilters && (
              <TouchableOpacity onPress={handleReset}>
                <Text style={[styles.resetText, { color: colors.gold }]}>
                  Clear all ({activeFilterCount})
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Sort By */}
            <Section title="Sort by">
              <View style={styles.sortRow}>
                {SORT_OPTIONS.map((option) => (
                  <FilterChip
                    key={option.id}
                    label={option.label}
                    isSelected={localFilters.sortBy === option.id}
                    onPress={() => setSortBy(option.id)}
                  />
                ))}
                <Pressable
                  style={[styles.sortOrderButton, { borderColor: colors.grayLine }]}
                  onPress={toggleSortOrder}
                >
                  <Icon
                    name={localFilters.sortOrder === 'asc' ? 'ArrowUp' : 'ArrowDown'}
                    size={16}
                    color={colors.black}
                  />
                </Pressable>
              </View>
            </Section>

            {/* Duration */}
            <Section title="Duration">
              {DURATION_RANGES.map((range) => (
                <FilterChip
                  key={range.id}
                  label={range.label}
                  isSelected={localFilters.duration === range.id}
                  onPress={() => toggleDuration(range.id)}
                />
              ))}
            </Section>

            {/* Genres */}
            {availableFilters.genres.length > 0 && (
              <Section title="Genre" showSeeAll={showSeeAllGenres}>
                {displayedGenres.map((genre) => (
                  <FilterChip
                    key={genre.id}
                    label={genre.name}
                    count={genre.count}
                    isSelected={localFilters.genres.includes(genre.id)}
                    onPress={() => toggleGenre(genre.id)}
                  />
                ))}
              </Section>
            )}

            {/* Authors */}
            {availableFilters.authors.length > 0 && (
              <Section title="Author" showSeeAll={showSeeAllAuthors}>
                {displayedAuthors.map((author) => (
                  <FilterChip
                    key={author.id}
                    label={author.name}
                    count={author.count}
                    isSelected={localFilters.authors.includes(author.id)}
                    onPress={() => toggleAuthor(author.id)}
                  />
                ))}
              </Section>
            )}

            {/* Narrators */}
            {availableFilters.narrators.length > 0 && (
              <Section title="Narrator" showSeeAll={showSeeAllNarrators}>
                {displayedNarrators.map((narrator) => (
                  <FilterChip
                    key={narrator.id}
                    label={narrator.name}
                    count={narrator.count}
                    isSelected={localFilters.narrators.includes(narrator.id)}
                    onPress={() => toggleNarrator(narrator.id)}
                  />
                ))}
              </Section>
            )}

            {/* Series */}
            {availableFilters.series.length > 0 && (
              <Section title="Series" showSeeAll={showSeeAllSeries}>
                {displayedSeries.map((series) => (
                  <FilterChip
                    key={series.id}
                    label={series.name}
                    count={series.count}
                    isSelected={localFilters.series.includes(series.id)}
                    onPress={() => toggleSeries(series.id)}
                  />
                ))}
              </Section>
            )}
          </ScrollView>

          {/* Footer with Apply Button */}
          <View style={[styles.footer, { borderTopColor: colors.grayLine }]}>
            <TouchableOpacity
              style={[styles.applyButton, { backgroundColor: colors.black }]}
              onPress={handleApply}
            >
              <Text style={[styles.applyButtonText, { color: colors.white }]}>
                Show {resultCount} Result{resultCount !== 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontFamily: secretLibraryFonts.playfair.regular,
    fontSize: scale(20),
    fontWeight: '600',
  },
  resetText: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(11),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(10),
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(10),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(11),
  },
  sortRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  sortOrderButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  applyButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(12),
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});

export default SearchFilterSheet;
