/**
 * src/features/player/components/AudioWaveform.tsx
 * Cross-platform audio waveform visualization using real audio samples
 * Android requires RECORD_AUDIO permission for sample listener
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { 
  useAudioSampleListener, 
  AudioPlayer,
  requestRecordingPermissionsAsync,
} from 'expo-audio';
import { audioService } from '../services/audioService';
import { WAVEFORM_WIDTH, WAVEFORM_HEIGHT, NUM_POINTS } from '../constants';

interface AudioWaveformProps {
  color: string;
  isPlaying: boolean;
}

// Global permission state
let permissionGranted: boolean | null = null;

export async function requestWaveformPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  if (permissionGranted !== null) return permissionGranted;
  
  try {
    const { granted } = await requestRecordingPermissionsAsync();
    permissionGranted = granted;
    return granted;
  } catch {
    permissionGranted = false;
    return false;
  }
}

function WaveformPath({ points, color }: { points: number[]; color: string }) {
  const midY = WAVEFORM_HEIGHT / 2;
  const amplitude = WAVEFORM_HEIGHT / 2 - 4;
  
  let path = `M 0 ${midY}`;
  const allPoints = [0.5, ...points, 0.5];
  
  for (let i = 1; i < allPoints.length; i++) {
    const x = (i / (allPoints.length - 1)) * WAVEFORM_WIDTH;
    const y = midY + (allPoints[i] - 0.5) * 2 * amplitude;
    const prevX = ((i - 1) / (allPoints.length - 1)) * WAVEFORM_WIDTH;
    const prevY = midY + (allPoints[i - 1] - 0.5) * 2 * amplitude;
    const cpX = (prevX + x) / 2;
    path += ` C ${cpX} ${prevY} ${cpX} ${y} ${x} ${y}`;
  }

  return (
    <Svg width={WAVEFORM_WIDTH} height={WAVEFORM_HEIGHT}>
      <Path
        d={path}
        stroke={color}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function LiveWaveform({ color, player, isPlaying }: { 
  color: string; 
  player: AudioPlayer; 
  isPlaying: boolean;
}) {
  const [points, setPoints] = useState<number[]>(() => Array(NUM_POINTS).fill(0.5));
  const pointsRef = useRef<number[]>(Array(NUM_POINTS).fill(0.5));
  const targetRef = useRef<number[]>(Array(NUM_POINTS).fill(0.5));
  const animFrameRef = useRef<number | null>(null);
  const isPlayingRef = useRef(isPlaying);
  const rmsHistoryRef = useRef<number[]>([]);
  const isSilentRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    if (!isPlaying) {
      targetRef.current = Array(NUM_POINTS).fill(0.5);
    }
  }, [isPlaying]);

  useEffect(() => {
    mountedRef.current = true;
    if (Platform.OS === 'android') {
      requestWaveformPermission();
    }
    return () => {
      mountedRef.current = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  useAudioSampleListener(player, (sample) => {
    if (!mountedRef.current || !isPlayingRef.current) return;
    
    try {
      const frames = sample.channels?.[0]?.frames;
      if (!frames?.length) return;
      
      // Calculate RMS for silence detection
      let sumSquares = 0;
      for (let i = 0; i < frames.length; i++) {
        sumSquares += frames[i] * frames[i];
      }
      const rms = Math.sqrt(sumSquares / frames.length);
      
      // Rolling average
      rmsHistoryRef.current.push(rms);
      if (rmsHistoryRef.current.length > 5) rmsHistoryRef.current.shift();
      const avgRms = rmsHistoryRef.current.reduce((a, b) => a + b, 0) / rmsHistoryRef.current.length;
      
      // Hysteresis for silence detection
      if (isSilentRef.current) {
        if (avgRms > 0.02) isSilentRef.current = false;
      } else {
        if (avgRms < 0.008) isSilentRef.current = true;
      }
      
      if (isSilentRef.current) {
        targetRef.current = Array(NUM_POINTS).fill(0.5);
        return;
      }
      
      // Sample points from audio
      const chunkSize = Math.max(1, Math.floor(frames.length / NUM_POINTS));
      const newPoints: number[] = [];
      for (let i = 0; i < NUM_POINTS; i++) {
        const value = frames[Math.floor(i * chunkSize)] || 0;
        newPoints.push(0.5 + Math.max(-0.45, Math.min(0.45, value * 3)));
      }
      
      targetRef.current = newPoints;
    } catch {
      // Player released - ignore
    }
  });

  useEffect(() => {
    const animate = () => {
      if (!mountedRef.current) return;
      
      pointsRef.current = pointsRef.current.map((p, i) => {
        const target = targetRef.current[i] ?? 0.5;
        const diff = target - p;
        if (Math.abs(diff) < 0.002) return target;
        return p + diff * (Math.abs(target - 0.5) < 0.01 ? 0.5 : 0.4);
      });
      
      setPoints([...pointsRef.current]);
      animFrameRef.current = requestAnimationFrame(animate);
    };
    
    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return <WaveformPath points={points} color={color} />;
}

export function AudioWaveform({ color, isPlaying }: AudioWaveformProps) {
  const [player, setPlayer] = useState<AudioPlayer | null>(null);
  const [playerId, setPlayerId] = useState(0);
  
  useEffect(() => {
    let mounted = true;
    
    const check = () => {
      if (!mounted) return;
      const p = audioService.getPlayer();
      const id = audioService.getPlayerId();
      
      if (id !== playerId) {
        setPlayerId(id);
        setPlayer(p);
      } else if (p !== player) {
        setPlayer(p);
      }
    };
    
    check();
    const interval = setInterval(check, 300);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [player, playerId]);

  // Always show flat waveform when no player
  if (!player) {
    return (
      <View style={styles.container}>
        <WaveformPath points={Array(NUM_POINTS).fill(0.5)} color={color} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LiveWaveform 
        key={playerId}
        color={color} 
        player={player} 
        isPlaying={isPlaying}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: WAVEFORM_WIDTH,
    height: WAVEFORM_HEIGHT,
    alignSelf: 'center',
    marginVertical: 12,
  },
});