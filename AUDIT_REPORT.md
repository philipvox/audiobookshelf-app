# Audit Report: AudiobookShelf Mobile App v0.9.223

**Audit Number:** 3 (Third Comprehensive Audit)
**Date:** 2026-03-22
**Version Audited:** 0.9.223 (Build 1223)
**Previous Scores:** Audit 1: 78/100, Audit 2: 89/100

---

## Executive Summary

This third audit examined all source files across the codebase following 17 fixes applied since the second audit (v0.9.222). While the prior fixes addressed many issues (StorageCard debounce, wishlist cap, SQLite migration safety, typed lazy getters, event bus capacity), **several new bugs were introduced by the fix agents**, primarily in `authService.clearStorage()`. The app's overall architecture remains solid, with good patterns for state management, audio playback, and offline support.

**Overall Score: 87/100** (down from 89 due to newly introduced regressions)

---

## Scoring Breakdown

| Category | Score | Weight | Notes |
|----------|-------|--------|-------|
| Architecture & Patterns | 90/100 | 20% | Strong modular design, cross-feature imports still prevalent |
| Performance | 88/100 | 15% | Good use of lazy loading, memoization; module-level Dimensions.get() |
| Error Handling | 89/100 | 15% | Comprehensive try/catch, error boundaries on all screens |
| Security | 78/100 | 20% | PIN hash migration gap, kid mode not reset on logout |
| Data Integrity | 85/100 | 15% | Type mismatch in auth cleanup, silent failures on wrong method names |
| Production Readiness | 90/100 | 15% | Good logging, background tasks, graceful degradation |
| **Weighted Total** | **87/100** | | |

---

## Issues Found

### CRITICAL (Must Fix Before Release)

#### C-01: authService resets myLibraryStore with Set() instead of Array
**File:** `src/core/auth/authService.ts` line 219
**Severity:** Critical | **Category:** Data Integrity
**Introduced by:** Fix agent (Audit 2 store cleanup)

```typescript
// BUG: myLibraryStore uses string[] arrays, not Set objects
require('@/shared/stores/myLibraryStore').useMyLibraryStore.setState({
  libraryIds: new Set(),          // Should be: []
  favoriteSeriesNames: new Set(), // Should be: []
  selectedIds: new Set(),         // Should be: []
  isSelecting: false
});
```

**Impact:** After logout, any component calling `.includes()`, `.filter()`, `.map()`, or `.length` on these fields will crash with a TypeError because Set objects don't have those Array methods. This affects the entire My Library tab.

**Fix:** Change `new Set()` to `[]` for all three fields.

---

#### C-02: PIN Hash Migration Gap - Existing Users Locked Out
**File:** `src/shared/stores/kidModeStore.ts` lines 338-384
**Severity:** Critical | **Category:** Security
**Status:** Pre-existing (not introduced by fix agents)

`setPin()` now hashes PINs with SHA-256 before storing them. `verifyPin()` hashes the input and compares to the stored value. However, there is **no migration path** for users who had a plaintext PIN stored before this change was deployed.

**Impact:** Any user who set a Kid Mode PIN before the hashing update will be unable to disable Kid Mode or access adult content. Their plaintext PIN will never match the SHA-256 hash comparison.

**Fix:** Add a migration check in `verifyPin()`:
1. If stored PIN is exactly 4 digits (plaintext), hash it and update storage
2. Then compare hashed input against newly-hashed stored value
3. OR: detect plaintext by checking if stored value length is 4 (hashes are 64 hex chars)

---

### HIGH (Should Fix Before Release)

#### H-01: authService Calls Non-Existent Method `cancelSeeking`
**File:** `src/core/auth/authService.ts` line 214
**Severity:** High | **Category:** Data Integrity
**Introduced by:** Fix agent (Audit 2 store cleanup)

```typescript
require('@/features/player/stores/seekingStore')
  .useSeekingStore.getState().cancelSeeking?.();
// Method doesn't exist! Actual methods are: cancelSeek() or resetSeekingState()
```

**Impact:** The optional chaining (`?.()`) prevents a crash, but the seeking state is never cleaned up on logout. If a user logs out while seeking, the seeking state persists. Low practical impact due to the full app restart that typically follows logout.

**Fix:** Change `cancelSeeking` to `resetSeekingState`.

---

#### H-02: authService Uses Wrong Property Name `isEnabled` for kidModeStore
**File:** `src/core/auth/authService.ts` line 233
**Severity:** High | **Category:** Security

```typescript
require('@/shared/stores/kidModeStore').useKidModeStore.setState({
  isEnabled: false,  // WRONG: property is called `enabled`, not `isEnabled`
  pin: null,
  pinFailedAttempts: 0,
  pinLockoutUntil: null
});
```

**Impact:** Kid Mode is NOT disabled on logout because `isEnabled` is not a recognized property. The `enabled` flag retains its value. If a parent logs out and a child picks up the device, Kid Mode settings from the previous account persist. The `pin`, `pinFailedAttempts`, and `pinLockoutUntil` are correctly reset since those property names match.

**Fix:** Change `isEnabled: false` to `enabled: false`.

---

#### H-03: Unbounded `followedAuthors` and `trackedSeries` Arrays in WishlistStore
**File:** `src/features/wishlist/stores/wishlistStore.ts`
**Severity:** High | **Category:** Performance/Data Integrity
**Status:** Pre-existing (wishlist `items` capped at 200, but these arrays have no limit)

The wishlist store correctly caps `items` at `MAX_WISHLIST_ITEMS = 200`, but `followedAuthors` and `trackedSeries` arrays have no size limits. A user could theoretically follow thousands of authors, causing:
- AsyncStorage serialization overhead (entire store persisted)
- Slow filtering operations
- Memory pressure on low-end devices

**Fix:** Add caps (e.g., 100 followed authors, 100 tracked series) with the same pattern used for items.

---

### MEDIUM (Should Fix in Next Sprint)

#### M-01: Duplicate `resetSeekingState()` Call in playerStore.loadBook
**File:** `src/features/player/stores/playerStore.ts` lines 557 and 576
**Severity:** Medium | **Category:** Code Quality

```typescript
// Line 557: First call
useSeekingStore.getState().resetSeekingState();

// ... set() call with new book state ...

// Line 576: Duplicate call
useSeekingStore.getState().resetSeekingState();
```

**Impact:** No functional bug (idempotent operation), but unnecessary work and confusing intent. The first call resets before setting state, the second resets after -- both accomplish the same thing.

**Fix:** Remove one of the two calls. The one at line 557 (before state set) is sufficient.

---

#### M-02: Module-Level `Dimensions.get('window')` in 17 Files
**Files:** See list below
**Severity:** Medium | **Category:** Platform Compatibility

```
src/constants/layout.ts
src/shared/theme/spacing.ts
src/features/player/constants.ts
src/features/reading-history-wizard/screens/MarkBooksScreen.tsx
src/features/reading-history-wizard/components/SwipeableBookCard.tsx
src/features/home/components/DiscoverMoreCard.tsx
src/features/library/screens/SeriesListScreen.tsx
src/features/browse/components/CollectionsSection.tsx
src/features/browse/components/SeriesListContent.tsx
src/features/browse/components/FeaturedCollectionCard.tsx
src/features/browse/components/BrowseHero.tsx
src/features/browse/screens/CollectionsListScreen.tsx
src/features/book-detail/components/SeriesSwipeContainer.tsx
src/shared/components/BrowseSeriesCard.tsx
src/shared/components/Snackbar.tsx
```

**Impact:** `Dimensions.get('window')` at module scope captures the window size at import time. On iPad split-screen, foldable devices, or Android multi-window, the values won't update if the window resizes. The app already has a `useResponsive` hook that handles this correctly.

**Fix:** Replace module-level calls with `useWindowDimensions()` hook or the existing `useResponsive` hook inside components.

---

#### M-03: Extensive Cross-Feature Imports Still Present
**Severity:** Medium | **Category:** Architecture

The CLAUDE.md states "Features should NOT import from other features" but this rule is widely violated. 19 files across non-player features import from `@/features/player`. Other cross-feature imports include:

- `browse` -> `player`, `collections`, `narrator`, `library`, `search`, `series`, `discover`
- `profile` -> `player` (5+ stores), `library`, `stats`
- `library` -> `player`, `downloads`, `book-detail`, `recommendations`
- `book-detail` -> `player`, `queue`
- `queue` -> `player`
- `search` -> `player`

**Impact:** Tight coupling makes features harder to test and maintain independently. Circular dependency risk (already mitigated with lazy getters in some places).

**Mitigation:** The lazy getter pattern is correctly applied in critical circular paths (castStore, seekingStore). For non-circular paths, this is more of a long-term maintenance concern than a bug.

---

#### M-04: `require()` Calls in authService Not Using Typed Lazy Getter Pattern
**File:** `src/core/auth/authService.ts` lines 212-238
**Severity:** Medium | **Category:** Code Quality

The `clearStorage()` method uses 20+ raw `require()` calls wrapped in individual try/catch blocks. While each call is wrapped in `try/catch {}`, using untyped `require()` means:
- No compile-time checking of property names (root cause of C-01, H-01, H-02)
- No IDE autocompletion or type safety
- Easy to introduce property name mismatches

**Fix:** Either:
1. Use typed lazy getters (like castStore does) for compile-time safety
2. Or use dynamic `import()` with typed returns
3. At minimum, add a unit test that verifies all property names match their stores

---

### LOW (Nice to Have)

#### L-01: QueueScreen Uses DraggableFlatList Inside ScrollView
**File:** `src/features/queue/screens/QueueScreen.tsx` line 372
**Severity:** Low | **Category:** UX

`DraggableFlatList` is nested inside a `ScrollView` with `scrollEnabled={false}`. While this works because scroll is disabled on the FlatList, it means the entire queue is rendered at once (no virtualization benefit). For very large queues, this could cause performance issues.

**Impact:** Minimal for typical queue sizes (5-20 books). Only problematic for 100+ items.

---

#### L-02: `formatDuration()` Helper Duplicated Across Files
**Files:** `QueueScreen.tsx`, `QueuePanel.tsx`, `QueueItem.tsx`, `SwipeableQueueItem.tsx`
**Severity:** Low | **Category:** Code Quality

Each queue component has its own copy of duration formatting logic. The shared utils already have `formatDuration` in `src/shared/utils/format.ts`.

**Fix:** Import from shared utils.

---

#### L-03: Hardcoded Skip Intervals in GlobalMiniPlayer
**File:** `src/navigation/components/GlobalMiniPlayer.tsx` lines 121, 130
**Severity:** Low | **Category:** UX Consistency

The mini player hardcodes skip back = 15s and skip forward = 30s, while the user can configure these in Profile > Playback Settings (`skipForwardInterval`, `skipBackInterval`). The full player respects user settings but the mini player doesn't.

**Fix:** Read from `usePlayerSettingsStore` instead of hardcoding.

---

#### L-04: `useEffect` Missing Dependency in QueueScreen
**File:** `src/features/queue/screens/QueueScreen.tsx` line 230
**Severity:** Low | **Category:** React Best Practices

```typescript
useEffect(() => {
  if (shouldShowClearDialog) { ... }
}, [shouldShowClearDialog]);
// Missing: dismissClearDialog, clearPlayed
```

**Impact:** Functions are stable (from Zustand), so this won't cause bugs, but ESLint exhaustive-deps would flag it.

---

## Verified Fixes (From Audit 2)

The following fixes from the previous audit were verified as correctly applied:

| Fix | Status | Verification |
|-----|--------|-------------|
| Wishlist MAX_WISHLIST_ITEMS = 200 cap | Correct | Items array properly bounded |
| StorageCard 5-second debounce | Correct | Interval check + useEffect cleanup |
| SQLite migration safety (user_books check before drop) | Correct | Checks count before dropping legacy table |
| Typed lazy getters in castStore | Correct | 5 dependencies typed with compile-time safety |
| Typed lazy getter in seekingStore | Correct | playerStore resolved with type annotation |
| Event bus maxListeners = 25 | Correct | Raised from default 10 |
| Error boundaries on all screen-level components | Correct | 18 screens wrapped in AppNavigator |
| Non-blocking app initialization | Correct | InteractionManager defers all service inits |
| Position generation counter in seekingStore | Correct | Prevents stale updates |
| Safety timeout for stuck seeking (10s) | Correct | Auto-resets via setTimeout |

---

## Architecture Observations

### Strengths

1. **Modular player architecture**: playerStore delegates to 7 child stores (seeking, speed, sleep, bookmarks, completion, settings, selectors). Clear ownership boundaries.

2. **Offline-first queue**: Queue persists to SQLite with slim metadata (~200 bytes/book instead of 150-500KB for full LibraryItem). Resolves from cache with offline fallback stubs.

3. **Background task prioritization**: BackgroundTaskService uses priority levels and per-task timeouts. Critical tasks (progress sync) run first within the limited background time.

4. **Error boundary coverage**: Every screen in AppNavigator is wrapped in an ErrorBoundary with context labels. Crashes are contained to individual screens.

5. **Authentication security**: Proper use of SecureStore for tokens (with 2048 byte limit awareness), AsyncStorage for larger user data. Credential storage is atomic (all-or-nothing with cleanup on partial failure).

6. **Content filtering**: Comprehensive age-based filtering system with multiple dimensions (age recommendations, age ratings, content ratings, genre-based, tag-based, length range).

### Areas for Improvement

1. **Cross-feature coupling**: The "features should not import from other features" rule is widely violated. While not causing bugs (lazy getters handle circular cases), it makes the codebase harder to refactor.

2. **Auth cleanup fragility**: The 20+ `require()` calls in `clearStorage()` are the most error-prone code in the entire codebase. Three separate bugs were introduced here (C-01, H-01, H-02) because there's no type checking on property names.

3. **Module-level dimension capture**: 17 files capture window dimensions at module scope, which won't update on window resize events.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| C-01: Crash after logout (Set vs Array) | **High** (every logout) | **High** (app crash) | Fix immediately |
| C-02: Locked out of Kid Mode | **Medium** (only affects users who set PIN before hash update) | **High** (permanent lockout) | Add migration |
| H-02: Kid Mode persists after logout | **Medium** (only if Kid Mode was active) | **Medium** (security leak) | Fix property name |
| M-02: Stale dimensions on resize | **Low** (only iPad/foldable) | **Low** (layout glitch) | Replace with hooks |

---

## Recommendation

**Do NOT ship** until C-01 (Set vs Array crash) is fixed. This will crash the app on every logout attempt. C-02 (PIN migration) and H-02 (Kid Mode not reset on logout) should also be addressed before release due to their security implications.

The remaining medium and low issues can be addressed in subsequent releases without blocking.
