/**
 * src/shared/components/LiquidGlass/LiquidGlassFallback.tsx
 * Fallback components using expo-blur for older devices or when Skia unavailable
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import Slider from '@react-native-community/slider';

// Fallback LiquidGlassView
interface LiquidGlassViewFallbackProps {
  width: number;
  height: number;
  borderRadius?: number;
  tint?: 'light' | 'dark';
  children?: React.ReactNode;
  style?: ViewStyle;
}

export function LiquidGlassViewFallback({
  width,
  height,
  borderRadius = 24,
  tint = 'light',
  children,
  style,
}: LiquidGlassViewFallbackProps) {
  const isLight = tint === 'light';

  return (
    <View
      style={[
        styles.glassContainer,
        { width, height, borderRadius },
        style,
      ]}
    >
      <BlurView
        intensity={40}
        tint={tint}
        style={[StyleSheet.absoluteFill, { borderRadius }]}
      />
      <LinearGradient
        colors={[
          isLight ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)',
          'transparent',
        ]}
        style={[styles.highlight, { borderRadius }]}
      />
      <View
        style={[
          styles.border,
          {
            borderRadius,
            borderColor: isLight
              ? 'rgba(255,255,255,0.4)'
              : 'rgba(255,255,255,0.15)',
          },
        ]}
      />
      {children}
    </View>
  );
}

// Fallback LiquidGlassSlider
interface LiquidGlassSliderFallbackProps {
  value: number;
  onValueChange: (value: number) => void;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  tint?: 'light' | 'dark';
  labels?: { value: number; label: string }[];
}

export function LiquidGlassSliderFallback({
  value,
  onValueChange,
  minimumValue = 0,
  maximumValue = 1,
  step = 0.05,
  tint = 'light',
  labels,
}: LiquidGlassSliderFallbackProps) {
  const isLight = tint === 'light';
  const trackColor = isLight ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.4)';
  const trackBg = isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.15)';
  const thumbColor = isLight ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.3)';
  const labelColor = isLight ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.5)';

  return (
    <View style={styles.sliderContainer}>
      <Slider
        style={styles.slider}
        value={value}
        onValueChange={onValueChange}
        minimumValue={minimumValue}
        maximumValue={maximumValue}
        step={step}
        minimumTrackTintColor={trackColor}
        maximumTrackTintColor={trackBg}
        thumbTintColor={thumbColor}
      />
      {labels && (
        <View style={styles.labelsRow}>
          {labels.map((item) => (
            <Text key={item.value} style={[styles.label, { color: labelColor }]}>
              {item.label}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

// Fallback LiquidGlassButton
interface LiquidGlassButtonFallbackProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  tint?: 'light' | 'dark';
  style?: ViewStyle;
  textStyle?: TextStyle;
  rotation?: number;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function LiquidGlassButtonFallback({
  title,
  onPress,
  variant = 'primary',
  tint = 'light',
  style,
  textStyle,
  rotation = 0,
}: LiquidGlassButtonFallbackProps) {
  const scale = useSharedValue(1);

  const isLight = tint === 'light';
  const isPrimary = variant === 'primary';

  const bgColor = isPrimary
    ? isLight
      ? 'rgba(0,0,0,0.85)'
      : 'rgba(255,255,255,0.9)'
    : isLight
    ? 'rgba(0,0,0,0.08)'
    : 'rgba(255,255,255,0.15)';

  const textColor = isPrimary
    ? isLight
      ? '#fff'
      : '#000'
    : isLight
    ? 'rgba(0,0,0,0.9)'
    : 'rgba(255,255,255,0.95)';

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotation}deg` }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
      style={[
        styles.button,
        isPrimary ? styles.buttonPrimary : styles.buttonSecondary,
        { backgroundColor: bgColor },
        style,
        animatedStyle,
      ]}
    >
      <Text style={[styles.buttonText, { color: textColor }, textStyle]}>
        {title}
      </Text>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  // Glass View
  glassContainer: {
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  border: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
  },

  // Slider
  sliderContainer: {
    width: '100%',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Button
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonPrimary: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 100,
  },
  buttonSecondary: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 100,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
