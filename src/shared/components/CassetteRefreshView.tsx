/**
 * src/shared/components/CassetteRefreshView.tsx
 *
 * A ScrollView wrapper with cassette-themed pull-to-refresh.
 * Drop-in replacement that adds the cassette animation to any ScrollView.
 */

import React, { useCallback, useState, ReactNode } from 'react';
import {
  ScrollView,
  ScrollViewProps,
  RefreshControl,
  View,
  StyleSheet,
  Platform,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { CassetteRefreshControl } from './CassetteRefreshControl';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

// Accent color
const ACCENT_COLOR = '#F4B60C';

interface CassetteRefreshViewProps extends Omit<ScrollViewProps, 'refreshControl'> {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  refreshing?: boolean;
  tintColor?: string;
  showsCassetteLoader?: boolean;
}

export function CassetteRefreshView({
  children,
  onRefresh,
  refreshing: externalRefreshing,
  tintColor = ACCENT_COLOR,
  showsCassetteLoader = true,
  ...scrollViewProps
}: CassetteRefreshViewProps) {
  const [internalRefreshing, setInternalRefreshing] = useState(false);
  const scrollY = useSharedValue(0);
  const [pullProgress, setPullProgress] = useState(0);

  const refreshing = externalRefreshing ?? internalRefreshing;

  const handleRefresh = useCallback(async () => {
    if (externalRefreshing === undefined) {
      setInternalRefreshing(true);
    }
    try {
      await onRefresh();
    } finally {
      if (externalRefreshing === undefined) {
        setInternalRefreshing(false);
      }
    }
  }, [onRefresh, externalRefreshing]);

  // Track scroll position
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Cassette loader style - appears during pull
  const cassetteStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [-80, -40, 0],
      [1, 0.5, 0],
      Extrapolation.CLAMP
    );

    const scale = interpolate(
      scrollY.value,
      [-100, -50, 0],
      [1, 0.8, 0.5],
      Extrapolation.CLAMP
    );

    const translateY = interpolate(
      scrollY.value,
      [-100, 0],
      [0, -50],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ scale }, { translateY }],
    };
  });

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    if (y < 0) {
      // Calculate progress from 0 to 1 based on pull distance
      const progress = Math.min(Math.abs(y) / 80, 1);
      setPullProgress(progress);
    } else {
      setPullProgress(0);
    }
  }, []);

  // Use platform-specific refresh control
  // On iOS, we can show the cassette animation above the content
  // On Android, the standard RefreshControl animation is more expected

  if (Platform.OS === 'android') {
    // Android: Use standard RefreshControl with custom color
    return (
      <ScrollView
        {...scrollViewProps}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[tintColor]}
            progressBackgroundColor="#303030"
          />
        }
      >
        {children}
      </ScrollView>
    );
  }

  // iOS: Show cassette animation during pull
  return (
    <View style={styles.container}>
      {/* Cassette loader - positioned above scroll content */}
      {showsCassetteLoader && (
        <Animated.View style={[styles.cassetteContainer, cassetteStyle]}>
          <CassetteRefreshControl
            refreshing={refreshing}
            progress={pullProgress}
            tintColor={tintColor}
            size={50}
          />
        </Animated.View>
      )}

      <AnimatedScrollView
        {...scrollViewProps}
        onScroll={(e) => {
          scrollHandler(e);
          handleScroll(e);
          scrollViewProps.onScroll?.(e);
        }}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="transparent" // Hide default spinner
          />
        }
      >
        {children}
      </AnimatedScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cassetteContainer: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
});
