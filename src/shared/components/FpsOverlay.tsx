/**
 * src/shared/components/FpsOverlay.tsx
 *
 * Floating FPS counter overlay for development.
 * Measures frame rate using requestAnimationFrame.
 * Toggle via Developer Settings.
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Store for FPS overlay toggle (persisted)
interface FpsStore {
  showFps: boolean;
  setShowFps: (v: boolean) => void;
}

export const useFpsStore = create<FpsStore>()(
  persist(
    (set) => ({
      showFps: false,
      setShowFps: (v) => set({ showFps: v }),
    }),
    { name: 'fps-store', storage: createJSONStorage(() => AsyncStorage) }
  )
);

function FpsCounter() {
  const [fps, setFps] = useState(60);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const rafId = useRef<number>(0);

  useEffect(() => {
    const tick = () => {
      frameCount.current++;
      const now = performance.now();
      const delta = now - lastTime.current;
      if (delta >= 1000) {
        setFps(Math.round((frameCount.current * 1000) / delta));
        frameCount.current = 0;
        lastTime.current = now;
      }
      rafId.current = requestAnimationFrame(tick);
    };
    rafId.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId.current);
  }, []);

  const color = fps >= 50 ? '#4CAF50' : fps >= 30 ? '#FFC107' : '#F44336';

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={[styles.badge, { borderColor: color }]}>
        <Text style={[styles.text, { color }]}>{fps}</Text>
        <Text style={[styles.label, { color }]}>FPS</Text>
      </View>
    </View>
  );
}

export function FpsOverlay() {
  const showFps = useFpsStore((s) => s.showFps);
  const setShowFps = useFpsStore((s) => s.setShowFps);

  // Auto-disable: if persisted state was left on, turn it off
  useEffect(() => {
    if (showFps) setShowFps(false);
  }, []);

  if (!showFps) return null;
  return <FpsCounter />;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 8,
    zIndex: 9999,
  },
  badge: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontSize: 8,
    fontWeight: '600',
  },
});
