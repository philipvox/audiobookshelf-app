/**
 * src/shared/components/LoadingSpinner.tsx
 *
 * Reusable loading spinner component with optional text message.
 * Used throughout the app for loading states.
 */

import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

interface LoadingSpinnerProps {
  text?: string;
  size?: 'small' | 'large';
}

/**
 * Display a loading spinner with optional text message
 */
export function LoadingSpinner({ text, size = 'large' }: LoadingSpinnerProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color="#007AFF" />
      {text && <Text style={styles.text}>{text}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  text: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
});
