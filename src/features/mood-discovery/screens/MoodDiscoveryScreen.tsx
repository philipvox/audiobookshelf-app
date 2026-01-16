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
import { spacing, radius, scale, useTheme } from '@/shared/theme';
import { secretLibraryFonts } from '@/shared/theme/secretLibrary';
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
    question: 'What are you in the mood for?',
    subtitle: 'Pick one',
    label: 'MOOD',
  },
  2: {
    question: 'How fast should it move?',
    subtitle: 'Optional',
    label: 'PACE',
  },
  3: {
    question: 'How heavy or light?',
    subtitle: 'Optional',
    label: 'TONE',
  },
  4: {
    question: 'What kind of world?',
    subtitle: 'Optional',
    label: 'SETTING',
  },
  5: {
    question: 'How long?',
    subtitle: 'Optional',
    label: 'LENGTH',
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
  const { colors } = useTheme();
  const accentColor = colors.accent.primary;
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
          { backgroundColor: colors.background.tertiary, borderColor: colors.border.default },
          selected && { backgroundColor: accentColor, borderColor: accentColor },
          animatedStyle,
        ]}
      >
        <Icon
          name={config.icon}
          size={24}
          color={selected ? colors.text.inverse : colors.text.tertiary}
          set={config.iconSet as any}
        />
        <Text style={[styles.compactLabel, { color: colors.text.primary }, selected && { color: colors.text.inverse }]}>
          {config.label}
        </Text>
        <Text style={[styles.compactDesc, { color: colors.text.tertiary }, selected && { color: colors.text.inverse }]} numberOfLines={2}>
          {config.description}
        </Text>
        {config.isDefault && !selected && (
          <View style={[styles.defaultBadge, { backgroundColor: colors.background.secondary }]}>
            <Text style={[styles.defaultBadgeText, { color: colors.text.tertiary }]}>Default</Text>
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
        { backgroundColor: colors.background.tertiary, borderColor: colors.border.default },
        selected && { backgroundColor: accentColor, borderColor: accentColor },
        animatedStyle,
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: colors.background.secondary }, selected && { backgroundColor: colors.overlay.light }]}>
        <Icon
          name={config.icon}
          size={28}
          color={selected ? colors.text.inverse : colors.text.tertiary}
          set={config.iconSet as any}
        />
      </View>
      <View style={styles.optionContent}>
        <Text style={[styles.optionLabel, { color: colors.text.primary }, selected && { color: colors.text.inverse }]}>
          {config.label}
        </Text>
        <Text style={[styles.optionDesc, { color: colors.text.tertiary }, selected && { color: colors.text.inverse }]}>
          {config.description}
        </Text>
      </View>
      {selected && (
        <Icon name="CircleCheck" size={24} color={colors.text.inverse} />
      )}
    </AnimatedPressable>
  );
}

// ============================================================================
// PROGRESS INDICATOR
// ============================================================================

function ProgressIndicator({ current, total }: { current: number; total: number }) {
  const { colors } = useTheme();
  const accentColor = colors.accent.primary;

  return (
    <View style={styles.progressContainer}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.progressDot,
            { backgroundColor: colors.border.default },
            i + 1 <= current && { backgroundColor: accentColor },
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
  const { colors } = useTheme();
  const accentColor = colors.accent.primary;
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
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background.primary }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Icon name="X" size={24} color={colors.text.primary} />
        </TouchableOpacity>

        <ProgressIndicator current={draft.currentStep} total={TOTAL_QUIZ_STEPS} />

        {draft.currentStep > 1 && draft.mood ? (
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={[styles.skipText, { color: colors.text.tertiary }]}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.skipButton} />
        )}
      </View>

      {/* Session indicator */}
      {hasActiveSession && draft.currentStep === 1 && (
        <View style={[styles.sessionBanner, { backgroundColor: colors.accent.primarySubtle, borderColor: colors.accent.primary }]}>
          <Icon name="Clock" size={16} color={accentColor} />
          <Text style={[styles.sessionText, { color: accentColor }]}>
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
        <Text style={[styles.stepIndicator, { color: colors.text.tertiary }]}>
          STEP {draft.currentStep} OF {TOTAL_QUIZ_STEPS} · {stepConfig.label}
        </Text>

        {/* Question */}
        <Text style={[styles.question, { color: colors.text.primary }]}>{stepConfig.question}</Text>
        <Text style={[styles.subtitle, { color: colors.text.tertiary }]}>{stepConfig.subtitle}</Text>

        {/* Options */}
        {renderOptions()}

        {/* Footer - inside scroll */}
        <View style={styles.footer}>
          <View style={styles.footerButtons}>
            {draft.currentStep > 1 && (
              <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                <Icon name="ArrowLeft" size={20} color={colors.text.tertiary} />
                <Text style={[styles.backText, { color: colors.text.tertiary }]}>Back</Text>
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
                { backgroundColor: accentColor },
                !canProceed && { backgroundColor: colors.background.tertiary },
                draft.currentStep === 1 && styles.nextButtonFull,
                buttonAnimatedStyle,
              ]}
            >
              <Text style={[styles.nextText, { color: colors.text.inverse }, !canProceed && { color: colors.text.tertiary }]}>
                {draft.currentStep === TOTAL_QUIZ_STEPS ? 'Find Books' : 'Next'}
              </Text>
              <Icon
                name={draft.currentStep === TOTAL_QUIZ_STEPS ? 'Sparkles' : 'ArrowRight'}
                size={20}
                color={canProceed ? colors.text.inverse : colors.text.tertiary}
              />
            </AnimatedPressable>
          </View>

          {!canProceed && draft.currentStep === 1 && (
            <Text style={[styles.hint, { color: colors.text.tertiary }]}>Select a mood to continue</Text>
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
    // backgroundColor set dynamically via colors.background.primary
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
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
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(11),
    // color set dynamically via colors.text.tertiary
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    // backgroundColor set dynamically via colors.border.default or accentColor
  },

  // Session Banner
  sessionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor and borderColor set dynamically via accent
    marginHorizontal: 24,
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    gap: spacing.sm,
    borderWidth: 1,
  },
  sessionText: {
    flex: 1,
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(10),
    // color set dynamically via accentColor
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: spacing.lg,
  },

  // Step
  stepIndicator: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(9),
    // color set dynamically via colors.text.tertiary
    textTransform: 'uppercase',
    letterSpacing: 1.35,
    marginBottom: spacing.md,
  },
  question: {
    fontFamily: secretLibraryFonts.playfair.regular,
    fontSize: scale(28),
    // color set dynamically via colors.text.primary
    marginBottom: spacing.xs,
    lineHeight: scale(28) * 1.15,
  },
  subtitle: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(10),
    // color set dynamically via colors.text.tertiary
    marginBottom: spacing.xl,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Options Grid (2 columns for Mood and World)
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },

  // Options List (full width for Pace and Weight)
  optionsList: {
    gap: spacing.md,
  },

  // Compact Card (grid items)
  compactCard: {
    width: '47%',
    // backgroundColor and borderColor set dynamically via theme
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
  },
  compactLabel: {
    fontFamily: secretLibraryFonts.playfair.regular,
    fontSize: scale(17),
    // color set dynamically via colors.text.primary or inverse
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  compactDesc: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(9),
    // color set dynamically via colors.text.tertiary
    letterSpacing: 0.3,
  },
  defaultBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    // backgroundColor set dynamically via colors.background.secondary
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  defaultBadgeText: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(8),
    // color set dynamically via colors.text.tertiary
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Full-width Option Card
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor and borderColor set dynamically via theme
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    gap: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    // backgroundColor set dynamically via colors.background.secondary
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontFamily: secretLibraryFonts.playfair.regular,
    fontSize: scale(17),
    // color set dynamically via colors.text.primary or inverse
  },
  optionDesc: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(10),
    // color set dynamically via colors.text.tertiary or inverse
    marginTop: 2,
  },

  // Footer
  footer: {
    marginTop: spacing.xl,
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
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(11),
    // color set dynamically via colors.text.tertiary
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // backgroundColor set dynamically via accentColor
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  nextButtonFull: {
    flex: 1,
  },
  nextText: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(12),
    fontWeight: '600',
    // color set dynamically via colors.text.inverse or tertiary
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  hint: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(10),
    // color set dynamically via colors.text.tertiary
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
