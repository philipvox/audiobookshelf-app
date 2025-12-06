/**
 * src/navigation/components/FloatingTabBar.tsx
 *
 * Minimal 3-button floating nav: Search | Player | Home
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, Pressable, StyleSheet, Dimensions, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Svg, { Rect, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { usePlayerStore } from '@/features/player';
import { useCoverUrl } from '@/core/cache';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BUTTON_SIZE = 64;
const BUTTON_GAP = 32;
const VIBRANT_GREEN = '#C8FF00'; // Vibrant green instead of iOS green

// SVG Components - icons centered in circles
const SearchButton: React.FC<{ size?: number }> = ({ size = BUTTON_SIZE }) => (
  <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <Rect width="64" height="64" rx="32" fill="#262626" />
    <Path
      d="M38 38L34.5 34.5M36.5 29.5C36.5 33.09 33.59 36 30 36C26.41 36 23.5 33.09 23.5 29.5C23.5 25.91 26.41 23 30 23C33.59 23 36.5 25.91 36.5 29.5Z"
      stroke="#808080"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const HomeButton: React.FC<{ size?: number; active?: boolean }> = ({
  size = BUTTON_SIZE,
  active = false
}) => (
  <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <Rect width="64" height="64" rx="32" fill={active ? VIBRANT_GREEN : "#262626"} />
    {/* House icon - centered at 32,32 with proper proportions */}
    <Path
      d="M32 21L23 28V38C23 38.55 23.45 39 24 39H29V33H35V39H40C40.55 39 41 38.55 41 38V28L32 21Z"
      stroke={active ? "#1E1E1E" : "#808080"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Svg>
);

// Player button - shows blurred cover of currently playing book
const PlayerButton: React.FC<{
  size?: number;
  isPlaying?: boolean;
  coverUrl?: string | null;
}> = ({
  size = BUTTON_SIZE,
  isPlaying = false,
  coverUrl,
}) => {
  // If we have a cover, show blurred image with play/pause overlay
  if (coverUrl) {
    return (
      <View style={[playerButtonStyles.container, { width: size, height: size, borderRadius: size / 2 }]}>
        <Image
          source={{ uri: coverUrl }}
          style={[playerButtonStyles.coverImage, { width: size, height: size, borderRadius: size / 2 }]}
          blurRadius={3}
        />
        <BlurView
          intensity={15}
          style={[playerButtonStyles.blurOverlay, { borderRadius: size / 2 }]}
          tint="dark"
        />
        <View style={playerButtonStyles.iconOverlay}>
          <Svg width={28} height={28} viewBox="0 0 28 28" fill="none">
            {isPlaying ? (
              <>
                {/* Pause icon */}
                <Rect x="7" y="5" width="5" height="18" rx="1" fill="white" />
                <Rect x="16" y="5" width="5" height="18" rx="1" fill="white" />
              </>
            ) : (
              /* Play icon */
              <Path d="M8 4v20l16-10L8 4z" fill="white" />
            )}
          </Svg>
        </View>
      </View>
    );
  }

  // Fallback: green button with play/pause
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Rect width="64" height="64" rx="32" fill={VIBRANT_GREEN} />
      {isPlaying ? (
        <>
          <Rect x="24" y="22" width="6" height="20" rx="1" fill="#1E1E1E" />
          <Rect x="34" y="22" width="6" height="20" rx="1" fill="#1E1E1E" />
        </>
      ) : (
        <Path d="M26 21v22l18-11-18-11z" fill="#1E1E1E" />
      )}
    </Svg>
  );
};

const playerButtonStyles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  coverImage: {
    position: 'absolute',
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  iconOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// Inner component that uses navigation hooks
function FloatingTabBarInner() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { currentBook, isPlaying, play, pause, isPlayerVisible, closePlayer } = usePlayerStore();
  const [currentRouteName, setCurrentRouteName] = useState('HomeTab');

  // Get cover URL for currently playing book
  const coverUrl = useCoverUrl(currentBook?.id || '');

  // Listen for navigation state changes
  useEffect(() => {
    const unsubscribe = navigation.addListener('state', () => {
      const state = navigation.getState();
      if (state) {
        const route = state.routes[state.index];
        if (route.state) {
          const nestedState = route.state as any;
          setCurrentRouteName(nestedState.routes?.[nestedState.index]?.name || route.name);
        } else {
          setCurrentRouteName(route.name);
        }
      }
    });
    return unsubscribe;
  }, [navigation]);

  const isHomeTab = currentRouteName === 'HomeTab';

  const handleSearchPress = () => {
    if (isPlayerVisible) {
      closePlayer();
    }
    navigation.navigate('Search');
  };

  const handleHomePress = () => {
    if (isPlayerVisible) {
      closePlayer();
    }
    navigation.navigate('Main', { screen: 'HomeTab' });
  };

  // Play button: plays/pauses audio
  const handlePlayerPress = async () => {
    if (!currentBook) {
      // No book loaded, go to library to pick one
      navigation.navigate('Main', { screen: 'LibraryTab' });
      return;
    }
    if (isPlaying) {
      await pause();
    } else {
      await play();
    }
  };

  // Long press: open player screen
  const handlePlayerLongPress = () => {
    if (currentBook) {
      usePlayerStore.setState({ isPlayerVisible: true });
    }
  };

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }]}>
      {/* Bottom gradient: black 0% at top -> black 100% at bottom */}
      <LinearGradient
        colors={['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 1)']}
        style={styles.bottomGradient}
        pointerEvents="none"
      />
      <View style={styles.container}>
        {/* Search Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={handleSearchPress}
          activeOpacity={0.8}
        >
          <SearchButton />
        </TouchableOpacity>

        {/* Player Button - Blurred cover or green fallback */}
        <Pressable
          style={styles.button}
          onPress={handlePlayerPress}
          onLongPress={handlePlayerLongPress}
          delayLongPress={300}
        >
          <PlayerButton isPlaying={isPlaying} coverUrl={coverUrl} />
        </Pressable>

        {/* Home Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={handleHomePress}
          activeOpacity={0.8}
        >
          <HomeButton active={isHomeTab} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Error boundary wrapper - catches navigation errors during initial mount
class FloatingTabBarErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // Silently catch navigation errors during initial mount
    console.log('[FloatingTabBar] Caught error during mount:', error.message);
  }

  componentDidUpdate() {
    // Reset error state after a short delay to try rendering again
    if (this.state.hasError) {
      setTimeout(() => this.setState({ hasError: false }), 100);
    }
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

// Exported component with error boundary
export function FloatingTabBar() {
  return (
    <FloatingTabBarErrorBoundary>
      <FloatingTabBarInner />
    </FloatingTabBarErrorBoundary>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: 180, // Height of the gradient fade
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: BUTTON_GAP,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
  },
});