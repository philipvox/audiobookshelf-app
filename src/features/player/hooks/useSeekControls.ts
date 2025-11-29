/**
 * src/features/player/hooks/useSeekControls.ts
 * 
 * Hook to manage tape-recorder style hold-to-seek behavior
 * With bulletproof cleanup to prevent runaway seeking
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { usePlayerStore } from '../stores/playerStore';

interface UseSeekControlsOptions {
  skipAmount?: number;
  seekSpeed?: number;
  seekInterval?: number;
}

export function useSeekControls(options: UseSeekControlsOptions = {}) {
  const {
    skipAmount = 30,
    seekSpeed = 2,
    seekInterval = 100,
  } = options;

  const position = usePlayerStore(s => s.position);
  const duration = usePlayerStore(s => s.duration);
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const seekTo = usePlayerStore(s => s.seekTo);
  const pause = usePlayerStore(s => s.pause);
  const play = usePlayerStore(s => s.play);
  
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekDelta, setSeekDelta] = useState(0);
  
  // All mutable state in refs to avoid closure issues
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const seekDeltaRef = useRef(0);
  const startPositionRef = useRef(0);
  const wasPlayingRef = useRef(false);
  const directionRef = useRef<'back' | 'forward'>('forward');
  const durationRef = useRef(duration);

  // Keep duration ref updated
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  // Cleanup function
  const stopSeeking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return stopSeeking;
  }, [stopSeeking]);

  const onSkipBack = useCallback(() => {
    const newPos = Math.max(0, position - skipAmount);
    seekTo(newPos);
  }, [position, skipAmount, seekTo]);

  const onSkipForward = useCallback(() => {
    const newPos = Math.min(duration, position + skipAmount);
    seekTo(newPos);
  }, [position, duration, skipAmount, seekTo]);

  const onSeekStart = useCallback((direction: 'back' | 'forward') => {
    // Always stop any existing interval first
    stopSeeking();
    
    // Initialize
    directionRef.current = direction;
    seekDeltaRef.current = 0;
    startPositionRef.current = position;
    wasPlayingRef.current = isPlaying;
    
    setIsSeeking(true);
    setSeekDelta(0);
    
    // Pause during seek
    pause();
    
    // Create new interval
    intervalRef.current = setInterval(() => {
      const delta = directionRef.current === 'forward' ? seekSpeed : -seekSpeed;
      seekDeltaRef.current += delta;
      
      const newPosition = Math.max(0, Math.min(durationRef.current, startPositionRef.current + seekDeltaRef.current));
      
      setSeekDelta(seekDeltaRef.current);
      seekTo(newPosition);
    }, seekInterval);
    
  }, [position, isPlaying, pause, seekTo, seekSpeed, seekInterval, stopSeeking]);

  const onSeekEnd = useCallback(() => {
    // Stop the interval
    stopSeeking();
    
    const finalPosition = Math.max(0, Math.min(durationRef.current, startPositionRef.current + seekDeltaRef.current));
    const shouldResume = wasPlayingRef.current;
    
    // Reset
    setIsSeeking(false);
    setSeekDelta(0);
    seekDeltaRef.current = 0;
    
    // Final seek and resume
    seekTo(finalPosition);
    if (shouldResume) {
      play();
    }
  }, [seekTo, play, stopSeeking]);

  return {
    isSeeking,
    seekDelta,
    onSkipBack,
    onSkipForward,
    onSeekStart,
    onSeekEnd,
  };
}