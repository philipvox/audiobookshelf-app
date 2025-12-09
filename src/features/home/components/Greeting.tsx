/**
 * src/features/home/components/Greeting.tsx
 *
 * Time-based greeting component for Home screen
 * Shows personalized greeting based on time of day and username
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { COLORS } from '../homeDesign';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (size / 402) * SCREEN_WIDTH;

interface GreetingProps {
  username?: string | null;
}

/**
 * Get time-based greeting
 * - 5am - 12pm: "Good morning"
 * - 12pm - 5pm: "Good afternoon"
 * - 5pm - 9pm: "Good evening"
 * - 9pm - 5am: "Good night"
 */
function getGreeting(): string {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return 'Good morning';
  } else if (hour >= 12 && hour < 17) {
    return 'Good afternoon';
  } else if (hour >= 17 && hour < 21) {
    return 'Good evening';
  } else {
    return 'Good night';
  }
}

export function Greeting({ username }: GreetingProps) {
  const greeting = getGreeting();
  const displayName = username || 'there';

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        {greeting}, <Text style={styles.name}>{displayName}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: scale(20),
    paddingTop: scale(8),
    paddingBottom: scale(16),
  },
  text: {
    fontSize: scale(22),
    fontWeight: '300',
    color: COLORS.textSecondary,
    letterSpacing: -0.3,
  },
  name: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
});
