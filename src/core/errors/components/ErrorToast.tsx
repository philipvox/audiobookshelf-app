/**
 * src/core/errors/components/ErrorToast.tsx
 *
 * Toast notification component for error messages.
 * Displays brief, non-blocking error notifications.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { Info, AlertTriangle, AlertCircle, XCircle, X, type LucideIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppError, ErrorSeverity } from '../types';
import { useTheme, scale, spacing, type ThemeColors } from '@/shared/theme';

interface ErrorToastProps {
  error: AppError;
  onDismiss: () => void;
  onAction?: () => void;
  duration?: number;
}

/**
 * Get severity-based colors from theme semantic tokens
 */
function getSeverityColors(severity: ErrorSeverity, colors: ThemeColors) {
  const severityMap = {
    low: { color: colors.semantic.info, bg: colors.semantic.infoLight },
    medium: { color: colors.semantic.warning, bg: colors.semantic.warningLight },
    high: { color: colors.semantic.error, bg: colors.semantic.errorLight },
    critical: { color: colors.semantic.error, bg: colors.semantic.error },
  };
  return severityMap[severity];
}

const SEVERITY_ICONS: Record<ErrorSeverity, LucideIcon> = {
  low: Info,
  medium: AlertTriangle,
  high: AlertCircle,
  critical: XCircle,
};

export function ErrorToast({
  error,
  onDismiss,
  onAction,
  duration = 4000,
}: ErrorToastProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss
    const timer = setTimeout(() => {
      dismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss());
  };

  const severityColors = getSeverityColors(error.severity, colors);
  const IconComponent = SEVERITY_ICONS[error.severity];
  const hasAction = error.recovery === 'retry' || onAction;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 8,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View style={[styles.toast, { borderLeftColor: severityColors.color, backgroundColor: colors.background.elevated }]}>
        <IconComponent size={22} color={severityColors.color} strokeWidth={2} style={styles.icon} />

        <View style={styles.content}>
          <Text style={[styles.message, { color: colors.text.primary }]} numberOfLines={2}>
            {error.userMessage}
          </Text>
        </View>

        <View style={styles.actions}>
          {hasAction && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                onAction?.();
                dismiss();
              }}
            >
              <Text style={[styles.actionText, { color: severityColors.color }]}>
                {error.recovery === 'retry' ? 'Retry' : 'Fix'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.dismissButton} onPress={dismiss}>
            <X size={20} color={colors.text.tertiary} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 9999,
  },
  toast: {
    borderRadius: scale(12),
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  icon: {
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
  },
  message: {
    fontSize: scale(14),
    lineHeight: scale(18),
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  actionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  actionText: {
    fontSize: scale(14),
    fontWeight: '600',
  },
  dismissButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
});
