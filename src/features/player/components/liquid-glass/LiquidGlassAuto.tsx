/**
 * src/shared/components/LiquidGlass/LiquidGlassAuto.tsx
 * Auto-selecting wrapper that uses Skia when available, fallback otherwise
 */

import React from 'react';
import { Platform } from 'react-native';

// Check if Skia is available
let skiaAvailable = false;
try {
  require('@shopify/react-native-skia');
  skiaAvailable = true;
} catch {
  skiaAvailable = false;
}

// Export the appropriate components based on Skia availability
export const useLiquidGlass = () => {
  if (skiaAvailable) {
    const {
      LiquidGlassView,
      LiquidGlassSlider,
      LiquidGlassButton,
    } = require('./index');
    return { LiquidGlassView, LiquidGlassSlider, LiquidGlassButton, isNative: true };
  } else {
    const {
      LiquidGlassViewFallback: LiquidGlassView,
      LiquidGlassSliderFallback: LiquidGlassSlider,
      LiquidGlassButtonFallback: LiquidGlassButton,
    } = require('./LiquidGlassFallback');
    return { LiquidGlassView, LiquidGlassSlider, LiquidGlassButton, isNative: false };
  }
};

// Static exports for direct import
export const LiquidGlassView = skiaAvailable
  ? require('./LiquidGlassView').LiquidGlassView
  : require('./LiquidGlassFallback').LiquidGlassViewFallback;

export const LiquidGlassSlider = skiaAvailable
  ? require('./LiquidGlassSlider').LiquidGlassSlider
  : require('./LiquidGlassFallback').LiquidGlassSliderFallback;

export const LiquidGlassButton = skiaAvailable
  ? require('./LiquidGlassButton').LiquidGlassButton
  : require('./LiquidGlassFallback').LiquidGlassButtonFallback;

export const isSkiaAvailable = skiaAvailable;
