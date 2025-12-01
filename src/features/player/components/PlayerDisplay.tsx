/**
 * src/features/player/components/PlayerDisplay.tsx
 * 
 * Main display panel matching the HTML mockup.
 * Contains: artwork, title/chapter, waveform, time/controls row
 */

import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, {
  Defs,
  Filter,
  FeFlood,
  FeBlend,
  FeColorMatrix,
  FeMorphology,
  FeOffset,
  FeGaussianBlur,
  FeComposite,
  RadialGradient,
  LinearGradient,
  Stop,
  Rect,
  Path,
  Mask,
  G,
} from 'react-native-svg';
import { GlassPanel } from './GlassPanel';

const GAP = 5;
const BUTTON_WIDTH = 128;
const DISPLAY_WIDTH = BUTTON_WIDTH * 3 + GAP * 2; // 394
const DISPLAY_PADDING = 16;
const ARTWORK_SIZE = DISPLAY_WIDTH - DISPLAY_PADDING * 2; // 362

interface PlayerDisplayProps {
  title: string;
  chapter: string;
  coverUrl?: string;
  currentTime: string;
  progress: number; // 0-1
  playbackRate: string;
  isFavorite?: boolean;
  onFavoritePress?: () => void;
  onSpeedPress?: () => void;
}

export function PlayerDisplay({
  title,
  chapter,
  coverUrl,
  currentTime,
  progress,
  playbackRate,
  isFavorite = false,
  onFavoritePress,
  onSpeedPress,
}: PlayerDisplayProps) {
  const displayHeight = DISPLAY_PADDING + ARTWORK_SIZE + 16 + 60 + 16 + 48 + 16 + 24 + DISPLAY_PADDING;

  return (
    <GlassPanel width={DISPLAY_WIDTH} height={displayHeight} variant="display">
      <View style={styles.content}>
        {/* Artwork */}
        <View style={styles.artworkContainer}>
          <ArtworkWithShadow size={ARTWORK_SIZE} coverUrl={coverUrl} />
        </View>

        {/* Title row */}
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.chapter}>{chapter}</Text>
        </View>

        {/* Waveform */}
        <View style={styles.waveformContainer}>
          <View style={styles.waveformBg} />
          <Waveform progress={progress} />
        </View>

        {/* Controls row */}
        <View style={styles.controlsRow}>
          <Text style={styles.time}>{currentTime}</Text>
          
          <TouchableOpacity style={styles.controlItem}>
            <RewindIcon />
            <Text style={styles.controlText}>1m</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlItem} onPress={onFavoritePress}>
            <HeartIcon filled={isFavorite} />
          </TouchableOpacity>

          <TouchableOpacity onPress={onSpeedPress}>
            <Text style={styles.speed}>{playbackRate}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </GlassPanel>
  );
}

function ArtworkWithShadow({ size, coverUrl }: { size: number; coverUrl?: string }) {
  return (
    <View style={[styles.artwork, { width: size, height: size }]}>
      {/* SVG with shadow and overlay effects */}
      <Svg
        width={size}
        height={size}
        viewBox="0 0 382 382"
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <Filter
            id="artworkShadow"
            x="0"
            y="0"
            width="382"
            height="396"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <FeFlood floodOpacity="0" result="BackgroundImageFix" />
            <FeBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
            <FeColorMatrix
              in="SourceAlpha"
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
              result="hardAlpha"
            />
            <FeMorphology radius="1" operator="erode" in="SourceAlpha" result="effect1_innerShadow" />
            <FeOffset dy="14" />
            <FeGaussianBlur stdDeviation="17" />
            <FeComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
            <FeColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" />
            <FeBlend mode="normal" in2="shape" result="effect1_innerShadow" />
          </Filter>
          <RadialGradient
            id="artRadial1"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(349 149) rotate(138.976) scale(522.312 115.329)"
          >
            <Stop stopColor="white" />
            <Stop offset="1" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient
            id="artRadial2"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(191 34.5) rotate(90) scale(107.5 308.283)"
          >
            <Stop stopColor="white" />
            <Stop offset="1" stopOpacity="0" />
          </RadialGradient>
          <LinearGradient
            id="artLinear"
            x1="333"
            y1="318.5"
            x2="404.5"
            y2="305.5"
            gradientUnits="userSpaceOnUse"
          >
            <Stop stopOpacity="0" />
            <Stop offset="1" />
          </LinearGradient>
        </Defs>
        {/* Base shape with inner shadow - placeholder gray */}
        <G filter="url(#artworkShadow)">
          <Rect width="382" height="382" rx="11" fill="#D9D9D9" />
        </G>
        {/* Overlay layers */}
        <Rect width="382" height="382" rx="11" fill="url(#artRadial1)" fillOpacity="0.1" />
        <Rect width="382" height="382" rx="11" fill="url(#artRadial2)" fillOpacity="0.1" />
        <Rect width="382" height="382" rx="11" fill="url(#artLinear)" fillOpacity="0.2" />
        <Rect width="382" height="382" rx="11" fill="black" fillOpacity="0.34" />
        {/* Border */}
        <Rect
          x="0.5"
          y="0.5"
          width="381"
          height="381"
          rx="10.5"
          stroke="white"
          strokeOpacity="0.5"
          fill="none"
        />
      </Svg>
      
      {/* Actual cover image */}
      {coverUrl && (
        <Image
          source={{ uri: coverUrl }}
          style={styles.coverImage}
          resizeMode="cover"
        />
      )}
      
      {/* Darkening overlay on cover */}
      <View style={styles.coverOverlay} />
    </View>
  );
}

function Waveform({ progress }: { progress: number }) {
  // Generate a simple waveform path
  const waveformPath = `M0 24 
    Q5 24 10 22 T20 26 T30 20 T40 28 T50 18 T60 30 T70 16 T80 32 T90 14 T100 34 
    T110 12 T120 36 T130 10 T140 38 T150 12 T160 36 T170 14 T180 34 T190 16 T200 32 
    T210 18 T220 30 T230 20 T240 28 T250 22 T260 26 T270 24 T280 24 T290 22 T300 26 
    T310 20 T320 28 T330 22 T340 24`;

  return (
    <Svg
      width="100%"
      height={48}
      viewBox="0 0 340 48"
      preserveAspectRatio="none"
      style={styles.waveformSvg}
    >
      <Path
        d={waveformPath}
        stroke="rgba(255,255,255,0.4)"
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function RewindIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3C7.03 3 3 7.03 3 12H0L4 16L8 12H5C5 8.13 8.13 5 12 5C15.87 5 19 8.13 19 12C19 15.87 15.87 19 12 19C10.07 19 8.32 18.21 7.06 16.94L5.64 18.36C7.27 19.99 9.51 21 12 21C16.97 21 21 16.97 21 12C21 7.03 16.97 3 12 3Z"
        fill="rgba(255,255,255,0.5)"
      />
    </Svg>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth={2}
        fill={filled ? 'rgba(255,255,255,0.5)' : 'none'}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: DISPLAY_PADDING,
  },
  artworkContainer: {
    marginBottom: 16,
  },
  artwork: {
    borderRadius: 11,
    overflow: 'hidden',
  },
  coverImage: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 11,
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.34)',
    borderRadius: 11,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'System',
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
    lineHeight: 26,
    flex: 1,
    marginRight: 12,
  },
  chapter: {
    fontFamily: 'Courier',
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  waveformContainer: {
    position: 'relative',
    width: '100%',
    height: 48,
    marginBottom: 16,
  },
  waveformBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
    borderRadius: 4,
  },
  waveformSvg: {
    position: 'relative',
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