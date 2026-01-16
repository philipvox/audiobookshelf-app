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
import { wp, hp, moderateScale, useTheme, colors } from '@/shared/theme';

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
  themeColors: ReturnType<typeof useTheme>['colors'];
}

function SortOptionRow({ label, isSelected, onPress, isLast, themeColors }: SortOptionRowProps) {
  return (
    <TouchableOpacity
      style={[
        styles.optionRow,
        !isLast && [styles.optionRowBorder, { borderBottomColor: themeColors.border.default }],
      ]}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.optionText,
        { color: themeColors.text.primary },
        isSelected && { color: colors.accent.primary, fontWeight: '600' },
      ]}>
        {label}
      </Text>
      {isSelected && (
        <Check size={wp(5)} color={colors.accent.primary} strokeWidth={2.5} />
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
  const { colors: themeColors } = useTheme();

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
        style={[styles.overlay, { backgroundColor: themeColors.overlay.medium }]}
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
      >
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: themeColors.background.primary,
              paddingBottom: insets.bottom + hp(2),
            },
          ]}
          entering={SlideInDown.springify().damping(20)}
          exiting={SlideOutDown.duration(200)}
        >
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: themeColors.text.tertiary }]} />
          </View>

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: themeColors.border.default }]}>
            <Text style={[styles.headerTitle, { color: themeColors.text.primary }]}>Sort By</Text>
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
                themeColors={themeColors}
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
    // backgroundColor set via theme in JSX
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    // backgroundColor set via theme in JSX
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
    // backgroundColor set via theme in JSX
    borderRadius: hp(0.25),
  },
  header: {
    alignItems: 'center',
    paddingBottom: hp(2),
    borderBottomWidth: 1,
    // borderBottomColor set via theme in JSX
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    // color set via theme in JSX
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
    // borderBottomColor set via theme in JSX
  },
  optionText: {
    fontSize: moderateScale(15),
    fontWeight: '400',
    // color set via theme in JSX
  },
});

export default SortSheet;
