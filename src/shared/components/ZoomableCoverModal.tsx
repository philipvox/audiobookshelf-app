/**
 * src/shared/components/ZoomableCoverModal.tsx
 *
 * Fullscreen cover zoom modal with pinch-to-zoom and pan gestures.
 * Triggered by pinch gesture on a cover image, displays the cover
 * in a fullscreen overlay with interactive zoom controls.
 */

import React, { useCallback } from 'react';
import { Modal, View, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';

interface ZoomableCoverModalProps {
  visible: boolean;
  coverUrl: string | null;
  onClose: () => void;
}

const SPRING_CONFIG = { damping: 20, stiffness: 200 };
const MIN_SCALE = 1;
const MAX_SCALE = 5;

export function ZoomableCoverModal({ visible, coverUrl, onClose }: ZoomableCoverModalProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const resetTransform = useCallback(() => {
    'worklet';
    scale.value = withSpring(1, SPRING_CONFIG);
    translateX.value = withSpring(0, SPRING_CONFIG);
    translateY.value = withSpring(0, SPRING_CONFIG);
    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, []);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      'worklet';
      const newScale = savedScale.value * e.scale;
      scale.value = Math.min(Math.max(newScale, MIN_SCALE * 0.5), MAX_SCALE);
    })
    .onEnd(() => {
      'worklet';
      // Snap back if below minimum
      if (scale.value < MIN_SCALE) {
        scale.value = withSpring(MIN_SCALE, SPRING_CONFIG);
        translateX.value = withSpring(0, SPRING_CONFIG);
        translateY.value = withSpring(0, SPRING_CONFIG);
        savedScale.value = MIN_SCALE;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        savedScale.value = scale.value;
      }
    });

  const panGesture = Gesture.Pan()
    .minPointers(1)
    .onUpdate((e) => {
      'worklet';
      if (scale.value > 1) {
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
      }
    })
    .onEnd(() => {
      'worklet';
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      'worklet';
      if (scale.value > 1.5) {
        // Zoomed in — reset
        resetTransform();
      } else {
        // Zoom to 3x
        scale.value = withSpring(3, SPRING_CONFIG);
        savedScale.value = 3;
      }
    });

  const composedGesture = Gesture.Simultaneous(
    pinchGesture,
    panGesture,
    doubleTapGesture,
  );

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const handleClose = useCallback(() => {
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    onClose();
  }, [onClose]);

  // Cover fills width with aspect ratio preserved
  const coverSize = Math.min(screenWidth, screenHeight * 0.8);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={styles.root}>
        <Pressable style={styles.backdrop} onPress={handleClose}>
          <View style={styles.container}>
            <GestureDetector gesture={composedGesture}>
              <Animated.View style={[styles.imageWrap, animatedImageStyle]}>
                <Pressable onPress={(e) => e.stopPropagation()}>
                  <Image
                    source={coverUrl ? { uri: coverUrl } : undefined}
                    style={{ width: coverSize, height: coverSize }}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                  />
                </Pressable>
              </Animated.View>
            </GestureDetector>
          </View>
        </Pressable>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
