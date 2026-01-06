# Edit Specification: Error Boundaries

**Covers Action Plan Items:** 1.1
**Priority:** Critical (Phase 1)
**Effort:** M (Medium) - 4-6 hours

---

## Current State

- **Error boundaries:** Only 1 exists (wraps `FloatingTabBar`)
- **File:** No dedicated ErrorBoundary component in shared
- **Impact:** Any unhandled error in a screen component crashes the entire app
- **Current coverage:** ~3% of screens protected

---

## Issues Identified

| Issue | Source | Severity |
|-------|--------|----------|
| Only 1 error boundary in entire app | [28], [30] Quick Win #1 | Critical |
| Screen crashes bring down full app | [28] | Critical |
| No user-friendly error recovery UI | [28] | High |
| No error reporting to analytics | [30] | Medium |

---

## Alignment Requirements

From [30] Executive Summary:
- Listed as Quick Win #1 - 4 hours effort, high impact
- "Wrap each screen in ErrorBoundary component. Prevents full app crash from component errors."

From [31] Alignment Audit:
- Error handling listed as pattern gap across all screens

---

## Target State

```
src/shared/components/
├── ErrorBoundary.tsx           (NEW - class component for error catching)
├── ErrorFallback.tsx           (NEW - fallback UI)
└── index.ts                    (update exports)

src/navigation/
└── AppNavigator.tsx            (wrap each screen)
```

All screens wrapped with error boundary providing:
- Graceful fallback UI
- Retry functionality
- Error logging to analytics
- Optional "Report Issue" button

---

## Specific Changes

### Step 1: Create ErrorBoundary Component

**New file:** `src/shared/components/ErrorBoundary.tsx`

```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '@/shared/utils/logger';
import { trackEvent } from '@/core/monitoring';
import { ErrorFallback } from './ErrorFallback';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  screenName?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { screenName, onError } = this.props;

    // Log to console in dev
    logger.error('ErrorBoundary', `Caught error in ${screenName || 'unknown'}`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    // Track in analytics
    trackEvent('error_boundary_triggered', {
      screen: screenName,
      error_message: error.message,
      error_name: error.name,
    });

    // Call optional callback
    onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          screenName={this.props.screenName}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}
```

### Step 2: Create ErrorFallback Component

**New file:** `src/shared/components/ErrorFallback.tsx`

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';
import { colors, spacing, scale, typography } from '@/shared/theme';
import { useThemeColors } from '@/shared/theme/themeStore';

interface ErrorFallbackProps {
  error: Error | null;
  screenName?: string;
  onRetry: () => void;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  screenName,
  onRetry,
}) => {
  const themeColors = useThemeColors();

  return (
    <View style={[styles.container, { backgroundColor: themeColors.backgroundPrimary }]}>
      <AlertTriangle
        size={scale(48)}
        color={themeColors.textSecondary}
        style={styles.icon}
      />

      <Text style={[styles.title, { color: themeColors.textPrimary }]}>
        Something went wrong
      </Text>

      <Text style={[styles.message, { color: themeColors.textSecondary }]}>
        {screenName
          ? `There was a problem loading ${screenName}.`
          : 'There was an unexpected error.'}
      </Text>

      {__DEV__ && error && (
        <Text style={[styles.errorDetail, { color: themeColors.textTertiary }]}>
          {error.message}
        </Text>
      )}

      <TouchableOpacity
        style={[styles.retryButton, { backgroundColor: colors.accent }]}
        onPress={onRetry}
        activeOpacity={0.8}
      >
        <RefreshCw size={scale(18)} color="#000" style={styles.retryIcon} />
        <Text style={styles.retryText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  icon: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: scale(20),
    fontWeight: '600',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: scale(15),
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  errorDetail: {
    fontSize: scale(12),
    fontFamily: 'monospace',
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: scale(24),
  },
  retryIcon: {
    marginRight: spacing.sm,
  },
  retryText: {
    color: '#000',
    fontSize: scale(16),
    fontWeight: '600',
  },
});
```

### Step 3: Create withErrorBoundary HOC

**Add to:** `src/shared/components/ErrorBoundary.tsx`

```typescript
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  screenName: string
) {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const ComponentWithErrorBoundary: React.FC<P> = (props) => (
    <ErrorBoundary screenName={screenName}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;

  return ComponentWithErrorBoundary;
}
```

### Step 4: Update AppNavigator

**File:** `src/navigation/AppNavigator.tsx`

Wrap each screen with error boundary:

```typescript
import { ErrorBoundary, withErrorBoundary } from '@/shared/components';

// Option A: Wrap in Stack.Screen component prop
<Stack.Screen
  name="Home"
  component={withErrorBoundary(HomeScreen, 'Home')}
/>

// Option B: Wrap at screen definition level
const ProtectedHomeScreen = withErrorBoundary(HomeScreen, 'Home');
const ProtectedMyLibraryScreen = withErrorBoundary(MyLibraryScreen, 'My Library');
// ... etc

// Option C: Create wrapper component (if screens need navigation props)
const ScreenWrapper: React.FC<{ name: string; children: ReactNode }> = ({
  name,
  children,
}) => (
  <ErrorBoundary screenName={name}>
    {children}
  </ErrorBoundary>
);
```

### Step 5: List of Screens to Wrap

**All main screens (~25):**
```typescript
// Main tabs
HomeScreen
MyLibraryScreen
BrowseScreen
ProfileScreen

// Detail screens
BookDetailScreen
SeriesDetailScreen
AuthorDetailScreen
NarratorDetailScreen
CollectionDetailScreen
GenreDetailScreen

// List screens
AuthorsListScreen
NarratorsListScreen
SeriesListScreen
GenresListScreen

// Utility screens
SearchScreen
DownloadsScreen
QueueScreen
StatsScreen
WishlistScreen

// Settings screens
PlaybackSettingsScreen
StorageSettingsScreen
HapticSettingsScreen
ChapterCleaningSettingsScreen
JoystickSeekSettingsScreen
KidModeSettingsScreen
PreferencesScreen

// Player
CDPlayerScreen

// Onboarding
MoodDiscoveryScreen
MoodResultsScreen
MarkBooksScreen
ReadingHistoryScreen
PreferencesOnboardingScreen
```

### Step 6: Export from shared components

**Update:** `src/shared/components/index.ts`

```typescript
export { ErrorBoundary, withErrorBoundary } from './ErrorBoundary';
export { ErrorFallback } from './ErrorFallback';
```

---

## Cross-Screen Dependencies

| Component | Impact |
|-----------|--------|
| All screens | Now wrapped with error boundary |
| AppNavigator | Import and apply wrappers |
| Analytics (trackEvent) | Receives error events |
| Logger | Receives error logs |

---

## Testing Criteria

- [ ] Error in HomeScreen shows fallback, not crash
- [ ] Error in BookDetailScreen shows fallback with screen name
- [ ] Retry button resets error state and re-renders
- [ ] Error details shown only in __DEV__ mode
- [ ] Error logged to console in dev
- [ ] Error tracked to analytics
- [ ] Other screens continue working when one has error
- [ ] Navigation still works from error fallback
- [ ] Dark/light theme applied to fallback UI

---

## Effort Breakdown

| Task | Effort | Risk |
|------|--------|------|
| Create ErrorBoundary component | 1 hour | Low |
| Create ErrorFallback UI | 1 hour | Low |
| Create withErrorBoundary HOC | 30 min | Low |
| Wrap all screens in AppNavigator | 1.5 hours | Low |
| Add analytics tracking | 30 min | Low |
| Testing | 1.5 hours | - |

**Total: 4-6 hours**
