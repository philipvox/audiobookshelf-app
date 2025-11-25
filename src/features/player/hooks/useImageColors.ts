// File: src/features/player/hooks/useImageColors.ts
import { useState, useEffect } from 'react';
import { getColors } from 'react-native-image-colors';
import { getFallbackColors, pickGradientColors, lightenColor, getHighContrastAccent } from '../utils/colorUtils';

interface ImageColors {
  background: string;
  backgroundLight: string;
  accent: string;
  progressAccent: string;
  isLight: boolean;
  isLoading: boolean;
}

export function useImageColors(imageUrl: string, bookId: string): ImageColors {
  const [colors, setColors] = useState<ImageColors>(() => {
    const fallback = getFallbackColors(bookId);
    return {
      background: fallback.bg,
      backgroundLight: lightenColor(fallback.bg, 0.15),
      accent: fallback.accent,
      progressAccent: getHighContrastAccent(fallback.bg),
      isLight: false,
      isLoading: true,
    };
  });

  useEffect(() => {
    let mounted = true;

    const extractColors = async () => {
      try {
        const result = await getColors(imageUrl, {
          fallback: '#1A1A2E',
          cache: true,
          key: imageUrl,
        });

        if (!mounted) return;

        const allColors: string[] = [];
        
        if (result.platform === 'android') {
          if (result.vibrant) allColors.push(result.vibrant);
          if (result.dominant) allColors.push(result.dominant);
          if (result.darkVibrant) allColors.push(result.darkVibrant);
          if (result.lightVibrant) allColors.push(result.lightVibrant);
          if (result.darkMuted) allColors.push(result.darkMuted);
          if (result.lightMuted) allColors.push(result.lightMuted);
          if (result.muted) allColors.push(result.muted);
          if (result.average) allColors.push(result.average);
        } else if (result.platform === 'ios') {
          if (result.primary) allColors.push(result.primary);
          if (result.secondary) allColors.push(result.secondary);
          if (result.background) allColors.push(result.background);
          if (result.detail) allColors.push(result.detail);
        } else {
          const webResult = result as any;
          if (webResult.vibrant) allColors.push(webResult.vibrant);
          if (webResult.dominant) allColors.push(webResult.dominant);
          if (webResult.muted) allColors.push(webResult.muted);
        }

        const gradient = pickGradientColors(allColors);
        
        // Get the dominant/background color for complementary calculation
        const dominantColor = gradient.dark || allColors[0] || '#1A1A2E';
        
        // High contrast complementary for progress indicators
        const progressAccent = getHighContrastAccent(dominantColor);
        
        // Regular accent
        let accentBase = allColors[0] || '#FF6B6B';
        if (result.platform === 'android' && result.vibrant) {
          accentBase = result.vibrant;
        } else if (result.platform === 'ios' && result.primary) {
          accentBase = result.primary;
        }

        setColors({
          background: gradient.dark,
          backgroundLight: gradient.light,
          accent: accentBase,
          progressAccent,
          isLight: false,
          isLoading: false,
        });
      } catch (error) {
        console.warn('Failed to extract image colors:', error);
        if (!mounted) return;
        
        const fallback = getFallbackColors(bookId);
        setColors({
          background: fallback.bg,
          backgroundLight: lightenColor(fallback.bg, 0.15),
          accent: fallback.accent,
          progressAccent: getHighContrastAccent(fallback.bg),
          isLight: false,
          isLoading: false,
        });
      }
    };

    extractColors();

    return () => {
      mounted = false;
    };
  }, [imageUrl, bookId]);

  return colors;
}