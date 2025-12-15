/**
 * src/features/mood-discovery/components/LengthSlider.tsx
 *
 * Segmented control for audiobook length preference.
 * Single-select: Short, Medium, Long, or Any.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LengthPreference, LENGTH_OPTIONS, LengthConfig } from '../types';
import { colors, spacing, radius } from '@/shared/theme';

interface LengthSliderProps {
  /** Currently selected length preference */
  selected: LengthPreference;
  /** Callback when selection changes */
  onSelect: (length: LengthPreference) => void;
  /** Whether selection is disabled */
  disabled?: boolean;
}

interface SegmentProps {
  config: LengthConfig;
  isSelected: boolean;
  onPress: () => void;
  disabled?: boolean;
}

function Segment({ config, isSelected, onPress, disabled }: SegmentProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: withTiming(
      isSelected ? colors.accent : 'transparent',
      { duration: 150 }
    ),
  }));

  const handlePress = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={styles.segmentTouchable}
    >
      <Animated.View style={[styles.segment, animatedStyle]}>
        <Text
          style={[
            styles.segmentLabel,
            isSelected && styles.segmentLabelSelected,
          ]}
        >
          {config.label}
        </Text>
        <Text
          style={[
            styles.segmentDescription,
            isSelected && styles.segmentDescriptionSelected,
          ]}
        >
          {config.description}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export function LengthSlider({
  selected,
  onSelect,
  disabled,
}: LengthSliderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>How long?</Text>
      <Text style={styles.subheader}>Pick your preferred length</Text>
      <View style={styles.segmentContainer}>
        {LENGTH_OPTIONS.map((option) => (
          <Segment
            key={option.id}
            config={option}
            isSelected={selected === option.id}
            onPress={() => onSelect(option.id)}
            disabled={disabled}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  header: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subheader: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundTertiary,
    borderRadius: radius.md,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  segmentTouchable: {
    flex: 1,
  },
  segment: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  segmentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  segmentLabelSelected: {
    color: '#000',
  },
  segmentDescription: {
    fontSize: 11,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  segmentDescriptionSelected: {
    color: 'rgba(0, 0, 0, 0.6)',
  },
});
