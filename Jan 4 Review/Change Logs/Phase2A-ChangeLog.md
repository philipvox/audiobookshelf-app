# Phase 2A Change Log: Foundation

**Date:** January 5, 2026
**Duration:** ~60 minutes
**Items Completed:** 2.1 Cross-feature imports, 2.3 Color tokens (verified), 2.4 Deprecated hooks

---

## Summary

Moved shared stores and hooks from feature-specific directories to `src/shared/` to fix cross-feature import violations. Verified deprecated color tokens are properly marked. Removed deprecated useResponsive hook from exports.

---

## Item 2.1: Cross-Feature Imports

### Files Created

#### 1. src/shared/stores/index.ts (NEW)
```typescript
export * from './kidModeStore';
export * from './myLibraryStore';
```

#### 2. src/shared/stores/kidModeStore.ts (MOVED)
- **Original:** `src/features/profile/stores/kidModeStore.ts`
- **Lines:** 340
- **Reason:** Used by 6 files across profile, library, home, search, discover features

#### 3. src/shared/stores/myLibraryStore.ts (MOVED)
- **Original:** `src/features/library/stores/myLibraryStore.ts`
- **Lines:** 141
- **Reason:** Used by 7 files across library, home, profile, series, user features

#### 4. src/shared/hooks/useContinueListening.ts (MOVED)
- **Original:** `src/features/home/hooks/useContinueListening.ts`
- **Lines:** 74
- **Reason:** Used by 6 files across library, discover features

---

### Files Modified (Import Updates)

| File | Change |
|------|--------|
| `src/features/profile/screens/ProfileScreen.tsx` | Updated to `@/shared/stores/` |
| `src/features/library/screens/MyLibraryScreen.tsx` | Updated to `@/shared/stores/` and `@/shared/hooks/` |
| `src/features/home/hooks/useHomeData.ts` | Updated to `@/shared/stores/` |
| `src/shared/utils/kidModeFilter.ts` | Updated to `@/shared/stores/` |
| `src/features/search/screens/SearchScreen.tsx` | Updated to `@/shared/stores/` |
| `src/features/discover/hooks/useDiscoverData.ts` | Updated to `@/shared/stores/` and `@/shared/hooks/` |
| `src/features/library/screens/SeriesListScreen.tsx` | Updated to `@/shared/stores/` |
| `src/shared/components/SeriesHeartButton.tsx` | Updated to `@/shared/stores/` |
| `src/features/series/screens/SeriesDetailScreen.tsx` | Updated to `@/shared/stores/` |
| `src/shared/components/HeartButton.tsx` | Updated to `@/shared/stores/` |
| `src/features/user/hooks/useFavorites.ts` | Updated to `@/shared/stores/` |
| `src/features/library/screens/FilteredBooksScreen.tsx` | Updated to `@/shared/hooks/` |
| `src/features/library/screens/GenresListScreen.tsx` | Updated to `@/shared/hooks/` |
| `src/features/library/screens/NarratorsListScreen.tsx` | Updated to `@/shared/hooks/` |
| `src/features/library/screens/AuthorsListScreen.tsx` | Updated to `@/shared/hooks/` |
| `src/features/library/components/AddToLibraryButton.tsx` | Updated to `@/shared/stores/` |
| `src/features/profile/screens/KidModeSettingsScreen.tsx` | Updated to `@/shared/stores/` |
| `src/features/library/index.ts` | Updated to re-export from `@/shared/stores/` |
| `src/features/home/index.ts` | Updated to re-export from `@/shared/hooks/` |

### Backwards Compatibility Files

The following files were converted to re-exports for backwards compatibility:

| File | Status |
|------|--------|
| `src/features/library/stores/myLibraryStore.ts` | Re-exports from shared |
| `src/features/profile/stores/kidModeStore.ts` | Re-exports from shared |
| `src/features/home/hooks/useContinueListening.ts` | Re-exports from shared |

---

## Item 2.3: Deprecated Color Tokens

**Status:** Already implemented correctly

The `src/shared/theme/colors.ts` file already has:
- `gold` marked as `@deprecated Use primary instead`
- `goldDark` marked as `@deprecated Use primaryDark instead`
- `goldSubtle` marked as `@deprecated Use primarySubtle instead`

All deprecated tokens are aliases to the new names, maintaining backwards compatibility.

---

## Item 2.4: Deprecated Hooks

### Files Modified

#### 1. src/shared/hooks/index.ts

**Change:** Removed export of useResponsive

**Before:**
```typescript
export * from './useResponsive';
export * from './useBookCardState';
```

**After:**
```typescript
// useResponsive is deprecated - import directly from '@/shared/theme'
export * from './useBookCardState';
```

**Note:** The `useResponsive.ts` file is kept for reference but no longer exported. All functionality is available directly from `@/shared/theme`.

---

## Item 2.2: Duplicate Components (DEFERRED)

**Status:** Deferred to later sprint

**Reason:** Consolidating SeriesCard and SwipeableBookCard requires:
1. Analysis of all usage locations
2. Creating a unified API
3. Testing across all screens

This is a larger refactor better suited for a dedicated sprint.

---

## Testing Notes

- [ ] Import `useKidModeStore` from `@/shared/stores/kidModeStore` - verify works
- [ ] Import `useMyLibraryStore` from `@/shared/stores/myLibraryStore` - verify works
- [ ] Import `useContinueListening` from `@/shared/hooks/useContinueListening` - verify works
- [ ] Verify old import paths still work (backwards compatibility)
- [ ] Check Profile > Kid Mode Settings still works
- [ ] Check heart buttons on books and series still work
- [ ] Check continue listening sections still display

---

## Architecture Benefits

### Before
```
features/
├── home/hooks/useContinueListening.ts     ← Used by 6 features
├── library/stores/myLibraryStore.ts       ← Used by 7 features
└── profile/stores/kidModeStore.ts         ← Used by 6 features

❌ Cross-feature imports violate module boundaries
❌ Hard to know where shared code lives
❌ Circular dependency risks
```

### After
```
shared/
├── stores/
│   ├── index.ts
│   ├── kidModeStore.ts                    ← Clear shared location
│   └── myLibraryStore.ts                  ← Clear shared location
└── hooks/
    ├── index.ts
    └── useContinueListening.ts            ← Clear shared location

✅ Clear distinction: feature-local vs shared
✅ No cross-feature imports
✅ Easy to find shared code
```

---

## Phase 2A Summary

| Item | Status | Notes |
|------|--------|-------|
| 2.1 Cross-feature imports | ✅ Complete | 3 files moved, 19 imports updated |
| 2.2 Duplicate components | ⏸️ Deferred | SeriesCard, SwipeableBookCard |
| 2.3 Color tokens | ✅ Verified | Already deprecated correctly |
| 2.4 Deprecated hooks | ✅ Complete | useResponsive removed from exports |
