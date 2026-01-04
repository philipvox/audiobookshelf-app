/**
 * src/shared/components/Skeleton.tsx
 *
 * Skeleton loading components with shimmer animation.
 * Uses react-native-reanimated for smooth 60fps animations.
 *
 * Components:
 * - Shimmer: Base animated shimmer effect
 * - SkeletonBox: Basic rectangle skeleton
 * - SkeletonCircle: Circular skeleton for avatars
 * - SkeletonText: Text placeholder lines
 * - BookCardSkeleton: Matches BookCard layout
 * - ContinueListeningCardSkeleton: Matches horizontal scroll cards
 * - ListRowSkeleton: Generic list row with cover
 * - SectionSkeleton: Complete section with header + cards
 * - HomeHeroSkeleton: Hero disc section skeleton
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, DimensionValue } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, wp, hp, scale } from '@/shared/theme';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Light theme colors for skeleton */
const SKELETON_BG = 'rgba(0, 0, 0, 0.08)';
const SHIMMER_COLOR = 'rgba(255, 255, 255, 0.5)';

/** Animation duration in ms */
const SHIMMER_DURATION = 1200;

// Card dimensions (matching actual components)
const CARD = {
  coverSize: wp(22),      // Continue Listening card cover
  listCover: scale(50),   // BookCard cover
  rowCover: 56,           // List row cover
  gap: wp(4),
};

// ============================================================================
// SHIMMER ANIMATION (Base)
// ============================================================================

interface ShimmerProps {
  width: DimensionValue;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Shimmer({ width, height, borderRadius = 4, style }: ShimmerProps) {
  const translateX = useSharedValue(-1);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(1, {
        duration: SHIMMER_DURATION,
        easing: Easing.linear,
      }),
      -1, // Infinite repeat
      false // Don't reverse
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const translateXValue = interpolate(
      translateX.value,
      [-1, 1],
      [-200, 200]
    );
    return {
      transform: [{ translateX: translateXValue }],
    };
  });

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: SKELETON_BG,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
        <LinearGradient
          colors={[
            'transparent',
            SHIMMER_COLOR,
            'transparent',
          ]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ flex: 1, width: 200 }}
        />
      </Animated.View>
    </View>
  );
}

// ============================================================================
// BASIC SKELETONS
// ============================================================================

interface SkeletonBoxProps {
  width: DimensionValue;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/** Basic rectangle skeleton */
export function SkeletonBox({ width, height, borderRadius = radius.sm, style }: SkeletonBoxProps) {
  return <Shimmer width={width} height={height} borderRadius={borderRadius} style={style} />;
}

interface SkeletonCircleProps {
  size: number;
  style?: ViewStyle;
}

/** Circular skeleton for avatars */
export function SkeletonCircle({ size, style }: SkeletonCircleProps) {
  return <Shimmer width={size} height={size} borderRadius={size / 2} style={style} />;
}

interface SkeletonTextProps {
  width: DimensionValue;
  height?: number;
  style?: ViewStyle;
}

/** Text line placeholder */
export function SkeletonText({ width, height = 14, style }: SkeletonTextProps) {
  return <Shimmer width={width} height={height} borderRadius={height / 2} style={style} />;
}

// ============================================================================
// COMPONENT SKELETONS
// ============================================================================

interface BookCardSkeletonProps {
  style?: ViewStyle;
}

/**
 * Skeleton matching BookCard layout
 * - 50x50 cover on left
 * - Title and subtitle text on right
 */
export function BookCardSkeleton({ style }: BookCardSkeletonProps) {
  return (
    <View style={[styles.bookCard, style]}>
      {/* Cover */}
      <SkeletonBox
        width={CARD.listCover}
        height={CARD.listCover}
        borderRadius={radius.cover}
      />
      {/* Text content */}
      <View style={styles.bookCardText}>
        <SkeletonText width="80%" height={16} />
        <SkeletonText width="60%" height={14} style={styles.textSpacing} />
      </View>
    </View>
  );
}

interface ContinueListeningCardSkeletonProps {
  style?: ViewStyle;
}

/**
 * Skeleton matching ContinueListeningCard
 * - Square cover (22%w)
 * - Title below
 */
export function ContinueListeningCardSkeleton({ style }: ContinueListeningCardSkeletonProps) {
  return (
    <View style={[styles.continueCard, style]}>
      {/* Square cover */}
      <SkeletonBox
        width={CARD.coverSize}
        height={CARD.coverSize}
        borderRadius={wp(1.5)}
      />
      {/* Title */}
      <SkeletonText
        width={CARD.coverSize * 0.85}
        height={12}
        style={styles.continueCardTitle}
      />
    </View>
  );
}

interface ListRowSkeletonProps {
  coverSize?: number;
  showSubtitle?: boolean;
  showProgress?: boolean;
  style?: ViewStyle;
}

/**
 * Generic list row skeleton
 * - Cover on left
 * - Title and optional subtitle
 * - Optional progress indicator
 */
export function ListRowSkeleton({
  coverSize = CARD.rowCover,
  showSubtitle = true,
  showProgress = false,
  style,
}: ListRowSkeletonProps) {
  return (
    <View style={[styles.listRow, style]}>
      {/* Cover */}
      <SkeletonBox
        width={coverSize}
        height={coverSize}
        borderRadius={radius.cover}
      />
      {/* Text content */}
      <View style={styles.listRowText}>
        <SkeletonText width="75%" height={16} />
        {showSubtitle && (
          <SkeletonText width="50%" height={14} style={styles.textSpacing} />
        )}
        {showProgress && (
          <SkeletonText width="30%" height={10} style={styles.textSpacing} />
        )}
      </View>
      {/* Action area */}
      <SkeletonCircle size={28} />
    </View>
  );
}

interface SectionSkeletonProps {
  cardCount?: number;
  showHeader?: boolean;
  horizontal?: boolean;
  style?: ViewStyle;
}

/**
 * Complete section skeleton with header and cards
 * - Section header
 * - Horizontal scroll of cards (Continue Listening style)
 */
export function SectionSkeleton({
  cardCount = 4,
  showHeader = true,
  horizontal = true,
  style,
}: SectionSkeletonProps) {
  const cards = Array.from({ length: cardCount }, (_, i) => i);

  return (
    <View style={[styles.section, style]}>
      {/* Header */}
      {showHeader && (
        <View style={styles.sectionHeader}>
          <SkeletonText width={wp(35)} height={18} />
        </View>
      )}

      {/* Cards */}
      {horizontal ? (
        <View style={styles.horizontalScroll}>
          {cards.map((i) => (
            <ContinueListeningCardSkeleton
              key={i}
              style={i > 0 ? { marginLeft: CARD.gap } : undefined}
            />
          ))}
        </View>
      ) : (
        <View style={styles.verticalList}>
          {cards.map((i) => (
            <BookCardSkeleton
              key={i}
              style={i > 0 ? { marginTop: spacing.sm } : undefined}
            />
          ))}
        </View>
      )}
    </View>
  );
}

interface HomeHeroSkeletonProps {
  style?: ViewStyle;
}

/**
 * Home screen hero skeleton
 * - Large circular disc placeholder
 * - Title and subtitle below
 */
export function HomeHeroSkeleton({ style }: HomeHeroSkeletonProps) {
  const discSize = wp(70);

  return (
    <View style={[styles.homeHero, style]}>
      {/* Disc */}
      <SkeletonCircle size={discSize} style={styles.heroDisc} />

      {/* Title and subtitle */}
      <View style={styles.heroText}>
        <SkeletonText width={wp(50)} height={20} />
        <SkeletonText width={wp(35)} height={16} style={styles.textSpacing} />
      </View>
    </View>
  );
}

interface BookDetailSkeletonProps {
  style?: ViewStyle;
}

/**
 * Book detail screen skeleton
 * - Large cover image
 * - Title, author, duration
 * - Progress bar
 * - Action buttons
 */
export function BookDetailSkeleton({ style }: BookDetailSkeletonProps) {
  const coverSize = wp(45);

  return (
    <View style={[styles.bookDetail, style]}>
      {/* Cover */}
      <SkeletonBox
        width={coverSize}
        height={coverSize * 1.5}
        borderRadius={radius.md}
        style={styles.detailCover}
      />

      {/* Title and metadata */}
      <View style={styles.detailMeta}>
        <SkeletonText width={wp(70)} height={24} />
        <SkeletonText width={wp(50)} height={18} style={styles.textSpacing} />
        <SkeletonText width={wp(30)} height={14} style={styles.textSpacing} />
      </View>

      {/* Progress bar */}
      <SkeletonBox
        width="100%"
        height={4}
        borderRadius={2}
        style={styles.detailProgress}
      />

      {/* Action buttons row */}
      <View style={styles.detailActions}>
        <SkeletonBox width={wp(40)} height={44} borderRadius={22} />
        <SkeletonCircle size={44} />
        <SkeletonCircle size={44} />
      </View>
    </View>
  );
}

interface AuthorRowSkeletonProps {
  style?: ViewStyle;
}

/**
 * Author/Narrator row skeleton with circular avatar
 */
export function AuthorRowSkeleton({ style }: AuthorRowSkeletonProps) {
  return (
    <View style={[styles.authorRow, style]}>
      <SkeletonCircle size={48} />
      <View style={styles.authorText}>
        <SkeletonText width="60%" height={16} />
        <SkeletonText width="40%" height={14} style={styles.textSpacing} />
      </View>
    </View>
  );
}

interface SearchResultsSkeletonProps {
  count?: number;
  style?: ViewStyle;
}

/**
 * Search results skeleton with multiple list rows
 */
export function SearchResultsSkeleton({ count = 5, style }: SearchResultsSkeletonProps) {
  const rows = Array.from({ length: count }, (_, i) => i);

  return (
    <View style={[styles.searchResults, style]}>
      {rows.map((i) => (
        <BookCardSkeleton
          key={i}
          style={i > 0 ? { marginTop: spacing.md } : undefined}
        />
      ))}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Book Card
  bookCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  bookCardText: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },

  // Continue Listening Card
  continueCard: {
    width: CARD.coverSize,
  },
  continueCardTitle: {
    marginTop: hp(0.6),
  },

  // List Row
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  listRowText: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },

  // Section
  section: {
    marginTop: hp(2),
  },
  sectionHeader: {
    marginBottom: spacing.md,
    marginLeft: wp(3.25),
  },
  horizontalScroll: {
    flexDirection: 'row',
    paddingLeft: wp(3.25),
  },
  verticalList: {
    paddingHorizontal: spacing.lg,
  },

  // Home Hero
  homeHero: {
    alignItems: 'center',
    paddingTop: hp(4),
    paddingBottom: hp(2),
  },
  heroDisc: {
    marginBottom: spacing.lg,
  },
  heroText: {
    alignItems: 'center',
  },

  // Book Detail
  bookDetail: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: hp(2),
  },
  detailCover: {
    marginBottom: spacing.lg,
  },
  detailMeta: {
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.lg,
  },
  detailProgress: {
    marginBottom: spacing.lg,
  },
  detailActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },

  // Author Row
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  authorText: {
    flex: 1,
    marginLeft: spacing.md,
  },

  // Search Results
  searchResults: {
    paddingTop: spacing.md,
  },

  // Common
  textSpacing: {
    marginTop: spacing.xs,
  },
});

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  Shimmer,
  SkeletonBox,
  SkeletonCircle,
  SkeletonText,
  BookCardSkeleton,
  ContinueListeningCardSkeleton,
  ListRowSkeleton,
  SectionSkeleton,
  HomeHeroSkeleton,
  BookDetailSkeleton,
  AuthorRowSkeleton,
  SearchResultsSkeleton,
};
