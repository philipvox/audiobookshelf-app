/**
 * src/shared/components/AddToLibraryButton.tsx
 *
 * Button to add/remove a book from the user's personal library.
 * Books added to library appear in Continue Listening section.
 *
 * - Uses progressStore for library state
 * - Animated icon transition
 * - Haptic feedback
 * - Toast notifications
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Animated,
  ActivityIndicator,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useProgressStore, useIsInLibrary } from '@/core/stores/progressStore';
import { haptics } from '@/core/native/haptics';
import { useToast } from '@/shared/hooks/useToast';
import { useTheme } from '@/shared/theme';

/**
 * Library/bookmark icon - outline when not in library, filled when in library
 */
const LibraryIcon = ({
  size = 24,
  color,
  filled = false,
}: {
  size?: number;
  color: string;
  filled?: boolean;
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {filled ? (
      // Filled bookmark icon
      <Path
        d="M5 4C5 2.89543 5.89543 2 7 2H17C18.1046 2 19 2.89543 19 4V21C19 21.3746 18.7907 21.7178 18.4576 21.8892C18.1245 22.0606 17.7236 22.0315 17.4188 21.8137L12 17.8619L6.58124 21.8137C6.27642 22.0315 5.87549 22.0606 5.54242 21.8892C5.20935 21.7178 5 21.3746 5 21V4Z"
        fill={color}
      />
    ) : (
      // Outline bookmark icon
      <Path
        d="M5 4C5 2.89543 5.89543 2 7 2H17C18.1046 2 19 2.89543 19 4V21C19 21.3746 18.7907 21.7178 18.4576 21.8892C18.1245 22.0606 17.7236 22.0315 17.4188 21.8137L12 17.8619L6.58124 21.8137C6.27642 22.0315 5.87549 22.0606 5.54242 21.8892C5.20935 21.7178 5 21.3746 5 21V4Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    )}
  </Svg>
);

export interface AddToLibraryButtonProps {
  /** Book ID to add/remove from library */
  bookId: string;
  /** Book title for toast notification */
  bookTitle?: string;
  /** Size of the icon (default: 24) */
  size?: number;
  /** Color when in library (default: accent gold) */
  activeColor?: string;
  /** Color when not in library (default: gray) */
  inactiveColor?: string;
  /** Custom icon renderer - receives (size, color, isInLibrary) */
  renderIcon?: (size: number, color: string, isInLibrary: boolean) => React.ReactNode;
  /** Additional style for the touchable container */
  style?: ViewStyle;
  /** Hit slop for easier tapping */
  hitSlop?: number;
  /** Callback after toggling (optional) */
  onToggle?: (isInLibrary: boolean) => void;
  /** Disable the button */
  disabled?: boolean;
  /** Enable pulse animation on tap (default: true) */
  animated?: boolean;
  /** Show toast notifications (default: true) */
  showToast?: boolean;
}

export function AddToLibraryButton({
  bookId,
  bookTitle,
  size = 24,
  activeColor,
  inactiveColor,
  renderIcon,
  style,
  hitSlop = 8,
  onToggle,
  disabled = false,
  animated = true,
  showToast: showToastProp = true,
}: AddToLibraryButtonProps) {
  const { colors } = useTheme();
  const isInLibrary = useIsInLibrary(bookId);
  const addToLibrary = useProgressStore((state) => state.addToLibrary);
  const removeFromLibrary = useProgressStore((state) => state.removeFromLibrary);
  const { showSuccess } = useToast();

  // Default colors from theme
  const defaultActiveColor = colors.accent.primary;
  const defaultInactiveColor = colors.icon.tertiary;
  const finalActiveColor = activeColor ?? defaultActiveColor;
  const finalInactiveColor = inactiveColor ?? defaultInactiveColor;

  const [isLoading, setIsLoading] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(async () => {
    if (disabled || isLoading) return;

    // Haptic feedback
    if (isInLibrary) {
      haptics.toggle(); // Medium haptic for removing
    } else {
      haptics.success(); // Success haptic for adding
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

    setIsLoading(true);

    try {
      if (isInLibrary) {
        await removeFromLibrary(bookId);
        if (showToastProp && bookTitle) {
          showSuccess(`Removed from library`);
        }
        onToggle?.(false);
      } else {
        await addToLibrary(bookId);
        if (showToastProp) {
          showSuccess(bookTitle ? `Added "${bookTitle}" to library` : 'Added to library');
        }
        onToggle?.(true);
      }
    } catch (error) {
      // Error handling - toast already shown by store if needed
      console.error('Failed to update library:', error);
    } finally {
      setIsLoading(false);
    }
  }, [
    bookId,
    bookTitle,
    isInLibrary,
    addToLibrary,
    removeFromLibrary,
    onToggle,
    disabled,
    isLoading,
    animated,
    scaleAnim,
    showToastProp,
    showSuccess,
  ]);

  const color = isInLibrary ? finalActiveColor : finalInactiveColor;

  // Show loading spinner while processing
  if (isLoading) {
    return (
      <ActivityIndicator
        size="small"
        color={finalActiveColor}
        style={[styles.container, style]}
      />
    );
  }

  const iconContent = renderIcon ? (
    renderIcon(size, color, isInLibrary)
  ) : (
    <LibraryIcon size={size} color={color} filled={isInLibrary} />
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
export { LibraryIcon };

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
