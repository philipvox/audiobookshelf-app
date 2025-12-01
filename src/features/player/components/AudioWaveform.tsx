/**
 * src/features/player/components/AudioWaveform.tsx
 *
 * Waveform visualization matching the design
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { WAVEFORM_HEIGHT } from '../constants';

interface AudioWaveformProps {
  color?: string;
  isPlaying?: boolean;
  width?: number;
}

export function AudioWaveform({
  color = 'rgba(255,255,255,0.4)',
  isPlaying = false,
  width = 340,
}: AudioWaveformProps) {
  return (
    <View style={styles.container}>
      <View style={styles.background} />
      <Svg
        width="100%"
        height={WAVEFORM_HEIGHT}
        viewBox={`0 0 ${width} ${WAVEFORM_HEIGHT}`}
        preserveAspectRatio="none"
      >
        <Path
          d="M0 12 Q10 12 20 11 T40 13 T60 10 T80 14 T100 9 T120 15 T140 11 T160 13 T180 10 T200 14 T220 11 T240 13 T260 10 T280 14 T300 11 T320 13 T340 12"
          stroke={color}
          strokeWidth={1.5}
          fill="none"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
    height: WAVEFORM_HEIGHT,
    marginBottom: 16,
    overflow: 'hidden',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'black',
    borderRadius: 4,
  },
});

export default AudioWaveform;
