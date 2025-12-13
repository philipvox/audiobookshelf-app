/**
 * src/shared/hooks/useImageColors.ts
 *
 * Extract dominant colors from an image URL
 * Uses react-native-image-colors for color extraction
 * Falls back to default accent color if extraction fails
 */

import { useState, useEffect } from 'react';

// Default accent color (amber/gold)
const DEFAULT_ACCENT = '#F4B60C';
const DEFAULT_BACKGROUND = '#000000';

export interface ImageColors {
  /** Primary/dominant color from the image */
  dominant: string;
  /** Darker muted color for backgrounds */
  darkMuted: string;
  /** Vibrant color for accents */
  vibrant: string;
  /** Light vibrant color */
  lightVibrant: string;
  /** Dark vibrant color */
  darkVibrant: string;
  /** Muted color */
  muted: string;
  /** Light muted color */
  lightMuted: string;
}

/**
 * Simple color extraction that estimates dominant color from image
 * This is a fallback implementation - for full color extraction,
 * install react-native-image-colors
 */
export function useImageColors(imageUrl: string | null): ImageColors | null {
  const [colors, setColors] = useState<ImageColors | null>(null);

  useEffect(() => {
    if (!imageUrl) {
      setColors(null);
      return;
    }

    // Try to dynamically import react-native-image-colors
    // If not available, use default colors
    const extractColors = async () => {
      try {
        // Attempt to use react-native-image-colors if installed
        const imageColors = await import('react-native-image-colors');
        const result = await imageColors.getColors(imageUrl, {
          fallback: DEFAULT_ACCENT,
          cache: true,
          key: imageUrl,
        });

        if (result.platform === 'ios') {
          setColors({
            dominant: result.primary || DEFAULT_ACCENT,
            darkMuted: result.background || DEFAULT_BACKGROUND,
            vibrant: result.primary || DEFAULT_ACCENT,
            lightVibrant: result.secondary || DEFAULT_ACCENT,
            darkVibrant: result.primary || DEFAULT_ACCENT,
            muted: result.detail || DEFAULT_ACCENT,
            lightMuted: result.secondary || DEFAULT_ACCENT,
          });
        } else if (result.platform === 'android') {
          setColors({
            dominant: result.dominant || DEFAULT_ACCENT,
            darkMuted: result.darkMuted || DEFAULT_BACKGROUND,
            vibrant: result.vibrant || DEFAULT_ACCENT,
            lightVibrant: result.lightVibrant || DEFAULT_ACCENT,
            darkVibrant: result.darkVibrant || DEFAULT_ACCENT,
            muted: result.muted || DEFAULT_ACCENT,
            lightMuted: result.lightMuted || DEFAULT_ACCENT,
          });
        }
      } catch (error) {
        // react-native-image-colors not installed, use defaults
        console.log('Image colors extraction not available, using defaults');
        setColors({
          dominant: DEFAULT_ACCENT,
          darkMuted: DEFAULT_BACKGROUND,
          vibrant: DEFAULT_ACCENT,
          lightVibrant: DEFAULT_ACCENT,
          darkVibrant: DEFAULT_ACCENT,
          muted: DEFAULT_ACCENT,
          lightMuted: DEFAULT_ACCENT,
        });
      }
    };

    extractColors();
  }, [imageUrl]);

  return colors;
}

export default useImageColors;
