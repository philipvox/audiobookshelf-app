/**
 * src/features/player/components/FloatingPlayerNav.tsx
 * 
 * Light themed floating navigation inside the player screen.
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { usePlayerStore } from '../stores/playerStore';
import { Icon } from '@/shared/components/Icon';

const CONTAINER_HEIGHT = 56;
const CIRCLE_SIZE = 44;
const CENTER_GAP = 6;

const LIGHT_BG = 'rgba(255, 255, 255, 0.85)';
const LIGHT_PILL = 'rgba(255, 255, 255, 0.95)';
const ICON_COLOR = '#1C1C1E';

export function FloatingPlayerNav() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { closePlayer } = usePlayerStore();

  const handleHome = () => {
    closePlayer();
    navigation.navigate('HomeTab');
  };

  const handleLibrary = () => {
    closePlayer();
    navigation.navigate('LibraryTab');
  };

  const handleSearch = () => {
    closePlayer();
    navigation.navigate('Search');
  };

  return (
    <View style={[
      styles.wrapper,
      { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 },
    ]}>
      <View style={styles.container}>
        {/* Home */}
        <TouchableOpacity style={styles.circleButton} onPress={handleHome} activeOpacity={0.7}>
          <Icon name="home-outline" size={24} color={ICON_COLOR} set="ionicons" />
        </TouchableOpacity>

        {/* Center: Library + Discover */}
        <View style={styles.centerPill}>
          <TouchableOpacity style={styles.centerTab} onPress={handleLibrary} activeOpacity={0.7}>
            <Icon name="library-outline" size={24} color={ICON_COLOR} set="ionicons" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.centerTab} onPress={() => navigation.navigate('DiscoverTab')} activeOpacity={0.7}>
            <Icon name="compass-outline" size={24} color={ICON_COLOR} set="ionicons" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.centerTab} onPress={() => navigation.navigate('ProfileTab')} activeOpacity={0.7}>
            <Icon name="person-outline" size={24} color={ICON_COLOR} set="ionicons" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <TouchableOpacity style={styles.circleButton} onPress={handleSearch} activeOpacity={0.7}>
          <Icon name="search-outline" size={24} color={ICON_COLOR} set="ionicons" />
        </TouchableOpacity>
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
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LIGHT_BG,
    borderRadius: CONTAINER_HEIGHT / 2,
    height: CONTAINER_HEIGHT,
    paddingHorizontal: 6,
    gap: CENTER_GAP,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  circleButton: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: LIGHT_PILL,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerPill: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: LIGHT_PILL,
    borderRadius: (CIRCLE_SIZE - 4) / 2,
    height: CIRCLE_SIZE - 4,
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  centerTab: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.5,
  },
});