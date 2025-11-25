// File: src/features/player/components/MiniPlayer.tsx
import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { usePlayerStore } from '../stores/playerStore';
import { useImageColors } from '../hooks/useImageColors';
import { apiClient } from '@/core/api';
import { Icon } from '@/shared/components/Icon';

const BUTTON_SIZE = 74;
const BORDER_WIDTH = 5;

export function MiniPlayer() {
  const insets = useSafeAreaInsets();
  const { currentBook, isPlaying, position, duration, play, pause, togglePlayer } = usePlayerStore();
  
  const coverUrl = currentBook ? apiClient.getItemCoverUrl(currentBook.id) : '';
  const { progressAccent } = useImageColors(coverUrl, currentBook?.id || '');

  if (!currentBook) return null;

  const handlePlayPause = async () => {
    try {
      if (isPlaying) {
        await pause();
      } else {
        await play();
      }
    } catch (error) {
      console.error('Failed to toggle playback:', error);
    }
  };

  const progress = duration > 0 ? position / duration : 0;

  // Progress ring calculations
  const radius = (BUTTON_SIZE - BORDER_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const strokeDashoffset = circumference * (1 - clampedProgress);
  const innerSize = BUTTON_SIZE - BORDER_WIDTH * 2;

  const baseOffset = insets.bottom > 0 ? insets.bottom : 16;
  const bottomOffset = baseOffset - 6;

  const iconName = isPlaying ? 'pause' : 'play';

  return (
    <View style={[styles.container, { bottom: bottomOffset }]}>
      <TouchableOpacity 
        style={styles.button}
        onPress={handlePlayPause}
        onLongPress={togglePlayer}
        delayLongPress={300}
        activeOpacity={0.95}
      >
        {/* Progress ring */}
        <View style={StyleSheet.absoluteFill}>
          <Svg width={BUTTON_SIZE} height={BUTTON_SIZE}>
            {/* Background track */}
            <Circle
              cx={BUTTON_SIZE / 2}
              cy={BUTTON_SIZE / 2}
              r={radius}
              fill="none"
              stroke="rgba(0,0,0,0.15)"
              strokeWidth={BORDER_WIDTH}
            />
            {/* Progress */}
            <Circle
              cx={BUTTON_SIZE / 2}
              cy={BUTTON_SIZE / 2}
              r={radius}
              fill="none"
              stroke={progressAccent}
              strokeWidth={BORDER_WIDTH}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              rotation={-90}
              origin={`${BUTTON_SIZE / 2}, ${BUTTON_SIZE / 2}`}
            />
          </Svg>
        </View>

        {/* Cover image */}
        <Image
          source={{ uri: coverUrl }}
          style={[styles.cover, { width: innerSize, height: innerSize, borderRadius: innerSize / 2 }]}
          resizeMode="cover"
        />

        {/* Centered glow shadow behind icon */}
        <View style={styles.iconWrapper}>
          <View style={styles.iconGlow} />
          <View style={isPlaying ? undefined : styles.playOffset}>
            <Icon name={iconName} size={26} color="#FFFFFF" set="ionicons" />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    zIndex: 999,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    position: 'relative',
    shadowColor: '#000',
   shadowOffset: { width: 0, height: 30 },
    shadowOpacity: 0.35,
    shadowRadius: 54,
    elevation: 12,
  },
  cover: {
    position: 'absolute',
    top: BORDER_WIDTH,
    left: BORDER_WIDTH,
    backgroundColor: '#333',
  },
  iconWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconGlow: {
    position: 'absolute',
    width: 15,
    height: 15,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 25,
    elevation: 10,
  },
  playOffset: {
    paddingLeft: 3,
  },
});