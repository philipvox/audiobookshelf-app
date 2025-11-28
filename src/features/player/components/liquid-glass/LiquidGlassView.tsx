/**
 * src/shared/components/LiquidGlass/LiquidGlassView.tsx
 * Reusable Liquid Glass container component
 */

import React, { useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import {
  Canvas,
  RoundedRect,
  BackdropBlur,
  BackdropFilter,
  Fill,
  Group,
  Paint,
  Shader,
  vec,
  LinearGradient,
  Blur,
} from '@shopify/react-native-skia';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

interface LiquidGlassViewProps {
  width: number;
  height: number;
  borderRadius?: number;
  blurAmount?: number;
  tint?: 'light' | 'dark';
  interactive?: boolean;
  children?: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}

export function LiquidGlassView({
  width,
  height,
  borderRadius = 24,
  blurAmount = 12,
  tint = 'light',
  interactive = false,
  children,
  style,
  onPress,
}: LiquidGlassViewProps) {
  const pressed = useSharedValue(false);
  const scale = useSharedValue(1);

  const isLight = tint === 'light';
  const fillColor = isLight ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.2)';
  const borderColor = isLight ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)';
  const highlightColor = isLight ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)';

  const gesture = useMemo(() => {
    if (!interactive) return null;
    
    return Gesture.Tap()
      .onBegin(() => {
        pressed.value = true;
        scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
      })
      .onFinalize(() => {
        pressed.value = false;
        scale.value = withSpring(1, { damping: 15, stiffness: 400 });
        if (onPress) onPress();
      });
  }, [interactive, onPress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glassContent = (
    <Animated.View style={[styles.container, { width, height }, style, animatedStyle]}>
      <Canvas style={StyleSheet.absoluteFill}>
        {/* Backdrop blur */}
        <BackdropBlur blur={blurAmount} clip={{ x: 0, y: 0, width, height }}>
          {/* Base fill */}
          <RoundedRect
            x={0}
            y={0}
            width={width}
            height={height}
            r={borderRadius}
            color={fillColor}
          />
        </BackdropBlur>

        {/* Top highlight gradient */}
        <Group clip={{ x: 0, y: 0, width, height }}>
          <RoundedRect x={0} y={0} width={width} height={height * 0.5} r={borderRadius}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(0, height * 0.5)}
              colors={[highlightColor, 'transparent']}
            />
          </RoundedRect>
        </Group>

        {/* Border */}
        <RoundedRect
          x={0.75}
          y={0.75}
          width={width - 1.5}
          height={height - 1.5}
          r={borderRadius - 0.75}
          color="transparent"
          style="stroke"
          strokeWidth={1.5}
        >
          <LinearGradient
            start={vec(0, 0)}
            end={vec(width, height)}
            colors={[borderColor, 'transparent', borderColor]}
          />
        </RoundedRect>
      </Canvas>

      {/* Content */}
      <View style={styles.content}>{children}</View>
    </Animated.View>
  );

  if (gesture) {
    return <GestureDetector gesture={gesture}>{glassContent}</GestureDetector>;
  }

  return glassContent;
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  content: {
    flex: 1,
  },
});
