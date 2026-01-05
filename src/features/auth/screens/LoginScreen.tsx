/**
 * Login screen with updated design system
 * Enhanced with real-time URL validation feedback per UX research
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Check, X, AlertCircle, Eye, EyeOff } from 'lucide-react-native';
import { useAuth } from '@/core/auth';
import { Button } from '@/shared/components';
import { colors, spacing, radius, scale } from '@/shared/theme';
import { logger } from '@/shared/utils/logger';

// App logo (horizontal version with text)
const APP_LOGO = require('../../../../assets/login-logo.png');

/**
 * Normalize server URL to standard format:
 * - Adds https:// if no protocol specified
 * - Removes trailing slashes
 * - Validates basic URL structure
 */
function normalizeServerUrl(url: string): { normalized: string; corrected: boolean; error?: string } {
  let normalized = url.trim();
  let corrected = false;

  if (!normalized) {
    return { normalized: '', corrected: false, error: 'Please enter a server URL' };
  }

  // Add protocol if missing
  if (!normalized.match(/^https?:\/\//i)) {
    // Check if it looks like it has a protocol but wrong format
    if (normalized.includes('://')) {
      return { normalized, corrected: false, error: 'Invalid URL protocol. Use http:// or https://' };
    }
    // Default to https for security
    normalized = `https://${normalized}`;
    corrected = true;
  }

  // Remove trailing slashes
  while (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
    corrected = true;
  }

  // Basic URL validation
  try {
    const parsed = new URL(normalized);
    if (!parsed.hostname) {
      return { normalized, corrected: false, error: 'Invalid server URL' };
    }
  } catch {
    return { normalized, corrected: false, error: 'Invalid server URL format' };
  }

  return { normalized, corrected };
}

export function LoginScreen() {
  const { login, isLoading, error, clearError } = useAuth();

  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [urlCorrectionMsg, setUrlCorrectionMsg] = useState('');

  // Real-time URL validation status
  type UrlStatus = 'empty' | 'valid' | 'correctable' | 'invalid';
  const urlValidation = useMemo<{ status: UrlStatus; message: string; normalized?: string }>(() => {
    const trimmed = serverUrl.trim();
    if (!trimmed) {
      return { status: 'empty', message: '' };
    }

    // Check for invalid protocols
    if (trimmed.includes('://') && !trimmed.match(/^https?:\/\//i)) {
      return { status: 'invalid', message: 'Use http:// or https://' };
    }

    // Try to normalize
    let normalized = trimmed;
    let corrected = false;

    // Add protocol if missing
    if (!normalized.match(/^https?:\/\//i)) {
      normalized = `https://${normalized}`;
      corrected = true;
    }

    // Remove trailing slashes
    while (normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }

    // Validate URL structure
    try {
      const parsed = new URL(normalized);
      if (!parsed.hostname) {
        return { status: 'invalid', message: 'Enter a valid hostname' };
      }

      // Valid URL
      if (corrected) {
        return {
          status: 'correctable',
          message: `Will connect to ${normalized}`,
          normalized,
        };
      }
      return { status: 'valid', message: 'URL looks good', normalized };
    } catch {
      return { status: 'invalid', message: 'Invalid URL format' };
    }
  }, [serverUrl]);

  // Load last used server URL
  useEffect(() => {
    loadLastServerUrl();
  }, []);

  // Clear errors when inputs change
  useEffect(() => {
    if (validationError) {
      setValidationError('');
    }
    if (urlCorrectionMsg) {
      setUrlCorrectionMsg('');
    }
    // Also clear auth errors when user makes changes
    if (error) {
      clearError();
    }
  }, [serverUrl, username, password]);

  // Show auth errors inline (better UX than Alert)
  // Errors are shown in the errorText below the form

  const loadLastServerUrl = async () => {
    try {
      const { authService } = await import('@/core/auth');
      const lastUrl = await authService.getStoredServerUrl();
      if (lastUrl) {
        setServerUrl(lastUrl);
      }
    } catch (err) {
      logger.error('[Login] Failed to load last server URL:', err);
    }
  };

  const validateInputs = (): { valid: boolean; normalizedUrl?: string } => {
    // Use pre-computed URL validation
    if (urlValidation.status === 'empty') {
      setValidationError('Please enter a server URL');
      return { valid: false };
    }
    if (urlValidation.status === 'invalid') {
      setValidationError(urlValidation.message);
      return { valid: false };
    }

    // Show correction message if URL was auto-corrected
    if (urlValidation.status === 'correctable' && urlValidation.normalized) {
      setUrlCorrectionMsg(`Connecting to: ${urlValidation.normalized}`);
      setServerUrl(urlValidation.normalized);
    }

    if (!username.trim()) {
      setValidationError('Please enter a username');
      return { valid: false };
    }
    if (!password) {
      setValidationError('Please enter a password');
      return { valid: false };
    }
    return { valid: true, normalizedUrl: urlValidation.normalized };
  };

  const handleLogin = async () => {
    const result = validateInputs();
    if (!result.valid || !result.normalizedUrl) {
      return;
    }

    try {
      await login(result.normalizedUrl, username.trim(), password);
    } catch (err) {
      // Error handled by context
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={APP_LOGO}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.subtitle}>Connect to your server</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Server URL with real-time validation */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Server URL</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[
                  styles.input,
                  styles.inputWithIcon,
                  urlValidation.status === 'invalid' && styles.inputError,
                  (urlValidation.status === 'valid' || urlValidation.status === 'correctable') && styles.inputValid,
                ]}
                placeholder="server.example.com:13378"
                placeholderTextColor={colors.textTertiary}
                value={serverUrl}
                onChangeText={setServerUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                editable={!isLoading}
              />
              {/* Validation status icon */}
              {urlValidation.status === 'valid' && (
                <View style={styles.inputIcon}>
                  <Check size={scale(18)} color="#30D158" strokeWidth={2.5} />
                </View>
              )}
              {urlValidation.status === 'correctable' && (
                <View style={styles.inputIcon}>
                  <AlertCircle size={scale(18)} color={colors.accent} strokeWidth={2} />
                </View>
              )}
              {urlValidation.status === 'invalid' && (
                <View style={styles.inputIcon}>
                  <X size={scale(18)} color="#FF453A" strokeWidth={2.5} />
                </View>
              )}
            </View>
            {/* Inline validation message */}
            {urlValidation.message && urlValidation.status !== 'empty' && (
              <Text
                style={[
                  styles.inlineMessage,
                  urlValidation.status === 'valid' && styles.inlineMessageSuccess,
                  urlValidation.status === 'correctable' && styles.inlineMessageWarning,
                  urlValidation.status === 'invalid' && styles.inlineMessageError,
                ]}
              >
                {urlValidation.message}
              </Text>
            )}
          </View>

          {/* Username */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter username"
              placeholderTextColor={colors.textTertiary}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          {/* Password with visibility toggle */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, styles.inputWithIcon]}
                placeholder="Enter password"
                placeholderTextColor={colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.inputIcon}
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {showPassword ? (
                  <EyeOff size={scale(18)} color={colors.textSecondary} strokeWidth={2} />
                ) : (
                  <Eye size={scale(18)} color={colors.textSecondary} strokeWidth={2} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* URL Correction Notice */}
          {urlCorrectionMsg ? (
            <Text style={styles.correctionText}>{urlCorrectionMsg}</Text>
          ) : null}

          {/* Validation Error */}
          {validationError ? (
            <View style={styles.errorContainer}>
              <AlertCircle size={scale(16)} color="#FF453A" strokeWidth={2} />
              <Text style={styles.errorText}>{validationError}</Text>
            </View>
          ) : null}

          {/* Auth Error (from server) */}
          {error && !validationError ? (
            <View style={styles.errorContainer}>
              <AlertCircle size={scale(16)} color="#FF453A" strokeWidth={2} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Login Button */}
          <Button
            title="Login"
            onPress={handleLogin}
            loading={isLoading}
            disabled={isLoading}
            fullWidth
            size="large"
            style={styles.loginButton}
          />
        </View>

        {/* Help Text */}
        <View style={styles.footer}>
          <Text style={styles.helpText}>
            Enter your server URL and login credentials
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: scale(260),
    height: scale(120),
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  input: {
    fontSize: 15,
    backgroundColor: colors.backgroundPrimary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.textPrimary,
  },
  inputWrapper: {
    position: 'relative',
  },
  inputWithIcon: {
    paddingRight: scale(44),
  },
  inputIcon: {
    position: 'absolute',
    right: spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputError: {
    borderColor: '#FF453A',
  },
  inputValid: {
    borderColor: '#30D158',
  },
  inlineMessage: {
    fontSize: 12,
    marginTop: spacing.xs,
    lineHeight: 16,
  },
  inlineMessageSuccess: {
    color: '#30D158',
  },
  inlineMessageWarning: {
    color: colors.accent,
  },
  inlineMessageError: {
    color: '#FF453A',
  },
  loginButton: {
    marginTop: spacing.xs,
  },
  correctionText: {
    fontSize: 13,
    color: colors.accent,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    borderRadius: radius.sm,
    padding: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#FF453A',
    lineHeight: 18,
  },
  footer: {
    marginTop: spacing.xxl,
    alignItems: 'center',
  },
  helpText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});