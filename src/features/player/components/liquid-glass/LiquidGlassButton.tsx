/**
 * src/shared/components/LiquidGlass/LiquidGlassButton.tsx
 * Liquid Glass button with press animation
 */

import React from 'react';
import { StyleSheet, Text, ViewStyle, TextStyle } from 'react-native';
import {
  Canvas,
  RoundedRect,
  BackdropBlur,
  LinearGradient,
  vec,
  Group,
} from '@shopify/react-native-skia';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

interface LiquidGlassButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  tint?: 'light' | 'dark';
  style?: ViewStyle;
  textStyle?: TextStyle;
  rotation?: number;
}

export function LiquidGlassButton({
  title,
  onPress,
  variant = 'primary',
  tint = 'light',
  style,
  textStyle,
  rotation = 0,
}: LiquidGlassButtonProps) {
  const pressed = useSharedValue(false);
  const scale = useSharedValue(1);

  const isLight = tint === 'light';
  const isPrimary = variant === 'primary';

  // Colors
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

  const highlightColor = isPrimary
    ? isLight
      ? 'rgba(255,255,255,0.15)'
      : 'rgba(255,255,255,0.3)'
    : isLight
    ? 'rgba(255,255,255,0.5)'
    : 'rgba(255,255,255,0.2)';

  const gesture = Gesture.Tap()
    .onBegin(() => {
      pressed.value = true;
      scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
    })
    .onFinalize((_, success) => {
      pressed.value = false;
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      if (success) {
        onPress();
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation}deg` },
    ],
  }));

  const width = isPrimary ? 140 : 110;
  const height = isPrimary ? 56 : 48;
  const borderRadius = height / 2;

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          styles.container,
          { width, height },
          style,
          animatedStyle,
        ]}
      >
        <Canvas style={StyleSheet.absoluteFill}>
          {isPrimary ? (
            // Primary: solid with subtle gradient
            <Group>
              <RoundedRect
                x={0}
                y={0}
                width={width}
                height={height}
                r={borderRadius}
                color={bgColor}
              />
              {/* Top highlight */}
              <RoundedRect
                x={2}
                y={2}
                width={width - 4}
                height={height / 2}
                r={borderRadius - 2}
              >
                <LinearGradient
                  start={vec(0, 0)}
                  end={vec(0, height / 2)}
                  colors={[highlightColor, 'transparent']}
                />
              </RoundedRect>
            </Group>
          ) : (
            // Secondary: glass effect
            <BackdropBlur
              blur={10}
              clip={{ x: 0, y: 0, width, height }}
            >
              <RoundedRect
                x={0}
                y={0}
                width={width}
                height={height}
                r={borderRadius}
                color={bgColor}
              />
              {/* Top highlight */}
              <RoundedRect
                x={2}
                y={2}
                width={width - 4}
                height={height / 2}
                r={borderRadius - 2}
              >
                <LinearGradient
                  start={vec(0, 0)}
                  end={vec(0, height / 2)}
                  colors={[highlightColor, 'transparent']}
                />
              </RoundedRect>
              {/* Border */}
              <RoundedRect
                x={0.75}
                y={0.75}
                width={width - 1.5}
                height={height - 1.5}
                r={borderRadius - 0.75}
                style="stroke"
                strokeWidth={1}
                color={isLight ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)'}
              />
            </BackdropBlur>
          )}
        </Canvas>

        <Text style={[styles.text, { color: textColor }, textStyle]}>
          {title}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});
