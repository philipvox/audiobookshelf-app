/**
 * src/features/player/components/WaveformProgress.tsx
 *
 * Seekable waveform progress container with visual wave decoration.
 */

import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  GestureResponderEvent,
  Dimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CONTAINER_MARGIN = 16;
const CONTAINER_WIDTH = SCREEN_WIDTH - CONTAINER_MARGIN * 2;
const CONTAINER_HEIGHT = 50;
const CONTAINER_RADIUS = 8;

interface WaveformProgressProps {
  /** Current progress 0-1 */
  progress: number;
  /** Seek callback with new progress 0-1 */
  onSeek: (progress: number) => void;
  /** Is audio currently playing */
  isPlaying: boolean;
}

/**
 * Generate a simple waveform SVG path
 */
function generateWaveformPath(width: number, height: number): string {
  const points: string[] = [];
  const midY = height / 2;
  const numWaves = 40;
  const waveWidth = width / numWaves;

  points.push(`M 0 ${midY}`);

  for (let i = 0; i < numWaves; i++) {
    const x = i * waveWidth;
    // Vary amplitude semi-randomly based on position
    const amplitude = (Math.sin(i * 0.7) * 0.3 + Math.sin(i * 1.3) * 0.2 + 0.5) * (height * 0.4);
    const y1 = midY - amplitude;
    const y2 = midY + amplitude;

    // Draw up and down
    points.push(`L ${x + waveWidth * 0.25} ${y1}`);
    points.push(`L ${x + waveWidth * 0.5} ${midY}`);
    points.push(`L ${x + waveWidth * 0.75} ${y2}`);
    points.push(`L ${x + waveWidth} ${midY}`);
  }

  return points.join(' ');
}

export function WaveformProgress({
  progress,
  onSeek,
  isPlaying,
}: WaveformProgressProps) {
  const waveformPath = generateWaveformPath(CONTAINER_WIDTH - 16, CONTAINER_HEIGHT - 16);

  const handlePress = useCallback(
    (event: GestureResponderEvent) => {
      const { locationX } = event.nativeEvent;
      const newProgress = Math.max(0, Math.min(1, locationX / CONTAINER_WIDTH));
      onSeek(newProgress);
    },
    [onSeek]
  );

  const progressWidth = progress * CONTAINER_WIDTH;

  return (
    <Pressable style={styles.container} onPress={handlePress}>
      {/* Waveform visualization */}
      <View style={styles.waveformContainer}>
        <Svg
          width={CONTAINER_WIDTH - 16}
          height={CONTAINER_HEIGHT - 16}
          style={styles.waveform}
        >
          <Path
            d={waveformPath}
            stroke="rgba(255,255,255,0.3)"
            strokeWidth={2}
            fill="none"
          />
        </Svg>

        {/* Progress overlay with clipped waveform */}
        <View style={[styles.progressOverlay, { width: progressWidth }]}>
          <Svg
            width={CONTAINER_WIDTH - 16}
            height={CONTAINER_HEIGHT - 16}
            style={styles.waveform}
          >
            <Path
              d={waveformPath}
              stroke="rgba(255,255,255,0.8)"
              strokeWidth={2}
              fill="none"
            />
          </Svg>
        </View>
      </View>

      {/* Playhead indicator */}
      <View
        style={[
          styles.playhead,
          { left: Math.max(4, Math.min(CONTAINER_WIDTH - 4, progressWidth)) },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CONTAINER_WIDTH,
    height: CONTAINER_HEIGHT,
    backgroundColor: '#1a1a1a',
    borderRadius: CONTAINER_RADIUS,
    marginHorizontal: CONTAINER_MARGIN,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  waveformContainer: {
    position: 'relative',
    paddingHorizontal: 8,
    height: CONTAINER_HEIGHT - 16,
  },
  waveform: {
    position: 'absolute',
    top: 0,
    left: 8,
  },
  progressOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  playhead: {
    position: 'absolute',
    top: 8,
    bottom: 8,
    width: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
});

export default WaveformProgress;
