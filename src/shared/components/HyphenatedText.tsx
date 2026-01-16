/**
 * src/shared/components/HyphenatedText.tsx
 *
 * Cross-platform text component with hyphenation support.
 * - iOS: Uses native HyphenatedText with NSParagraphStyle.hyphenationFactor
 * - Android: Uses standard Text with android_hyphenationFrequency
 */

import React from 'react';
import {
  Text,
  Platform,
  requireNativeComponent,
  StyleSheet,
  TextStyle,
} from 'react-native';
import { scale } from '@/shared/theme';

// Native component for iOS
const NativeHyphenatedText = Platform.OS === 'ios'
  ? requireNativeComponent<any>('HyphenatedText')
  : null;

interface HyphenatedTextProps {
  children: string;
  style?: TextStyle;
  numberOfLines?: number;
  /** Hyphenation factor 0-1, where 1 is maximum hyphenation (default: 1) */
  hyphenationFactor?: number;
}

/**
 * HyphenatedText - Text component with automatic hyphenation
 *
 * Enables proper justified text by allowing words to break with hyphens.
 */
export function HyphenatedText({
  children,
  style,
  numberOfLines,
  hyphenationFactor = 1.0,
}: HyphenatedTextProps) {
  // Extract style values
  const flatStyle = StyleSheet.flatten(style) || {};
  const fontSize = (flatStyle.fontSize as number) || scale(14);
  const lineHeight = (flatStyle.lineHeight as number) || scale(22);
  const color = flatStyle.color || '#000000';
  const fontFamily = (flatStyle.fontFamily as string) || Platform.select({ ios: 'Georgia', android: 'serif' });

  if (Platform.OS === 'ios' && NativeHyphenatedText) {
    return (
      <NativeHyphenatedText
        text={children}
        fontSize={fontSize}
        fontFamily={fontFamily}
        lineHeight={lineHeight}
        textColor={color}
        hyphenationFactor={hyphenationFactor}
        style={[
          {
            // Default dimensions - parent should constrain
            minHeight: lineHeight,
          },
          style,
        ]}
        numberOfLines={numberOfLines}
      />
    );
  }

  // Android: Use standard Text with hyphenation prop
  return (
    <Text
      style={style}
      numberOfLines={numberOfLines}
      android_hyphenationFrequency="full"
    >
      {children}
    </Text>
  );
}

export default HyphenatedText;
