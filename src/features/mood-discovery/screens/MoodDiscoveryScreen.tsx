/**
 * src/features/mood-discovery/screens/MoodDiscoveryScreen.tsx
 *
 * 3-Step Discovery Quiz Screen:
 * 1. Mood (required) - What emotional experience (4 moods in 2x2 grid)
 * 2. Flavor (optional) - Sub-category drill-down based on mood
 * 3. Seed Book (optional) - "What book do you wish you could read again?"
 *
 * Design features:
 * - Italic serif titles with gray subtitles
 * - "Surprise me" button at top of Screen 1
 * - Mood chip header on Screens 2 and 3
 * - Card tap inversion with auto-advance
 * - Adults only toggle with divider
 */

import React, { useCallback, useState, useEffect, useRef } from 'react';
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
import { secretLibraryFonts, secretLibraryColors } from '@/shared/theme/secretLibrary';
import { LinearGradient } from 'expo-linear-gradient';
import {
  MOODS,
  MOOD_FLAVORS,
  MOOD_COLORS,
  TOTAL_QUIZ_STEPS,
  Mood,
  FlavorConfig,
} from '../types';
import {
  useMoodDraft,
  useQuizActions,
  useHasActiveSession,
} from '../stores/moodSessionStore';
import { MoodScoringOverlay } from '../components/MoodScoringOverlay';
import { SeedBookPicker } from '../components/SeedBookPicker';
import { ScreenLoadingOverlay } from '@/shared/components';

// Auto-advance delay after selection (ms)
const AUTO_ADVANCE_DELAY = 400;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ============================================================================
// STEP QUESTIONS
// ============================================================================

/**
 * Get step config based on current step and selected mood.
 * Step 1: Mood selection - "What are you in the mood for?"
 * Step 2: Flavor drill-down - Sub-categories for chosen mood
 * Step 3: Seed book - "What book do you wish you could read again?"
 */
function getStepConfig(step: number, mood: Mood | null) {
  switch (step) {
    case 1:
      return {
        question: 'What are you in the mood for?',
        subtitle: 'Pick one',
        label: 'MOOD',
      };

    case 2:
      return {
        question: 'What flavor?',
        subtitle: 'Pick your vibe',
        label: 'FLAVOR',
      };

    case 3:
      return {
        question: 'Which book do you wish you could read for the first time again?',
        subtitle: 'This helps us find similar gems',
        label: 'SEED',
      };

    default:
      return {
        question: 'Refine your search',
        subtitle: 'Optional',
        label: 'DETAILS',
      };
  }
}

// ============================================================================
// MOOD CARD COMPONENT (2x2 grid, black & white design)
// ============================================================================

interface MoodCardProps<T> {
  config: { id: T; label: string; icon: string; iconSet: string; description: string; isDefault?: boolean };
  selected: boolean;
  onSelect: () => void;
  /** Mood color override — used by flavor cards to inherit parent mood's colors */
  moodColorOverride?: Mood;
}

function MoodCard<T>({ config, selected, onSelect, moodColorOverride }: MoodCardProps<T>) {
  const cardScale = useSharedValue(1);

  // Resolve mood colors: use override if provided, otherwise try config.id as Mood
  const moodId = moodColorOverride || (config.id as unknown as Mood);
  const moodColor = MOOD_COLORS[moodId] || MOOD_COLORS.comfort;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const handlePressIn = () => {
    cardScale.value = withSpring(0.95, { damping: 40 });
  };

  const handlePressOut = () => {
    cardScale.value = withSpring(1, { damping: 40 });
  };

  const handlePress = () => {
    haptics.impact('light');
    onSelect();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.moodCard,
        {
          backgroundColor: moodColor.cardBg,
          borderColor: moodColor.cardBorder,
          overflow: 'hidden',
        },
        selected && {
          borderColor: 'transparent',
          shadowColor: moodColor.glow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 1,
          shadowRadius: 16,
          elevation: 8,
        },
        animatedStyle,
      ]}
    >
      {/* Gradient fill when selected */}
      {selected && (
        <LinearGradient
          colors={[moodColor.gradientStart, moodColor.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={styles.moodCardContent}>
        <View style={styles.moodCardRow}>
          <Icon
            name={config.icon}
            size={18}
            color={selected ? '#FFFFFF' : moodColor.primary}
          />
          <Text style={[
            styles.moodCardTitle,
            { color: selected ? '#FFFFFF' : '#FFFFFF' },
          ]}>
            {config.label}
          </Text>
        </View>
        <Text style={[
          styles.moodCardDesc,
          { color: selected ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.45)' },
        ]}>
          {config.description}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

// ============================================================================
// MOOD CHIP COMPONENT (shows selected mood on screens 2 and 3)
// ============================================================================

interface MoodChipProps {
  mood: Mood;
  onClear: () => void;
}

function MoodChip({ mood, onClear }: MoodChipProps) {
  const moodConfig = MOODS.find((m) => m.id === mood);
  const moodColor = MOOD_COLORS[mood];
  if (!moodConfig) return null;

  return (
    <View style={[styles.moodChip, { backgroundColor: moodColor.cardBg, borderColor: moodColor.cardBorder, borderWidth: 1 }]}>
      <Icon name={moodConfig.icon} size={14} color={moodColor.primary} />
      <Text style={[styles.moodChipText, { color: moodColor.primary }]}>
        {moodConfig.label.toUpperCase()}
      </Text>
      <TouchableOpacity onPress={onClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={[styles.moodChipRemove, { color: moodColor.primary }]}>×</Text>
      </TouchableOpacity>
    </View>
  );
}

// ============================================================================
// PROGRESS INDICATOR
// ============================================================================

function ProgressIndicator({ current, total, mood }: { current: number; total: number; mood?: Mood | null }) {
  const activeColor = mood ? MOOD_COLORS[mood].primary : '#FFFFFF';
  return (
    <View style={styles.progressContainer}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.progressDot,
            { backgroundColor: 'rgba(255,255,255,0.2)' },
            i + 1 <= current && { backgroundColor: activeColor },
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
  const accentColor = secretLibraryColors.gold;
  const hasActiveSession = useHasActiveSession();

  // Loading state for initial mount
  const [mounted, setMounted] = useState(false);

  // Loading state for scoring overlay
  const [isScoring, setIsScoring] = useState(false);
  const [scoringProgress, setScoringProgress] = useState(0);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Mark as mounted after first render
  useEffect(() => {
    // Small delay to ensure layout is complete
    const timer = setTimeout(() => setMounted(true), 50);
    return () => {
      clearTimeout(timer);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Quiz state
  const draft = useMoodDraft();
  const {
    setMood,
    setFlavor,
    setSeedBook,
    setExcludeChildrens,
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

  // Auto-advance timer ref
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scoring animation timer ref (for cleanup on unmount)
  const scoringTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear all timers on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
      if (scoringTimerRef.current) {
        clearTimeout(scoringTimerRef.current);
      }
    };
  }, []);

  const handleClose = useCallback(() => {
    resetDraft();
    navigation.goBack();
  }, [navigation, resetDraft]);

  // Handle "Surprise me — any mood" - randomly picks a mood and advances
  const handleSurpriseMe = useCallback(() => {
    haptics.impact('medium');
    const randomMood = MOODS[Math.floor(Math.random() * MOODS.length)].id;
    setMood(randomMood);

    // Show scoring animation immediately for surprise me
    setIsScoring(true);
    setScoringProgress(0);

    let progress = 0;
    progressIntervalRef.current = setInterval(() => {
      progress += 0.05;
      if (progress >= 1) {
        progress = 1;
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
      }
      setScoringProgress(progress);
    }, 75);

    commitSession();
    scoringTimerRef.current = setTimeout(() => {
      setIsScoring(false);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      navigation.goBack();
    }, 1500);
  }, [setMood, commitSession, navigation]);

  // Handle mood selection (no auto-advance - user navigates manually)
  const handleMoodSelect = useCallback((moodId: Mood) => {
    setMood(moodId);
  }, [setMood]);

  // Handle flavor selection (no auto-advance - user navigates manually)
  const handleFlavorSelect = useCallback((flavorId: string) => {
    setFlavor(flavorId);
  }, [setFlavor]);

  // Handle clearing mood chip (go back to step 1)
  const handleClearMood = useCallback(() => {
    haptics.impact('light');
    resetDraft();
  }, [resetDraft]);

  const handleNext = useCallback(() => {
    haptics.impact('light');
    if (draft.currentStep === TOTAL_QUIZ_STEPS) {
      // Final step - show scoring overlay, commit, then navigate
      haptics.impact('medium');
      setIsScoring(true);
      setScoringProgress(0);

      // Animate progress smoothly over ~1.5 seconds
      let progress = 0;
      progressIntervalRef.current = setInterval(() => {
        progress += 0.05;
        if (progress >= 1) {
          progress = 1;
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
          }
        }
        setScoringProgress(progress);
      }, 75);

      // Commit session and navigate after showing animation
      commitSession();
      scoringTimerRef.current = setTimeout(() => {
        setIsScoring(false);
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
        navigation.goBack();
      }, 1500);
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
      setIsScoring(true);
      setScoringProgress(0);

      // Animate progress smoothly over ~1.5 seconds
      let progress = 0;
      progressIntervalRef.current = setInterval(() => {
        progress += 0.05;
        if (progress >= 1) {
          progress = 1;
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
          }
        }
        setScoringProgress(progress);
      }, 75);

      // Commit session and navigate after showing animation
      commitSession();
      scoringTimerRef.current = setTimeout(() => {
        setIsScoring(false);
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
        navigation.goBack();
      }, 1500);
    }
  }, [draft.mood, commitSession, navigation]);

  // Determine if we can proceed
  // Step 1: Mood required, Steps 2-3: Optional (can skip)
  const canProceed = draft.currentStep === 1 ? draft.mood !== null : true;

  // Get current step config
  const stepConfig = getStepConfig(draft.currentStep, draft.mood);

  // Get flavor options for current mood
  const flavorOptions = draft.mood ? MOOD_FLAVORS[draft.mood] : [];

  // Render options based on current step
  // Use Animated.View with FadeIn only on iOS - Android crashes with layout animations in ScrollView
  const renderOptions = () => {
    const Container = isIOS ? Animated.View : View;
    const animProps = isIOS ? { entering: FadeIn.duration(150) } : {};

    switch (draft.currentStep) {
      // Step 1: Mood selection - 2x2 grid with surprise button
      case 1:
        return (
          <View>
            {/* Surprise me button */}
            <TouchableOpacity
              style={styles.surpriseButton}
              onPress={handleSurpriseMe}
              activeOpacity={0.7}
            >
              <Icon name="Shuffle" size={16} color="rgba(255,255,255,0.5)" />
              <Text style={styles.surpriseButtonText}>
                Surprise me — any mood
              </Text>
            </TouchableOpacity>

            {/* 2x2 Mood Grid */}
            <Container {...animProps} style={styles.cardGrid}>
              {MOODS.map((moodConfig) => (
                <MoodCard
                  key={moodConfig.id}
                  config={moodConfig}
                  selected={draft.mood === moodConfig.id}
                  onSelect={() => handleMoodSelect(moodConfig.id)}
                />
              ))}
            </Container>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Adults only toggle */}
            <Pressable
              style={styles.toggleRow}
              onPress={() => {
                haptics.toggle();
                setExcludeChildrens(!draft.excludeChildrens);
              }}
            >
              <View style={styles.toggleTextContainer}>
                <Text style={styles.toggleLabel}>Adults only</Text>
                <Text style={styles.toggleSublabel}>Skip children's books</Text>
              </View>
              <View style={[styles.toggle, draft.excludeChildrens && styles.toggleActive]}>
                <View style={[styles.toggleThumb, draft.excludeChildrens && styles.toggleThumbActive]} />
              </View>
            </Pressable>
          </View>
        );

      // Step 2: Flavor drill-down - 2x2 grid with mood colors
      case 2: {
        const parentMoodColor = draft.mood ? MOOD_COLORS[draft.mood] : MOOD_COLORS.comfort;
        return (
          <View>
            {/* Surprise me button */}
            <TouchableOpacity
              style={[
                styles.surpriseButton,
                !draft.flavor && {
                  backgroundColor: parentMoodColor.cardBg,
                  borderColor: parentMoodColor.primary,
                },
              ]}
              onPress={() => {
                haptics.impact('light');
                setFlavor(null);
              }}
              activeOpacity={0.7}
            >
              <Icon name="Shuffle" size={16} color={!draft.flavor ? parentMoodColor.primary : 'rgba(255,255,255,0.5)'} />
              <Text style={[
                styles.surpriseButtonText,
                !draft.flavor && { color: parentMoodColor.primary },
              ]}>
                Surprise me — any flavor
              </Text>
            </TouchableOpacity>

            {/* 2x2 Flavor Grid — inherits parent mood color */}
            <Container {...animProps} style={styles.cardGrid}>
              {flavorOptions.map((flavor) => (
                <MoodCard
                  key={flavor.id}
                  config={flavor}
                  selected={draft.flavor === flavor.id}
                  onSelect={() => handleFlavorSelect(flavor.id)}
                  moodColorOverride={draft.mood || undefined}
                />
              ))}
            </Container>
          </View>
        );
      }

      // Step 3 is handled separately outside ScrollView to avoid VirtualizedList nesting
      default:
        // Return empty View instead of null - Android crashes with null children in SafeAreaProvider
        return <View />;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top - 10, 0), backgroundColor: colors.background.primary }]}>
      {/* Mood color background tint */}
      {draft.mood && (
        <LinearGradient
          colors={[`${MOOD_COLORS[draft.mood].primary}1F`, 'transparent']}
          style={styles.backgroundTint}
        />
      )}

      {/* Initial load overlay */}
      <ScreenLoadingOverlay visible={!mounted} />

      {/* Scoring overlay */}
      <MoodScoringOverlay
        visible={isScoring}
        progress={scoringProgress}
        statusText="Finding your perfect reads..."
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Icon name="X" size={24} color={colors.text.primary} />
        </TouchableOpacity>

        <ProgressIndicator current={draft.currentStep} total={TOTAL_QUIZ_STEPS} mood={draft.mood} />

        {draft.currentStep > 1 && draft.mood ? (
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={[styles.skipText, { color: colors.text.tertiary }]}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.skipButton} />
        )}
      </View>

      {/* Mood chip header (screens 2 and 3) */}
      {draft.currentStep > 1 && draft.mood && (
        <View style={styles.moodChipContainer}>
          <MoodChip mood={draft.mood} onClear={handleClearMood} />
        </View>
      )}

      {/* Session indicator */}
      {hasActiveSession && draft.currentStep === 1 && (
        <View style={[styles.sessionBanner, { backgroundColor: 'rgba(243, 182, 12, 0.15)', borderColor: accentColor }]}>
          <Icon name="Clock" size={16} color={accentColor} />
          <Text style={[styles.sessionText, { color: accentColor }]}>
            You have an active session. Edit or start fresh.
          </Text>
        </View>
      )}

      {/* Content - Step 3 uses flex layout to avoid VirtualizedList nesting in ScrollView */}
      {draft.currentStep === 3 ? (
        // Step 3: SeedBookPicker with FlatList - no ScrollView wrapper
        <View style={[styles.content, styles.contentContainer]}>
          {/* Step indicator */}
          <Text style={[styles.stepIndicator, { color: colors.text.tertiary }]}>
            STEP {draft.currentStep} OF {TOTAL_QUIZ_STEPS} · {stepConfig.label}
          </Text>

          {/* Question */}
          <Text style={[styles.question, { color: colors.text.primary }]}>{stepConfig.question}</Text>
          <Text style={[styles.subtitle, { color: colors.text.tertiary }]}>{stepConfig.subtitle}</Text>

          {/* Seed Book Picker (contains FlatList) */}
          <View style={styles.seedBookContainer}>
            <SeedBookPicker
              selectedBookId={draft.seedBookId}
              onSelectBook={setSeedBook}
              mood={draft.mood}
            />
          </View>

          {/* Footer */}
          <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
            {/* FIND BOOKS button - enabled when book selected */}
            <AnimatedPressable
              onPress={handleNext}
              onPressIn={() => {
                buttonScale.value = withSpring(0.97, { damping: 55 });
              }}
              onPressOut={() => {
                buttonScale.value = withSpring(1, { damping: 55 });
              }}
              disabled={!draft.seedBookId}
              style={[
                styles.findBooksButton,
                { overflow: 'hidden' as const },
                draft.seedBookId && draft.mood
                  ? { backgroundColor: 'transparent' }
                  : { backgroundColor: draft.seedBookId ? '#FFFFFF' : 'rgba(255,255,255,0.1)' },
                buttonAnimatedStyle,
              ]}
            >
              {draft.seedBookId && draft.mood && (
                <LinearGradient
                  colors={[MOOD_COLORS[draft.mood].gradientStart, MOOD_COLORS[draft.mood].gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              )}
              <Text style={[
                styles.findBooksText,
                { color: draft.seedBookId ? '#FFFFFF' : 'rgba(255,255,255,0.3)' },
              ]}>
                FIND BOOKS
              </Text>
              <Icon
                name="Sparkles"
                size={18}
                color={draft.seedBookId ? '#FFFFFF' : 'rgba(255,255,255,0.3)'}
              />
            </AnimatedPressable>

            {/* Skip — surprise me link */}
            <TouchableOpacity onPress={handleSkip} style={styles.skipLinkContainer}>
              <Text style={[styles.skipLinkText, { color: colors.text.tertiary }]}>
                Skip — surprise me
              </Text>
            </TouchableOpacity>

            {/* Back button */}
            <TouchableOpacity onPress={handleBack} style={styles.backButtonCentered}>
              <Icon name="ArrowLeft" size={16} color={colors.text.tertiary} />
              <Text style={[styles.backText, { color: colors.text.tertiary }]}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        // Steps 1-2: ScrollView wrapper
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
                  { overflow: 'hidden' as const },
                  canProceed && draft.mood
                    ? { backgroundColor: 'transparent' }
                    : { backgroundColor: canProceed ? '#FFFFFF' : 'rgba(255,255,255,0.1)' },
                  draft.currentStep === 1 && styles.nextButtonFull,
                  buttonAnimatedStyle,
                ]}
              >
                {canProceed && draft.mood && (
                  <LinearGradient
                    colors={[MOOD_COLORS[draft.mood].gradientStart, MOOD_COLORS[draft.mood].gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <Text style={[styles.nextText, { color: canProceed ? '#FFFFFF' : 'rgba(255,255,255,0.3)' }]}>
                  {draft.currentStep === TOTAL_QUIZ_STEPS ? 'FIND BOOKS' : 'NEXT'}
                </Text>
                <Icon
                  name={draft.currentStep === TOTAL_QUIZ_STEPS ? 'Sparkles' : 'ArrowRight'}
                  size={18}
                  color={canProceed ? '#FFFFFF' : 'rgba(255,255,255,0.3)'}
                />
              </AnimatedPressable>
            </View>

            {!canProceed && draft.currentStep === 1 && (
              <Text style={[styles.hint, { color: colors.text.tertiary }]}>Select a mood to continue</Text>
            )}
          </View>
        </ScrollView>
      )}
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
  backgroundTint: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: 350,
    zIndex: 0,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
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
    justifyContent: 'center',
    gap: 8,
    marginTop: 'auto',
    paddingTop: 12,
  },
  progressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
    paddingTop: 0,
  },

  // Step
  stepIndicator: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(9),
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  question: {
    fontFamily: secretLibraryFonts.playfair.regularItalic,
    fontSize: scale(22),
    color: '#FFFFFF',
    marginBottom: 8,
    lineHeight: scale(22) * 1.15,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(9),
    marginBottom: 20,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 16,
  },

  // Mood chip header
  moodChipContainer: {
    paddingHorizontal: 24,
    marginBottom: spacing.xs,
  },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    gap: 10,
  },
  moodChipText: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(11),
    fontWeight: '500',
    letterSpacing: 1,
    color: '#FFFFFF',
  },
  moodChipRemove: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 16,
  },

  // Surprise me button
  surpriseButton: {
    width: '100%',
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    marginBottom: 12,
  },
  surpriseButtonSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  surpriseButtonText: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(11),
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  surpriseButtonTextSelected: {
    color: '#000000',
  },

  // 2x2 Card Grid
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },

  // Mood Card (2x2 grid item)
  moodCard: {
    width: '47.5%',
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  moodCardContent: {
    alignItems: 'flex-start' as const,
    gap: 6,
    position: 'relative' as const,
    zIndex: 1,
  },
  moodCardRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  moodCardSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  moodCardTitle: {
    fontFamily: secretLibraryFonts.playfair.regular,
    fontSize: scale(15),
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  moodCardDesc: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(10),
    lineHeight: scale(13),
  },

  // Toggle Row
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleLabel: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(12),
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 2,
  },
  toggleSublabel: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(10),
    color: 'rgba(255,255,255,0.3)',
  },
  toggle: {
    width: 44,
    height: 26,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 13,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: '#FFFFFF',
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  toggleThumbActive: {
    backgroundColor: '#000000',
    alignSelf: 'flex-end',
  },

  // Footer
  footer: {
    marginTop: spacing.md,
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

  // Seed book container (Step 3)
  seedBookContainer: {
    flex: 1,
    minHeight: 400,
  },

  // Step 3 footer styles
  findBooksButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  findBooksText: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(13),
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  skipLinkContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  skipLinkText: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(12),
    textDecorationLine: 'underline',
  },
  backButtonCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
});
