# Interactive States & Feedback Audit
## AudiobookShelf Design System

**Date:** January 5, 2026

---

## Press States

### TouchableOpacity Usage

| Component | activeOpacity | Consistent |
|-----------|---------------|------------|
| SeriesCard (home) | 0.7 | Yes |
| FannedSeriesCard | 0.7 | Yes |
| PersonCard | 0.7 | Yes |
| HeartButton | 0.8 | Different |
| BookCard actions | Default (~0.2) | Different |

**Recommendation:** Standardize `activeOpacity={0.7}` across all tappables.

### Pressable Usage

| Component | Press Feedback | Style |
|-----------|----------------|-------|
| BookCard | None (uses Pressable) | - |
| AuthorCard | `opacity: 0.7` | Custom pressed style |
| EmptyState buttons | Default | - |
| Button component | Custom styling | Various |

### Animated Press Feedback

| Component | Animation | Type |
|-----------|-----------|------|
| BookCard queue button | Scale 1 → 1.3 → 1 | Bounce |
| BookCard wishlist button | Scale 1 → 1.3 → 1 | Bounce |
| HeartButton | Scale bounce | Bounce |

**Pattern:**
```typescript
Animated.sequence([
  Animated.timing(scaleAnim, {
    toValue: 1.3,
    duration: 100,
    useNativeDriver: true,
  }),
  Animated.spring(scaleAnim, {
    toValue: 1,
    friction: 4,
    useNativeDriver: true,
  }),
]).start();
```

---

## Loading States

### Skeleton Components

**File:** `src/shared/components/Skeleton.tsx`

Available skeleton components:
- `Shimmer` - Base animated shimmer effect
- `SkeletonBox` - Rectangular placeholder
- `SkeletonCircle` - Circular placeholder
- `SkeletonText` - Text line placeholder
- `BookCardSkeleton` - Full book card skeleton
- `ContinueListeningCardSkeleton` - Hero card skeleton
- `ListRowSkeleton` - List row skeleton
- `SectionSkeleton` - Full section skeleton
- `HomeHeroSkeleton` - Home hero skeleton
- `BookDetailSkeleton` - Book detail page skeleton
- `AuthorRowSkeleton` - Author row skeleton
- `SearchResultsSkeleton` - Search results skeleton

### Loading Spinner

**File:** `src/shared/components/LoadingSpinner.tsx`

| Property | Default |
|----------|---------|
| Size | `'large'` |
| Color | `colors.accent` (red) |
| Background | `colors.backgroundPrimary` |
| Text style | 15px, `colors.textSecondary` |

**Issue:** Uses legacy `colors` object

### Progress Indicators

| Type | Usage | Color |
|------|-------|-------|
| ProgressRing | Download progress | White or Orange (paused) |
| InlineProgressBar | Book card progress | `colors.accent` fill |
| ThumbnailProgressBar | Cover overlay | Accent |

---

## Empty States

### EmptyState Component

**File:** `src/shared/components/EmptyState.tsx`

| Property | Value |
|----------|-------|
| Icon size | `scale(64)` |
| Title style | `typography.displaySmall` |
| Description | `typography.bodyMedium`, `colors.textTertiary` |
| Max width | `scale(280)` |
| Button height | `layout.minTouchTarget` (44px) |
| Button radius | `radius.card` (12px) |

**Available Icons:**
- book, search, heart, download, list
- user, mic, library, celebrate, collection

**Emoji Mapping:**
- `📚` → library
- `📖` → book
- `🔍` → search
- `👤` → user
- etc.

### EmptyState Styling

```typescript
container: {
  padding: spacing.xxl,
  backgroundColor: colors.backgroundTertiary,
}
actionButton: {
  backgroundColor: colors.accent,
  paddingVertical: spacing.lg,
  paddingHorizontal: spacing['3xl'],
  borderRadius: radius.card,
  minHeight: layout.minTouchTarget,
}
```

---

## Error States

### ErrorView Component

**File:** `src/shared/components/ErrorView.tsx`

| Error Type | Icon | Title |
|------------|------|-------|
| network | WifiOff | "Connection Error" |
| auth | Lock | "Authentication Required" |
| notFound | Search | "Not Found" |
| server | AlertTriangle | "Server Error" |
| generic | AlertCircle | "Something went wrong" |

**Features:**
- Retry button with `onRetry` callback
- Custom message support
- Full screen option

**Issue:** May use legacy colors (needs verification)

---

## Success States

### Snackbar/Toast

**File:** `src/shared/components/Snackbar.tsx`

| Property | Value |
|----------|-------|
| Position | Bottom (above tab bar) |
| Duration | 3000ms default |
| Animation | Slide up |

**File:** `src/shared/components/ToastContainer.tsx`

Global toast container for app-wide notifications.

### Haptic Feedback

Used via `expo-haptics`:

| Action | Haptic Type |
|--------|-------------|
| Button tap | `ImpactFeedbackStyle.Light` |
| Long press | `ImpactFeedbackStyle.Medium` |
| Success action | `NotificationFeedbackType.Success` |

---

## Disabled States

### Button Disabled

```typescript
disabled: {
  backgroundColor: 'rgba(255,255,255,0.12)',  // button.disabled
  opacity: 1,  // Full opacity, color indicates disabled
}
disabledText: {
  color: 'rgba(255,255,255,0.30)',  // button.disabledText
}
```

### Interactive Element Disabled

| Component | Disabled Style |
|-----------|---------------|
| BookCard action | `opacity: 0.5` |
| Download button (offline) | `opacity: 0.5` + different icon |

---

## Pull-to-Refresh

### RefreshControl Usage

```typescript
<RefreshControl
  refreshing={isRefreshing}
  onRefresh={handleRefresh}
  tintColor={colors.accent}  // Red spinner
/>
```

**Consistency:** All lists should use same `tintColor`

---

## Scroll Indicators

Most lists hide scroll indicators:
```typescript
showsVerticalScrollIndicator={false}
showsHorizontalScrollIndicator={false}
```

---

## Keyboard Behavior

| Context | Behavior |
|---------|----------|
| Search inputs | `keyboardShouldPersistTaps="handled"` |
| Forms | Standard dismissal |

---

## Issues Identified

### High Priority

1. **Inconsistent activeOpacity** - Mix of 0.7, 0.8, and defaults
2. **LoadingSpinner uses legacy colors** - Should use theme
3. **No standardized press feedback** - Some animate, some opacity only

### Medium Priority

4. **EmptyState uses legacy colors** - Should use theme
5. **Missing skeleton for some views** - Add as needed
6. **Error states not theme-aware** - Verify ErrorView

### Low Priority

7. **Haptic feedback not universal** - Some actions missing haptics
8. **Inconsistent animation timing** - Should standardize

---

## Recommendations

### 1. Standardize Press Feedback

Create a reusable hook or component:
```typescript
const usePressAnimation = () => {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.timing(scale, {
      toValue: 0.95,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  };

  return { scale, onPressIn, onPressOut };
};
```

### 2. Create Interactive State Tokens

```typescript
// In theme
export const interactiveStates = {
  press: {
    opacity: 0.7,
    scale: 0.95,
    duration: 100,
  },
  bounce: {
    scale: 1.3,
    duration: 100,
    friction: 4,
  },
  disabled: {
    opacity: 0.5,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
};
```

### 3. Migrate LoadingSpinner to Theme

```typescript
// Before
color = colors.accent
// After
const { colors } = useTheme();
color = colors.progress.fill
```

---

*Audit complete. See 08-IconAudit.md for icon system analysis.*
