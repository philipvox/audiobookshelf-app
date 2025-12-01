/**
 * src/features/player/components/QuickActionsRow.tsx
 *
 * Quick actions row: Time | Sleep | Heart | Speed
 * Layout: 00:00        moon 1m        heart        1x
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Icon } from '@/shared/components/Icon';
import { formatTime } from '../utils';

interface QuickActionsRowProps {
  /** Current playback position in seconds */
  currentTime: number;
  /** Sleep timer remaining in minutes, null if not set */
  sleepTimer: number | null;
  /** Whether book is in user's library/favorites */
  isFavorite: boolean;
  /** Current playback speed multiplier */
  playbackRate: number;
  /** Handler for sleep timer button */
  onSleepPress: () => void;
  /** Handler for favorite/heart button */
  onFavoritePress: () => void;
  /** Handler for speed button */
  onSpeedPress: () => void;
}

export function QuickActionsRow({
  currentTime,
  sleepTimer,
  isFavorite,
  playbackRate,
  onSleepPress,
  onFavoritePress,
  onSpeedPress,
}: QuickActionsRowProps) {
  return (
    <View style={styles.container}>
      {/* Current Time */}
      <Text style={styles.time}>{formatTime(currentTime)}</Text>

      {/* Sleep Timer */}
      <TouchableOpacity
        style={styles.action}
        onPress={onSleepPress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Icon
          name={sleepTimer ? 'moon' : 'moon-outline'}
          size={20}
          color="#FFFFFF"
          set="ionicons"
        />
        {sleepTimer !== null && (
          <Text style={styles.sleepLabel}>{sleepTimer}m</Text>
        )}
      </TouchableOpacity>

      {/* Favorite */}
      <TouchableOpacity
        style={styles.action}
        onPress={onFavoritePress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Icon
          name={isFavorite ? 'heart' : 'heart-outline'}
          size={20}
          color={isFavorite ? '#FF6B6B' : '#FFFFFF'}
          set="ionicons"
        />
      </TouchableOpacity>

      {/* Playback Speed */}
      <TouchableOpacity
        style={styles.action}
        onPress={onSpeedPress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.speed}>{playbackRate}x</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  time: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    minWidth: 50,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sleepLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  speed: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default QuickActionsRow;
