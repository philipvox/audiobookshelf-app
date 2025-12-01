/**
 * src/features/player/components/GradientPanel.tsx
 *
 * Glass-like panel with gradient overlays matching the design
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RADIUS } from '../constants';

type GradientVariant = 'display' | 'rewind' | 'fastforward' | 'play';

interface GradientPanelProps {
  variant: GradientVariant;
  style?: ViewStyle;
  children?: React.ReactNode;
}

export function GradientPanel({ variant, style, children }: GradientPanelProps) {
  return (
    <View style={[styles.container, style]}>
      {/* Base background */}
      <View style={styles.base} />

      {/* Dark shadow at top */}
      <LinearGradient
        colors={
          variant === 'display'
            ? ['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.1)', 'transparent']
            : ['rgba(0,0,0,0.25)', 'transparent']
        }
        locations={variant === 'display' ? [0, 0.05, 0.18] : [0, 0.2]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.layer}
      />

      {/* Light highlight at bottom */}
      <LinearGradient
        colors={
          variant === 'display'
            ? ['transparent', 'rgba(255,255,255,0.08)']
            : ['transparent', 'rgba(255,255,255,0.18)']
        }
        locations={variant === 'display' ? [0.98, 1] : [0.92, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.layer}
      />

      {/* Radial gradient effects (approximated with linear gradients) */}
      {variant === 'display' && (
        <>
          {/* Top-left area glow */}
          <LinearGradient
            colors={['rgba(255,255,255,0.04)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0.7 }}
            style={styles.layer}
          />
          {/* Bottom-right area glow */}
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.04)']}
            start={{ x: 0, y: 0.3 }}
            end={{ x: 1, y: 1 }}
            style={styles.layer}
          />
        </>
      )}

      {variant === 'rewind' && (
        <>
          {/* Top-right diagonal glow */}
          <LinearGradient
            colors={['rgba(255,255,255,0.08)', 'transparent']}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.layer}
          />
          {/* Bottom-left diagonal glow */}
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.08)']}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.layer}
          />
        </>
      )}

      {variant === 'fastforward' && (
        <>
          {/* Top center glow */}
          <LinearGradient
            colors={['rgba(255,255,255,0.08)', 'transparent', 'transparent']}
            locations={[0, 0.4, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.layer}
          />
          {/* Bottom center glow */}
          <LinearGradient
            colors={['transparent', 'transparent', 'rgba(255,255,255,0.08)']}
            locations={[0, 0.6, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.layer}
          />
        </>
      )}

      {variant === 'play' && (
        <>
          {/* Top-left diagonal glow */}
          <LinearGradient
            colors={['rgba(255,255,255,0.08)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.layer}
          />
          {/* Bottom-right diagonal glow */}
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.08)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.layer}
          />
        </>
      )}

      {/* Border layer */}
      <View style={[styles.layer, styles.border, getBorderStyle(variant)]} />

      {/* Content */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

function getBorderStyle(variant: GradientVariant): ViewStyle {
  // All variants have a subtle white border with varying opacity
  return {
    borderWidth: 0.5,
    borderColor: variant === 'display'
      ? 'rgba(255,255,255,0.3)'
      : 'rgba(255,255,255,0.25)',
  };
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    borderRadius: RADIUS,
    overflow: 'hidden',
  },
  base: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#262626',
    borderRadius: RADIUS,
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: RADIUS,
  },
  border: {
    borderRadius: RADIUS,
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
});
