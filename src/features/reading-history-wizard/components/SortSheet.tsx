/**
 * src/features/reading-history-wizard/components/SortSheet.tsx
 *
 * Bottom sheet for sorting reading history.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { wp, hp, moderateScale } from '@/shared/theme';

// =============================================================================
// COLORS
// =============================================================================

const COLORS = {
  accent: '#F3B60C',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textTertiary: 'rgba(255, 255, 255, 0.5)',
  surface: 'rgba(255, 255, 255, 0.05)',
  surfaceBorder: 'rgba(255, 255, 255, 0.08)',
  background: '#0A0A0A',
  scrim: 'rgba(0, 0, 0, 0.6)',
};

// =============================================================================
// TYPES
// =============================================================================

export type SortOption = 'recent' | 'title' | 'author' | 'duration_long' | 'duration_short';

interface SortSheetProps {
  visible: boolean;
  onClose: () => void;
  currentSort: SortOption;
  onSelectSort: (option: SortOption) => void;
}

// =============================================================================
// SORT OPTIONS
// =============================================================================

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: 'recent', label: 'Most Recent' },
  { id: 'title', label: 'Title (A-Z)' },
  { id: 'author', label: 'Author (A-Z)' },
  { id: 'duration_long', label: 'Duration (Longest)' },
  { id: 'duration_short', label: 'Duration (Shortest)' },
];

// =============================================================================
// SORT OPTION ROW COMPONENT
// =============================================================================

interface SortOptionRowProps {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  isLast?: boolean;
}

function SortOptionRow({ label, isSelected, onPress, isLast }: SortOptionRowProps) {
  return (
    <TouchableOpacity
      style={[styles.optionRow, !isLast && styles.optionRowBorder]}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      activeOpacity={0.7}
    >
      <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
        {label}
      </Text>
      {isSelected && (
        <Check size={wp(5)} color={COLORS.accent} strokeWidth={2.5} />
      )}
    </TouchableOpacity>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function SortSheet({
  visible,
  onClose,
  currentSort,
  onSelectSort,
}: SortSheetProps) {
  const insets = useSafeAreaInsets();

  const handleSelect = (option: SortOption) => {
    onSelectSort(option);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        style={styles.overlay}
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
      >
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />

        <Animated.View
          style={[styles.sheet, { paddingBottom: insets.bottom + hp(2) }]}
          entering={SlideInDown.springify().damping(20)}
          exiting={SlideOutDown.duration(200)}
        >
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Sort By</Text>
          </View>

          {/* Options */}
          <View style={styles.options}>
            {SORT_OPTIONS.map((option, index) => (
              <SortOptionRow
                key={option.id}
                label={option.label}
                isSelected={currentSort === option.id}
                onPress={() => handleSelect(option.id)}
                isLast={index === SORT_OPTIONS.length - 1}
              />
            ))}
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
    backgroundColor: COLORS.scrim,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: wp(5),
    borderTopRightRadius: wp(5),
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: hp(1.5),
  },
  handle: {
    width: wp(9),
    height: hp(0.5),
    backgroundColor: COLORS.textTertiary,
    borderRadius: hp(0.25),
  },
  header: {
    alignItems: 'center',
    paddingBottom: hp(2),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  options: {
    paddingHorizontal: wp(5.5),
    paddingTop: hp(1),
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: hp(2),
  },
  optionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
  },
  optionText: {
    fontSize: moderateScale(15),
    fontWeight: '400',
    color: COLORS.textPrimary,
  },
  optionTextSelected: {
    color: COLORS.accent,
    fontWeight: '600',
  },
});

export default SortSheet;
