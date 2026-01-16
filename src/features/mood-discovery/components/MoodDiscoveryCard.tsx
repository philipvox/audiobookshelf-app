/**
 * src/features/mood-discovery/components/MoodDiscoveryCard.tsx
 *
 * Simple entry point card for mood discovery.
 * Clean design: "What sounds good?" with arrow button.
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
  useSharedValue,
  FadeIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { ArrowRight } from 'lucide-react-native';
import {
  useHasActiveSession,
  useActiveSession,
  formatTimeRemaining,
} from '../stores/moodSessionStore';
import { MOODS, MoodConfig } from '../types';
import { Icon } from '@/shared/components/Icon';
import { spacing, radius, scale, layout, useTheme } from '@/shared/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface MoodDiscoveryCardProps {
  /** Compact mode for smaller spaces */
  compact?: boolean;
}

export function MoodDiscoveryCard({ compact = false }: MoodDiscoveryCardProps) {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const hasSession = useHasActiveSession();
  const session = useActiveSession();

  const scaleValue = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (hasSession) {
      navigation.navigate('MoodResults');
    } else {
      navigation.navigate('MoodDiscovery');
    }
  };

  const handlePressIn = () => {
    scaleValue.value = withSpring(0.98, { damping: 15, stiffness: 200 });
  };

  const handlePressOut = () => {
    scaleValue.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  // Get active mood config for display
  const activeMoodConfig: MoodConfig | null = session?.mood
    ? MOODS.find((m) => m.id === session.mood) || null
    : null;

  // Calculate time remaining
  const timeRemaining = session ? session.expiresAt - Date.now() : 0;

  if (compact) {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.compactContainer, animatedStyle]}
      >
        <View style={[styles.compactCard, { backgroundColor: colors.background.tertiary }]}>
          <View style={styles.compactText}>
            <Text style={[styles.compactTitle, { color: colors.text.primary }]}>
              {hasSession ? 'Your Mood' : 'What sounds good?'}
            </Text>
            {hasSession && (
              <Text style={[styles.compactSubtitle, { color: colors.text.secondary }]}>
                {formatTimeRemaining(timeRemaining)}
              </Text>
            )}
          </View>
          <View style={[styles.arrowButton, { borderColor: colors.border.default }]}>
            <ArrowRight size={16} color={colors.text.primary} strokeWidth={2} />
          </View>
        </View>
      </AnimatedPressable>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={animatedStyle}
      >
        <View style={[styles.card, { backgroundColor: colors.background.tertiary }]}>
          {/* Left content */}
          <View style={styles.content}>
            <Text style={[styles.title, { color: colors.text.primary }]}>
              {hasSession ? 'Your current mood' : 'What sounds good?'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
              {hasSession
                ? `${formatTimeRemaining(timeRemaining)} · Tap to see matches`
                : 'Find your next listen'}
            </Text>
          </View>

          {/* Right arrow button - outlined */}
          <View style={[styles.arrowButton, { borderColor: colors.border.default }]}>
            <ArrowRight size={20} color={colors.text.primary} strokeWidth={2} />
          </View>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: layout.screenPaddingH,
    marginBottom: spacing.lg,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
    borderRadius: radius.lg,
    // backgroundColor set dynamically via colors.background.tertiary
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: scale(16),
    fontWeight: '700',
    marginBottom: scale(2),
    // color set dynamically via colors.text.primary
  },
  subtitle: {
    fontSize: scale(13),
    // color set dynamically via colors.text.secondary
  },
  arrowButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.md,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    // borderColor set dynamically via colors.border.default
  },

  // Compact styles
  compactContainer: {
    paddingHorizontal: layout.screenPaddingH,
    marginVertical: spacing.sm,
  },
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    // backgroundColor set dynamically via colors.background.tertiary
  },
  compactText: {
    flex: 1,
  },
  compactTitle: {
    fontSize: scale(14),
    fontWeight: '600',
    // color set dynamically via colors.text.primary
  },
  compactSubtitle: {
    fontSize: scale(11),
    marginTop: scale(1),
    // color set dynamically via colors.text.secondary
  },
});
