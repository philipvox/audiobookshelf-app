# Refactoring Priority Matrix

## Overview

This document prioritizes potential refactoring targets based on three criteria:

| Criteria | Description | Weight |
|----------|-------------|--------|
| **User Impact** | How much users are affected by bugs/performance in this code | High |
| **Code Complexity** | Lines of code, cyclomatic complexity, number of responsibilities | Medium |
| **Dependency Count** | How many other files import/depend on this module | High |

**Priority Score Formula:**
```
Priority = (UserImpact × 3) + (Complexity × 2) + (DependencyRisk × 3)
```

Scale: 1 (Low) to 5 (Critical)

---

## Priority Matrix

### Critical Priority (Score 20+)

| Module | Lines | Dependents | User Impact | Complexity | Dep Risk | Score | Reason |
|--------|-------|------------|-------------|------------|----------|-------|--------|
| **playerStore.ts** | 2,838 | 16 | 5 | 5 | 4 | **33** | Core playback state, affects all audio |
| **CDPlayerScreen.tsx** | 4,398 | 1 | 5 | 5 | 2 | **29** | Main player UI, highest LOC |
| **libraryCache.ts** | 771 | 39 | 4 | 3 | 5 | **28** | Most imported module, data foundation |
| **apiClient** | ~500 | 61 | 5 | 3 | 5 | **31** | All server communication |

### High Priority (Score 15-19)

| Module | Lines | Dependents | User Impact | Complexity | Dep Risk | Score | Reason |
|--------|-------|------------|-------------|------------|----------|-------|--------|
| **downloadManager.ts** | 1,169 | 25 | 4 | 4 | 4 | **26** | Download reliability critical |
| **sqliteCache.ts** | 3,310 | ~10 | 3 | 5 | 3 | **23** | Large, complex persistence |
| **audioService.ts** | 1,335 | 9 | 5 | 4 | 3 | **25** | Audio engine, errors = no playback |
| **MyLibraryScreen.tsx** | 2,020 | 1 | 4 | 4 | 1 | **19** | Primary library view |
| **themeStore** | ~200 | 51 | 3 | 2 | 5 | **21** | Most used UI dependency |

### Medium Priority (Score 10-14)

| Module | Lines | Dependents | User Impact | Complexity | Dep Risk | Score | Reason |
|--------|-------|------------|-------------|------------|----------|-------|--------|
| **SearchScreen.tsx** | 1,798 | 1 | 3 | 4 | 1 | **15** | Important but self-contained |
| **BookDetailScreen.tsx** | 1,078 | 1 | 3 | 3 | 1 | **13** | Key user flow |
| **queueStore.ts** | 327 | 14 | 3 | 2 | 3 | **15** | Queue management |
| **useHomeData.ts** | ~600 | 1 | 3 | 3 | 1 | **13** | Home screen data |
| **GlobalMiniPlayer.tsx** | 649 | 1 | 4 | 3 | 1 | **16** | Always visible player |

### Low Priority (Score <10)

| Module | Lines | Dependents | User Impact | Complexity | Dep Risk | Score | Reason |
|--------|-------|------------|-------------|------------|----------|-------|--------|
| **StatsScreen.tsx** | 802 | 1 | 2 | 3 | 1 | **10** | Nice-to-have feature |
| **WishlistScreen.tsx** | 648 | 1 | 2 | 2 | 1 | **8** | Self-contained feature |
| **runtimeMonitor.ts** | 1,409 | ~5 | 1 | 4 | 2 | **11** | Dev-only, no user impact |

---

## Detailed Analysis

### 1. playerStore.ts (CRITICAL)

**Current State:**
- 2,838 lines in single file
- 43 imports
- Manages: playback state, seeking, chapter navigation, speed, sleep timer, bookmarks, completion, position syncing

**Issues:**
- God object anti-pattern
- Too many responsibilities
- Difficult to test in isolation
- State mutations spread across file

**Recommended Refactoring:**
```
playerStore.ts (2,838 lines)
    ↓ Split into:
├── playbackStore.ts     (~800 lines) - play/pause/seek/position
├── chapterStore.ts      (~400 lines) - chapter navigation
├── bookmarksStore.ts    (~300 lines) - bookmark CRUD
├── sleepTimerStore.ts   (~200 lines) - sleep timer logic
├── speedStore.ts        (~150 lines) - playback rate per book
└── playerUIStore.ts     (~200 lines) - UI state (visibility, sheets)
```

**Effort:** High (2-3 days)
**Risk:** High (core functionality)

---

### 2. CDPlayerScreen.tsx (CRITICAL)

**Current State:**
- 4,398 lines - largest file in codebase
- 32 imports
- 11 useEffect hooks
- Renders: cover, timeline, controls, sheets, panels

**Issues:**
- Monolithic component
- Hard to reason about
- Performance concerns (re-renders)
- Mixing UI and business logic

**Recommended Refactoring:**
```
CDPlayerScreen.tsx (4,398 lines)
    ↓ Extract components:
├── PlayerHeader.tsx         - close button, title
├── PlayerCover.tsx          - cover art display
├── PlayerTimeline.tsx       - progress bar, chapter ticks
├── PlayerControls.tsx       - play/pause, skip, speed
├── ChapterListSheet.tsx     - chapter navigation
├── BookmarksSheet.tsx       - bookmarks panel
├── SleepTimerSheet.tsx      - sleep timer
└── CDPlayerScreen.tsx       (~500 lines) - composition only
```

**Effort:** High (2-3 days)
**Risk:** Medium (UI only, no state changes)

---

### 3. libraryCache.ts (HIGH)

**Current State:**
- 771 lines
- 39 dependents (most in codebase)
- In-memory cache for all library data

**Issues:**
- Any bug affects entire app
- Memory pressure on large libraries
- No cache invalidation strategy documented

**Recommended Refactoring:**
- Add cache size limits
- Implement LRU eviction for large libraries
- Add cache versioning for migrations
- Document cache invalidation rules

**Effort:** Medium (1-2 days)
**Risk:** High (foundational)

---

### 4. Type Safety Debt

**Current State:**
- 119 files use `as any` or `: any`
- Type assertions hiding real issues

**High-Impact Files:**
```
Files with most 'any' usage:
1. playerStore.ts
2. CDPlayerScreen.tsx
3. downloadManager.ts
4. sqliteCache.ts
5. Various detail screens
```

**Recommended Approach:**
1. Define proper types for API responses
2. Add strict null checks incrementally
3. Replace `as any` with proper type guards

**Effort:** Medium (ongoing)
**Risk:** Low (type-only changes)

---

### 5. Cross-Feature Imports

**Current State:**
Features importing from other features (violates module boundaries):

| Import Pattern | Count | Risk |
|----------------|-------|------|
| `useContinueListening` from home | 6 | Move to shared |
| `useMyLibraryStore` from library | 5 | Move to shared |
| `useKidModeStore` from profile | 5 | Move to shared |
| `SearchBar` from search | 4 | Move to shared |

**Recommended Refactoring:**
```
Current:
  features/home/hooks/useContinueListening.ts
  features/library/stores/myLibraryStore.ts
  features/profile/stores/kidModeStore.ts

Move to:
  shared/hooks/useContinueListening.ts
  shared/stores/libraryStore.ts
  shared/stores/kidModeStore.ts
```

**Effort:** Low (1 day)
**Risk:** Low (import path changes only)

---

### 6. Duplicate Components

**Current State:**
```
Duplicate names found:
- SeriesCard.tsx (2 files)
- SwipeableBookCard.tsx (2 files)
```

**Locations:**
```
src/features/home/components/SeriesCard.tsx
src/features/series/components/SeriesCard.tsx

src/features/discover/components/SwipeableBookCard.tsx
src/features/reading-history-wizard/components/SwipeableBookCard.tsx
```

**Recommended:**
- Consolidate into shared components
- Or rename to clarify purpose (e.g., `HomeSeriesCard`, `SeriesDetailCard`)

**Effort:** Low (few hours)
**Risk:** Low

---

### 7. Console Statements

**Current State:**
- 61 files contain console.log/warn/error
- Mix of debug logging and error handling

**Recommended:**
- Create centralized logger utility
- Remove debug console.log statements
- Keep console.warn/error for real issues
- Add log levels (debug, info, warn, error)

**Effort:** Low (few hours)
**Risk:** Low

---

## Refactoring Roadmap

### Phase 1: Quick Wins (1-2 days)

| Task | Effort | Impact |
|------|--------|--------|
| Move cross-feature imports to shared | 4 hours | Cleaner architecture |
| Consolidate duplicate components | 2 hours | Less confusion |
| Remove debug console statements | 2 hours | Cleaner logs |
| Add centralized logger | 4 hours | Better debugging |

### Phase 2: Type Safety (1 week, ongoing)

| Task | Effort | Impact |
|------|--------|--------|
| Define API response types | 2 days | Catch bugs at compile time |
| Fix `any` in playerStore | 1 day | Core stability |
| Fix `any` in downloadManager | 1 day | Download reliability |
| Enable strict null checks | Ongoing | Prevent null errors |

### Phase 3: playerStore Split (2-3 days)

| Task | Effort | Impact |
|------|--------|--------|
| Extract sleepTimerStore | 4 hours | Easy first extraction |
| Extract bookmarksStore | 4 hours | Self-contained |
| Extract speedStore | 2 hours | Small scope |
| Extract chapterStore | 6 hours | More complex |
| Extract playbackStore | 8 hours | Core logic |

### Phase 4: CDPlayerScreen Split (2-3 days)

| Task | Effort | Impact |
|------|--------|--------|
| Extract PlayerTimeline | 4 hours | Reusable component |
| Extract PlayerControls | 4 hours | Clear responsibility |
| Extract sheet components | 6 hours | Multiple extractions |
| Compose final screen | 4 hours | Clean up main file |

---

## Risk Assessment

### High Risk Refactoring

| Module | Risk | Mitigation |
|--------|------|------------|
| playerStore | Playback could break | Extensive testing, feature flags |
| audioService | Audio could stop | Keep old code path, A/B test |
| downloadManager | Downloads fail | Test on multiple devices |
| libraryCache | Data loss | Add cache versioning |

### Low Risk Refactoring

| Module | Risk | Notes |
|--------|------|-------|
| UI component extraction | Minimal | Visual-only changes |
| Import path changes | Minimal | TypeScript catches errors |
| Type additions | None | Compile-time only |
| Console cleanup | None | No behavior change |

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Largest file (lines) | 4,398 | <1,000 |
| playerStore.ts lines | 2,838 | <800 |
| Files with `any` | 119 | <50 |
| Cross-feature imports | 25+ | 0 |
| Duplicate components | 4 | 0 |
| Console statements | 61 files | 10 files |

---

## Recommended Immediate Actions

1. **Don't refactor playerStore yet** - Too risky without comprehensive tests
2. **Start with cross-feature imports** - Quick win, low risk
3. **Add types incrementally** - Each PR should reduce `any` count
4. **Extract CDPlayerScreen components** - UI-only, safe refactor
5. **Document libraryCache behavior** - Understanding before changing

---

## Files to Watch

These files change frequently and should be monitored for complexity creep:

| File | Recent Changes | Watch For |
|------|----------------|-----------|
| playerStore.ts | Position sync, seeking fixes | More state additions |
| useHomeData.ts | Kid mode, series ordering | More computed values |
| MyLibraryScreen.tsx | Source of truth fixes | More tabs/filters |
| CDPlayerScreen.tsx | Timeline improvements | More sheets/panels |
