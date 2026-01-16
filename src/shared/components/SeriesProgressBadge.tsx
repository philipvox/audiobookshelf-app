/**
 * src/shared/components/SeriesProgressBadge.tsx
 *
 * Series progress badge component showing completion status.
 *
 * Shows:
 * - "2/3 ●●○" for in-progress series (dots for ≤5 books)
 * - "4/42" for in-progress series (count for >5 books)
 * - "12h 30m left" as subtitle for active series
 * - Green checkmark for completed series
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { ProgressDots } from './ProgressDots';
import { scale, spacing, useTheme, ThemeColors } from '@/shared/theme';

// Helper to extract semantic colors
function getSemanticColors(c: ThemeColors) {
  return {
    success: c.semantic.success,
  };
}

interface SeriesProgressBadgeProps {
  /** Number of completed books */
  completed: number;
  /** Number of in-progress books */
  inProgress: number;
  /** Total number of books in series */
  total: number;
  /** Time remaining in seconds (optional) */
  timeRemaining?: number;
  /** Compact mode - single line */
  compact?: boolean;
}

/**
 * Format time remaining as "Xh Ym left"
 */
function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return '';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m left`;
  } else if (hours > 0) {
    return `${hours}h left`;
  } else {
    return `${minutes}m left`;
  }
}

export function SeriesProgressBadge({
  completed,
  inProgress,
  total,
  timeRemaining,
  compact = false,
}: SeriesProgressBadgeProps) {
  const { colors } = useTheme();
  const semanticColors = getSemanticColors(colors);

  const isComplete = completed === total && total > 0;
  const hasProgress = completed > 0 || inProgress > 0;

  // Completed series - show checkmark
  if (isComplete) {
    return (
      <View style={[styles.container, compact && styles.containerCompact]}>
        <View style={[styles.completeBadge, { backgroundColor: semanticColors.success }]}>
          <Check size={scale(12)} color={colors.background.primary} strokeWidth={3} />
        </View>
        <Text style={[styles.completeText, { color: semanticColors.success }]}>Complete</Text>
      </View>
    );
  }

  // Series with progress
  if (hasProgress) {
    return (
      <View style={[styles.container, compact && styles.containerCompact]}>
        <ProgressDots
          completed={completed}
          inProgress={inProgress}
          total={total}
          showCount={true}
        />
        {!compact && timeRemaining && timeRemaining > 0 && (
          <Text style={[styles.timeText, { color: colors.text.tertiary }]}>{formatTimeRemaining(timeRemaining)}</Text>
        )}
      </View>
    );
  }

  // No progress - show book count
  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <Text style={[styles.countOnlyText, { color: colors.text.secondary }]}>
        {total} {total === 1 ? 'book' : 'books'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    gap: spacing.xxs,
  },
  containerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  completeBadge: {
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeText: {
    fontSize: scale(12),
    fontWeight: '500',
  },
  timeText: {
    fontSize: scale(11),
  },
  countOnlyText: {
    fontSize: scale(12),
  },
});

export default SeriesProgressBadge;
