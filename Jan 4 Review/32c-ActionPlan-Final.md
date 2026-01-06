# Action Plan - Final Version

**Version:** 32c (Final, post-validation)
**Based on:** 32b-ActionPlan-Revised.md + 33-ValidationReport.md fixes

---

## Key Changes from 32b

1. **Added SharedUtilities (0.1)** - Critical dependency for useToast, PinInput
2. **Re-sequenced Phase 2** - Explicit dependency ordering with sub-phases
3. **Fixed effort estimates** - 7 items corrected based on actual breakdowns
4. **Removed ambiguity** - Decisions made for Option A/B items
5. **Total items:** 67 (was 66)

---

## Phase 0: Critical Dependencies
**Must complete before other phases**

| # | Issue | Effort | Files to Create | Blocks |
|---|-------|--------|-----------------|--------|
| 0.1 | **SharedUtilities** - useToast, PinInput, getFeaturedReason | S | `src/shared/hooks/useToast.ts`, `src/shared/components/ToastContainer.tsx`, `src/shared/components/PinInput.tsx`, `src/shared/utils/featuredReason.ts` | 1.1, 1.4, 2.11, 2.5 |

**Phase 0 Summary:** 1 item (1S)

---

## Phase 1: Critical Fixes
**Blocking issues, broken flows, crashes, quick bug fixes**

### 1A. Crash Prevention

| # | Issue | Screen/Area | Effort | Files to Edit | Sources | Depends On |
|---|-------|-------------|--------|---------------|---------|------------|
| 1.1 | ✅ **Add error boundaries to all screens** | All screens | S-M | 9 screens wrapped | [27], [28], [30] | 0.1 (useToast) |
| 1.4 | ✅ **Silent catch blocks** - fixed with toast feedback | Search, BookDetail, AuthorDetail, Series | M | All screens have user feedback | [28] | 0.1 (useToast) |

### 1B. Bug Fixes (Quick Wins)

| # | Issue | Screen/Area | Effort | Files to Edit | Sources | Depends On |
|---|-------|-------------|--------|---------------|---------|------------|
| 1.7 | **StackedCovers bug** - passes only `bookIds` without `coverUrls` | SeriesDetail | S | `SeriesDetailScreen.tsx:616` | [30] Quick Win #5 | None |
| 1.8 | **Wishlist link missing from Profile** | Profile | S | `ProfileScreen.tsx` | [27], [30] Quick Win #8 | None |

### 1C. Architectural Refactors (High Priority)

| # | Issue | Screen/Area | Effort | Files to Edit | Sources | Depends On |
|---|-------|-------------|--------|---------------|---------|------------|
| 1.2 | **StandardPlayerScreen missing** (0% complete) | Player | L | Create `StandardPlayerScreen.tsx` | [27], [30] #7 | None |
| 1.3 | **CDPlayerScreen refactor** - 4,398 lines | CDPlayerScreen | L | Extract 6+ components | [28], [29], [30] #1 | None |
| 1.5 | **Type safety for API responses** - 202 `as any` casts | Global | M | Create `src/core/types/api.ts`, update screens | [28], [30] #3 | 2.4 (getBookMetadata) |
| 1.6 | **sqliteCache.ts split** - 3,310 lines | Database layer | L | Split into 8 domain files | [28], [29], [30] #5 | None |

**Phase 1 Summary:** 8 items (3L + 2M + 3S)

---

## Phase 2: Alignment Work
**Re-sequenced with explicit dependencies**

### Phase 2A: Foundation (Must Complete First)

| # | Issue | Screen/Area | Effort | Files to Edit | Sources | Depends On |
|---|-------|-------------|--------|---------------|---------|------------|
| 2.1 | **Cross-feature imports** - violates module boundaries | Architecture | S | Move `kidModeStore`, `myLibraryStore`, `useContinueListening` to `shared/` | [29], [30] #10, [31] §3.2 | None |
| 2.2 | **Duplicate components** - SeriesCard, SwipeableBookCard | Home, Series, Discover | S | Consolidate to `src/shared/components/` | [29], [31] §3.3 | None |
| 2.3 | **Deprecated color tokens** - gold → primary | Theme | S | `src/shared/theme/colors.ts` | [28] | None |
| 2.4 | **Deprecated hooks** - useResponsive removal | Shared hooks | S | Remove `useResponsive.ts` | [28] | None |

### Phase 2B: Core Helpers (Enables Other Work)

| # | Issue | Screen/Area | Effort | Files to Edit | Sources | Depends On |
|---|-------|-------------|--------|---------------|---------|------------|
| 2.5 | **Create `getBookMetadata()` helper** | Global | M | Create `src/shared/utils/bookMetadata.ts` | [28], [31] A5 | None |
| 2.6 | **Create Logger utility** | Global | S | Create `src/shared/utils/logger.ts` | [28], [30] #9 | None |

### Phase 2C: Pattern Consolidation (Depends on 2A + 2B)

| # | Issue | Screen/Area | Effort | Files to Edit | Sources | Depends On |
|---|-------|-------------|--------|---------------|---------|------------|
| 2.7 | **Create `useFilteredLibrary()` hook** | Home, Library, Discover, Search | M | Create `src/shared/hooks/useFilteredLibrary.ts` | [31] A1, §1.1 | 2.1 (kidModeStore moved) |
| 2.8 | **Standardize EmptyState API** | Downloads, Search, MyLibrary | S | Update `EmptyState.tsx` | [30] #9, [31] A4 | None |
| 2.9 | **Create `useSwipeGesture()` hook** | Discover, History, Downloads | S | Create `src/shared/hooks/useSwipeGesture.ts` | [31] A3, §1.4 | None |
| 2.10 | **Create `useSeriesProgress()` hook** | Library, SeriesDetail | S | Create `src/shared/hooks/useSeriesProgress.ts` | [31] A6 | 2.5 (getBookMetadata) |
| 2.11 | **Create `useInProgressBooks()` hook** | Home, Library, Discover | S | Create `src/shared/hooks/useInProgressBooks.ts` | [31] §2.2 | 2.5 (getBookMetadata) |
| 2.12 | **Consolidate download status checks** | Multiple screens | S | Create `src/shared/hooks/useDownloadState.ts` | [31] §2.3 | None |
| 2.13 | **Create `useIsFinished()` hook** | ReadingHistory | S | Create `src/shared/hooks/useIsFinished.ts` | [31] §4.2 | 2.5 (getBookMetadata) |

### Phase 2D: Screen Refactors (Depends on 2C)

| # | Issue | Screen/Area | Effort | Files to Edit | Sources | Depends On |
|---|-------|-------------|--------|---------------|---------|------------|
| 2.14 | ✅ **MyLibraryScreen refactor** - 2,020 → 397 lines | MyLibrary | M | 5 tab components | [28], [29], [30] #6 | 2.7 (useFilteredLibrary) |
| 2.15 | ✅ **useDiscoverData.ts split** - ~700 → 84 lines | Browse/Discover | M | 5 focused hooks + utils | [28] | 2.7 (useFilteredLibrary), 0.1 (getFeaturedReason) |
| 2.16 | ✅ **playerStore.ts split** - 2,838 → 2,156 lines | Player state | L | Split to 7 stores + 4 utils | [28], [29], [30] #2 | None |
| 2.17 | ✅ **Console.log cleanup** - 557 → 170 (debug only) | Global | M | Remaining in debug utilities | [28], [30] #9 | 2.6 (logger) |

### Phase 2E: Quick Wins & Polish

| # | Issue | Screen/Area | Effort | Files to Edit | Sources | Depends On |
|---|-------|-------------|--------|---------------|---------|------------|
| 2.18 | ✅ **Kid Mode PIN protection** - Full system | Profile/KidMode | M | Complete with set/change/remove/verify | [30] Quick Win #7 | 0.1 (PinInput), 2.1 (kidModeStore moved) |
| 2.19 | **DownloadsScreen EmptyState** | Downloads | S | `DownloadsScreen.tsx` | [30] Quick Win #9 | 2.8 (EmptyState API) |
| 2.20 | **Storage Summary "Manage" button** | Storage | S | `StorageSummary.tsx` | [30] Quick Win #10 | None |
| 2.21 | **Icon size standardization** | Global | S | Create lint rule or wrapper | [30] Quick Win #6 | None |
| 2.22 | **Inline styles cleanup** | MyLibraryScreen | S | `MyLibraryScreen.tsx` | [28] | 2.14 (after refactor) |

### Phase 2F: Documentation

| # | Issue | Screen/Area | Effort | Files to Edit | Sources | Depends On |
|---|-------|-------------|--------|---------------|---------|------------|
| 2.23 | **Document favorites split** | Docs | S | Add to CLAUDE.md: Books/Series in myLibraryStore, Authors/Narrators in preferencesStore | [31] A2 | None |
| 2.24 | **Clarify progress storage architecture** | Docs | S | Document in CLAUDE.md | [31] §4.1 | None |
| 2.25 | **Document HomeScreen design decision** | Docs | S | Add to docs: HeroSection intentional, not CD disc | [27] | None |

**Phase 2 Summary:** 25 items (1L + 6M + 18S)

---

## Phase 2 Dependency Graph

```
Phase 2A (Foundation)         Phase 2B (Core Helpers)
┌─────────────────────┐      ┌─────────────────────┐
│ 2.1 Cross-feature   │      │ 2.5 getBookMetadata │
│ 2.2 Duplicates      │      │ 2.6 Logger          │
│ 2.3 Color tokens    │      └─────────┬───────────┘
│ 2.4 Deprecated hooks│                │
└─────────┬───────────┘                │
          │                            │
          ▼                            ▼
    Phase 2C (Pattern Consolidation)
    ┌─────────────────────────────────────┐
    │ 2.7 useFilteredLibrary (needs 2.1)  │
    │ 2.8 EmptyState                      │
    │ 2.9 useSwipeGesture                 │
    │ 2.10 useSeriesProgress (needs 2.5)  │
    │ 2.11 useInProgressBooks (needs 2.5) │
    │ 2.12 useDownloadState               │
    │ 2.13 useIsFinished (needs 2.5)      │
    └─────────────────┬───────────────────┘
                      │
                      ▼
          Phase 2D (Screen Refactors)
          ┌───────────────────────────┐
          │ 2.14 MyLibraryScreen      │
          │ 2.15 useDiscoverData      │
          │ ✅ 2.16 playerStore       │
          │ 2.17 Console.log cleanup  │
          └─────────────┬─────────────┘
                        │
                        ▼
              Phase 2E (Quick Wins)
              ┌─────────────────────┐
              │ 2.18-2.22           │
              └─────────────────────┘
```

---

## Phase 3: Optimization
**Performance improvements, UX polish, documentation**

### 3A. Performance

| # | Issue | Screen/Area | Effort | Files to Edit | Sources |
|---|-------|-------------|--------|---------------|---------|
| 3.1 | **CDPlayerScreen re-renders** | CDPlayerScreen | M | Memoize components | [28] |
| 3.2 | **libraryCache memory limits** | Cache layer | M | Add LRU eviction | [29] |
| 3.3 | **SearchScreen virtualization** | Search | S | Add getItemLayout | [28] |
| 3.4 | **Large useMemo blocks** | Browse | S | Break into smaller values | [28] |
| 3.5 | **NarratorDetailScreen caching** | NarratorDetail | S | Add cached data support | [27], [28] |

### 3B. UX Polish

| # | Issue | Screen/Area | Effort | Files to Edit | Sources |
|---|-------|-------------|--------|---------------|---------|
| 3.6 | **Queue visual distinction** | Queue | S | Improve section styling | [27] |
| 3.7 | **Genre filter prominence** | Browse | S | Make chips larger | [27] |
| 3.8 | **Swipe sensitivity tuning** | MarkBooksScreen | S | Tune thresholds | [27] |
| 3.9 | **Volume icon behavior** | CDPlayerScreen | S | Clarify interaction | [27] |
| 3.10 | **Refresh button visibility** | BookDetail | S | Visible in all states | [27] |
| 3.11 | **Priority editing UX** | Wishlist | S | Improve star interaction | [27] |
| 3.12 | **Step animation** | PreferencesOnboarding | S | Add transitions | [27] |

### 3C. Documentation

| # | Issue | Screen/Area | Effort | Files to Edit | Sources |
|---|-------|-------------|--------|---------------|---------|
| 3.13 | **Progress display guidelines** | Docs | S | Document formats | [31] A7 |
| 3.14 | **Mood system distinction** | Docs | S | Clarify naming | [31] A8 |

**Phase 3 Summary:** 14 items (2M + 12S)

---

## Phase 4: New Features
**Missing functionality from spec**

### 4A. High Priority Features

| # | Feature | Screen/Area | Effort | Files to Edit | Sources |
|---|---------|-------------|--------|---------------|---------|
| 4.1 | **A-Z Scrubber sidebar** | AuthorsList, NarratorsList | M | Create `AlphabetScrubber.tsx` | [27], [30] #8 |
| 4.2 | **"Your Genres" personalized section** | GenresList | M | Use useIsFinished | [27] |
| 4.3 | **"Your Authors" personalized section** | AuthorsList | M | Create personalization | [27] |
| 4.4 | **Batch selection for Reading History** | ReadingHistory | M | Add selection mode | [27] |
| 4.5 | **Download quota slider** | StorageSettings | S | Add slider | [27] |

### 4B. Medium Priority Features

| # | Feature | Screen/Area | Effort | Files to Edit | Sources |
|---|---------|-------------|--------|---------------|---------|
| 4.6 | **View mode toggle** (Grouped/A-Z) | GenresList | M | Add grouping | [27] |
| 4.7 | **Series filter by status** | SeriesList | S | Add filter chips | [27] |
| 4.8 | **Hero continue card** | MyLibrary | S | Add hero card | [27] |
| 4.9 | **"Browse Full Library" CTA** | MyLibrary | S | Add button | [27] |
| 4.10 | **Follow/track narrator** | NarratorDetail | M | Add follow feature | [27] |
| 4.11 | **Top Narrators in stats** | Stats | S | Add section | [27] |
| 4.12 | **MoodDiscovery 2x3 grid** | MoodDiscovery | S | Expand from 2x2 | [27] |

### 4C. Low Priority / Nice-to-Have

| # | Feature | Screen/Area | Effort | Files to Edit | Sources |
|---|---------|-------------|--------|---------------|---------|
| 4.13 | **Quick action pills on Home** | Home | S | Sleep, Speed, Queue pills | [27] |
| 4.14 | **Joystick response curve graph** | JoystickSettings | L | Interactive visualization | [27] |
| 4.15 | **Joystick test scrubber** | JoystickSettings | M | Test area | [27] |
| 4.16 | **Server discovery/scan** | Login | M | Parallel network scan with mDNS | [27] |
| 4.17 | **Genre description display** | GenreDetail | S | Show if available | [27] |
| 4.18 | **Wishlist edit sheet** (TODO) | Wishlist | S | Implement edit | [28] |
| 4.19 | **Track series notifications** | SeriesDetail | S | Bell icon prominence | [27] |
| 4.20 | **Edit collection** | CollectionDetail | M | Server-side support | [27] |

**Phase 4 Summary:** 20 items (1L + 10M + 9S)

---

## Summary

| Phase | Items | Effort Breakdown |
|-------|-------|------------------|
| Phase 0: Dependencies | 1 | 1S |
| Phase 1: Critical | 8 | 3L + 2M + 3S |
| Phase 2: Alignment | 25 | 1L + 6M + 18S |
| Phase 3: Optimization | 14 | 2M + 12S |
| Phase 4: New Features | 20 | 1L + 10M + 9S |
| **Total** | **68 items** | **5L + 20M + 43S** |

---

## Revised Sprint Plan

### Sprint 0: Foundation (1 day)
1. 0.1 SharedUtilities [S] - unblocks everything

### Sprint 1: Stability & Quick Wins (3-4 days)
1. 1.1 Error boundaries [S-M]
2. 1.7 StackedCovers bug [S]
3. 1.8 Wishlist link [S]
4. 2.1 Cross-feature imports [S]
5. 2.2 Duplicate components [S]
6. 2.3 Deprecated color tokens [S]
7. 2.4 Deprecated hooks [S]

### Sprint 2: Core Helpers (3-4 days)
1. 2.5 getBookMetadata helper [M]
2. 2.6 Logger utility [S]
3. 2.7 useFilteredLibrary hook [M]
4. 2.8 EmptyState standardization [S]
5. 2.9 useSwipeGesture [S]
6. 2.10 useSeriesProgress [S]
7. 2.11 useInProgressBooks [S]
8. 2.12 useDownloadState [S]
9. 2.13 useIsFinished [S]

### Sprint 3: Screen Refactors (5-7 days) ✅ COMPLETE
1. ✅ 2.14 MyLibraryScreen tabs [M] - 2,020 → 397 lines
2. ✅ 2.15 useDiscoverData split [M] - ~700 → 84 lines
3. ✅ 2.17 Console.log cleanup [M] - 557 → 170 (debug only)
4. ✅ 2.18 Kid Mode PIN [M] - Full system implemented
5. ✅ 1.4 Silent catch blocks [M] - All screens have user feedback

### Sprint 4: Big Refactors (8-10 days)
1. 1.3 CDPlayerScreen extraction [L] - ✅ Phases 1-4 complete (4,398 → 3,515 lines), Phases 5-6 deferred
2. ~~2.16 playerStore split [L]~~ ✅ COMPLETE
3. 1.6 sqliteCache split [L] - Remaining

### Sprint 5: Type Safety (5-7 days)
1. 1.5 Type safety [M] - uses getBookMetadata

### Sprint 6+: Features & Polish
1. 4.1 A-Z Scrubber [M]
2. 1.2 StandardPlayerScreen [L]
3. Remaining Phase 3-4 items

---

## Effort Estimate Corrections

| Item | Previous | Corrected | Reason |
|------|----------|-----------|--------|
| 1.1 ErrorBoundaries | M (4-6h) | S-M (4-6h) | Breakdown = 6h, borderline |
| 1.5 TypeSafety | L (1-2 weeks) | M (4-6 days) | Breakdown = 22h |
| 2.10 HomeScreen | M (1-2 days) | S (4-6h) | Breakdown = 5.5h |
| 2.18 ProfileScreen (PIN) | S-M (2-6h) | M (6-8h) | Breakdown = 6.5h |
| AuthorNarratorScreens | M (2-3 days) | M (1-2 days) | Breakdown = 9.5h |
| SeriesScreens | S (2-4h) | S (3-5h) | Uses useSeriesProgress |
| BrowseScreen | M (1-2 days) | M (1 day) | Uses getFeaturedReason |

---

## Decisions Made (Resolving Ambiguity)

| Item | Decision | Rationale |
|------|----------|-----------|
| Favorites split (2.23) | **Document split, don't consolidate** | Books/Series = library content, Authors/Narrators = discovery preferences |
| HomeScreen design (2.25) | **Keep HeroSection** | CD disc now exclusive to CDPlayerScreen |
| StandardPlayerScreen | **Linear progress, static cover** | See comparison table in EditSpec |
| Server discovery (4.16) | **Parallel scan + mDNS** | Sequential is too slow |

---

## Appendix: Complete Dependency Matrix

| Item | Depends On | Blocks |
|------|------------|--------|
| 0.1 SharedUtilities | - | 1.1, 1.4, 2.15, 2.18 |
| 2.1 Cross-feature | - | 2.7, 2.18 |
| 2.5 getBookMetadata | - | 1.5, 2.10, 2.11, 2.13, 4.2 |
| 2.6 Logger | - | 2.17 |
| 2.7 useFilteredLibrary | 2.1 | 2.14, 2.15 |
| 2.8 EmptyState | - | 2.19 |
| 2.10 useSeriesProgress | 2.5 | 4.7 |
| 2.13 useIsFinished | 2.5 | 4.2 |
| 2.14 MyLibraryScreen | 2.7 | 2.22 |
