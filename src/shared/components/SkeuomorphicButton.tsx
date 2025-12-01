/**
 * src/shared/components/SkeuomorphicButton.tsx
 *
 * Skeuomorphic button matching exact SVG design spec.
 * Uses react-native-svg for gradient overlays.
 *
 * Gradient layers (from SVG):
 * 1. Base fill: #262626
 * 2. Top edge darken: linear gradient black at 20% fill-opacity
 * 3. Bottom edge lighten: linear gradient white at 20% fill-opacity
 * 4. Radial highlight 1: from bottom-right at 10% fill-opacity
 * 5. Radial highlight 2: from top at 10% fill-opacity
 * 6. Border: 0.7px white at 50% opacity
 * 7. Icon with inner shadow: dy=2, blur=3, 35% black
 */

import React, { useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Animated,
  ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Rect,
  Circle as SvgCircle,
  G,
} from 'react-native-svg';

export type LightPosition = 'left' | 'center' | 'right';
export type ButtonShape = 'circle' | 'rounded-rect';

interface SkeuomorphicButtonProps {
  lightPosition: LightPosition;
  shape: ButtonShape;
  size: number | { width: number; height: number };
  borderRadius?: number;
  coverImageUrl?: string | null;
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  buttonId?: string;
}

/**
 * Get radial gradient configurations based on light position.
 * Values derived from exact SVG gradientTransform attributes.
 */
function getRadialConfig(position: LightPosition, width: number, height: number) {
  // From SVG: paint2_radial translates to bottom-right, paint3_radial to top-left area
  switch (position) {
    case 'left':
      // Light from upper-right (rewind button position)
      return {
        radial1: { cx: width * 0.95, cy: height * 0.95 },
        radial2: { cx: width * 0.7, cy: -height * 0.15 },
      };
    case 'center':
      // Light from above (center button position)
      return {
        radial1: { cx: width * 0.95, cy: height * 0.95 },
        radial2: { cx: width * 0.5, cy: -height * 0.15 },
      };
    case 'right':
      // Light from upper-left (play button - matches exact SVG)
      // SVG: translate(127, 136) for radial1, translate(37, -26.5) for radial2
      // Normalized to 128x136 viewBox
      return {
        radial1: { cx: width * 0.99, cy: height * 1.0 },
        radial2: { cx: width * 0.29, cy: -height * 0.195 },
      };
  }
}

export function SkeuomorphicButton({
  lightPosition,
  shape,
  size,
  borderRadius: customBorderRadius,
  coverImageUrl,
  children,
  onPress,
  onLongPress,
  onPressIn,
  onPressOut,
  disabled = false,
  style,
  buttonId = `btn-${Math.random().toString(36).substr(2, 9)}`,
}: SkeuomorphicButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Calculate dimensions
  const width = typeof size === 'number' ? size : size.width;
  const height = typeof size === 'number' ? size : size.height;
  const borderRadius = customBorderRadius ?? (shape === 'circle' ? width / 2 : 5);

  const radialConfig = getRadialConfig(lightPosition, width, height);

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
    onPressIn?.();
  }, [onPressIn, scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
    onPressOut?.();
  }, [onPressOut, scaleAnim]);

  const isCircle = shape === 'circle';

  // Unique gradient IDs
  const topGradId = `${buttonId}-top`;
  const bottomGradId = `${buttonId}-bottom`;
  const radial1Id = `${buttonId}-r1`;
  const radial2Id = `${buttonId}-r2`;

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        delayLongPress={300}
        style={[
          styles.button,
          {
            width,
            height,
            borderRadius,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        {/* Layer 1: Base fill #262626 */}
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: '#262626', borderRadius },
          ]}
        />

        {/* Cover image (for mini-player) */}
        {coverImageUrl && (
          <>
            <Image
              source={coverImageUrl}
              style={[StyleSheet.absoluteFill, { borderRadius }]}
              contentFit="cover"
              transition={150}
            />
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: 'rgba(0,0,0,0.4)', borderRadius },
              ]}
            />
          </>
        )}

        {/* SVG Gradient Overlays - matching exact SVG spec */}
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          <Defs>
            {/*
              paint0_linear: Top edge darken
              x1="63.5957" y1="24" x2="63.5957" y2="-6.5"
              stops: 0.480769 -> opacity 0, 0.65 -> opacity 1
            */}
            <LinearGradient
              id={topGradId}
              x1="50%"
              y1={`${(24 / 135.532) * 100}%`}
              x2="50%"
              y2={`${(-6.5 / 135.532) * 100}%`}
            >
              <Stop offset="0.48" stopColor="#000000" stopOpacity="0" />
              <Stop offset="0.65" stopColor="#000000" stopOpacity="1" />
            </LinearGradient>

            {/*
              paint1_linear: Bottom edge lighten
              x1="63.5957" y1="112.5" x2="63.5957" y2="135.532"
              stops: 0.399038 -> opacity 0, 0.903846 -> white
            */}
            <LinearGradient
              id={bottomGradId}
              x1="50%"
              y1={`${(112.5 / 135.532) * 100}%`}
              x2="50%"
              y2="100%"
            >
              <Stop offset="0.4" stopColor="#FFFFFF" stopOpacity="0" />
              <Stop offset="0.9" stopColor="#FFFFFF" stopOpacity="1" />
            </LinearGradient>

            {/*
              paint2_radial: Bottom-right radial
              translate(127, 136) rotate(164.83) scale(147.127 70.455)
            */}
            <RadialGradient
              id={radial1Id}
              cx={radialConfig.radial1.cx}
              cy={radialConfig.radial1.cy}
              r={Math.max(width, height) * 1.15}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
            </RadialGradient>

            {/*
              paint3_radial: Top radial
              translate(37, -26.5) rotate(86.0884) scale(117.273 235.111)
            */}
            <RadialGradient
              id={radial2Id}
              cx={radialConfig.radial2.cx}
              cy={radialConfig.radial2.cy}
              r={Math.max(width, height) * 0.9}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
            </RadialGradient>
          </Defs>

          {isCircle ? (
            <G>
              {/* Layer 2: Top edge darken at 20% fill-opacity */}
              <SvgCircle
                cx={width / 2}
                cy={height / 2}
                r={width / 2 - 0.35}
                fill={`url(#${topGradId})`}
                fillOpacity={0.2}
              />
              {/* Layer 3: Bottom edge lighten at 20% fill-opacity */}
              <SvgCircle
                cx={width / 2}
                cy={height / 2}
                r={width / 2 - 0.35}
                fill={`url(#${bottomGradId})`}
                fillOpacity={0.2}
              />
              {/* Layer 4: Radial 1 at 10% fill-opacity */}
              <SvgCircle
                cx={width / 2}
                cy={height / 2}
                r={width / 2 - 0.35}
                fill={`url(#${radial1Id})`}
                fillOpacity={0.1}
              />
              {/* Layer 5: Radial 2 at 10% fill-opacity */}
              <SvgCircle
                cx={width / 2}
                cy={height / 2}
                r={width / 2 - 0.35}
                fill={`url(#${radial2Id})`}
                fillOpacity={0.1}
              />
              {/* Layer 6: Border - 0.7px white at 50% opacity */}
              <SvgCircle
                cx={width / 2}
                cy={height / 2}
                r={width / 2 - 0.35}
                fill="none"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth={0.7}
              />
            </G>
          ) : (
            <G>
              {/* Layer 2: Top edge darken at 20% fill-opacity */}
              <Rect
                x={0}
                y={0}
                width={width}
                height={height}
                rx={borderRadius}
                ry={borderRadius}
                fill={`url(#${topGradId})`}
                fillOpacity={0.2}
              />
              {/* Layer 3: Bottom edge lighten at 20% fill-opacity */}
              <Rect
                x={0}
                y={0}
                width={width}
                height={height}
                rx={borderRadius}
                ry={borderRadius}
                fill={`url(#${bottomGradId})`}
                fillOpacity={0.2}
              />
              {/* Layer 4: Radial 1 at 10% fill-opacity */}
              <Rect
                x={0}
                y={0}
                width={width}
                height={height}
                rx={borderRadius}
                ry={borderRadius}
                fill={`url(#${radial1Id})`}
                fillOpacity={0.1}
              />
              {/* Layer 5: Radial 2 at 10% fill-opacity */}
              <Rect
                x={0}
                y={0}
                width={width}
                height={height}
                rx={borderRadius}
                ry={borderRadius}
                fill={`url(#${radial2Id})`}
                fillOpacity={0.1}
              />
              {/* Layer 6: Border - 0.7px white at 50% opacity */}
              <Rect
                x={0.35}
                y={0.35}
                width={width - 0.7}
                height={height - 0.7}
                rx={borderRadius}
                ry={borderRadius}
                fill="none"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth={0.7}
              />
            </G>
          )}
        </Svg>

        {/* Layer 7: Icon with inner shadow effect */}
        {/* SVG filter: feOffset dy="2", feGaussianBlur stdDeviation="1.5", 35% black */}
        <View style={styles.contentContainer}>
          {/* Shadow layer - 2px down offset, 35% black */}
          <View style={styles.shadowLayer}>
            {React.Children.map(children, child => {
              if (React.isValidElement(child)) {
                return React.cloneElement(child as React.ReactElement<any>, {
                  color: 'rgba(0,0,0,0.35)',
                });
              }
              return null;
            })}
          </View>
          {/* Main icon */}
          <View style={styles.iconLayer}>{children}</View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shadowLayer: {
    position: 'absolute',
    top: 2, // dy=2 from SVG filter
    left: 0,
  },
  iconLayer: {
    position: 'relative',
  },
});
