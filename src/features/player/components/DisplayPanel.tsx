/**
 * src/features/player/components/DisplayPanel.tsx
 *
 * Main display panel for the media player with artwork, title, waveform, and controls
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';
import { GradientPanel } from './GradientPanel';
import { AudioWaveform } from './AudioWaveform';
import {
  PLAYER_PADDING,
  DISPLAY_WIDTH,
  DISPLAY_PADDING,
  COVER_SIZE,
  RADIUS,
} from '../constants';
import { formatTime } from '../utils';

interface DisplayPanelProps {
  coverUrl: string;
  title: string;
  chapterTitle: string;
  position: number;
  duration: number;
  playbackRate: number;
  isPlaying: boolean;
  onCoverPress?: () => void;
  onChapterPress?: () => void;
  onSpeedPress?: () => void;
}

export function DisplayPanel({
  coverUrl,
  title,
  chapterTitle,
  position,
  playbackRate,
  isPlaying,
  onCoverPress,
  onChapterPress,
  onSpeedPress,
}: DisplayPanelProps) {
  return (
    <View style={styles.container}>
      <GradientPanel variant="display" style={styles.panel}>
        <View style={styles.content}>
          {/* Artwork */}
          <TouchableOpacity
            style={styles.artworkContainer}
            onPress={onCoverPress}
            activeOpacity={0.9}
          >
            <View style={styles.artworkWrapper}>
              <Image
                source={coverUrl}
                style={styles.artwork}
                contentFit="cover"
                transition={300}
              />
              {/* Inner shadow overlay */}
              <View style={styles.artworkShadow} />
              {/* Border */}
              <View style={styles.artworkBorder} />
            </View>
          </TouchableOpacity>

          {/* Title Row */}
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
            <TouchableOpacity onPress={onChapterPress}>
              <Text style={styles.chapter}>{chapterTitle}</Text>
            </TouchableOpacity>
          </View>

          {/* Waveform */}
          <AudioWaveform
            color="rgba(255,255,255,0.4)"
            isPlaying={isPlaying}
          />

          {/* Controls Row */}
          <View style={styles.controlsRow}>
            <Text style={styles.time}>{formatTime(position)}</Text>

            <View style={styles.controlItem}>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 3C7.03 3 3 7.03 3 12H0L4 16L8 12H5C5 8.13 8.13 5 12 5C15.87 5 19 8.13 19 12C19 15.87 15.87 19 12 19C10.07 19 8.32 18.21 7.06 16.94L5.64 18.36C7.27 19.99 9.51 21 12 21C16.97 21 21 16.97 21 12C21 7.03 16.97 3 12 3Z"
                  fill="rgba(255,255,255,0.5)"
                />
              </Svg>
              <Text style={styles.controlText}>1m</Text>
            </View>

            <View style={styles.controlItem}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z"
                  stroke="rgba(255,255,255,0.5)"
                  strokeWidth={2}
                  fill="none"
                />
              </Svg>
            </View>

            <TouchableOpacity onPress={onSpeedPress}>
              <Text style={styles.speed}>{playbackRate}x</Text>
            </TouchableOpacity>
          </View>
        </View>
      </GradientPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: PLAYER_PADDING,
  },
  panel: {
    width: DISPLAY_WIDTH,
  },
  content: {
    padding: DISPLAY_PADDING,
  },
  artworkContainer: {
    marginBottom: 16,
  },
  artworkWrapper: {
    width: COVER_SIZE,
    aspectRatio: 1,
    borderRadius: 11,
    overflow: 'hidden',
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  artworkShadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // Inner shadow from top
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 1,
    shadowRadius: 17,
  },
  artworkBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 11,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    flex: 1,
    fontFamily: 'System',
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
    lineHeight: 26,
    marginRight: 12,
  },
  chapter: {
    fontFamily: 'Courier',
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  time: {
    fontFamily: 'System',
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontVariant: ['tabular-nums'],
  },
  controlItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  controlText: {
    fontFamily: 'System',
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  speed: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
  },
});
