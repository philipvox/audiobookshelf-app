/**
 * src/features/mood-discovery/screens/MoodDiscoveryScreen.tsx
 *
 * 5-Step Discovery Quiz Screen with situational questions.
 * Uses orthogonal dimensions for precise recommendations:
 * 1. Mood (required) - What emotional experience
 * 2. Energy (optional) - How fast it moves
 * 3. Tone (optional) - How emotionally demanding
 * 4. World (optional) - Setting type
 * 5. Length (optional) - How much time you have
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';

// Layout animations can crash on Android in ScrollViews - disable on Android
const enteringAnimation = Platform.OS === 'ios' ? FadeIn.duration(150) : undefined;
const exitingAnimation = Platform.OS === 'ios' ? FadeOut.duration(100) : undefined;

import { Icon } from '@/shared/components/Icon';
import { haptics } from '@/core/native/haptics';
import { colors, spacing, radius, scale } from '@/shared/theme';
import {
  MOODS,
  PACES,
  WEIGHTS,
  WORLDS,
  LENGTHS,
  TOTAL_QUIZ_STEPS,
  Mood,
  Pace,
  Weight,
  World,
  LengthPreference,
  MoodConfig,
  PaceConfig,
  WeightConfig,
  WorldConfig,
  LengthConfig,
} from '../types';
import {
  useMoodDraft,
  useQuizActions,
  useHasActiveSession,
} from '../stores/moodSessionStore';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ============================================================================
// STEP QUESTIONS
// ============================================================================

const STEP_CONFIG = {
  1: {
    question: "It's your perfect listening moment. Where are you?",
    subtitle: 'Choose the mood that fits right now',
    label: 'MOOD',
  },
  2: {
    question: 'What kind of energy fits right now?',
    subtitle: 'Optional',
    label: 'ENERGY',
  },
  3: {
    question: 'What emotional territory feels right?',
    subtitle: 'Optional',
    label: 'TONE',
  },
  4: {
    question: 'Where do you want the story to take you?',
    subtitle: 'Optional',
    label: 'WORLD',
  },
  5: {
    question: 'How much time do you have?',
    subtitle: 'Optional',
    label: 'TIME',
  },
};

// ============================================================================
// OPTION CARD COMPONENT
// ============================================================================

interface OptionCardProps<T> {
  config: { id: T; label: string; icon: string; iconSet: string; description: string; isDefault?: boolean };
  selected: boolean;
  onSelect: () => void;
  compact?: boolean;
}

function OptionCard<T>({ config, selected, onSelect, compact }: OptionCardProps<T>) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 45 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 45 });
  };

  const handlePress = () => {
    haptics.impact('light');
    onSelect();
  };

  if (compact) {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.compactCard,
          selected && styles.compactCardSelected,
          animatedStyle,
        ]}
      >
        <Icon
          name={config.icon}
          size={24}
          color={selected ? '#000' : colors.textSecondary}
          set={config.iconSet as any}
        />
        <Text style={[styles.compactLabel, selected && styles.compactLabelSelected]}>
          {config.label}
        </Text>
        <Text style={[styles.compactDesc, selected && styles.compactDescSelected]} numberOfLines={2}>
          {config.description}
        </Text>
        {config.isDefault && !selected && (
          <View style={styles.defaultBadge}>
            <Text style={styles.defaultBadgeText}>Default</Text>
          </View>
        )}
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.optionCard, selected && styles.optionCardSelected, animatedStyle]}
    >
      <View style={[styles.iconContainer, selected && styles.iconContainerSelected]}>
        <Icon
          name={config.icon}
          size={28}
          color={selected ? '#000' : colors.textSecondary}
          set={config.iconSet as any}
        />
      </View>
      <View style={styles.optionContent}>
        <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
          {config.label}
        </Text>
        <Text style={[styles.optionDesc, selected && styles.optionDescSelected]}>
          {config.description}
        </Text>
      </View>
      {selected && (
        <Icon name="CircleCheck" size={24} color="#000" />
      )}
    </AnimatedPressable>
  );
}

// ============================================================================
// PROGRESS INDICATOR
// ============================================================================

function ProgressIndicator({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.progressContainer}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.progressDot,
            i + 1 <= current && styles.progressDotActive,
          ]}
        />
      ))}
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MoodDiscoveryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const hasActiveSession = useHasActiveSession();

  // Quiz state
  const draft = useMoodDraft();
  const {
    setMood,
    setPace,
    setWeight,
    setWorld,
    setDraftLength,
    nextStep,
    prevStep,
    resetDraft,
    commitSession,
  } = useQuizActions();

  // Animation for button
  const buttonScale = useSharedValue(1);
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handleClose = useCallback(() => {
    resetDraft();
    navigation.goBack();
  }, [navigation, resetDraft]);

  const handleNext = useCallback(() => {
    haptics.impact('light');
    if (draft.currentStep === TOTAL_QUIZ_STEPS) {
      // Final step - commit and go back
      haptics.impact('medium');
      commitSession();
      navigation.goBack();
    } else {
      nextStep();
    }
  }, [draft.currentStep, nextStep, commitSession, navigation]);

  const handleBack = useCallback(() => {
    haptics.impact('light');
    prevStep();
  }, [prevStep]);

  const handleSkip = useCallback(() => {
    // Skip remaining steps and commit with current selections
    if (draft.mood) {
      haptics.impact('medium');
      commitSession();
      navigation.goBack();
    }
  }, [draft.mood, commitSession, navigation]);

  // Determine if we can proceed
  const canProceed = draft.currentStep === 1 ? draft.mood !== null : true;

  // Get current step config
  const stepConfig = STEP_CONFIG[draft.currentStep];

  // Render options based on current step
  const renderOptions = () => {
    switch (draft.currentStep) {
      case 1:
        return (
          <Animated.View
            entering={enteringAnimation}
            exiting={exitingAnimation}
            style={styles.optionsGrid}
          >
            {MOODS.map((mood) => (
              <OptionCard
                key={mood.id}
                config={mood}
                selected={draft.mood === mood.id}
                onSelect={() => setMood(mood.id)}
                compact
              />
            ))}
          </Animated.View>
        );

      case 2:
        return (
          <Animated.View
            entering={enteringAnimation}
            exiting={exitingAnimation}
            style={styles.optionsList}
          >
            {PACES.map((pace) => (
              <OptionCard
                key={pace.id}
                config={pace}
                selected={draft.pace === pace.id}
                onSelect={() => setPace(pace.id)}
              />
            ))}
          </Animated.View>
        );

      case 3:
        return (
          <Animated.View
            entering={enteringAnimation}
            exiting={exitingAnimation}
            style={styles.optionsList}
          >
            {WEIGHTS.map((weight) => (
              <OptionCard
                key={weight.id}
                config={weight}
                selected={draft.weight === weight.id}
                onSelect={() => setWeight(weight.id)}
              />
            ))}
          </Animated.View>
        );

      case 4:
        return (
          <Animated.View
            entering={enteringAnimation}
            exiting={exitingAnimation}
            style={styles.optionsGrid}
          >
            {WORLDS.map((world) => (
              <OptionCard
                key={world.id}
                config={world}
                selected={draft.world === world.id}
                onSelect={() => setWorld(world.id)}
                compact
              />
            ))}
          </Animated.View>
        );

      case 5:
        return (
          <Animated.View
            entering={enteringAnimation}
            exiting={exitingAnimation}
            style={styles.optionsList}
          >
            {LENGTHS.map((length) => (
              <OptionCard
                key={length.id}
                config={length}
                selected={draft.length === length.id}
                onSelect={() => setDraftLength(length.id)}
              />
            ))}
          </Animated.View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Icon name="X" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <ProgressIndicator current={draft.currentStep} total={TOTAL_QUIZ_STEPS} />

        {draft.currentStep > 1 && draft.mood ? (
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.skipButton} />
        )}
      </View>

      {/* Session indicator */}
      {hasActiveSession && draft.currentStep === 1 && (
        <View style={styles.sessionBanner}>
          <Icon name="Clock" size={16} color={colors.accent} />
          <Text style={styles.sessionText}>
            You have an active session. Edit or start fresh.
          </Text>
        </View>
      )}

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Step indicator */}
        <Text style={styles.stepIndicator}>
          STEP {draft.currentStep} OF {TOTAL_QUIZ_STEPS} • {stepConfig.label}
        </Text>

        {/* Question */}
        <Text style={styles.question}>{stepConfig.question}</Text>
        <Text style={styles.subtitle}>{stepConfig.subtitle}</Text>

        {/* Options */}
        {renderOptions()}

        {/* Footer - inside scroll */}
        <View style={styles.footer}>
          <View style={styles.footerButtons}>
            {draft.currentStep > 1 && (
              <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                <Icon name="ArrowLeft" size={20} color={colors.textSecondary} />
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>
            )}

            <AnimatedPressable
              onPress={handleNext}
              onPressIn={() => {
                buttonScale.value = withSpring(0.97, { damping: 55 });
              }}
              onPressOut={() => {
                buttonScale.value = withSpring(1, { damping: 55 });
              }}
              disabled={!canProceed}
              style={[
                styles.nextButton,
                !canProceed && styles.nextButtonDisabled,
                draft.currentStep === 1 && styles.nextButtonFull,
                buttonAnimatedStyle,
              ]}
            >
              <Text style={[styles.nextText, !canProceed && styles.nextTextDisabled]}>
                {draft.currentStep === TOTAL_QUIZ_STEPS ? 'Find Books' : 'Next'}
              </Text>
              <Icon
                name={draft.currentStep === TOTAL_QUIZ_STEPS ? 'Sparkles' : 'ArrowRight'}
                size={20}
                color={canProceed ? '#000' : colors.textTertiary}
              />
            </AnimatedPressable>
          </View>

          {!canProceed && draft.currentStep === 1 && (
            <Text style={styles.hint}>Select a mood to continue</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  skipText: {
    fontSize: 15,
    color: colors.textSecondary,
  },

  // Progress
  progressContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.backgroundTertiary,
  },
  progressDotActive: {
    backgroundColor: colors.accent,
  },

  // Session Banner
  sessionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentSubtle,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  sessionText: {
    flex: 1,
    fontSize: 13,
    color: colors.accent,
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },

  // Step
  stepIndicator: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textTertiary,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  question: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },

  // Options Grid (2 columns for Mood and World)
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  // Options List (full width for Pace and Weight)
  optionsList: {
    gap: spacing.md,
  },

  // Compact Card (grid items)
  compactCard: {
    width: '47%',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  compactCardSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  compactLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  compactLabelSelected: {
    color: '#000',
  },
  compactDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  compactDescSelected: {
    color: 'rgba(0, 0, 0, 0.7)',
  },
  defaultBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.backgroundTertiary,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textTertiary,
  },

  // Full-width Option Card
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: spacing.md,
  },
  optionCardSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerSelected: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  optionLabelSelected: {
    color: '#000',
  },
  optionDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  optionDescSelected: {
    color: 'rgba(0, 0, 0, 0.7)',
  },

  // Footer
  footer: {
    marginTop: spacing.lg,
  },
  footerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  backText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonDisabled: {
    backgroundColor: colors.backgroundTertiary,
  },
  nextText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  nextTextDisabled: {
    color: colors.textTertiary,
  },
  hint: {
    fontSize: 13,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
