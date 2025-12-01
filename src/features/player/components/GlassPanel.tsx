/**
 * src/features/player/components/GlassPanel.tsx
 * 
 * Base panel with glass morphism styling matching the HTML mockup.
 * Layers: background → dark shadow → light highlight → border
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const PANEL_RADIUS = 5;
const BASE_COLOR = '#262626';

export type LightingVariant = 'display' | 'diagonal-left' | 'vertical' | 'diagonal-right';

interface GlassPanelProps {
  children: React.ReactNode;
  width: number;
  height: number;
  variant?: LightingVariant;
  style?: ViewStyle;
}

export function GlassPanel({
  children,
  width,
  height,
  variant = 'display',
  style,
}: GlassPanelProps) {
  return (
    <View style={[styles.container, { width, height }, style]}>
      {/* Base background */}
      <View style={[styles.layer, styles.base]} />

      {/* Dark shadow at top */}
      <LinearGradient
        colors={
          variant === 'display'
            ? ['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.1)', 'transparent']
            : ['rgba(0,0,0,0.25)', 'transparent']
        }
        locations={variant === 'display' ? [0, 0.05, 0.18] : [0, 0.2]}
        style={styles.layer}
        pointerEvents="none"
      />

      {/* Light highlight at bottom */}
      <LinearGradient
        colors={['transparent', variant === 'display' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.18)']}
        locations={variant === 'display' ? [0.98, 1] : [0.92, 1]}
        style={styles.layer}
        pointerEvents="none"
      />

      {/* Radial-like glow layers based on variant */}
      <RadialGlowLayers variant={variant} />

      {/* Border */}
      <View style={styles.border} pointerEvents="none" />

      {/* Content */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

function RadialGlowLayers({ variant }: { variant: LightingVariant }) {
  switch (variant) {
    case 'display':
      return (
        <>
          {/* Top-left glow */}
          <LinearGradient
            colors={['rgba(255,255,255,0.04)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.5, y: 0.3 }}
            style={styles.layer}
            pointerEvents="none"
          />
          {/* Bottom-right glow */}
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.04)']}
            start={{ x: 0.5, y: 0.7 }}
            end={{ x: 1, y: 1 }}
            style={styles.layer}
            pointerEvents="none"
          />
        </>
      );
    case 'diagonal-left': // Rewind - light from top-right
      return (
        <>
          <LinearGradient
            colors={['rgba(255,255,255,0.08)', 'transparent']}
            start={{ x: 1, y: 0 }}
            end={{ x: 0.3, y: 0.5 }}
            style={styles.layer}
            pointerEvents="none"
          />
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.08)']}
            start={{ x: 0.7, y: 0.5 }}
            end={{ x: 0, y: 1 }}
            style={styles.layer}
            pointerEvents="none"
          />
        </>
      );
    case 'vertical': // Fast forward - light from top center
      return (
        <>
          <LinearGradient
            colors={['rgba(255,255,255,0.08)', 'transparent']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 0.4 }}
            style={styles.layer}
            pointerEvents="none"
          />
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.08)']}
            start={{ x: 0.5, y: 0.6 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.layer}
            pointerEvents="none"
          />
        </>
      );
    case 'diagonal-right': // Play - light from top-left
      return (
        <>
          <LinearGradient
            colors={['rgba(255,255,255,0.08)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.7, y: 0.5 }}
            style={styles.layer}
            pointerEvents="none"
          />
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.08)']}
            start={{ x: 0.3, y: 0.5 }}
            end={{ x: 1, y: 1 }}
            style={styles.layer}
            pointerEvents="none"
          />
        </>
      );
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  container: {
    borderRadius: PANEL_RADIUS,
    overflow: 'hidden',
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: PANEL_RADIUS,
  },
  base: {
    backgroundColor: BASE_COLOR,
  },
  border: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: PANEL_RADIUS,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
});