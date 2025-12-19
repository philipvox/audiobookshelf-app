/**
 * src/core/errors/ErrorBoundary.tsx
 *
 * React Error Boundary component for catching render errors.
 * Provides fallback UI and error reporting.
 */

import React, { Component, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { AlertCircle, RefreshCw, AlertTriangle } from 'lucide-react-native';
import { errorService, wrapError } from './errorService';
import { AppError } from './types';


interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional fallback component */
  fallback?: ReactNode | ((error: AppError, retry: () => void) => ReactNode);
  /** Called when an error is caught */
  onError?: (error: AppError) => void;
  /** Context identifier for error tracking */
  context?: string;
  /** Level: 'screen' shows full-screen, 'component' shows inline error */
  level?: 'screen' | 'component';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: AppError | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const { onError, context } = this.props;

    // Wrap and handle the error
    const appError = wrapError(error, {
      context: context || 'ErrorBoundary',
      details: {
        componentStack: errorInfo.componentStack,
      },
    });

    this.setState({ error: appError });

    // Handle through error service
    errorService.handle(appError, { context });

    // Call optional callback
    onError?.(appError);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    const { children, fallback, level = 'component' } = this.props;
    const { hasError, error } = this.state;

    if (hasError && error) {
      // Custom fallback
      if (fallback) {
        if (typeof fallback === 'function') {
          return fallback(error, this.handleRetry);
        }
        return fallback;
      }

      // Default fallback
      return level === 'screen' ? (
        <ScreenErrorView error={error} onRetry={this.handleRetry} />
      ) : (
        <ComponentErrorView error={error} onRetry={this.handleRetry} />
      );
    }

    return children;
  }
}

/**
 * Full-screen error view for screen-level errors
 */
function ScreenErrorView({ error, onRetry }: { error: AppError; onRetry: () => void }) {
  return (
    <View style={styles.screenContainer}>
      <AlertCircle size={64} color="#ff4444" strokeWidth={1.5} />
      <Text style={styles.screenTitle}>Something went wrong</Text>
      <Text style={styles.screenMessage}>{error.userMessage}</Text>

      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <RefreshCw size={20} color="#000" strokeWidth={2} />
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>

      {__DEV__ && (
        <View style={styles.devInfo}>
          <Text style={styles.devText}>Code: {error.code}</Text>
          <Text style={styles.devText}>Category: {error.category}</Text>
          <Text style={styles.devText} numberOfLines={3}>
            {error.message}
          </Text>
        </View>
      )}
    </View>
  );
}

/**
 * Inline error view for component-level errors
 */
function ComponentErrorView({ error, onRetry }: { error: AppError; onRetry: () => void }) {
  return (
    <View style={styles.componentContainer}>
      <View style={styles.componentContent}>
        <AlertTriangle size={24} color="#ff9800" strokeWidth={2} />
        <View style={styles.componentText}>
          <Text style={styles.componentMessage} numberOfLines={2}>
            {error.userMessage}
          </Text>
          <TouchableOpacity onPress={onRetry}>
            <Text style={styles.componentRetry}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/**
 * HOC to wrap a component with an error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: Omit<ErrorBoundaryProps, 'children'>
): React.FC<P> {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const WithErrorBoundary: React.FC<P> = (props) => (
    <ErrorBoundary {...options} context={options?.context || displayName}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;
  return WithErrorBoundary;
}

const styles = StyleSheet.create({
  // Screen-level error
  screenContainer: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  screenMessage: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4B60C',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    gap: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  devInfo: {
    marginTop: 32,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    width: '100%',
    maxWidth: 300,
  },
  devText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 4,
  },

  // Component-level error
  componentContainer: {
    backgroundColor: 'rgba(255,152,0,0.1)',
    borderRadius: 8,
    padding: 12,
    margin: 8,
  },
  componentContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  componentText: {
    flex: 1,
  },
  componentMessage: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  componentRetry: {
    fontSize: 12,
    color: '#F4B60C',
    fontWeight: '500',
  },
});
