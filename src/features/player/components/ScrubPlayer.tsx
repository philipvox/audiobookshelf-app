/**
 * src/features/player/components/ScrubPlayer.tsx
 * 
 * Audio scrubber with true reverse playback.
 * 
 * Install: npx expo install react-native-audio-api
 */

import { useEffect, useRef, useCallback, useState } from 'react';

let AudioContextClass: any = null;
let audioApiLoaded = false;
let audioApiAvailable = false;

async function loadAudioApi(): Promise<boolean> {
  if (audioApiLoaded) return audioApiAvailable;
  
  try {
    const api = await import('react-native-audio-api');
    AudioContextClass = api.AudioContext;
    audioApiAvailable = true;
    console.log('ScrubPlayer: library loaded');
  } catch (e) {
    console.log('ScrubPlayer: library not installed');
    audioApiAvailable = false;
  }
  
  audioApiLoaded = true;
  return audioApiAvailable;
}

interface ScrubPlayerProps {
  audioUrl: string | null;
  currentPosition: number;
  totalDuration: number;
}

export function useScrubPlayer({ audioUrl, currentPosition, totalDuration }: ScrubPlayerProps) {
  const [isReady, setIsReady] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubDelta, setScrubDelta] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  const ctxRef = useRef<any>(null);
  const sourceRef = useRef<any>(null);
  const gainRef = useRef<any>(null);
  const bufferRef = useRef<any>(null);
  const reversedBufferRef = useRef<any>(null);
  const loadedUrlRef = useRef<string | null>(null);
  const bufferDurationRef = useRef(0);
  
  const scrubStartPos = useRef(0);
  const scrubStartTime = useRef(0);
  const directionRef = useRef<'forward' | 'backward'>('forward');
  const speedRef = useRef(1);
  const updateInterval = useRef<NodeJS.Timeout | null>(null);
  const wasPlayingRef = useRef(false);
  const currentPosRef = useRef(currentPosition);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    currentPosRef.current = currentPosition;
  }, [currentPosition]);

  useEffect(() => {
    const init = async () => {
      const available = await loadAudioApi();
      if (!available || !AudioContextClass) {
        setIsReady(false);
        return;
      }
      
      try {
        ctxRef.current = new AudioContextClass();
        gainRef.current = ctxRef.current.createGain();
        gainRef.current.connect(ctxRef.current.destination);
        setIsReady(true);
      } catch (e) {
        setIsReady(false);
      }
    };
    
    init();

    return () => {
      stopSource();
      abortRef.current?.abort();
      if (ctxRef.current) {
        try { ctxRef.current.close(); } catch (e) {}
      }
    };
  }, []);

  const stopSource = useCallback(() => {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
        sourceRef.current.disconnect();
      } catch (e) {}
      sourceRef.current = null;
    }
    if (updateInterval.current) {
      clearInterval(updateInterval.current);
      updateInterval.current = null;
    }
  }, []);

  const reverseBuffer = useCallback((ctx: any, buffer: any): any => {
    const reversed = ctx.createBuffer(
      buffer.numberOfChannels,
      buffer.length,
      buffer.sampleRate
    );
    
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const src = buffer.getChannelData(ch);
      const dst = reversed.getChannelData(ch);
      const len = src.length;
      for (let i = 0; i < len; i++) {
        dst[i] = src[len - 1 - i];
      }
    }
    
    return reversed;
  }, []);

  const ensureLoaded = useCallback(async (): Promise<boolean> => {
    if (!ctxRef.current || !audioUrl) return false;
    
    if (loadedUrlRef.current === audioUrl && bufferRef.current) {
      return true;
    }
    
    if (loadedUrlRef.current !== audioUrl) {
      bufferRef.current = null;
      reversedBufferRef.current = null;
    }
    
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    
    setIsLoading(true);
    
    try {
      console.log('ScrubPlayer: Loading...', audioUrl.substring(0, 50));
      
      const response = await fetch(audioUrl, {
        signal: abortRef.current.signal,
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const arrayBuffer = await response.arrayBuffer();
      console.log('ScrubPlayer: Downloaded', (arrayBuffer.byteLength / 1024 / 1024).toFixed(1), 'MB');
      
      bufferRef.current = await ctxRef.current.decodeAudioData(arrayBuffer);
      bufferDurationRef.current = bufferRef.current.duration;
      console.log('ScrubPlayer: Buffer duration:', bufferDurationRef.current.toFixed(1), 's');
      console.log('ScrubPlayer: Book duration:', totalDuration.toFixed(1), 's');
      
      reversedBufferRef.current = reverseBuffer(ctxRef.current, bufferRef.current);
      
      loadedUrlRef.current = audioUrl;
      setIsLoading(false);
      return true;
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error('ScrubPlayer: Load failed:', e);
      }
      setIsLoading(false);
      return false;
    }
  }, [audioUrl, totalDuration, reverseBuffer]);

  const startScrub = useCallback(async (
    direction: 'forward' | 'backward',
    speed: number,
    wasPlaying: boolean
  ): Promise<boolean> => {
    if (!ctxRef.current || !gainRef.current) return false;
    
    const loaded = await ensureLoaded();
    if (!loaded || !bufferRef.current) return false;
    
    const buffer = direction === 'backward' ? reversedBufferRef.current : bufferRef.current;
    if (!buffer) return false;
    
    stopSource();
    
    const bufDuration = bufferDurationRef.current;
    const pos = currentPosRef.current;
    
    // Map book position to buffer position
    // If buffer is shorter than book (multi-file), clamp to buffer range
    const posInBuffer = Math.min(pos, bufDuration);
    
    setIsScrubbing(true);
    scrubStartPos.current = pos;
    scrubStartTime.current = ctxRef.current.currentTime;
    directionRef.current = direction;
    speedRef.current = speed;
    wasPlayingRef.current = wasPlaying;
    setScrubDelta(0);
    
    try {
      const source = ctxRef.current.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = speed;
      source.connect(gainRef.current);
      
      // Calculate offset in the buffer
      let offset: number;
      if (direction === 'backward') {
        // Reversed buffer: position 0 = end of original, position duration = start of original
        // To hear what's at posInBuffer going backwards, start at (bufDuration - posInBuffer)
        offset = bufDuration - posInBuffer;
      } else {
        // Forward: start at current position
        offset = posInBuffer;
      }
      
      // Clamp to valid range
      offset = Math.max(0, Math.min(bufDuration - 0.01, offset));
      
      console.log(`ScrubPlayer: ${direction} from book pos ${pos.toFixed(1)}s, buffer offset ${offset.toFixed(1)}s, speed ${speed}x`);
      
      source.start(0, offset);
      sourceRef.current = source;
      
      // Track delta
      updateInterval.current = setInterval(() => {
        if (!ctxRef.current || !isScrubbing) return;
        
        const elapsed = ctxRef.current.currentTime - scrubStartTime.current;
        const moved = elapsed * speedRef.current;
        const delta = directionRef.current === 'backward' ? -moved : moved;
        const newPos = scrubStartPos.current + delta;
        
        // Boundary check
        if (newPos <= 0) {
          stopSource();
          setIsScrubbing(false);
          setScrubDelta(-scrubStartPos.current);
          return;
        }
        if (newPos >= totalDuration) {
          stopSource();
          setIsScrubbing(false);
          setScrubDelta(totalDuration - scrubStartPos.current);
          return;
        }
        
        setScrubDelta(delta);
      }, 50);
      
      return true;
    } catch (e) {
      console.error('ScrubPlayer: Start failed:', e);
      setIsScrubbing(false);
      return false;
    }
  }, [totalDuration, ensureLoaded, stopSource, isScrubbing]);

  const stopScrub = useCallback((): { newPosition: number; wasPlaying: boolean } => {
    stopSource();
    
    const newPosition = Math.max(0, Math.min(totalDuration, scrubStartPos.current + scrubDelta));
    const wasPlaying = wasPlayingRef.current;
    
    console.log(`ScrubPlayer: Stopped at ${newPosition.toFixed(1)}s`);
    
    setIsScrubbing(false);
    setScrubDelta(0);
    
    return { newPosition, wasPlaying };
  }, [scrubDelta, totalDuration, stopSource]);

  const preload = useCallback(async () => {
    if (!isReady || isLoading || isScrubbing) return;
    await ensureLoaded();
  }, [isReady, isLoading, isScrubbing, ensureLoaded]);

  const setVolume = useCallback((vol: number) => {
    if (gainRef.current) {
      gainRef.current.gain.value = Math.max(0, Math.min(1, vol));
    }
  }, []);

  return {
    isReady,
    isScrubbing,
    scrubDelta,
    isLoading,
    startScrub,
    stopScrub,
    preload,
    setVolume,
  };
}