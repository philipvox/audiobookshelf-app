/**
 * src/features/mood-discovery/components/WorldSelector.tsx
 *
 * Single-select world/setting cards for mood discovery.
 * Our World, Fantasy, Sci-Fi, Historical, or Any.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { WorldSetting, WORLD_OPTIONS, WorldConfig } from '../types';
import { Icon } from '@/shared/components/Icon';
import { colors, spacing, radius } from '@/shared/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface WorldSelectorProps {
  /** Currently selected world setting */
  selected: WorldSetting;
  /** Callback when selection changes */
  onSelect: (world: WorldSetting) => void;
  /** Whether selection is disabled */
  disabled?: boolean;
}

interface WorldCardProps {
  config: WorldConfig;
  isSelected: boolean;
  onPress: () => void;
  disabled?: boolean;
}

function WorldCard({ config, isSelected, onPress, disabled }: WorldCardProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: withTiming(
      isSelected ? 'rgba(243, 182, 12, 0.15)' : 'rgba(255, 255, 255, 0.05)',
      { duration: 150 }
    ),
    borderColor: withTiming(
      isSelected ? colors.accent : 'rgba(255, 255, 255, 0.1)',
      { duration: 150 }
    ),
    transform: [
      { scale: withTiming(isSelected ? 1 : 0.98, { duration: 150 }) },
    ],
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
      style={[styles.card, animatedStyle]}
    >
      <View style={[styles.iconContainer, isSelected && styles.iconContainerSelected]}>
        <Icon
          name={config.icon}
          size={28}
          color={isSelected ? colors.accent : colors.textSecondary}
          set={config.iconSet}
        />
      </View>
      <Text style={[styles.label, isSelected && styles.labelSelected]}>
        {config.label}
      </Text>
      <Text style={styles.description}>{config.description}</Text>
      {isSelected && (
        <View style={styles.selectedIndicator}>
          <View style={styles.selectedDot} />
        </View>
      )}
    </AnimatedPressable>
  );
}

export function WorldSelector({
  selected,
  onSelect,
  disabled,
}: WorldSelectorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>What world?</Text>
      <Text style={styles.subheader}>Pick your preferred setting</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {WORLD_OPTIONS.map((option) => (
          <WorldCard
            key={option.id}
            config={option}
            isSelected={selected === option.id}
            onPress={() => onSelect(option.id)}
            disabled={disabled}
          />
        ))}
      </ScrollView>
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
    paddingHorizontal: spacing.lg,
  },
  subheader: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  card: {
    width: 130,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 2,
    alignItems: 'center',
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  iconContainerSelected: {
    backgroundColor: 'rgba(243, 182, 12, 0.15)',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  labelSelected: {
    color: colors.accent,
  },
  description: {
    fontSize: 11,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 14,
  },
  selectedIndicator: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
});
