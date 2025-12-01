/**
 * src/navigation/components/FloatingTabBar.tsx
 *
 * 3-button circular navigation bar with skeuomorphic lighting.
 * Layout: [Search] [MiniPlayer] [Home]
 */

import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
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
        {/* Search Button - Left */}
        <SkeuomorphicButton
          buttonId="nav-search"
          lightPosition="left"
          shape="circle"
          size={SIDE_BUTTON_SIZE}
          onPress={handleSearchPress}
        >
          <Icon name="search-outline" size={24} color="#FFFFFF" set="ionicons" />
        </SkeuomorphicButton>

        {/* Mini Player Button - Center */}
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

        {/* Home Button - Right */}
        <SkeuomorphicButton
          buttonId="nav-home"
          lightPosition="right"
          shape="circle"
          size={SIDE_BUTTON_SIZE}
          onPress={handleHomePress}
        >
          <Icon
            name={isHomeTab ? 'home' : 'home-outline'}
            size={24}
            color="#FFFFFF"
            set="ionicons"
          />
        </SkeuomorphicButton>
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
});
