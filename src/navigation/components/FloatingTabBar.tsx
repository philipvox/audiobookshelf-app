/**
 * src/navigation/components/FloatingTabBar.tsx
 *
 * 3-button circular navigation bar.
 * Layout: [Search] [MiniPlayer] [Home]
 *
 * Side buttons: Simple #262626 fill with #B3B3B3 icons (from SVG spec)
 * Center button: Full skeuomorphic treatment with gradients
 */

import React, { useCallback, useRef } from 'react';
import { View, StyleSheet, Dimensions, Pressable, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { usePlayerStore } from '@/features/player';
import { apiClient } from '@/core/api';
import { Icon } from '@/shared/components/Icon';
import { SkeuomorphicButton } from '@/shared/components/SkeuomorphicButton';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Button sizes
const SIDE_BUTTON_SIZE = 56;
const CENTER_BUTTON_SIZE = 80;
const BUTTON_GAP = 24;

// Calculate horizontal padding to center the buttons
const TOTAL_BUTTONS_WIDTH = SIDE_BUTTON_SIZE * 2 + CENTER_BUTTON_SIZE + BUTTON_GAP * 2;
const HORIZONTAL_PADDING = (SCREEN_WIDTH - TOTAL_BUTTONS_WIDTH) / 2;

// Icon color for side nav buttons (from SVG spec)
const NAV_ICON_COLOR = '#B3B3B3';

/**
 * Simple circular nav button for search/home.
 * From SVG: just #262626 fill with #B3B3B3 icon, no gradients.
 */
interface SimpleNavButtonProps {
  onPress: () => void;
  children: React.ReactNode;
}

function SimpleNavButton({ onPress, children }: SimpleNavButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.simpleButton}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const { currentBook, isPlaying, play, pause } = usePlayerStore();

  const isHomeTab = state.routes[state.index]?.name === 'HomeTab';
  const coverUrl = currentBook ? apiClient.getItemCoverUrl(currentBook.id) : null;

  const handleSearchPress = () => {
    nav.navigate('Search');
  };

  const handleHomePress = () => {
    navigation.navigate('HomeTab');
  };

  const handlePlayPress = async () => {
    if (!currentBook) {
      // If no book loaded, go to home
      navigation.navigate('HomeTab');
      return;
    }
    if (isPlaying) {
      await pause();
    } else {
      await play();
    }
  };

  const handlePlayLongPress = () => {
    if (currentBook) {
      usePlayerStore.setState({ isPlayerVisible: true });
    }
  };

  return (
    <View
      style={[
        styles.wrapper,
        { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 },
      ]}
    >
      <View style={styles.container}>
        {/* Search Button - Left (simple style per SVG spec) */}
        <SimpleNavButton onPress={handleSearchPress}>
          <Icon name="search-outline" size={24} color={NAV_ICON_COLOR} set="ionicons" />
        </SimpleNavButton>

        {/* Mini Player Button - Center (full skeuomorphic) */}
        <SkeuomorphicButton
          buttonId="nav-player"
          lightPosition="center"
          shape="circle"
          size={CENTER_BUTTON_SIZE}
          coverImageUrl={coverUrl}
          onPress={handlePlayPress}
          onLongPress={handlePlayLongPress}
        >
          <Icon
            name={currentBook && isPlaying ? 'pause' : 'play'}
            size={32}
            color="#FFFFFF"
            set="ionicons"
          />
        </SkeuomorphicButton>

        {/* Home Button - Right (simple style per SVG spec) */}
        <SimpleNavButton onPress={handleHomePress}>
          <Icon
            name={isHomeTab ? 'home' : 'home-outline'}
            size={24}
            color={NAV_ICON_COLOR}
            set="ionicons"
          />
        </SimpleNavButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 16,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  simpleButton: {
    width: SIDE_BUTTON_SIZE,
    height: SIDE_BUTTON_SIZE,
    borderRadius: SIDE_BUTTON_SIZE / 2,
    backgroundColor: '#262626',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
