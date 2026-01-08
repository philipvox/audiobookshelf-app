/**
 * src/shared/components/ToastContainer.tsx
 *
 * Global toast display component.
 * Add this to your root navigator to render toasts from useToast().
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

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  FadeIn,
  FadeOut,
  SlideInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react-native';
import { useToastStore, Toast, ToastType } from '@/shared/hooks/useToast';
import { scale, spacing, radius, useThemeColors } from '@/shared/theme';

// ============================================================================
// CONSTANTS
// ============================================================================

const TOAST_ICONS: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const TOAST_COLORS: Record<ToastType, string> = {
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
};

// ============================================================================
// TOAST ITEM COMPONENT
// ============================================================================

interface ToastItemProps {
  toast: Toast;
  onDismiss: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const themeColors = useThemeColors();
  const Icon = TOAST_ICONS[toast.type];
  const iconColor = TOAST_COLORS[toast.type];

  return (
    <Animated.View
      entering={SlideInUp.duration(250)}
      exiting={FadeOut.duration(200)}
      style={[styles.toast, { borderLeftColor: iconColor, backgroundColor: themeColors.backgroundSecondary }]}
    >
      <Icon size={scale(20)} color={iconColor} />
      <Text style={[styles.message, { color: themeColors.text }]} numberOfLines={3}>
        {toast.message}
      </Text>
      <TouchableOpacity
        onPress={onDismiss}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.dismissButton}
      >
        <X size={scale(16)} color={themeColors.textSecondary} />
      </TouchableOpacity>
    </Animated.View>
  );
};

// ============================================================================
// CONTAINER COMPONENT
// ============================================================================

export const ToastContainer: React.FC = () => {
  const insets = useSafeAreaInsets();
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  if (toasts.length === 0) return null;

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
    // backgroundColor set via themeColors in JSX
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
    // color set via themeColors in JSX
    lineHeight: scale(20),
  },
  dismissButton: {
    padding: spacing.xs,
  },
});

export default ToastContainer;
