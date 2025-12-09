/**
 * src/core/errors/components/ErrorSheet.tsx
 *
 * Bottom sheet component for displaying detailed errors.
 * Shows error details and recovery actions.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppError, ErrorSeverity, RecoveryStrategy } from '../types';

const MONO_FONT = Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' });

interface ErrorSheetProps {
  error: AppError;
  visible: boolean;
  onDismiss: () => void;
  onRetry?: () => void;
  onSecondaryAction?: () => void;
  secondaryActionText?: string;
  showDetails?: boolean;
}

const SEVERITY_COLORS: Record<ErrorSeverity, string> = {
  low: '#4a9eff',
  medium: '#ff9800',
  high: '#ff4444',
  critical: '#d32f2f',
};

const RECOVERY_BUTTONS: Record<RecoveryStrategy, { text: string; icon: string } | null> = {
  retry: { text: 'Try Again', icon: 'refresh' },
  offline: { text: 'Work Offline', icon: 'cloud-offline' },
  reauth: { text: 'Log In Again', icon: 'log-in' },
  manual: null,
  none: null,
};

export function ErrorSheet({
  error,
  visible,
  onDismiss,
  onRetry,
  onSecondaryAction,
  secondaryActionText,
  showDetails = __DEV__,
}: ErrorSheetProps) {
  const insets = useSafeAreaInsets();
  const color = SEVERITY_COLORS[error.severity];
  const recoveryButton = RECOVERY_BUTTONS[error.recovery];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
          onPress={() => {}}
        >
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconCircle, { backgroundColor: `${color}20` }]}>
              <Ionicons name="alert-circle" size={32} color={color} />
            </View>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.subtitle}>{getCategoryLabel(error.category)}</Text>
          </View>

          {/* Message */}
          <View style={styles.messageContainer}>
            <Text style={styles.message}>{error.userMessage}</Text>
          </View>

          {/* Debug Details (DEV only) */}
          {showDetails && (
            <View style={styles.detailsContainer}>
              <Text style={styles.detailsTitle}>Debug Info</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Code:</Text>
                <Text style={styles.detailValue}>{error.code}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Category:</Text>
                <Text style={styles.detailValue}>{error.category}</Text>
              </View>
              {error.context && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Context:</Text>
                  <Text style={styles.detailValue}>{error.context}</Text>
                </View>
              )}
              <Text style={styles.technicalMessage} numberOfLines={3}>
                {error.message}
              </Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            {recoveryButton && onRetry && (
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: color }]}
                onPress={onRetry}
              >
                <Ionicons
                  name={recoveryButton.icon as any}
                  size={20}
                  color="#fff"
                  style={styles.buttonIcon}
                />
                <Text style={styles.primaryButtonText}>{recoveryButton.text}</Text>
              </TouchableOpacity>
            )}

            {onSecondaryAction && secondaryActionText && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={onSecondaryAction}
              >
                <Text style={styles.secondaryButtonText}>{secondaryActionText}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
              <Text style={styles.dismissButtonText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    network: 'Network Error',
    auth: 'Authentication Error',
    sync: 'Sync Error',
    download: 'Download Error',
    playback: 'Playback Error',
    database: 'Storage Error',
    validation: 'Validation Error',
    unknown: 'Error',
  };
  return labels[category] || 'Error';
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingHorizontal: 20,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  messageContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  message: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 22,
    textAlign: 'center',
  },
  detailsContainer: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  detailsTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: MONO_FONT,
    color: 'rgba(255,255,255,0.4)',
    width: 80,
  },
  detailValue: {
    fontSize: 12,
    fontFamily: MONO_FONT,
    color: 'rgba(255,255,255,0.6)',
    flex: 1,
  },
  technicalMessage: {
    fontSize: 11,
    fontFamily: MONO_FONT,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 8,
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonIcon: {
    marginRight: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: '#c1f40c',
    fontSize: 15,
    fontWeight: '500',
  },
  dismissButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  dismissButtonText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
  },
});
