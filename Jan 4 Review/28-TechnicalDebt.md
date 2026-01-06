# Technical Debt Inventory

Screen-by-screen inventory of technical debt with severity ratings.

## Severity Legend

| Rating | Description | Action |
|--------|-------------|--------|
| **Critical** | Causes crashes, data loss, or security issues | Fix immediately |
| **High** | Significant performance/maintainability impact | Fix in next sprint |
| **Medium** | Code quality issues, moderate impact | Plan for refactor |
| **Low** | Minor improvements, nice-to-have | Backlog |

---

## Global/Cross-Cutting Debt

### Type Safety Issues

| Issue | Severity | Count | Description |
|-------|----------|-------|-------------|
| `as any` casts | **High** | 202 | 202 occurrences across 61 files. Most in screens accessing `userMediaProgress`, `media.duration`, `metadata.series` |
| `@ts-ignore` comments | **Medium** | 26+ | Mostly in test files and analytics |
| Missing API response types | **High** | - | Server responses use `any` casts for progress, metadata |

**Recommendation:** Create proper TypeScript interfaces for API responses, especially `LibraryItem.media` and `userMediaProgress`.

---

### File Size (God Objects)

| File | Lines | Severity | Notes |
|------|-------|----------|-------|
| `CDPlayerScreen.tsx` | 4,398 | **Critical** | Monolithic player UI. Should split into components |
| `sqliteCache.ts` | 3,310 | **High** | All SQLite ops in one file. Split by domain |
| `playerStore.ts` | 2,838 | **High** | Heavily documented but massive. Consider splitting |
| `MyLibraryScreen.tsx` | 2,020 | **High** | 5 tabs in one file. Extract tab components |
| `SearchScreen.tsx` | 1,798 | **Medium** | Complex but cohesive |
| `downloadManager.ts` | 1,169 | **Medium** | Acceptable for single-purpose service |
| `BookDetailScreen.tsx` | 1,078 | **Medium** | Moderate size |

---

### Deprecated Code

| Item | Location | Severity | Replacement |
|------|----------|----------|-------------|
| `useResponsive` hooks | `shared/hooks/useResponsive.ts` | **Low** | Use `@/shared/theme` direct imports |
| `useThemeColors()` | `themeStore.ts:156` | **Low** | Use `useTheme()` or `useColors()` |
| `colors.gold/goldDark/goldSubtle` | `colors.ts:22-26` | **Low** | Use `primary/primaryDark/primarySubtle` |
| `getTagColors()` | `colors.ts:381` | **Low** | Use `useTheme().colors` |

---

### Error Handling Gaps

| Issue | Severity | Affected Files |
|-------|----------|----------------|
| Silent catch blocks | **Medium** | `SearchScreen`, `BookDetailScreen`, `AuthorDetailScreen` |
| No error boundaries on screens | **High** | Only `FloatingTabBar` wrapped. All screens unprotected |
| Console.log in production | **Medium** | 492 occurrences across 43 files |

---

### Console Logging

| Location | Count | Severity | Notes |
|----------|-------|----------|-------|
| `sqliteCache.ts` | 116 | **Medium** | Debug logging should use logger service |
| `queueStore.ts` | 29 | **Medium** | Dev logging left in |
| `appInitializer.ts` | 21 | **Low** | Init logging is useful |
| `events/listeners.ts` | 19 | **Medium** | Event debugging |
| `websocketService.ts` | 18 | **Medium** | Connection debugging |
| `authService.ts` | 19 | **Medium** | Auth debugging |

---

## Per-Screen Technical Debt

### HomeScreen

| Issue | Severity | Description |
|-------|----------|-------------|
| - | - | Relatively clean after redesign |

**File Size:** 366 lines - **Good**

---

### MyLibraryScreen

| Issue | Severity | Description |
|-------|----------|-------------|
| File size | **High** | 2,020 lines - 5 tabs + components inline |
| `as any` casts | **High** | 16 occurrences for metadata access |
| Inline styles | **Medium** | Mixed with StyleSheet |
| Tab logic coupling | **Medium** | All tab filtering in one useMemo |

**Recommendations:**
1. Extract each tab into separate component files
2. Create `EnrichedBook` interface with proper types
3. Move `getMetadata` helper to shared utils

---

### SearchScreen

| Issue | Severity | Description |
|-------|----------|-------------|
| File size | **Medium** | 1,798 lines - complex but cohesive |
| Error handling | **Medium** | 4 try-catch blocks with just console.error |
| `as any` casts | **Low** | 2 occurrences |
| Autocomplete coupling | **Medium** | Autocomplete overlay embedded, not separated |

**Recommendations:**
1. Extract autocomplete overlay to component
2. Add user-facing error feedback
3. Consider virtualized list for large result sets

---

### CDPlayerScreen

| Issue | Severity | Description |
|-------|----------|-------------|
| File size | **Critical** | 4,398 lines - largest screen file |
| Component mixing | **High** | Timeline, controls, sheets, panels inline |
| `as any` casts | **Medium** | 7 occurrences |
| Animated value management | **Medium** | Many useRef for Animated.Values |
| PanResponder complexity | **High** | Complex gesture handling inline |

**Recommendations:**
1. **Priority 1:** Extract Timeline to `PlayerTimeline.tsx` (~800 lines)
2. **Priority 2:** Extract Controls to `PlayerControls.tsx` (~400 lines)
3. **Priority 3:** Extract BookInfo to `PlayerBookInfo.tsx` (~300 lines)
4. Create custom hooks for gesture logic

---

### BookDetailScreen

| Issue | Severity | Description |
|-------|----------|-------------|
| `as any` casts | **High** | 12 occurrences |
| Error handling | **Medium** | 6 catch blocks, some just log |
| Tab navigation | **Low** | Uses manual state vs tab navigator |

**Recommendations:**
1. Type the book detail response properly
2. Add user-facing error states
3. Consider Suspense boundaries for lazy sections

---

### DownloadsScreen

| Issue | Severity | Description |
|-------|----------|-------------|
| `as any` casts | **Low** | 2 occurrences |
| Clean structure | - | Well organized |

**File Size:** ~540 lines - **Good**

---

### QueueScreen

| Issue | Severity | Description |
|-------|----------|-------------|
| `as any` casts | **Low** | 2 occurrences |
| Clean structure | - | Well organized |

**File Size:** ~400 lines - **Good**

---

### ProfileScreen

| Issue | Severity | Description |
|-------|----------|-------------|
| Error handling | **Low** | 1 catch block |
| Clean structure | - | Well organized |

---

### BrowseScreen

| Issue | Severity | Description |
|-------|----------|-------------|
| Data hook size | **Medium** | `useDiscoverData.ts` is 803 lines |
| FIX comments | **Medium** | 5 FIX comments indicating workarounds |
| Computed data | **Medium** | Many large useMemo blocks |

**Recommendations:**
1. Split `useDiscoverData` into smaller hooks per section
2. Address FIX comments or document why they're necessary

---

### SeriesDetailScreen

| Issue | Severity | Description |
|-------|----------|-------------|
| `as any` casts | **High** | 9 occurrences |
| Series metadata typing | **Medium** | Complex nested structure untyped |

---

### AuthorDetailScreen

| Issue | Severity | Description |
|-------|----------|-------------|
| `as any` casts | **High** | 8 occurrences |
| Error handling | **Medium** | 1 catch block |

---

### NarratorDetailScreen

| Issue | Severity | Description |
|-------|----------|-------------|
| `as any` casts | **Medium** | 5 occurrences |
| No cached data | **Medium** | Always requires server |

---

### StatsScreen

| Issue | Severity | Description |
|-------|----------|-------------|
| Clean structure | - | Well organized with proper hooks |

---

### Settings Screens

| Screen | Severity | Notes |
|--------|----------|-------|
| StorageSettingsScreen | **Low** | Clean |
| PlaybackSettingsScreen | **Low** | Clean |
| HapticSettingsScreen | **Low** | Clean |
| ChapterCleaningSettingsScreen | **Low** | Clean |
| PreferencesScreen | **Low** | Clean |

---

## Service/Store Debt

### playerStore.ts (2,838 lines)

| Issue | Severity | Description |
|-------|----------|-------------|
| File size | **High** | Largest store file |
| `as any` casts | **Medium** | 8 occurrences |
| Console.log | **Medium** | 8 debug statements |
| Mixed concerns | **Medium** | Audio, bookmarks, speed, seeking all in one |

**Recommendations:**
1. Extract bookmark logic to `bookmarkStore.ts`
2. Extract speed settings to `speedStore.ts` (already exists as `settingsStore.ts`)
3. Create `usePlayerActions` hook for common action patterns

---

### sqliteCache.ts (3,310 lines)

| Issue | Severity | Description |
|-------|----------|-------------|
| File size | **High** | All SQLite in one file |
| Console.log | **High** | 116 debug statements |
| Mixed domains | **High** | Downloads, stats, cache, queue, user_books |

**Recommendations:**
1. Split into domain-specific files:
   - `sqliteDownloads.ts`
   - `sqliteStats.ts`
   - `sqliteQueue.ts`
   - `sqliteUserBooks.ts`
2. Create facade that imports all
3. Move logging to proper logger with levels

---

### queueStore.ts

| Issue | Severity | Description |
|-------|----------|-------------|
| Console.log | **Medium** | 29 debug statements |

---

### downloadManager.ts

| Issue | Severity | Description |
|-------|----------|-------------|
| Clean structure | - | Well organized |
| Console.log | **Low** | 4 debug statements (acceptable for service) |

---

## Incomplete Features (TODOs)

| Location | TODO | Severity |
|----------|------|----------|
| `WishlistScreen.tsx:125` | `TODO: Implement edit sheet` | **Low** |

**Note:** Only 1 TODO found - codebase is clean of TODO debt.

---

## Testing Debt

| Issue | Severity | Description |
|-------|----------|-------------|
| `@ts-ignore` in tests | **Low** | 26 occurrences in analytics tests |
| Limited test coverage | **Medium** | Only 1 component test file found |

---

## Platform-Specific Debt

| Issue | Severity | Count | Description |
|-------|----------|-------|-------------|
| `Platform.OS` checks | **Low** | 11 | Inline platform checks, could use Platform.select |
| Android-specific | **Low** | - | ActionSheetIOS used, needs Android equivalent |

---

## Summary by Priority

### Critical (Fix This Sprint)

1. **CDPlayerScreen.tsx refactor** - 4,398 lines is unmaintainable
2. **Error boundaries** - Screens can crash without recovery

### High Priority (Next Sprint)

1. **Type safety for API responses** - 202 `as any` casts
2. **sqliteCache.ts split** - 3,310 lines, mixed domains
3. **MyLibraryScreen.tsx refactor** - 2,020 lines, 5 tabs inline
4. **playerStore.ts split** - 2,838 lines, mixed concerns

### Medium Priority (Backlog)

1. **Console.log cleanup** - 492 occurrences, add logger levels
2. **SearchScreen error UX** - Show user-facing errors
3. **useDiscoverData.ts split** - 803 lines, many useMemo
4. **Series/Author type safety** - 9+ `as any` in detail screens

### Low Priority (Nice-to-Have)

1. Deprecated hook removal
2. TODO: Wishlist edit sheet
3. Test coverage improvement
4. Platform.select standardization

---

## Metrics Summary

| Metric | Value | Status |
|--------|-------|--------|
| Total `as any` casts | 202 | Needs work |
| Total console.log | 492 | Needs cleanup |
| Files > 1000 lines | 7 | Needs splitting |
| Files > 2000 lines | 4 | Critical |
| Error boundaries | 1 | Needs expansion |
| TODO comments | 1 | Good |
| Deprecated items | 12 | Low priority |
| @ts-ignore (non-test) | 3 | Good |
