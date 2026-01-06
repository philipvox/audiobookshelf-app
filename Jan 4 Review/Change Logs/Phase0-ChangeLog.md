# Phase 0 Change Log: Critical Dependencies

**Date:** January 5, 2026
**Duration:** ~30 minutes
**Items Completed:** 0.1 SharedUtilities

---

## Summary

Created shared utility components and hooks that are dependencies for later phases. These must exist before ErrorBoundaries (1.1), ProfileScreen PIN (2.18), and BrowseScreen (2.15).

---

## Files Created

### 1. useToast Hook
**File:** `src/shared/hooks/useToast.ts`
**Lines:** 108

**Features:**
- Global toast notification system using Zustand store
- Auto-dismiss after configurable duration
- Convenience methods: `showSuccess`, `showError`, `showWarning`, `showInfo`
- Exportable store for ToastContainer component

**Usage:**
```typescript
const { showToast, showError } = useToast();
showError('Something went wrong');
```

---

### 2. ToastContainer Component
**File:** `src/shared/components/ToastContainer.tsx`
**Lines:** 115

**Features:**
- Renders global toasts from useToastStore
- Positioned at top of screen with safe area inset
- Animated entry/exit (SlideInUp, FadeOut)
- Color-coded by type (success=green, error=red, warning=orange, info=blue)
- Dismissable via X button

**Integration:** Add to AppNavigator.tsx at root level.

---

### 3. PinInput Component
**File:** `src/shared/components/PinInput.tsx`
**Lines:** 137

**Features:**
- Hidden TextInput with visual dot display
- Numeric keyboard (number-pad)
- Secure mode (dots) or visible digits
- Active position indicator
- Error state styling
- Auto-focus on mount

**Usage:**
```typescript
<PinInput
  value={pin}
  onChange={setPin}
  length={4}
  secure
  error={hasError}
/>
```

---

### 4. getFeaturedReason Utility
**File:** `src/shared/utils/featuredReason.ts`
**Lines:** 183

**Features:**
- `getFeaturedReason(book, context)` - Generate human-readable recommendation reason
- `selectFeaturedBook(books, options)` - Pick best featured book with reason
- `isRecentlyAdded(book, daysAgo)` - Check if book added within N days

**Priority-based selection:**
1. Currently reading (in-progress)
2. By favorite author
3. By favorite narrator
4. Recently added (last 7 days)
5. Similar genre to finished
6. Random from top 10

---

## Files Modified

### 1. src/shared/hooks/index.ts
**Change:** Added export for useToast
```typescript
export * from './useToast';
```

---

### 2. src/shared/components/index.ts
**Change:** Added exports for ToastContainer and PinInput
```typescript
export { ToastContainer } from './ToastContainer';
export { PinInput } from './PinInput';
export type { PinInputProps } from './PinInput';
```

---

### 3. src/shared/utils/index.ts
**Change:** Added export for featuredReason
```typescript
export * from './featuredReason';
```

---

## Dependencies Unlocked

| Item | Can Now Proceed |
|------|-----------------|
| 1.1 ErrorBoundaries | Yes (needs useToast for error feedback) |
| 1.4 Silent catch blocks | Yes (needs useToast for error display) |
| 2.15 useDiscoverData | Yes (needs getFeaturedReason) |
| 2.18 Kid Mode PIN | Yes (needs PinInput) |

---

## Testing Notes

- [ ] Import `useToast` in any screen and call `showSuccess('Test')`
- [ ] Add `<ToastContainer />` to AppNavigator to see toasts render
- [ ] Test PinInput in isolation with different `length` and `secure` values
- [ ] Verify `getFeaturedReason` returns correct types for various book states

---

## Not Changed

- **AppNavigator.tsx** - ToastContainer integration deferred to Phase 1.1 (ErrorBoundaries) to avoid partial implementation

---

## Notes

1. The existing `Snackbar` + `useSnackbar` remains for component-local toast needs. `useToast` is for global app-wide notifications.

2. `extractBookMetadata` from `src/shared/utils/metadata.ts` already exists and handles the `as any` casting internally. `getFeaturedReason` uses this directly.

3. PinInput uses a hidden TextInput pattern for keyboard access while showing visual dots - this is the standard pattern for PIN/OTP inputs.
