/**
 * src/features/home/components/SwipeableCardStack.tsx
 * 
 * Swipeable card stack - swipe up to cycle cards
 * Top card goes to back, next card comes to front
 */

import React, { useState, useRef } from 'react';
import { View, StyleSheet, Animated, PanResponder, Dimensions } from 'react-native';
import { LibraryItem } from '@/core/types';
import { ContinueListeningCard, CARD_HEIGHT } from './ContinueListeningCard';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = 50;
const CARD_OFFSET = 20; // Vertical offset between stacked cards
const CARD_SCALE_DIFF = 0.05; // Scale difference between cards

interface SwipeableCardStackProps {
  items: LibraryItem[];
  maxCards?: number;
}

export function SwipeableCardStack({ items, maxCards = 3 }: SwipeableCardStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const translateY = useRef(new Animated.Value(0)).current;
  const isAnimating = useRef(false);

  const visibleItems = items.slice(0, Math.min(items.length, maxCards + 1));
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isAnimating.current,
      onMoveShouldSetPanResponder: (_, gesture) => {
        return !isAnimating.current && Math.abs(gesture.dy) > 10;
      },
      onPanResponderMove: (_, gesture) => {
        // Only allow upward swipe (negative dy)
        if (gesture.dy < 0) {
          translateY.setValue(gesture.dy);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy < -SWIPE_THRESHOLD && items.length > 1) {
          // Swipe up - animate card off screen then cycle
          isAnimating.current = true;
          
          Animated.timing(translateY, {
            toValue: -CARD_HEIGHT - 50,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            // Cycle to next card
            setCurrentIndex(prev => (prev + 1) % items.length);
            translateY.setValue(0);
            isAnimating.current = false;
          });
        } else {
          // Snap back
          Animated.spring(translateY, {
            toValue: 0,
            tension: 100,
            friction: 10,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  if (items.length === 0) return null;

  // Build visible card array based on current index
  const getVisibleCards = () => {
    const cards = [];
    for (let i = 0; i < Math.min(maxCards, items.length); i++) {
      const itemIndex = (currentIndex + i) % items.length;
      cards.push({
        item: items[itemIndex],
        stackIndex: i,
      });
    }
    return cards;
  };

  const visibleCards = getVisibleCards();
  
  // Stack height based on visible cards
  const stackHeight = CARD_HEIGHT + (Math.min(maxCards, items.length) - 1) * CARD_OFFSET;

  return (
    <View style={[styles.container, { height: stackHeight }]} {...panResponder.panHandlers}>
      {/* Render cards from back to front */}
      {visibleCards.reverse().map(({ item, stackIndex }, renderIndex) => {
        const isTopCard = stackIndex === 0;
        const zIndex = maxCards - stackIndex;
        const baseScale = 1 - stackIndex * CARD_SCALE_DIFF;
        const baseTranslateY = stackIndex * CARD_OFFSET;
        
        // Interpolations for swipe animation
        const cardTranslateY = isTopCard 
          ? Animated.add(translateY, baseTranslateY)
          : translateY.interpolate({
              inputRange: [-CARD_HEIGHT, 0],
              outputRange: [baseTranslateY - CARD_OFFSET, baseTranslateY],
              extrapolate: 'clamp',
            });
        
        const cardScale = isTopCard
          ? baseScale
          : translateY.interpolate({
              inputRange: [-CARD_HEIGHT, 0],
              outputRange: [baseScale + CARD_SCALE_DIFF, baseScale],
              extrapolate: 'clamp',
            });
        
        const cardOpacity = isTopCard
          ? translateY.interpolate({
              inputRange: [-CARD_HEIGHT, -CARD_HEIGHT / 2, 0],
              outputRange: [0, 0.7, 1],
              extrapolate: 'clamp',
            })
          : 1;

        return (
          <Animated.View
            key={`${item.id}-${stackIndex}`}
            style={[
              styles.cardWrapper,
              {
                zIndex,
                transform: [
                  { translateY: cardTranslateY },
                  { scale: cardScale },
                ],
                opacity: cardOpacity,
              },
            ]}
          >
            <ContinueListeningCard
              book={item}
              zIndex={zIndex}
            />
          </Animated.View>
        );
      })}
      
      {/* Swipe indicator dots */}
      {items.length > 1 && (
        <View style={styles.dotsContainer}>
          {items.slice(0, Math.min(5, items.length)).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                currentIndex % items.length === i && styles.dotActive,
              ]}
            />
          ))}
          {items.length > 5 && <View style={styles.dot} />}
        </View>
      )}
    </View>
  );
}

export { CARD_HEIGHT, CARD_OFFSET };

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  cardWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  dotsContainer: {
    position: 'absolute',
    bottom: -25,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});