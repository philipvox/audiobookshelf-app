/**
 * src/shared/components/SkeuomorphicButton.tsx
 *
 * Reusable skeuomorphic button with directional lighting effects.
 * Uses react-native-svg for gradient overlays.
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
} from 'react-native-svg';
import {
  LightPosition,
  ButtonShape,
  LIGHTING_CONFIG,
  getRadialGradientCenter,
  getRadialGradientFocal,
  TOP_EDGE_GRADIENT,
  BOTTOM_EDGE_GRADIENT,
  RADIAL_HIGHLIGHT_GRADIENT,
  BORDER_STROKE,
  getGradientIds,
  getButtonDimensions,
  hexToRgba,
} from '@/shared/utils/skeuomorphicStyles';

interface SkeuomorphicButtonProps {
  /** Direction light comes from relative to button position */
  lightPosition: LightPosition;
  /** Button shape - circle or rounded rectangle */
  shape: ButtonShape;
  /** Size - number for square/circle, object for rectangle */
  size: number | { width: number; height: number };
  /** Custom border radius (overrides shape default) */
  borderRadius?: number;
  /** Cover image URL for mini-player button */
  coverImageUrl?: string | null;
  /** Button content (icon) */
  children: React.ReactNode;
  /** Tap handler */
  onPress?: () => void;
  /** Long press handler */
  onLongPress?: () => void;
  /** Press in handler for hold buttons */
  onPressIn?: () => void;
  /** Press out handler for hold buttons */
  onPressOut?: () => void;
  /** Disabled state */
  disabled?: boolean;
  /** Additional styles */
  style?: ViewStyle;
  /** Unique ID for gradient definitions */
  buttonId?: string;
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
  const dimensions = getButtonDimensions(shape, size);
  const { width, height } = dimensions;
  const borderRadius = customBorderRadius ?? dimensions.borderRadius;

  const gradientIds = getGradientIds(buttonId);
  const radialCenter = getRadialGradientCenter(lightPosition);
  const radialFocal = getRadialGradientFocal(lightPosition);

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
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

  return (
    <Animated.View
      style={[
        { transform: [{ scale: scaleAnim }] },
        style,
      ]}
    >
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
        {/* Base fill */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: LIGHTING_CONFIG.baseFill,
              borderRadius,
            },
          ]}
        />

        {/* Cover image (for mini-player) */}
        {coverImageUrl && (
          <Image
            source={coverImageUrl}
            style={[
              StyleSheet.absoluteFill,
              { borderRadius },
            ]}
            contentFit="cover"
            transition={150}
          />
        )}

        {/* Darkening overlay when cover is present */}
        {coverImageUrl && (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: 'rgba(0,0,0,0.3)',
                borderRadius,
              },
            ]}
          />
        )}

        {/* SVG Gradient Overlays */}
        <Svg
          width={width}
          height={height}
          style={[StyleSheet.absoluteFill, { borderRadius }]}
        >
          <Defs>
            {/* Top edge darken gradient */}
            <LinearGradient
              id={gradientIds.topEdge}
              x1={TOP_EDGE_GRADIENT.start.x}
              y1={TOP_EDGE_GRADIENT.start.y}
              x2={TOP_EDGE_GRADIENT.end.x}
              y2={TOP_EDGE_GRADIENT.end.y}
            >
              {TOP_EDGE_GRADIENT.stops.map((stop, i) => (
                <Stop
                  key={i}
                  offset={stop.offset}
                  stopColor={stop.color}
                  stopOpacity={stop.opacity}
                />
              ))}
            </LinearGradient>

            {/* Bottom edge lighten gradient */}
            <LinearGradient
              id={gradientIds.bottomEdge}
              x1={BOTTOM_EDGE_GRADIENT.start.x}
              y1={BOTTOM_EDGE_GRADIENT.start.y}
              x2={BOTTOM_EDGE_GRADIENT.end.x}
              y2={BOTTOM_EDGE_GRADIENT.end.y}
            >
              {BOTTOM_EDGE_GRADIENT.stops.map((stop, i) => (
                <Stop
                  key={i}
                  offset={stop.offset}
                  stopColor={stop.color}
                  stopOpacity={stop.opacity}
                />
              ))}
            </LinearGradient>

            {/* Directional radial highlight */}
            <RadialGradient
              id={gradientIds.radialHighlight}
              cx={radialCenter.cx}
              cy={radialCenter.cy}
              fx={radialFocal.fx}
              fy={radialFocal.fy}
              r="70%"
            >
              {RADIAL_HIGHLIGHT_GRADIENT.stops.map((stop, i) => (
                <Stop
                  key={i}
                  offset={stop.offset}
                  stopColor={stop.color}
                  stopOpacity={stop.opacity}
                />
              ))}
            </RadialGradient>
          </Defs>

          {/* Apply gradients based on shape */}
          {isCircle ? (
            <>
              <SvgCircle
                cx={width / 2}
                cy={height / 2}
                r={width / 2 - 0.5}
                fill={`url(#${gradientIds.topEdge})`}
              />
              <SvgCircle
                cx={width / 2}
                cy={height / 2}
                r={width / 2 - 0.5}
                fill={`url(#${gradientIds.bottomEdge})`}
              />
              <SvgCircle
                cx={width / 2}
                cy={height / 2}
                r={width / 2 - 0.5}
                fill={`url(#${gradientIds.radialHighlight})`}
              />
              {/* Border stroke */}
              <SvgCircle
                cx={width / 2}
                cy={height / 2}
                r={width / 2 - 0.5}
                fill="none"
                stroke={hexToRgba(BORDER_STROKE.color, BORDER_STROKE.opacity)}
                strokeWidth={BORDER_STROKE.width}
              />
            </>
          ) : (
            <>
              <Rect
                x={0}
                y={0}
                width={width}
                height={height}
                rx={borderRadius}
                ry={borderRadius}
                fill={`url(#${gradientIds.topEdge})`}
              />
              <Rect
                x={0}
                y={0}
                width={width}
                height={height}
                rx={borderRadius}
                ry={borderRadius}
                fill={`url(#${gradientIds.bottomEdge})`}
              />
              <Rect
                x={0}
                y={0}
                width={width}
                height={height}
                rx={borderRadius}
                ry={borderRadius}
                fill={`url(#${gradientIds.radialHighlight})`}
              />
              {/* Border stroke */}
              <Rect
                x={0.5}
                y={0.5}
                width={width - 1}
                height={height - 1}
                rx={borderRadius}
                ry={borderRadius}
                fill="none"
                stroke={hexToRgba(BORDER_STROKE.color, BORDER_STROKE.opacity)}
                strokeWidth={BORDER_STROKE.width}
              />
            </>
          )}
        </Svg>

        {/* Icon content with inner shadow effect */}
        <View style={styles.contentContainer}>
          {/* Shadow layer */}
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
          <View style={styles.iconLayer}>
            {children}
          </View>
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
    top: 2,
    left: 0,
  },
  iconLayer: {
    position: 'relative',
  },
});
