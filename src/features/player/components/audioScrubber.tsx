/**
 * src/features/player/components/AudioScrubber.tsx
 * 
 * Custom audio scrubber using react-native-audio-api for reverse playback
 * and high-speed forward playback with audio.
 * 
 * Install: npx expo install react-native-audio-api
 */

import { useEffect, useRef, useCallback, useState } from 'react';

// Types for react-native-audio-api
interface AudioContext {
  currentTime: number;
  sampleRate: number;
  destination: AudioDestinationNode;
  createBufferSource(): AudioBufferSourceNode;
  decodeAudioData(data: ArrayBuffer): Promise<AudioBuffer>;
  close(): void;
}

interface AudioBuffer {
  duration: number;
  length: number;
  numberOfChannels: number;
  sampleRate: number;
  getChannelData(channel: number): Float32Array;
}

interface AudioBufferSourceNode {
  buffer: AudioBuffer | null;
  playbackRate: { value: number };
  connect(destination: AudioDestinationNode): void;
  disconnect(): void;
  start(when?: number, offset?: number): void;
  stop(): void;
  onended: (() => void) | null;
}

interface AudioDestinationNode {}

// Dynamic import to handle when library isn't installed
let AudioContextClass: new () => AudioContext;

export async function initAudioScrubber(): Promise<boolean> {
  try {
    const audioApi = await import('react-native-audio-api');
    AudioContextClass = audioApi.AudioContext;
    return true;
  } catch (e) {
    console.warn('react-native-audio-api not available, falling back to seek-based scrubbing');
    return false;
  }
}

interface UseScrubberOptions {
  audioUrl: string | null;
  currentPosition: number;
  onSeek: (position: number) => Promise<void>;
  onPlay: () => Promise<void>;
  onPause: () => Promise<void>;
}

export function useAudioScrubber({
  audioUrl,
  currentPosition,
  onSeek,
  onPlay,
  onPause,
}: UseScrubberOptions) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubDelta, setScrubDelta] = useState(0);
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const bufferCacheRef = useRef<Map<string, AudioBuffer>>(new Map());
  const scrubStartPosRef = useRef(0);
  const scrubIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize
  useEffect(() => {
    initAudioScrubber().then(available => {
      setIsAvailable(available);
      if (available && AudioContextClass) {
        audioCtxRef.current = new AudioContextClass();
      }
    });

    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  // Load audio chunk
  const loadChunk = useCallback(async (url: string, startSec: number, durationSec: number): Promise<AudioBuffer | null> => {
    if (!audioCtxRef.current || !url) return null;
    
    const cacheKey = `${url}-${startSec}-${durationSec}`;
    if (bufferCacheRef.current.has(cacheKey)) {
      return bufferCacheRef.current.get(cacheKey)!;
    }

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioCtxRef.current.decodeAudioData(arrayBuffer);
      bufferCacheRef.current.set(cacheKey, audioBuffer);
      return audioBuffer;
    } catch (e) {
      console.error('Failed to load audio chunk:', e);
      return null;
    }
  }, []);

  // Start scrubbing with audio
  const startScrub = useCallback(async (direction: 'forward' | 'backward', speed: number) => {
    if (!isAvailable || !audioUrl) {
      // Fallback to seek-based scrubbing
      return false;
    }

    setIsScrubbing(true);
    scrubStartPosRef.current = currentPosition;
    setScrubDelta(0);

    await onPause();

    // Load current chunk
    const buffer = await loadChunk(audioUrl, 0, 30);
    if (!buffer || !audioCtxRef.current) {
      setIsScrubbing(false);
      return false;
    }

    // Create source and set playback rate
    const source = audioCtxRef.current.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = direction === 'backward' ? -speed : speed;
    source.connect(audioCtxRef.current.destination);
    
    // Calculate start offset in buffer
    const bufferOffset = Math.min(currentPosition, buffer.duration - 0.1);
    source.start(0, bufferOffset);
    
    sourceRef.current = source;

    // Track position
    const startTime = audioCtxRef.current.currentTime;
    scrubIntervalRef.current = setInterval(() => {
      if (!audioCtxRef.current) return;
      const elapsed = audioCtxRef.current.currentTime - startTime;
      const delta = elapsed * (direction === 'backward' ? -speed : speed);
      setScrubDelta(delta);
    }, 50);

    return true;
  }, [isAvailable, audioUrl, currentPosition, onPause, loadChunk]);

  // Stop scrubbing
  const stopScrub = useCallback(async (resumePlayback: boolean) => {
    if (scrubIntervalRef.current) {
      clearInterval(scrubIntervalRef.current);
      scrubIntervalRef.current = null;
    }

    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
        sourceRef.current.disconnect();
      } catch (e) {
        // Ignore errors from already stopped source
      }
      sourceRef.current = null;
    }

    // Seek to new position
    const newPosition = Math.max(0, scrubStartPosRef.current + scrubDelta);
    await onSeek(newPosition);

    setIsScrubbing(false);
    setScrubDelta(0);

    if (resumePlayback) {
      await onPlay();
    }
  }, [scrubDelta, onSeek, onPlay]);

  return {
    isAvailable,
    isScrubbing,
    scrubDelta,
    startScrub,
    stopScrub,
  };
}