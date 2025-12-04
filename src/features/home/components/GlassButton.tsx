/**
 * src/features/home/components/GlassButton.tsx
 *
 * Glassmorphism button with gradient layers
 * Anima: rounded-[5.21px], complex gradient background
 */

import React, { useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../homeDesign';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (size / 402) * SCREEN_WIDTH;

interface GlassButtonProps {
  onPress: () => void;
  size?: number;
  width?: number;
  height?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  isPlayButton?: boolean;
  disabled?: boolean;
}

export function GlassButton({
  onPress,
  size,
  width: propWidth,
  height: propHeight,
  children,
  style,
  isPlayButton = false,
  disabled = false,
}: GlassButtonProps) {
  const width = propWidth || size || scale(52);
  const height = propHeight || size || scale(56);
  const borderRadius = scale(5.21);

  const handlePress = useCallback(() => {
    if (!disabled) {
      onPress();
    }
  }, [onPress, disabled]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.8}
      disabled={disabled}
      style={[
        styles.container,
        {
          width,
          height,
          borderRadius,
        },
        style,
      ]}
    >
      {/* Layer 1: Base dark fill */}
      <View
        style={[
          styles.layer,
          {
            backgroundColor: COLORS.controlButtonBg,
            borderRadius,
          },
        ]}
      />

      {/* Layer 2: Top gradient (dark at top) */}
      <LinearGradient
        colors={['rgba(0, 0, 0, 0.2)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
        style={[styles.layer, { borderRadius }]}
      />

      {/* Layer 3: Bottom gradient (light at bottom ~75-79%) */}
      <LinearGradient
        colors={['transparent', 'transparent', 'rgba(255, 255, 255, 0.2)']}
        locations={[0, 0.75, 0.79]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.layer, { borderRadius }]}
      />

      {/* Layer 4: Right side radial effect */}
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.1)', 'transparent']}
        start={{ x: 0.87, y: 0.5 }}
        end={{ x: 0.5, y: 0.5 }}
        style={[styles.layer, { borderRadius }]}
      />

      {/* Border highlight */}
      <View
        style={[
          styles.border,
          {
            borderRadius,
            borderColor: 'rgba(255, 255, 255, 0.5)',
            borderWidth: 1,
          },
        ]}
      />

      {/* Content (icon) */}
      <View style={styles.content}>{children}</View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
  border: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
