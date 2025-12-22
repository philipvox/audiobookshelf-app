/**
 * src/features/discover/components/MoodFilterPills.tsx
 *
 * Mood-aware filter display for the Browse screen.
 * Shows current mood session preferences with ability to edit or clear.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Animated, {
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Icon } from '@/shared/components/Icon';
import { colors, scale, layout, radius, spacing } from '@/shared/theme';
import {
  MoodSession,
  MOODS,
  PACES,
  WEIGHTS,
  WORLDS,
  Mood,
  Pace,
  Weight,
  World,
} from '@/features/mood-discovery/types';
import {
  useSessionInfo,
  getTimeRemainingFromExpiry,
  getSessionDisplayLabel,
} from '@/features/mood-discovery/stores/moodSessionStore';

// ============================================================================
// TYPES
// ============================================================================

interface MoodFilterPillsProps {
  session: MoodSession;
  onEditPress?: () => void;
  onClear?: () => void;
}

interface FilterChipProps {
  label: string;
  icon: string;
  iconSet?: string;
  active?: boolean;
  onPress?: () => void;
}

// ============================================================================
// TIME FORMATTING
// ============================================================================

function formatCompactTime(ms: number): string {
  if (ms <= 0) return '0s';

  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);

  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

function formatFullTime(ms: number): string {
  if (ms <= 0) return 'Expired';

  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
  if (seconds > 0 && hours === 0) parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);

  return parts.join(', ');
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function FilterChip({ label, icon, active = true, onPress }: FilterChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.filterChip, active && styles.filterChipActive]}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <Icon
        name={icon as any}
        size={16}
        color={active ? '#000' : colors.textSecondary}
      />
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MoodFilterPills({
  session,
  onEditPress,
  onClear,
}: MoodFilterPillsProps) {
  const navigation = useNavigation<any>();
  const { expiresAt, clearSession } = useSessionInfo();
  const [showTimerPopup, setShowTimerPopup] = useState(false);

  // Calculate time remaining locally
  const [timeRemaining, setTimeRemaining] = useState(() =>
    getTimeRemainingFromExpiry(expiresAt)
  );

  // Update interval based on remaining time
  useEffect(() => {
    setTimeRemaining(getTimeRemainingFromExpiry(expiresAt));

    const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

    let intervalMs: number;
    if (hours > 0) {
      intervalMs = 60000;
    } else if (minutes > 0) {
      intervalMs = 10000;
    } else {
      intervalMs = 1000;
    }

    const interval = setInterval(() => {
      setTimeRemaining(getTimeRemainingFromExpiry(expiresAt));
    }, intervalMs);

    return () => clearInterval(interval);
  }, [expiresAt, timeRemaining < 60000]);

  const handleClear = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    clearSession();
    onClear?.();
  }, [clearSession, onClear]);

  const handleBrowseBy = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('GenresList');
  }, [navigation]);

  const handleTimerPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowTimerPopup(true);
  }, []);

  // Get mood config
  const moodConfig = MOODS.find((m) => m.id === session.mood);
  const paceConfig = session.pace !== 'any' ? PACES.find((p) => p.id === session.pace) : null;
  const weightConfig = session.weight !== 'any' ? WEIGHTS.find((w) => w.id === session.weight) : null;
  const worldConfig = session.world !== 'any' ? WORLDS.find((w) => w.id === session.world) : null;

  return (
    <View style={styles.container}>
      {/* Header row: Timer, Edit, Clear, Browse By */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleTimerPress}
          style={styles.timerContainer}
          activeOpacity={0.7}
        >
          <Icon
            name="Clock"
            size={14}
            color={colors.textTertiary}
          />
          <Text style={styles.timerText}>
            {formatCompactTime(timeRemaining)}
          </Text>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          {/* Browse By button */}
          <TouchableOpacity
            onPress={handleBrowseBy}
            style={styles.browseByButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon
              name="LayoutGrid"
              size={18}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {/* Edit button */}
          {onEditPress && (
            <TouchableOpacity
              onPress={onEditPress}
              style={styles.editButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon
                name="SlidersHorizontal"
                size={18}
                color={colors.accent}
              />
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
          )}

          {/* Clear button */}
          <TouchableOpacity
            onPress={handleClear}
            style={styles.clearButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon
              name="XCircle"
              size={20}
              color={colors.textTertiary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter chips - scrollable */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContainer}
      >
        {/* Primary mood chip */}
        {moodConfig && (
          <FilterChip
            label={moodConfig.label}
            icon={moodConfig.icon}
            iconSet={moodConfig.iconSet}
            active
          />
        )}

        {/* Pace chip */}
        {paceConfig && (
          <FilterChip
            label={paceConfig.label}
            icon={paceConfig.icon}
            iconSet={paceConfig.iconSet}
          />
        )}

        {/* Weight chip */}
        {weightConfig && (
          <FilterChip
            label={weightConfig.label}
            icon={weightConfig.icon}
            iconSet={weightConfig.iconSet}
          />
        )}

        {/* World chip */}
        {worldConfig && (
          <FilterChip
            label={worldConfig.label}
            icon={worldConfig.icon}
            iconSet={worldConfig.iconSet}
          />
        )}
      </ScrollView>

      {/* Timer Info Popup */}
      <Modal
        visible={showTimerPopup}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTimerPopup(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowTimerPopup(false)}
        >
          <View style={styles.timerPopup}>
            <View style={styles.timerPopupIcon}>
              <Icon
                name="Clock"
                size={32}
                color={colors.accent}
              />
            </View>
            <Text style={styles.timerPopupTitle}>Mood Session</Text>
            <Text style={styles.timerPopupTime}>
              {formatFullTime(timeRemaining)}
            </Text>
            <Text style={styles.timerPopupDescription}>
              Your mood preferences are temporary and will expire after 24 hours.
              This lets you discover books based on how you feel right now, not forever.
            </Text>
            <TouchableOpacity
              onPress={() => setShowTimerPopup(false)}
              style={styles.timerPopupButton}
            >
              <Text style={styles.timerPopupButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: layout.screenPaddingH,
    marginBottom: spacing.sm,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: radius.full,
  },
  timerText: {
    fontSize: scale(12),
    color: colors.textSecondary,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  browseByButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: radius.full,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  editText: {
    fontSize: scale(13),
    color: colors.accent,
    fontWeight: '600',
  },
  clearButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  chipsContainer: {
    gap: spacing.sm,
    paddingHorizontal: layout.screenPaddingH,
    paddingVertical: spacing.xs,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(10),
    paddingHorizontal: scale(16),
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    gap: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.accent,
  },
  filterChipText: {
    fontSize: scale(14),
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#000',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  timerPopup: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    maxWidth: 320,
    width: '100%',
  },
  timerPopupIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accentSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  timerPopupTitle: {
    fontSize: scale(18),
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  timerPopupTime: {
    fontSize: scale(24),
    fontWeight: '700',
    color: colors.accent,
    marginBottom: spacing.md,
  },
  timerPopupDescription: {
    fontSize: scale(14),
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: scale(20),
    marginBottom: spacing.lg,
  },
  timerPopupButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
  },
  timerPopupButtonText: {
    fontSize: scale(15),
    fontWeight: '600',
    color: '#000',
  },
});
