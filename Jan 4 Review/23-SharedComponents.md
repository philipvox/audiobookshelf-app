# Shared Components Audit

Mapping of shared components used across 3+ screens, their props, and implementation consistency analysis.

---

## Summary

| Component | Usage Count | Screens | Inconsistencies |
|-----------|-------------|---------|-----------------|
| Icon | 16+ screens | Most screens | Minor: size with/without `scale()` |
| BookCard | 10 files | 6+ screens | None - well-standardized |
| StackedCovers | 10 files | 8+ screens | Minor: prop variations |
| EmptyState | 10 files | 6+ screens | **Major**: custom implementation in DownloadsScreen |
| SeriesHeartButton | 7 files | 5+ screens | None - consistent props |
| ErrorView | 6 files | 5+ screens | None - consistent usage |
| LoadingSpinner | 6 files | 5+ components | None - simple API |
| HeartButton | 3 files | 1 screen | Limited usage - only PlayerModule |
| Snackbar | 3 files | 2 screens | None - consistent hook pattern |
| AlphabetScrubber | 3 files | 2 screens | None - consistent |

---

## Components Used Across 3+ Screens

### 1. Icon

**Location:** `src/shared/components/Icon.tsx`

**Props:**
```typescript
interface IconProps {
  name: keyof typeof LucideIcons | string;
  size?: number;                    // Default: 24
  color?: string;                   // Default: colors.textPrimary
  strokeWidth?: number;             // Default: 2
  set?: string;                     // @deprecated - ignored
}
```

**Usage Count:** 16+ screens

**Usage Patterns:**
```tsx
// Pattern A: Using scale() for size
<Icon name="Search" size={scale(48)} color={themeColors.textTertiary} />

// Pattern B: Raw number for size (inconsistent)
<Icon name="Search" size={48} color={themeColors.textTertiary} />
<Icon name="ChevronLeft" size={24} color={themeColors.text} />
```

**Inconsistencies Found:**
| File | Issue |
|------|-------|
| `GenresListScreen.tsx:301` | Uses `size={48}` without `scale()` |
| `SeriesListScreen.tsx:379` | Uses `size={40}` without `scale()` |
| `StatsScreen.tsx:67` | Uses `size={20}` without `scale()` |
| Most other usages | Correctly use `scale()` wrapper |

**Recommendation:** Standardize on `scale()` wrapper for all icon sizes to ensure proper responsive scaling.

---

### 2. BookCard

**Location:** `src/shared/components/BookCard.tsx`

**Props:**
```typescript
interface BookCardProps {
  book: LibraryItem;
  onPress: () => void;
  onLongPress?: () => void;
  showListeningProgress?: boolean;     // Default: true
  actionType?: 'auto' | 'download' | 'play';  // Default: 'auto'
  onPlayPress?: () => void;
  context?: 'browse' | 'library' | 'author_detail' | 'narrator_detail' | 'series_detail';
  showStatusBadge?: boolean;           // Default: false
  showWishlistButton?: boolean;        // Default: false
  layout?: 'default' | 'search';       // Default: 'default'
  showPlayOverlay?: boolean;           // Default: false
}
```

**Usage Count:** 10 files, 6+ screens

**Usage Locations:**
- `SearchScreen.tsx` - Uses `layout="search"` variant
- `GenreDetailScreen.tsx` - Standard usage
- `CollectionDetailScreen.tsx` - Standard usage
- `FilteredBooksScreen.tsx` - Standard usage
- `MoodResultsScreen.tsx` - Standard usage
- Various content components (carousel, swipeable cards)

**Inconsistencies Found:** None - well-standardized with clear prop contracts.

**Note:** `BookCardWithState` wrapper exists for backwards compatibility but is just a pass-through.

---

### 3. StackedCovers

**Location:** `src/shared/components/StackedCovers.tsx`

**Props:**
```typescript
interface StackedCoversProps {
  coverUrls: (string | null | undefined)[];
  bookIds?: string[];              // For stable keys
  size?: number;                   // Default: cardTokens.stackedCovers.size
  offset?: number;                 // Default: cardTokens.stackedCovers.offset
  maxCovers?: number;              // Default: cardTokens.stackedCovers.count
  variant?: 'horizontal' | 'vertical';  // Default: 'horizontal'
  borderRadius?: number;           // Default: radius.sm
  style?: ViewStyle;
}
```

**Usage Count:** 10 files, 8+ screens

**Usage Patterns:**
```tsx
// Pattern A: Minimal props (relies on defaults)
<StackedCovers coverUrls={coverUrls} />

// Pattern B: With bookIds for stable keys
<StackedCovers coverUrls={coverUrls} bookIds={bookIds} />

// Pattern C: Custom size
<StackedCovers bookIds={coverBookIds} size={scale(44)} />

// Pattern D: Only bookIds (no coverUrls) - INCORRECT
<StackedCovers bookIds={bookIds} />  // SeriesDetailScreen.tsx:616
```

**Inconsistencies Found:**
| File | Issue |
|------|-------|
| `SeriesDetailScreen.tsx:616` | Passes only `bookIds` without `coverUrls` - component requires `coverUrls` |
| `CollectionDetailScreen.tsx:203` | Only passes `coverUrls` without `bookIds` (may cause flickering) |

**Recommendation:** Always pass both `coverUrls` and `bookIds` together for stable rendering.

---

### 4. EmptyState

**Location:** `src/shared/components/EmptyState.tsx`

**Props:**
```typescript
interface EmptyStateProps {
  title: string;
  icon?: EmptyStateIcon | string | React.ReactNode;  // Default: 'book'
  description?: string;
  actionTitle?: string;
  onAction?: () => void;
  secondaryActionTitle?: string;
  onSecondaryAction?: () => void;
  fullScreen?: boolean;            // Default: true
  style?: ViewStyle;
}

type EmptyStateIcon = 'book' | 'search' | 'heart' | 'download' | 'list'
                    | 'user' | 'mic' | 'library' | 'celebrate' | 'collection';
```

**Usage Count:** 10 files, 6+ screens

**Usage Patterns:**
```tsx
// Pattern A: Standard usage with built-in icons
<EmptyState
  title="No results found"
  icon="search"
  description="Try a different search term"
/>

// Pattern B: With action button
<EmptyState
  title="No downloads"
  icon="download"
  description="Download books for offline listening"
  actionTitle="Browse Library"
  onAction={handleBrowse}
/>

// Pattern C: Custom implementation (INCONSISTENT)
// DownloadsScreen.tsx:589 - passes custom props
<EmptyState onBrowse={handleBrowse} colors={colors} />
```

**Inconsistencies Found:**
| File | Issue | Severity |
|------|-------|----------|
| `DownloadsScreen.tsx:589` | Uses non-standard props `onBrowse` and `colors` - likely a custom local component | **MAJOR** |
| `CollectionsListContent.tsx` | Uses deprecated emoji icons (auto-converted) | Minor |
| `MarkBooksScreen.tsx` | Correct usage | None |

**Recommendation:**
1. Verify if DownloadsScreen has a local EmptyState component shadowing the shared one
2. Update all usages to use named icons instead of emojis

---

### 5. SeriesHeartButton

**Location:** `src/shared/components/SeriesHeartButton.tsx`

**Props:**
```typescript
interface SeriesHeartButtonProps {
  seriesName: string;              // Required - identifies the series
  size?: number;                   // Default: 24
  activeColor?: string;            // Default: '#E53935' (red)
  inactiveColor?: string;          // Default: 'rgba(128,128,128,0.6)'
  style?: ViewStyle;
  hitSlop?: number;                // Default: 8
  onToggle?: (isFavorite: boolean) => void;
  disabled?: boolean;              // Default: false
  animated?: boolean;              // Default: true
  showCircle?: boolean;            // Default: false
}
```

**Usage Count:** 7 files, 5+ screens

**Usage Patterns:**
```tsx
// Consistent pattern across all usages
<SeriesHeartButton
  seriesName={series.name}
  size={10}
  style={styles.heartButton}
/>
```

**Files Using:**
- `MyLibraryScreen.tsx:303`
- `SeriesListScreen.tsx:324`
- `TextListSection.tsx:161`
- `SeriesCard.tsx:73`
- `PopularSeriesSection.tsx:70`
- `SearchScreen.tsx:148`

**Inconsistencies Found:** None - all usages follow the same pattern with `size={10}`.

**Note:** Default `activeColor` is red (#E53935) while `HeartButton` for books uses gold (#F4B60C). This is intentional to visually distinguish book favorites from series favorites.

---

### 6. ErrorView

**Location:** `src/shared/components/ErrorView.tsx`

**Props:**
```typescript
interface ErrorViewProps {
  type?: 'network' | 'server' | 'auth' | 'notFound' | 'generic';  // Default: 'generic'
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;             // Default: 'Try Again'
  onSecondaryAction?: () => void;
  secondaryLabel?: string;         // Default: 'Go Back'
  isRetrying?: boolean;            // Default: false
}
```

**Usage Count:** 6 files, 5+ screens

**Usage Locations:**
- `BookDetailScreen.tsx`
- `AuthorsListContent.tsx`
- `NarratorsListContent.tsx`
- `SeriesListContent.tsx`
- `CollectionsListContent.tsx`
- `ErrorBoundary.tsx`

**Inconsistencies Found:** None - consistent usage with `onRetry` callback.

**Note:** Component auto-detects offline state via `useNetInfo()` and adjusts messaging accordingly.

---

### 7. LoadingSpinner

**Location:** `src/shared/components/LoadingSpinner.tsx`

**Props:**
```typescript
interface LoadingSpinnerProps {
  text?: string;
  size?: 'small' | 'large';        // Default: 'large'
  color?: string;                  // Default: colors.accent
}
```

**Usage Count:** 6 files, 5+ components

**Usage Patterns:**
```tsx
// Pattern A: Simple usage
<LoadingSpinner />

// Pattern B: With text
<LoadingSpinner text="Loading..." />
```

**Inconsistencies Found:** None - simple API with consistent usage.

**Note:** Background is hardcoded to `colors.backgroundPrimary` - may not work well in light-themed contexts.

---

### 8. HeartButton (Books)

**Location:** `src/shared/components/HeartButton.tsx`

**Props:**
```typescript
interface HeartButtonProps {
  bookId: string;                  // Required
  size?: number;                   // Default: 24
  activeColor?: string;            // Default: '#F4B60C' (gold)
  inactiveColor?: string;          // Default: '#808080'
  renderIcon?: (size: number, color: string, filled: boolean) => React.ReactNode;
  style?: ViewStyle;
  hitSlop?: number;                // Default: 8
  onToggle?: (isFavorite: boolean) => void;
  disabled?: boolean;              // Default: false
  animated?: boolean;              // Default: true
}
```

**Usage Count:** 3 files, but only 1 actual usage in screens

**Usage Locations:**
- `PlayerModule.tsx:240` - Only active usage

**Note:** Despite being exported from shared components, this is only used in the player module. Book favoriting in other screens is handled differently (via myLibraryStore directly or other patterns).

---

### 9. Snackbar + useSnackbar

**Location:** `src/shared/components/Snackbar.tsx`

**Props:**
```typescript
interface SnackbarProps {
  message: string;
  visible: boolean;
  duration?: number;               // Default: 4000ms
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
  icon?: React.ReactNode;
  type?: 'info' | 'success' | 'warning' | 'error';  // Default: 'info'
}

// Hook returns:
interface SnackbarHook {
  state: SnackbarState;
  show: (options) => void;
  hide: () => void;
  showUndo: (message, onUndo, duration?) => void;
  showSuccess: (message, duration?) => void;
  showError: (message, duration?) => void;
  snackbarProps: SnackbarProps;
}
```

**Usage Count:** 3 files, 2 screens

**Usage Locations:**
- `BookDetailScreen.tsx`
- `DownloadsScreen.tsx`

**Usage Pattern:**
```tsx
const { snackbarProps, showUndo, showSuccess } = useSnackbar();

// Later in JSX
<Snackbar {...snackbarProps} />
```

**Inconsistencies Found:** None - consistent hook-based pattern.

---

### 10. AlphabetScrubber

**Location:** `src/shared/components/AlphabetScrubber.tsx`

**Usage Count:** 3 files, 2 screens

**Usage Locations:**
- `AuthorsListScreen.tsx`
- `NarratorsListScreen.tsx`

**Inconsistencies Found:** None - used identically in both list screens.

---

## Components Used in < 3 Screens (Not Audited in Detail)

| Component | Usage Count | Notes |
|-----------|-------------|-------|
| CircularDownloadButton | 1 file | Only in PlayerModule |
| ThumbnailProgressBar | 2 files | BookCard + SeriesDetailScreen |
| SeriesProgressBadge | 2 files | MyLibraryScreen + SeriesCard |
| CoverPlayButton | 1 file | Limited usage |
| NetworkStatusBar | 1 file | Only in AppNavigator |
| FilterSortBar | ~2 files | Limited usage |
| Button | 1 file | Only LoginScreen |
| ProgressDots | 1 file | Only YourSeriesSection |

---

## Color Inconsistencies

### Heart Button Colors
| Component | Active Color | Inactive Color | Purpose |
|-----------|--------------|----------------|---------|
| HeartButton | `#F4B60C` (Gold) | `#808080` (Gray) | Book favorites |
| SeriesHeartButton | `#E53935` (Red) | `rgba(128,128,128,0.6)` | Series favorites |

This is **intentional** to visually distinguish book favorites from series favorites.

### ErrorView Background
- Uses hardcoded `#FFFFFF` (white) background
- May conflict with dark theme in other parts of the app
- Other components use `colors.backgroundPrimary` or `colors.backgroundTertiary`

---

## Recommendations

### High Priority

1. **DownloadsScreen EmptyState** - Investigate the custom EmptyState usage that doesn't match the shared component API.

2. **StackedCovers in SeriesDetailScreen** - Fix the usage that only passes `bookIds` without `coverUrls`.

### Medium Priority

3. **Icon size standardization** - Create a lint rule or wrapper to enforce `scale()` usage for all icon sizes.

4. **ErrorView theming** - Update ErrorView to support dark mode via theme colors instead of hardcoded white.

### Low Priority

5. **HeartButton adoption** - Consider using HeartButton more broadly instead of custom implementations.

6. **EmptyState emoji deprecation** - Update remaining usages from emoji icons to named icons.

---

## Component Dependency Graph

```
Shared Components
├── Feedback
│   ├── LoadingSpinner (standalone)
│   ├── ErrorView (uses netinfo)
│   ├── EmptyState (standalone)
│   └── Snackbar + useSnackbar (uses layout constants)
│
├── Interactive Buttons
│   ├── HeartButton (uses myLibraryStore)
│   ├── SeriesHeartButton (uses myLibraryStore)
│   ├── CircularDownloadButton (uses downloadManager)
│   └── CoverPlayButton (uses playerStore)
│
├── Cards & Lists
│   ├── BookCard (uses many stores + hooks)
│   │   └── ThumbnailProgressBar
│   └── StackedCovers (standalone)
│
├── Navigation
│   ├── AlphabetScrubber (standalone)
│   └── NetworkStatusBar (uses netinfo)
│
├── Progress Indicators
│   ├── ProgressDots (standalone)
│   ├── SeriesProgressBadge (standalone)
│   └── ThumbnailProgressBar (standalone)
│
└── Primitives
    ├── Icon (wraps lucide-react-native)
    ├── Button (standalone)
    └── Skeleton components (standalone)
```

---

## Files Modified for This Audit

None - this is a read-only audit.
