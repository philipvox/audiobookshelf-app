/**
 * src/shared/components/SeriesHeartButton.tsx
 *
 * Heart button for favoriting entire series
 */

import React, { useCallback, useRef } from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle, Animated, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useMyLibraryStore } from '@/shared/stores/myLibraryStore';
import { accentColors } from '@/shared/theme';
import { useThemeColors } from '@/shared/theme/themeStore';

const HeartIcon = ({
  size = 24,
  color = accentColors.red,
  filled = false,
}: {
  size?: number;
  color?: string;
  filled?: boolean;
}) => (
  <Svg width={size} height={size} viewBox="0 0 18 15" fill="none">
    <Path
      d="M15.9611 1.25119C15.5385 0.854523 15.0367 0.539863 14.4845 0.32518C13.9323 0.110498 13.3404 0 12.7426 0C12.1448 0 11.5529 0.110498 11.0007 0.32518C10.4484 0.539863 9.9467 0.854523 9.52412 1.25119L8.6471 2.07401L7.77009 1.25119C6.9165 0.450331 5.75878 0.000415111 4.55161 0.000415119C3.34445 0.000415128 2.18673 0.450331 1.33314 1.25119C0.479544 2.05204 8.99406e-09 3.13823 0 4.27081C-8.99406e-09 5.40339 0.479544 6.48958 1.33314 7.29044L8.6471 14.1525L15.9611 7.29044C16.3839 6.89396 16.7192 6.42322 16.9481 5.9051C17.1769 5.38698 17.2947 4.83164 17.2947 4.27081C17.2947 3.70998 17.1769 3.15464 16.9481 2.63652C16.7192 2.1184 16.3839 1.64766 15.9611 1.25119Z"
      fill={filled ? color : 'none'}
      stroke={filled ? 'none' : color}
      strokeWidth={1.5}
    />
  </Svg>
);

export interface SeriesHeartButtonProps {
  seriesName: string;
  size?: number;
  activeColor?: string;
  inactiveColor?: string;
  style?: ViewStyle;
  hitSlop?: number;
  onToggle?: (isFavorite: boolean) => void;
  disabled?: boolean;
  animated?: boolean;
  showCircle?: boolean;
}

export function SeriesHeartButton({
  seriesName,
  size = 24,
  activeColor,
  inactiveColor,
  style,
  hitSlop = 8,
  onToggle,
  disabled = false,
  animated = true,
  showCircle = false,
}: SeriesHeartButtonProps) {
  const themeColors = useThemeColors();
  const { isSeriesFavorite, addSeriesToFavorites, removeSeriesFromFavorites } = useMyLibraryStore();
  const isFavorite = isSeriesFavorite(seriesName);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Use props or theme-aware defaults
  const effectiveActiveColor = activeColor || accentColors.red;
  const effectiveInactiveColor = inactiveColor || themeColors.textTertiary;

  const handlePress = useCallback(() => {
    if (disabled) return;

    if (animated) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.7,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1.2,
          friction: 3,
          tension: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }

    if (isFavorite) {
      removeSeriesFromFavorites(seriesName);
      onToggle?.(false);
    } else {
      addSeriesToFavorites(seriesName);
      onToggle?.(true);
    }
  }, [seriesName, isFavorite, addSeriesToFavorites, removeSeriesFromFavorites, onToggle, disabled, animated, scaleAnim]);

  const color = isFavorite ? effectiveActiveColor : effectiveInactiveColor;
  const circleSize = size + 10;

  // For circle mode: inverse text on active bg when active, border when inactive
  const circleHeartColor = isFavorite ? themeColors.background : effectiveInactiveColor;
  const circleBgColor = isFavorite ? effectiveActiveColor : 'transparent';
  const circleBorderColor = isFavorite ? 'transparent' : themeColors.border;

  const heartContent = animated ? (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <HeartIcon size={size} color={showCircle ? circleHeartColor : color} filled={isFavorite} />
    </Animated.View>
  ) : (
    <HeartIcon size={size} color={showCircle ? circleHeartColor : color} filled={isFavorite} />
  );

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={handlePress}
      activeOpacity={0.7}
      hitSlop={{ top: hitSlop, bottom: hitSlop, left: hitSlop, right: hitSlop }}
      disabled={disabled}
    >
      {showCircle ? (
        <View style={[
          styles.circle,
          {
            width: circleSize,
            height: circleSize,
            borderRadius: circleSize / 2,
            backgroundColor: circleBgColor,
            borderWidth: isFavorite ? 0 : 1,
            borderColor: circleBorderColor,
          }
        ]}>
          {heartContent}
        </View>
      ) : (
        heartContent
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  circle: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
