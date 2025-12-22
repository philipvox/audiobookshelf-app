/**
 * src/features/mood-discovery/components/MoodDiscoveryCard.tsx
 *
 * Prominent entry point card for mood discovery.
 * Shows on Browse screen to invite users to set their mood.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  FadeIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import {
  useHasActiveSession,
  useActiveSession,
  formatTimeRemaining,
} from '../stores/moodSessionStore';
import { MOODS, MoodConfig } from '../types';
import { Icon } from '@/shared/components/Icon';
import { colors, spacing, radius } from '@/shared/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface MoodDiscoveryCardProps {
  /** Compact mode for smaller spaces */
  compact?: boolean;
}

export function MoodDiscoveryCard({ compact = false }: MoodDiscoveryCardProps) {
  const navigation = useNavigation<any>();
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
    scaleValue.value = withSpring(0.97, { damping: 15, stiffness: 200 });
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
        <LinearGradient
          colors={['rgba(243, 182, 12, 0.15)', 'rgba(243, 182, 12, 0.05)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.compactGradient}
        >
          <View style={styles.compactIconContainer}>
            {hasSession && activeMoodConfig ? (
              <Icon
                name={activeMoodConfig.icon}
                size={18}
                color={colors.accent}
                set={activeMoodConfig.iconSet as any}
              />
            ) : (
              <Icon
                name="Wand2"
                size={20}
                color={colors.accent}
              />
            )}
          </View>
          <View style={styles.compactText}>
            <Text style={styles.compactTitle}>
              {hasSession ? 'Your Mood' : 'What sounds good?'}
            </Text>
            {hasSession && (
              <Text style={styles.compactSubtitle}>
                {formatTimeRemaining(timeRemaining)}
              </Text>
            )}
          </View>
          <Icon
            name="ChevronRight"
            size={18}
            color={colors.accent}
          />
        </LinearGradient>
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
        <LinearGradient
          colors={[
            'rgba(243, 182, 12, 0.2)',
            'rgba(243, 182, 12, 0.08)',
            'rgba(0, 0, 0, 0)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* Left content */}
          <View style={styles.content}>
            <View style={styles.iconRow}>
              {hasSession && activeMoodConfig ? (
                <View style={styles.iconCircle}>
                  <Icon
                    name={activeMoodConfig.icon}
                    size={18}
                    color={colors.accent}
                    set={activeMoodConfig.iconSet as any}
                  />
                </View>
              ) : (
                <>
                  <View style={styles.iconCircle}>
                    <Icon name="Wand2" size={18} color={colors.accent} />
                  </View>
                  <View style={styles.iconCircle}>
                    <Icon name="Zap" size={18} color={colors.accent} />
                  </View>
                  <View style={styles.iconCircle}>
                    <Icon name="Moon" size={18} color={colors.accent} />
                  </View>
                </>
              )}
            </View>

            <Text style={styles.title}>
              {hasSession ? 'Your current mood' : 'What sounds good?'}
            </Text>

            <Text style={styles.subtitle}>
              {hasSession
                ? `${formatTimeRemaining(timeRemaining)} · Tap to see matches`
                : 'Find your next perfect listen based on how you feel right now'}
            </Text>
          </View>

          {/* Right arrow */}
          <View style={styles.arrowContainer}>
            <Icon
              name="ArrowRightCircle"
              size={28}
              color={colors.accent}
            />
          </View>
        </LinearGradient>
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(243, 182, 12, 0.3)',
  },
  content: {
    flex: 1,
  },
  iconRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(243, 182, 12, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  arrowContainer: {
    marginLeft: spacing.md,
  },

  // Compact styles
  compactContainer: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
  },
  compactGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(243, 182, 12, 0.2)',
  },
  compactIconContainer: {
    flexDirection: 'row',
    gap: 4,
    marginRight: spacing.sm,
  },
  compactText: {
    flex: 1,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  compactSubtitle: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 1,
  },
});
