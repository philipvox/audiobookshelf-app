/**
 * src/shared/components/CollapsibleSection.tsx
 *
 * Reusable collapsible section for detail screens.
 * Used in Author, Narrator, Series, and Genre detail screens
 * to show grouped content that can be expanded/collapsed.
 *
 * Features:
 * - Animated expand/collapse with smooth height transition
 * - Chevron indicator that rotates on toggle
 * - Optional navigation on title press (separate from collapse)
 * - Consistent Secret Library styling
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { scale, useSecretLibraryColors } from '@/shared/theme';
import { secretLibraryFonts } from '@/shared/theme/secretLibrary';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface CollapsibleSectionProps {
  /** Section title (e.g., "Fantasy", "Brandon Sanderson") */
  title: string;
  /** Number of items in this section */
  count: number;
  /** Content to show when expanded */
  children: React.ReactNode;
  /** Whether section starts expanded (default: true) */
  defaultExpanded?: boolean;
  /** Callback when title is pressed (for navigation) - separate from collapse toggle */
  onTitlePress?: () => void;
  /** Whether this section is the "Standalone" section (no navigation) */
  isStandalone?: boolean;
  /** Test ID for testing */
  testID?: string;
}

/**
 * CollapsibleSection - An animated collapsible container for grouped content
 *
 * Usage:
 * ```tsx
 * <CollapsibleSection
 *   title="Fantasy"
 *   count={books.length}
 *   onTitlePress={() => navigation.navigate('GenreDetail', { genreName: 'Fantasy' })}
 * >
 *   <ShelfView books={books} />
 * </CollapsibleSection>
 * ```
 */
export function CollapsibleSection({
  title,
  count,
  children,
  defaultExpanded = true,
  onTitlePress,
  isStandalone = false,
  testID,
}: CollapsibleSectionProps) {
  const colors = useSecretLibraryColors();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const rotateAnim = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

  // Animate chevron rotation
  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: isExpanded ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isExpanded, rotateAnim]);

  const toggleExpanded = useCallback(() => {
    // Use LayoutAnimation for smooth content height change
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(prev => !prev);
  }, []);

  const handleTitlePress = useCallback(() => {
    if (onTitlePress && !isStandalone) {
      onTitlePress();
    }
  }, [onTitlePress, isStandalone]);

  // Interpolate rotation for chevron (0 = pointing right/collapsed, 1 = pointing down/expanded)
  const chevronRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-90deg', '0deg'],
  });

  return (
    <View style={styles.container} testID={testID}>
      {/* Header row with title and collapse toggle */}
      <View style={styles.headerRow}>
        {/* Title - navigable if onTitlePress provided */}
        {onTitlePress && !isStandalone ? (
          <Pressable onPress={handleTitlePress} style={styles.titleContainer}>
            <Text style={[styles.title, { color: colors.black }]} numberOfLines={1}>
              {title}
              <Text style={[styles.count, { color: colors.gray }]}> ({count})</Text>
            </Text>
          </Pressable>
        ) : (
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: colors.black }]} numberOfLines={1}>
              {title}
              <Text style={[styles.count, { color: colors.gray }]}> ({count})</Text>
            </Text>
          </View>
        )}

        {/* Collapse/Expand toggle button - far right to avoid misclicks */}
        <Pressable
          onPress={toggleExpanded}
          style={styles.collapseButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityState={{ expanded: isExpanded }}
          accessibilityLabel={`${isExpanded ? 'Collapse' : 'Expand'} ${title} section`}
        >
          <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
            <ChevronDown size={scale(20)} color={colors.gray} strokeWidth={2} />
          </Animated.View>
        </Pressable>
      </View>

      {/* Content - only rendered when expanded */}
      {isExpanded && (
        <View style={styles.content}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: scale(36),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(16),
    marginTop: scale(8),
  },
  collapseButton: {
    padding: scale(4),
    marginLeft: scale(12), // Space between title and chevron
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontFamily: secretLibraryFonts.playfair.regular,
    fontSize: scale(26),
    fontWeight: '400',
  },
  count: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(10),
  },
  content: {
    // Content container - no special styling needed
  },
});

export default CollapsibleSection;
