/**
 * src/features/player/contexts/PlayerTransitionContext.tsx
 * 
 * Context for managing card-to-player animations.
 */

import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { Animated, Dimensions, LayoutRectangle } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CardLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  coverUrl: string;
  backgroundColor: string;
}

interface PlayerTransitionContextType {
  startTransition: (layout: CardLayout) => void;
  cardLayout: CardLayout | null;
  animatedValue: Animated.Value;
  isAnimating: boolean;
  completeTransition: () => void;
}

const PlayerTransitionContext = createContext<PlayerTransitionContextType | null>(null);

export function PlayerTransitionProvider({ children }: { children: React.ReactNode }) {
  const [cardLayout, setCardLayout] = useState<CardLayout | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const animatedValue = useRef(new Animated.Value(0)).current;

  const startTransition = useCallback((layout: CardLayout) => {
    setCardLayout(layout);
    setIsAnimating(true);
    animatedValue.setValue(0);

    Animated.spring(animatedValue, {
      toValue: 1,
      tension: 40,
      friction: 8,
      useNativeDriver: true,
    }).start(() => {
      setIsAnimating(false);
    });
  }, [animatedValue]);

  const completeTransition = useCallback(() => {
    setCardLayout(null);
    setIsAnimating(false);
    animatedValue.setValue(0);
  }, [animatedValue]);

  return (
    <PlayerTransitionContext.Provider
      value={{
        startTransition,
        cardLayout,
        animatedValue,
        isAnimating,
        completeTransition,
      }}
    >
      {children}
    </PlayerTransitionContext.Provider>
  );
}

export function usePlayerTransition() {
  const context = useContext(PlayerTransitionContext);
  if (!context) {
    throw new Error('usePlayerTransition must be used within PlayerTransitionProvider');
  }
  return context;
}