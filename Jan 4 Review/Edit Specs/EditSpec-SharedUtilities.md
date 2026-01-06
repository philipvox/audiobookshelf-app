# Edit Specification: Shared Utilities

**Covers Action Plan Items:** 1.1 (dependency), 2.11 (dependency), various
**Priority:** Critical (Must complete before ErrorBoundaries and ProfileScreen)
**Effort:** S (Small) - 3-4 hours

---

## Purpose

This spec creates shared utility components and hooks that are referenced by multiple other specs but have no owner. These must be created **before** the specs that depend on them.

---

## Components to Create

### 1. useToast Hook

**File:** `src/shared/hooks/useToast.ts`

**Referenced by:**
- EditSpec-SearchScreen.md (1.4)
- EditSpec-BookDetailScreen.md (1.4)
- EditSpec-AuthorNarratorScreens.md (1.4)
- EditSpec-ErrorBoundaries.md (1.1)

**Implementation:**

```typescript
import { create } from 'zustand';
import { useCallback } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));

    // Auto-remove after duration
    const duration = toast.duration ?? 3000;
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, duration);
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
  clearToasts: () => set({ toasts: [] }),
}));

export interface ShowToastOptions {
  type: ToastType;
  message: string;
  duration?: number;
}

export function useToast() {
  const addToast = useToastStore((state) => state.addToast);
  const removeToast = useToastStore((state) => state.removeToast);
  const toasts = useToastStore((state) => state.toasts);

  const showToast = useCallback(
    (options: ShowToastOptions) => {
      addToast(options);
    },
    [addToast]
  );

  return {
    showToast,
    removeToast,
    toasts,
  };
}

// Export store for ToastContainer
export { useToastStore };
```

**File:** `src/shared/components/ToastContainer.tsx`

```typescript
import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react-native';
import { useToastStore } from '@/shared/hooks/useToast';
import { scale, spacing, colors, radius } from '@/shared/theme';

const TOAST_ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const TOAST_COLORS = {
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
};

export const ToastContainer: React.FC = () => {
  const insets = useSafeAreaInsets();
  const toasts = useToastStore((state) => state.toasts);

  if (toasts.length === 0) return null;

  return (
    <View style={[styles.container, { top: insets.top + spacing.md }]}>
      {toasts.map((toast) => {
        const Icon = TOAST_ICONS[toast.type];
        const iconColor = TOAST_COLORS[toast.type];

        return (
          <Animated.View key={toast.id} style={styles.toast}>
            <Icon size={scale(20)} color={iconColor} />
            <Text style={styles.message}>{toast.message}</Text>
          </Animated.View>
        );
      })}
    </View>
  );
};

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
    backgroundColor: colors.backgroundSecondary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  message: {
    flex: 1,
    fontSize: scale(14),
    color: colors.textPrimary,
  },
});
```

**Integration:** Add ToastContainer to AppNavigator.tsx:
```typescript
// In AppNavigator.tsx
import { ToastContainer } from '@/shared/components/ToastContainer';

// At the root level, after NavigationContainer
<>
  <NavigationContainer>
    {/* ... existing navigation */}
  </NavigationContainer>
  <ToastContainer />
</>
```

---

### 2. PinInput Component

**File:** `src/shared/components/PinInput.tsx`

**Referenced by:**
- EditSpec-ProfileScreen.md (2.11)

**Implementation:**

```typescript
import React, { useRef, useEffect } from 'react';
import { View, TextInput, StyleSheet, Pressable } from 'react-native';
import { scale, spacing, colors, radius } from '@/shared/theme';
import { useThemeColors } from '@/shared/theme/themeStore';

interface PinInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  secure?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
}

export const PinInput: React.FC<PinInputProps> = ({
  value,
  onChange,
  length = 4,
  secure = true,
  autoFocus = true,
  disabled = false,
}) => {
  const themeColors = useThemeColors();
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  const handlePress = () => {
    inputRef.current?.focus();
  };

  const handleChange = (text: string) => {
    // Only allow digits
    const digits = text.replace(/\D/g, '').slice(0, length);
    onChange(digits);
  };

  return (
    <Pressable onPress={handlePress} style={styles.container}>
      {/* Hidden input for keyboard */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={length}
        style={styles.hiddenInput}
        editable={!disabled}
        autoComplete="off"
        textContentType="oneTimeCode"
      />

      {/* Visual dots/digits */}
      <View style={styles.dotsContainer}>
        {Array.from({ length }).map((_, index) => {
          const isFilled = index < value.length;
          const isActive = index === value.length;

          return (
            <View
              key={index}
              style={[
                styles.dot,
                { borderColor: themeColors.border },
                isFilled && styles.dotFilled,
                isActive && styles.dotActive,
              ]}
            >
              {isFilled && (
                <View
                  style={[
                    styles.dotInner,
                    secure ? styles.dotSecure : styles.dotDigit,
                  ]}
                >
                  {!secure && (
                    <Text style={styles.digitText}>{value[index]}</Text>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 0,
    width: 0,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  dot: {
    width: scale(48),
    height: scale(48),
    borderRadius: radius.md,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
  dotFilled: {
    borderColor: colors.accent,
  },
  dotActive: {
    borderColor: colors.accent,
    borderWidth: 3,
  },
  dotInner: {
    width: scale(16),
    height: scale(16),
  },
  dotSecure: {
    borderRadius: scale(8),
    backgroundColor: colors.accent,
  },
  dotDigit: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  digitText: {
    fontSize: scale(20),
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
```

---

### 3. getFeaturedReason Utility

**File:** `src/shared/utils/featuredReason.ts`

**Referenced by:**
- EditSpec-BrowseScreen.md (useFeaturedData)

**Implementation:**

```typescript
import { LibraryItem } from '@/core/types';
import { getBookMetadata, getProgress } from './bookMetadata';

type RecommendationReason =
  | 'continue_reading'
  | 'recently_added'
  | 'popular_in_genre'
  | 'by_favorite_author'
  | 'similar_to_finished'
  | 'random_pick';

interface FeaturedReason {
  type: RecommendationReason;
  message: string;
}

/**
 * Generate a human-readable reason for why a book is featured
 */
export function getFeaturedReason(
  book: LibraryItem | null,
  context?: {
    favoriteAuthors?: string[];
    recentlyFinishedGenres?: string[];
    isRecentlyAdded?: boolean;
    isInProgress?: boolean;
  }
): FeaturedReason {
  if (!book) {
    return { type: 'random_pick', message: 'Discover something new' };
  }

  const { authorName, genres } = getBookMetadata(book);
  const { progress } = getProgress(book);

  // Priority 1: Currently reading
  if (context?.isInProgress || (progress > 0 && progress < 0.95)) {
    return {
      type: 'continue_reading',
      message: 'Continue where you left off',
    };
  }

  // Priority 2: By favorite author
  if (context?.favoriteAuthors?.includes(authorName || '')) {
    return {
      type: 'by_favorite_author',
      message: `Because you like ${authorName}`,
    };
  }

  // Priority 3: Recently added
  if (context?.isRecentlyAdded) {
    return {
      type: 'recently_added',
      message: 'New in your library',
    };
  }

  // Priority 4: Similar genre to recently finished
  const matchingGenre = genres.find((g) =>
    context?.recentlyFinishedGenres?.includes(g)
  );
  if (matchingGenre) {
    return {
      type: 'similar_to_finished',
      message: `More ${matchingGenre}`,
    };
  }

  // Priority 5: Popular in first genre
  if (genres.length > 0) {
    return {
      type: 'popular_in_genre',
      message: `Popular in ${genres[0]}`,
    };
  }

  // Fallback
  return {
    type: 'random_pick',
    message: 'You might enjoy this',
  };
}

/**
 * Select the best featured book from a list
 */
export function selectFeaturedBook(
  books: LibraryItem[],
  options?: {
    favoriteAuthors?: string[];
    recentlyFinishedGenres?: string[];
  }
): { book: LibraryItem | null; reason: FeaturedReason } {
  if (books.length === 0) {
    return { book: null, reason: getFeaturedReason(null) };
  }

  // Priority 1: Currently in progress
  const inProgress = books.find((b) => {
    const { progress } = getProgress(b);
    return progress > 0 && progress < 0.95;
  });
  if (inProgress) {
    return {
      book: inProgress,
      reason: getFeaturedReason(inProgress, { isInProgress: true }),
    };
  }

  // Priority 2: By favorite author (not started)
  if (options?.favoriteAuthors?.length) {
    const byFavorite = books.find((b) => {
      const { authorName } = getBookMetadata(b);
      const { progress } = getProgress(b);
      return progress === 0 && options.favoriteAuthors?.includes(authorName || '');
    });
    if (byFavorite) {
      return {
        book: byFavorite,
        reason: getFeaturedReason(byFavorite, options),
      };
    }
  }

  // Priority 3: Recently added (within 7 days)
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentlyAdded = books.find((b) => (b.addedAt || 0) * 1000 > oneWeekAgo);
  if (recentlyAdded) {
    return {
      book: recentlyAdded,
      reason: getFeaturedReason(recentlyAdded, { isRecentlyAdded: true }),
    };
  }

  // Priority 4: Similar to recently finished
  if (options?.recentlyFinishedGenres?.length) {
    const similar = books.find((b) => {
      const { genres } = getBookMetadata(b);
      return genres.some((g) => options.recentlyFinishedGenres?.includes(g));
    });
    if (similar) {
      return {
        book: similar,
        reason: getFeaturedReason(similar, options),
      };
    }
  }

  // Fallback: Random from first 10
  const randomIndex = Math.floor(Math.random() * Math.min(10, books.length));
  return {
    book: books[randomIndex],
    reason: { type: 'random_pick', message: 'You might enjoy this' },
  };
}
```

---

### 4. Export Updates

**File:** `src/shared/hooks/index.ts`

Add:
```typescript
export * from './useToast';
```

**File:** `src/shared/components/index.ts`

Add:
```typescript
export { ToastContainer } from './ToastContainer';
export { PinInput } from './PinInput';
```

**File:** `src/shared/utils/index.ts`

Add:
```typescript
export * from './featuredReason';
```

---

## Dependencies

| This Spec | Blocks |
|-----------|--------|
| useToast | EditSpec-ErrorBoundaries, EditSpec-SearchScreen, EditSpec-BookDetailScreen, EditSpec-AuthorNarratorScreens |
| PinInput | EditSpec-ProfileScreen (Kid Mode PIN) |
| getFeaturedReason | EditSpec-BrowseScreen |

---

## Testing Criteria

### useToast
- [ ] `showToast({ type: 'success', message: 'Test' })` displays toast
- [ ] Toast auto-dismisses after duration
- [ ] Multiple toasts stack correctly
- [ ] Toast types have correct icons/colors

### PinInput
- [ ] Keyboard opens on focus
- [ ] Only digits allowed
- [ ] Secure mode shows dots, not digits
- [ ] Visual feedback on current position

### getFeaturedReason
- [ ] Returns continue_reading for in-progress books
- [ ] Returns by_favorite_author when applicable
- [ ] Falls back gracefully with no context

---

## Effort Breakdown

| Task | Effort | Risk |
|------|--------|------|
| Create useToast hook | 1 hour | Low |
| Create ToastContainer | 1 hour | Low |
| Create PinInput | 1 hour | Low |
| Create getFeaturedReason | 30 min | Low |
| Update exports | 15 min | Low |
| Testing | 30 min | - |

**Total: 3-4 hours**
