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
      {/* Header row — uppercase monospace label with count */}
      <Pressable
        style={styles.headerRow}
        onPress={toggleExpanded}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        accessibilityLabel={`${isExpanded ? 'Collapse' : 'Expand'} ${title} section`}
      >
        {onTitlePress && !isStandalone ? (
          <Pressable
            onPress={handleTitlePress}
            style={styles.titleContainer}
            accessibilityRole="link"
            accessibilityLabel={`Navigate to ${title}`}
          >
            <Text style={[styles.title, { color: colors.gray }]} numberOfLines={1}>
              {title.toUpperCase()}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: colors.gray }]} numberOfLines={1}>
              {title.toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={[styles.count, { color: colors.gray }]}>{count}</Text>
        <Animated.View style={[styles.chevronIcon, { transform: [{ rotate: chevronRotation }] }]}>
          <ChevronDown size={scale(14)} color={colors.gray} strokeWidth={2} />
        </Animated.View>
      </Pressable>

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
    marginBottom: scale(20),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  titleContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(10),
    letterSpacing: 1,
  },
  count: {
    fontFamily: secretLibraryFonts.jetbrainsMono.regular,
    fontSize: scale(10),
    letterSpacing: 0.5,
    marginRight: 4,
  },
  chevronIcon: {
    marginLeft: 2,
  },
  content: {
    // Content container - no special styling needed
  },
});

export default CollapsibleSection;
