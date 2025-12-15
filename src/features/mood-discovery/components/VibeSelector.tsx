/**
 * src/features/mood-discovery/components/VibeSelector.tsx
 *
 * Multi-select vibe chips for mood discovery.
 * Users can select multiple vibes to combine.
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
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Mood, MOODS, MoodConfig } from '../types';
import { Icon } from '@/shared/components/Icon';
import { colors, spacing, radius } from '@/shared/theme';

// Legacy type aliases for backwards compatibility
type Vibe = Mood;
type VibeConfig = MoodConfig;
const VIBES = MOODS;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface VibeSelectorProps {
  /** Currently selected vibes */
  selectedVibes: Vibe[];
  /** Callback when a vibe is toggled */
  onToggle: (vibe: Vibe) => void;
  /** Whether selection is disabled */
  disabled?: boolean;
}

interface VibeChipProps {
  config: VibeConfig;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}

function VibeChip({ config, selected, onPress, disabled }: VibeChipProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: withSpring(selected ? 1 : 0.97, { damping: 15, stiffness: 200 }) },
    ],
    backgroundColor: withTiming(
      selected ? 'rgba(243, 182, 12, 0.15)' : 'rgba(255, 255, 255, 0.05)',
      { duration: 150 }
    ),
    borderColor: withTiming(
      selected ? colors.accent : 'rgba(255, 255, 255, 0.1)',
      { duration: 150 }
    ),
  }));

  const handlePress = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      disabled={disabled}
      style={[styles.chip, animatedStyle]}
    >
      <View style={[styles.iconContainer, selected && styles.iconContainerSelected]}>
        <Icon
          name={config.icon}
          size={24}
          color={selected ? colors.accent : colors.textSecondary}
          set={config.iconSet}
        />
      </View>
      <View style={styles.chipText}>
        <Text style={[styles.label, selected && styles.labelSelected]}>
          {config.label}
        </Text>
        <Text style={styles.description}>{config.description}</Text>
      </View>
      {selected && (
        <View style={styles.checkmark}>
          <Icon name="checkmark" size={14} color="#000" set="ionicons" />
        </View>
      )}
    </AnimatedPressable>
  );
}

export function VibeSelector({
  selectedVibes,
  onToggle,
  disabled,
}: VibeSelectorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>What vibe are you looking for?</Text>
      <Text style={styles.subheader}>Select all that sound good</Text>
      <View style={styles.grid}>
        {VIBES.map((vibe) => (
          <VibeChip
            key={vibe.id}
            config={vibe}
            selected={selectedVibes.includes(vibe.id)}
            onPress={() => onToggle(vibe.id)}
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
  grid: {
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 2,
    gap: spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerSelected: {
    backgroundColor: 'rgba(243, 182, 12, 0.15)',
  },
  chipText: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  labelSelected: {
    color: colors.accent,
  },
  description: {
    fontSize: 13,
    color: colors.textTertiary,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
