/**
 * Cast icon button for the TopNav.
 * Shows native Cast device picker on press.
 * Hides itself when no Cast SDK is available.
 */

import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Cast } from 'lucide-react-native';
import { useCastStore } from '../stores/castStore';
import { useSecretLibraryColors } from '@/shared/theme/secretLibrary';

interface CastButtonProps {
  size?: number;
}

export function CastButton({ size = 16 }: CastButtonProps) {
  const colors = useSecretLibraryColors();
  const isAvailable = useCastStore((s) => s.isAvailable);
  const isConnected = useCastStore((s) => s.isConnected);
  const showPicker = useCastStore((s) => s.showPicker);

  if (!isAvailable) return null;

  return (
    <Pressable
      onPress={showPicker}
      style={[
        styles.circleButton,
        {
          borderColor: isConnected ? '#F3B60C' : colors.grayLine,
          backgroundColor: isConnected ? 'rgba(243,182,12,0.15)' : 'transparent',
        },
      ]}
    >
      <Cast
        size={size}
        color={isConnected ? '#F3B60C' : colors.black}
        strokeWidth={2}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
