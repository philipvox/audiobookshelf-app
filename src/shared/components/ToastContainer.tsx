/**
 * src/shared/components/ToastContainer.tsx
 *
 * Global toast display component.
 * Add this to your root navigator to render toasts from useToast().
 *
 * Features:
 * - Slide-in animation from top
 * - Swipe-to-dismiss (horizontal pan gesture)
 * - Optional "Undo" button (golden orange) when toast.onUndo is set
 *
 * Usage in AppNavigator:
 *   import { ToastContainer } from '@/shared/components/ToastContainer';
 *
 *   // At root level, after NavigationContainer
 *   <>
 *     <NavigationContainer>...</NavigationContainer>
 *     <ToastContainer />
 *   </>
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  FadeOut,
  SlideInUp,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react-native';
import { useToastStore, Toast, ToastType } from '@/shared/hooks/useToast';
import { scale, spacing, radius, useTheme } from '@/shared/theme';

// ============================================================================
// CONSTANTS
// ============================================================================

const TOAST_ICONS: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const SWIPE_THRESHOLD = 80;
const UNDO_COLOR = '#E8A020';

// ============================================================================
// TOAST ITEM COMPONENT
// ============================================================================

interface ToastItemProps {
  toast: Toast;
  onDismiss: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const { colors } = useTheme();
  const Icon = TOAST_ICONS[toast.type];
  const translateX = useSharedValue(0);

  // Map toast types to theme semantic colors
  const toastColorMap: Record<ToastType, string> = {
    success: colors.semantic.success,
    error: colors.semantic.error,
    warning: colors.semantic.warning,
    info: colors.semantic.info,
  };
  const iconColor = toastColorMap[toast.type];

  const handleDismiss = () => onDismiss();

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
    })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > SWIPE_THRESHOLD) {
        // Swipe off screen in the direction of the gesture
        const direction = e.translationX > 0 ? 1 : -1;
        translateX.value = withTiming(direction * 400, { duration: 200 }, () => {
          runOnJS(handleDismiss)();
        });
      } else {
        // Snap back
        translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: 1 - Math.min(Math.abs(translateX.value) / 200, 0.5),
  }));

  const handleUndo = () => {
    toast.onUndo?.();
    onDismiss();
  };

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        entering={SlideInUp.duration(250)}
        exiting={FadeOut.duration(200)}
        style={[
          styles.toast,
          { borderLeftColor: iconColor, backgroundColor: colors.background.secondary },
          animatedStyle,
        ]}
      >
        <Icon size={scale(20)} color={iconColor} />
        <Text style={[styles.message, { color: colors.text.primary }]} numberOfLines={3}>
          {toast.message}
        </Text>
        {toast.onUndo && (
          <TouchableOpacity
            onPress={handleUndo}
            style={styles.undoButton}
            hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
          >
            <Text style={styles.undoText}>Undo</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={onDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.dismissButton}
        >
          <X size={scale(16)} color={colors.text.secondary} />
        </TouchableOpacity>
      </Animated.View>
    </GestureDetector>
  );
};

// ============================================================================
// CONTAINER COMPONENT
// ============================================================================

export const ToastContainer: React.FC = () => {
  const insets = useSafeAreaInsets();
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  // Return empty View on Android to prevent SafeAreaProvider crash
  if (toasts.length === 0) return Platform.OS === 'android' ? <View /> : null;

  return (
    <View
      style={[styles.container, { top: insets.top + spacing.md }]}
      pointerEvents="box-none"
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => removeToast(toast.id)}
        />
      ))}
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 9999,
    gap: spacing.sm,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderLeftWidth: 4,
    gap: spacing.sm,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  message: {
    flex: 1,
    fontSize: scale(14),
    lineHeight: scale(20),
  },
  undoButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  undoText: {
    color: UNDO_COLOR,
    fontSize: scale(14),
    fontWeight: '700',
  },
  dismissButton: {
    padding: spacing.xs,
  },
});

export default ToastContainer;
