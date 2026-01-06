/**
 * src/shared/components/HeartButton.tsx
 *
 * Reusable heart/favorite button component
 * - Handles favorite logic via myLibraryStore
 * - Customizable size and colors
 * - Swappable icon via render prop
 * - Optional pulse animation on tap
 */

import React, { useCallback, useRef } from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle, Animated } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useMyLibraryStore } from '@/shared/stores/myLibraryStore';
import { haptics } from '@/core/native/haptics';

// Default colors
const VIBRANT_GREEN = '#F4B60C';
const GRAY = '#808080';

// Default heart icon
const DefaultHeartIcon = ({
  size = 24,
  color = VIBRANT_GREEN,
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

export interface HeartButtonProps {
  /** Book ID to toggle favorite status */
  bookId: string;
  /** Size of the icon (default: 24) */
  size?: number;
  /** Color when filled/active (default: vibrant green) */
  activeColor?: string;
  /** Color when not filled/inactive (default: gray) */
  inactiveColor?: string;
  /** Custom icon renderer - receives (size, color, filled) */
  renderIcon?: (size: number, color: string, filled: boolean) => React.ReactNode;
  /** Additional style for the touchable container */
  style?: ViewStyle;
  /** Hit slop for easier tapping */
  hitSlop?: number;
  /** Callback after toggling (optional) */
  onToggle?: (isFavorite: boolean) => void;
  /** Disable the button */
  disabled?: boolean;
  /** Enable pulse animation on tap (default: true) */
  animated?: boolean;
}

export function HeartButton({
  bookId,
  size = 24,
  activeColor = VIBRANT_GREEN,
  inactiveColor = GRAY,
  renderIcon,
  style,
  hitSlop = 8,
  onToggle,
  disabled = false,
  animated = true,
}: HeartButtonProps) {
  const { isInLibrary, addToLibrary, removeFromLibrary } = useMyLibraryStore();
  const isFavorite = isInLibrary(bookId);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    if (disabled) return;

    // NN/g: Haptic feedback confirms action
    if (isFavorite) {
      haptics.toggle(); // Medium haptic for removing
    } else {
      haptics.success(); // Success haptic for adding to favorites
    }

    // Pulse animation
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
      removeFromLibrary(bookId);
      onToggle?.(false);
    } else {
      addToLibrary(bookId);
      onToggle?.(true);
    }
  }, [bookId, isFavorite, addToLibrary, removeFromLibrary, onToggle, disabled, animated, scaleAnim]);

  const color = isFavorite ? activeColor : inactiveColor;

  const iconContent = renderIcon ? (
    renderIcon(size, color, isFavorite)
  ) : (
    <DefaultHeartIcon size={size} color={color} filled={isFavorite} />
  );

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={handlePress}
      activeOpacity={0.7}
      hitSlop={{ top: hitSlop, bottom: hitSlop, left: hitSlop, right: hitSlop }}
      disabled={disabled}
    >
      {animated ? (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          {iconContent}
        </Animated.View>
      ) : (
        iconContent
      )}
    </TouchableOpacity>
  );
}

// Export the default icon for custom usage
export { DefaultHeartIcon as HeartIcon };

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
