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
import { spacing, radius, scale, layout } from '@/shared/theme';
import { useThemeColors } from '@/shared/theme/themeStore';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface MoodDiscoveryCardProps {
  /** Compact mode for smaller spaces */
  compact?: boolean;
}

export function MoodDiscoveryCard({ compact = false }: MoodDiscoveryCardProps) {
  const navigation = useNavigation<any>();
  const themeColors = useThemeColors();
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
        <View style={styles.compactCard}>
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
          <View style={styles.arrowButton}>
            <ArrowRight size={16} color="#FFFFFF" strokeWidth={2} />
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
        <View style={styles.card}>
          {/* Left content */}
          <View style={styles.content}>
            <Text style={styles.title}>
              {hasSession ? 'Your current mood' : 'What sounds good?'}
            </Text>
            <Text style={styles.subtitle}>
              {hasSession
                ? `${formatTimeRemaining(timeRemaining)} · Tap to see matches`
                : 'Find your next listen'}
            </Text>
          </View>

          {/* Right arrow button - outlined */}
          <View style={styles.arrowButton}>
            <ArrowRight size={20} color="#FFFFFF" strokeWidth={2} />
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
    backgroundColor: 'rgba(255, 255, 255, 0.25)', // 25% opacity white
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: scale(16),
    fontWeight: '700',
    marginBottom: scale(2),
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: scale(13),
    color: 'rgba(255,255,255,0.7)',
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
    borderColor: 'rgba(255,255,255,0.4)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.25)', // 25% opacity white
  },
  compactText: {
    flex: 1,
  },
  compactTitle: {
    fontSize: scale(14),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  compactSubtitle: {
    fontSize: scale(11),
    marginTop: scale(1),
    color: 'rgba(255,255,255,0.7)',
  },
});
