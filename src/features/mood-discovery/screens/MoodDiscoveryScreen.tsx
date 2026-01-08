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
} from 'react-native-reanimated';

// Layout animations crash on Android in ScrollViews - use regular View on Android
const isIOS = Platform.OS === 'ios';

import { Icon } from '@/shared/components/Icon';
import { haptics } from '@/core/native/haptics';
import { spacing, radius, scale, useThemeColors } from '@/shared/theme';
import { useColors } from '@/shared/theme/themeStore';
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
  const themeColors = useThemeColors();
  const colors = useColors();
  const accent = colors.accent.primary;
  const cardScale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const handlePressIn = () => {
    cardScale.value = withSpring(0.96, { damping: 45 });
  };

  const handlePressOut = () => {
    cardScale.value = withSpring(1, { damping: 45 });
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
          { backgroundColor: themeColors.backgroundSecondary },
          selected && { backgroundColor: accent, borderColor: accent },
          animatedStyle,
        ]}
      >
        <Icon
          name={config.icon}
          size={24}
          color={selected ? '#000' : themeColors.textSecondary}
          set={config.iconSet as any}
        />
        <Text style={[styles.compactLabel, { color: themeColors.text }, selected && styles.compactLabelSelected]}>
          {config.label}
        </Text>
        <Text style={[styles.compactDesc, { color: themeColors.textSecondary }, selected && styles.compactDescSelected]} numberOfLines={2}>
          {config.description}
        </Text>
        {config.isDefault && !selected && (
          <View style={[styles.defaultBadge, { backgroundColor: themeColors.backgroundTertiary }]}>
            <Text style={[styles.defaultBadgeText, { color: themeColors.textTertiary }]}>Default</Text>
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
      style={[
        styles.optionCard,
        { backgroundColor: themeColors.backgroundSecondary },
        selected && { backgroundColor: accent, borderColor: accent },
        animatedStyle,
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: themeColors.backgroundTertiary }, selected && styles.iconContainerSelected]}>
        <Icon
          name={config.icon}
          size={28}
          color={selected ? '#000' : themeColors.textSecondary}
          set={config.iconSet as any}
        />
      </View>
      <View style={styles.optionContent}>
        <Text style={[styles.optionLabel, { color: themeColors.text }, selected && styles.optionLabelSelected]}>
          {config.label}
        </Text>
        <Text style={[styles.optionDesc, { color: themeColors.textSecondary }, selected && styles.optionDescSelected]}>
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
  const themeColors = useThemeColors();
  const colors = useColors();
  const accent = colors.accent.primary;
  return (
    <View style={styles.progressContainer}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.progressDot,
            { backgroundColor: themeColors.backgroundTertiary },
            i + 1 <= current && { backgroundColor: accent },
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
  const themeColors = useThemeColors();
  const colors = useColors();
  const accent = colors.accent.primary;
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
  // Use Animated.View with FadeIn only on iOS - Android crashes with layout animations in ScrollView
  const renderOptions = () => {
    const Container = isIOS ? Animated.View : View;
    const animProps = isIOS ? { entering: FadeIn.duration(150) } : {};

    switch (draft.currentStep) {
      case 1:
        return (
          <Container {...animProps} style={styles.optionsGrid}>
            {MOODS.map((mood) => (
              <OptionCard
                key={mood.id}
                config={mood}
                selected={draft.mood === mood.id}
                onSelect={() => setMood(mood.id)}
                compact
              />
            ))}
          </Container>
        );

      case 2:
        return (
          <Container {...animProps} style={styles.optionsList}>
            {PACES.map((pace) => (
              <OptionCard
                key={pace.id}
                config={pace}
                selected={draft.pace === pace.id}
                onSelect={() => setPace(pace.id)}
              />
            ))}
          </Container>
        );

      case 3:
        return (
          <Container {...animProps} style={styles.optionsList}>
            {WEIGHTS.map((weight) => (
              <OptionCard
                key={weight.id}
                config={weight}
                selected={draft.weight === weight.id}
                onSelect={() => setWeight(weight.id)}
              />
            ))}
          </Container>
        );

      case 4:
        return (
          <Container {...animProps} style={styles.optionsGrid}>
            {WORLDS.map((world) => (
              <OptionCard
                key={world.id}
                config={world}
                selected={draft.world === world.id}
                onSelect={() => setWorld(world.id)}
                compact
              />
            ))}
          </Container>
        );

      case 5:
        return (
          <Container {...animProps} style={styles.optionsList}>
            {LENGTHS.map((length) => (
              <OptionCard
                key={length.id}
                config={length}
                selected={draft.length === length.id}
                onSelect={() => setDraftLength(length.id)}
              />
            ))}
          </Container>
        );

      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Icon name="X" size={24} color={themeColors.text} />
        </TouchableOpacity>

        <ProgressIndicator current={draft.currentStep} total={TOTAL_QUIZ_STEPS} />

        {draft.currentStep > 1 && draft.mood ? (
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={[styles.skipText, { color: themeColors.textSecondary }]}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.skipButton} />
        )}
      </View>

      {/* Session indicator */}
      {hasActiveSession && draft.currentStep === 1 && (
        <View style={[styles.sessionBanner, { backgroundColor: `${accent}15` }]}>
          <Icon name="Clock" size={16} color={accent} />
          <Text style={[styles.sessionText, { color: accent }]}>
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
        <Text style={[styles.stepIndicator, { color: themeColors.textTertiary }]}>
          STEP {draft.currentStep} OF {TOTAL_QUIZ_STEPS} • {stepConfig.label}
        </Text>

        {/* Question */}
        <Text style={[styles.question, { color: themeColors.text }]}>{stepConfig.question}</Text>
        <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>{stepConfig.subtitle}</Text>

        {/* Options */}
        {renderOptions()}

        {/* Footer - inside scroll */}
        <View style={styles.footer}>
          <View style={styles.footerButtons}>
            {draft.currentStep > 1 && (
              <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                <Icon name="ArrowLeft" size={20} color={themeColors.textSecondary} />
                <Text style={[styles.backText, { color: themeColors.textSecondary }]}>Back</Text>
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
                { backgroundColor: accent },
                !canProceed && { backgroundColor: themeColors.backgroundTertiary },
                draft.currentStep === 1 && styles.nextButtonFull,
                buttonAnimatedStyle,
              ]}
            >
              <Text style={[styles.nextText, !canProceed && { color: themeColors.textTertiary }]}>
                {draft.currentStep === TOTAL_QUIZ_STEPS ? 'Find Books' : 'Next'}
              </Text>
              <Icon
                name={draft.currentStep === TOTAL_QUIZ_STEPS ? 'Sparkles' : 'ArrowRight'}
                size={20}
                color={canProceed ? '#000' : themeColors.textTertiary}
              />
            </AnimatedPressable>
          </View>

          {!canProceed && draft.currentStep === 1 && (
            <Text style={[styles.hint, { color: themeColors.textTertiary }]}>Select a mood to continue</Text>
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
    // backgroundColor set via themeColors in JSX
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
    // color set via themeColors in JSX
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
    // backgroundColor set via themeColors in JSX
  },

  // Session Banner
  sessionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor set via themeColors in JSX
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
    // color set via themeColors in JSX
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
    // color set via themeColors in JSX
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  question: {
    fontSize: 22,
    fontWeight: '700',
    // color set via themeColors in JSX
    marginBottom: spacing.xxs,
  },
  subtitle: {
    fontSize: 14,
    // color set via themeColors in JSX
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
    // backgroundColor set via themeColors in JSX
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  compactLabel: {
    fontSize: 14,
    fontWeight: '600',
    // color set via themeColors in JSX
    marginTop: spacing.xs,
  },
  compactLabelSelected: {
    color: '#000',
  },
  compactDesc: {
    fontSize: 12,
    // color set via themeColors in JSX
    marginTop: 2,
  },
  compactDescSelected: {
    color: 'rgba(0, 0, 0, 0.7)',
  },
  defaultBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    // backgroundColor set via themeColors in JSX
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    // color set via themeColors in JSX
  },

  // Full-width Option Card
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor set via themeColors in JSX
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    // backgroundColor set via themeColors in JSX
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
    // color set via themeColors in JSX
  },
  optionLabelSelected: {
    color: '#000',
  },
  optionDesc: {
    fontSize: 14,
    // color set via themeColors in JSX
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
    // color set via themeColors in JSX
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // backgroundColor set via themeColors in JSX
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  nextButtonFull: {
    flex: 1,
  },
  nextText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  hint: {
    fontSize: 13,
    // color set via themeColors in JSX
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
