/**
 * src/shared/components/GlobalCacheProgressBar.tsx
 *
 * A thin yellow progress bar that appears at the top of every screen
 * when image caching is running in the background.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { scale } from '@/shared/theme';
import { secretLibraryDarkColors } from '@/shared/theme/secretLibrary';
import {
  useImageCacheProgressStore,
  formatSpeed,
  formatTimeRemaining,
} from '@/core/stores/imageCacheProgressStore';
import { imageCacheService } from '@/core/services/imageCacheService';

// Use dark theme colors for consistent gold bar styling
const barColors = {
  gold: secretLibraryDarkColors.gold,
  background: secretLibraryDarkColors.background,
};

interface GlobalCacheProgressBarProps {
  /** If true, the bar is positioned absolutely at the top */
  absolute?: boolean;
}

export function GlobalCacheProgressBar({ absolute = true }: GlobalCacheProgressBarProps) {
  const insets = useSafeAreaInsets();
  const { isActive, isBackground, progress, speedBytesPerSecond, estimatedSecondsRemaining } =
    useImageCacheProgressStore();

  // Animation for progress bar
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Progress animation
  useEffect(() => {
    if (progress) {
      Animated.timing(progressAnim, {
        toValue: progress.percentComplete / 100,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [progress?.percentComplete]);

  const handleCancel = () => {
    imageCacheService.cancelCaching();
    useImageCacheProgressStore.getState().reset();
  };

  // Don't render if not active or not in background
  if (!isActive || !isBackground) {
    return null;
  }

  // When absolute, add safe area padding. When not absolute (in layout flow),
  // the status bar is handled by the parent, so no extra padding needed.
  const containerStyle = absolute
    ? [styles.container, styles.absolute, { paddingTop: insets.top }]
    : [styles.container];

  return (
    <View style={containerStyle}>
      {/* Progress bar */}
      <View style={styles.progressBarContainer}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>

      {/* Info row */}
      <View style={styles.infoRow}>
        <Text style={styles.phaseText}>
          Caching {progress?.phase === 'covers' ? 'covers' : 'spines'}...
        </Text>
        <View style={styles.statsRow}>
          <Text style={styles.statText}>
            {formatSpeed(speedBytesPerSecond)}
          </Text>
          <Text style={styles.separator}>|</Text>
          <Text style={styles.statText}>
            {formatTimeRemaining(estimatedSecondsRemaining)} left
          </Text>
          <Text style={styles.separator}>|</Text>
          <Text style={styles.statText}>
            {progress?.percentComplete ?? 0}%
          </Text>
        </View>
        <TouchableOpacity onPress={handleCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <X size={scale(16)} color={barColors.background} strokeWidth={2} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: barColors.gold,
    zIndex: 1000,
  },
  absolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  progressBarContainer: {
    height: scale(3),
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: barColors.background,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
  },
  phaseText: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: scale(11),
    color: barColors.background,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  statText: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: scale(10),
    color: barColors.background,
  },
  separator: {
    marginHorizontal: scale(6),
    color: 'rgba(0,0,0,0.3)',
    fontSize: scale(10),
  },
});

export default GlobalCacheProgressBar;
