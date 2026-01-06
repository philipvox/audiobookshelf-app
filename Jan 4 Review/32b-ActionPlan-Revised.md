# Action Plan (Revised)

Comprehensive roadmap incorporating findings from all analysis documents.

**Source Documents:**
- [27] Implementation Completeness Assessment
- [28] Technical Debt Inventory
- [29] Refactoring Priority Matrix
- [30] Executive Summary
- [31] Alignment Audit

---

## Changes from Original Action Plan (32)

### Items Added from [30] Executive Summary
| New # | Issue | Source |
|-------|-------|--------|
| 1.7 | StackedCovers bug in SeriesDetailScreen (line 616) | [30] Quick Win #5 |
| 2.11 | Kid Mode PIN protection | [30] Quick Win #7 |
| 2.12 | DownloadsScreen EmptyState API mismatch | [30] Quick Win #9 |
| 2.13 | Storage Summary "Manage" button | [30] Quick Win #10 |
| 2.14 | Icon size standardization with scale() | [30] Quick Win #6 |

### Items Added from [31] Alignment Audit
| New # | Issue | Source |
|-------|-------|--------|
| 2.15 | Create `useFilteredLibrary()` hook (consolidate 4 Kid Mode filters) | [31] A1, §1.1 |
| 2.16 | Consolidate favorites into single store OR document split | [31] A2, §1.3 |
| 2.17 | Create shared `useSwipeGesture` hook | [31] A3, §1.4 |
| 2.18 | Standardize EmptyState component API | [31] A4, §1.5 |
| 2.19 | Create `getBookMetadata()` typed helper | [31] A5, §2.1 |
| 2.20 | Create `useSeriesProgress()` hook | [31] A6, §2.4 |
| 2.21 | Create `useInProgressBooks()` hook (consolidate 3 implementations) | [31] §2.2 |
| 2.22 | Consolidate download status checks to single hook | [31] §2.3 |
| 2.23 | Clarify progress storage architecture (3 sources) | [31] §4.1 |
| 2.24 | Standardize finished book checking to single source | [31] §4.2 |
| 3.13 | Document progress display guidelines | [31] A7 |
| 3.14 | Align or distinguish Mood system naming | [31] A8, §4.4 |

### Items Re-Prioritized
| # | Issue | Original Phase | New Phase | Reason |
|---|-------|----------------|-----------|--------|
| 1.7 | StackedCovers bug | N/A | Phase 1 | Bug fix, 30 min effort [30] |
| 2.11 | Kid Mode PIN | N/A | Phase 2 | Medium impact security [30] |
| 4.6 | Wishlist link | Phase 4 | Phase 1 | 30 min effort, high discoverability [30] |

### Items Flagged for Conflicts
| # | Issue | Conflict |
|---|-------|----------|
| 2.2 | playerStore split | [30] §"Systems Working Well" recommends NOT touching seeking mode - ensure split preserves this |
| 1.6 | sqliteCache split | [30] notes libraryCache "works well" - ensure no regression to 39 dependents |
| 2.15 | useFilteredLibrary hook | Must coordinate with 2.3 cross-feature imports - both touch kidModeStore |

---

## Phase 1: Critical Fixes
**Blocking issues, broken flows, crashes, quick bug fixes**

### 1A. Crash Prevention

| # | Issue | Screen/Area | Effort | Files to Edit | Sources |
|---|-------|-------------|--------|---------------|---------|
| 1.1 | **Add error boundaries to all screens** | All screens | M | `src/navigation/AppNavigator.tsx`, create `src/shared/components/ErrorBoundary.tsx` | [27], [28], [30] |
| 1.4 | **Silent catch blocks** - errors swallowed with no user feedback | Search, BookDetail, AuthorDetail | M | `src/features/search/screens/SearchScreen.tsx`, `src/features/book-detail/screens/BookDetailScreen.tsx`, `src/features/author/screens/AuthorDetailScreen.tsx` | [28] |

### 1B. Bug Fixes (Quick Wins)

| # | Issue | Screen/Area | Effort | Files to Edit | Sources |
|---|-------|-------------|--------|---------------|---------|
| 1.7 | **StackedCovers bug** - passes only `bookIds` without `coverUrls` | SeriesDetail | S | `src/features/series/screens/SeriesDetailScreen.tsx:616` | [30] Quick Win #5 |
| 1.8 | **Wishlist link missing from Profile** | Profile | S | `src/features/profile/screens/ProfileScreen.tsx` | [27], [30] Quick Win #8 |

### 1C. Architectural Refactors (High Priority)

| # | Issue | Screen/Area | Effort | Files to Edit | Sources |
|---|-------|-------------|--------|---------------|---------|
| 1.3 | **CDPlayerScreen refactor** - 4,398 lines unmaintainable | CDPlayerScreen | L | `src/features/player/screens/CDPlayerScreen.tsx` → extract: `PlayerTimeline.tsx`, `PlayerControls.tsx`, `PlayerHeader.tsx`, `ChapterListSheet.tsx`, `BookmarksSheet.tsx`, `SleepTimerSheet.tsx` | [28], [29], [30] #1 |
| 1.5 | **Type safety for API responses** - 202 `as any` casts | Global | L | Create `src/core/types/api.ts`, update detail screens | [28], [30] #3 |
| 1.6 | **sqliteCache.ts split** - 3,310 lines, mixed domains | Database layer | L | `src/core/services/sqliteCache.ts` → split: `sqliteDownloads.ts`, `sqliteStats.ts`, `sqliteQueue.ts`, `sqliteUserBooks.ts`, `sqliteFacade.ts` | [28], [29], [30] #5 |

### 1D. New Features (Originally Spec'd)

| # | Issue | Screen/Area | Effort | Files to Edit | Sources |
|---|-------|-------------|--------|---------------|---------|
| 1.2 | **StandardPlayerScreen missing** (0% complete) | Player | L | Create `src/features/player/screens/StandardPlayerScreen.tsx` | [27], [30] #7 |

**Phase 1 Summary:** 8 items (3L + 2M + 3S)

---

## Phase 2: Alignment Work
**Make everything consistent, fix architectural issues, consolidate patterns**

### 2A. Code Architecture

| # | Issue | Screen/Area | Effort | Files to Edit | Sources |
|---|-------|-------------|--------|---------------|---------|
| 2.1 | **MyLibraryScreen refactor** - 2,020 lines, 5 tabs inline | MyLibrary | M | `src/features/library/screens/MyLibraryScreen.tsx` → extract: `AllBooksTab.tsx`, `DownloadedTab.tsx`, `InProgressTab.tsx`, `SeriesTab.tsx`, `AuthorsTab.tsx` | [28], [29], [30] #6 |
| 2.2 | **playerStore.ts split** - 2,838 lines | Player state | L | `src/features/player/stores/playerStore.ts` → split: `playbackStore.ts`, `chapterStore.ts`, `bookmarksStore.ts`, `sleepTimerStore.ts`, `speedStore.ts`, `playerUIStore.ts` | [28], [29], [30] #2 |
| 2.3 | **Cross-feature imports** - violates module boundaries | Architecture | S | Move `useContinueListening` → `src/shared/hooks/`, Move `myLibraryStore` → `src/shared/stores/`, Move `kidModeStore` → `src/shared/stores/`, Move `SearchBar` → `src/shared/components/` | [29], [30] #10, [31] §3.2 |
| 2.4 | **Duplicate components** - SeriesCard, SwipeableBookCard | Home, Series, Discover | S | Consolidate to `src/shared/components/` | [29], [31] §3.3 |
| 2.5 | **useDiscoverData.ts split** - 803 lines | Browse/Discover | M | Split to: `useFeaturedData.ts`, `useGenreData.ts`, `useMoodData.ts`, `usePopularData.ts` | [28] |
| 2.6 | **Console.log cleanup** - 492 occurrences | Global | M | Create `src/shared/utils/logger.ts`, update 43 files | [28], [30] #9 |

### 2B. Pattern Consolidation (NEW from [31])

| # | Issue | Screen/Area | Effort | Files to Edit | Sources |
|---|-------|-------------|--------|---------------|---------|
| 2.15 | **Create `useFilteredLibrary()` hook** - consolidate 4 Kid Mode filter implementations | Home, Library, Discover, Search | M | Create `src/shared/hooks/useFilteredLibrary.ts`, update `useHomeData.ts`, `useDiscoverData.ts`, `SearchScreen.tsx`, `MyLibraryScreen.tsx` | [31] A1, §1.1 |
| 2.16 | **Consolidate favorites** - Books/Series in myLibraryStore, Authors/Narrators in preferencesStore | Stores | M | Decide: consolidate to `favoritesStore` OR document why split | [31] A2, §1.3 |
| 2.17 | **Create `useSwipeGesture()` hook** - consolidate 3 swipe implementations | Discover, History, Downloads | S | Create `src/shared/hooks/useSwipeGesture.ts`, update `SwipeableBookCard.tsx`, `MarkBooksScreen.tsx`, `DownloadsScreen.tsx` | [31] A3, §1.4 |
| 2.18 | **Standardize EmptyState API** - inconsistent props across screens | Downloads, Search, MyLibrary, Wishlist, Hidden | S | Update `src/shared/components/EmptyState.tsx`, fix `DownloadsScreen.tsx` custom props | [30] #9, [31] A4 |
| 2.19 | **Create `getBookMetadata()` helper** - replace 202 unsafe casts | Global | M | Create `src/shared/utils/bookMetadata.ts`, update screens with `as any` metadata access | [28], [31] A5 |
| 2.20 | **Create `useSeriesProgress()` hook** - duplicate calculation | Library, SeriesDetail | S | Create `src/shared/hooks/useSeriesProgress.ts` | [31] A6 |
| 2.21 | **Create `useInProgressBooks()` hook** - 3 implementations | Home, Library, Discover | S | Create `src/shared/hooks/useInProgressBooks.ts`, consolidate from `useContinueListening`, `useDiscoverData`, `MyLibraryScreen` | [31] §2.2 |
| 2.22 | **Consolidate download status checks** | Multiple screens | S | Create `src/shared/hooks/useDownloadState.ts` combining `useDownloadStatus`, `useIsOfflineAvailable` | [31] §2.3 |
| 2.23 | **Clarify progress storage architecture** - 3 sources of truth | Documentation | S | Document in CLAUDE.md: SQLite = persistent, playerStore = ephemeral, Server = sync target | [31] §4.1 |
| 2.24 | **Standardize finished book checking** | ReadingHistory | S | Ensure `useReadingHistory.isFinished(id)` is ONLY check used | [31] §4.2 |

### 2C. Design System Consistency

| # | Issue | Screen/Area | Effort | Files to Edit | Sources |
|---|-------|-------------|--------|---------------|---------|
| 2.7 | **Deprecated color tokens** - gold/goldDark/goldSubtle | Theme | S | `src/shared/theme/colors.ts` | [28] |
| 2.8 | **Deprecated hooks** - useResponsive, useThemeColors | Shared hooks | S | Remove `src/shared/hooks/useResponsive.ts` | [28] |
| 2.9 | **Inline styles cleanup** | MyLibraryScreen | S | `src/features/library/screens/MyLibraryScreen.tsx` | [28] |
| 2.10 | **HomeScreen design divergence** | Home | M | Evaluate if CD disc should be restored per spec | [27] |

### 2D. Quick Wins from [30]

| # | Issue | Screen/Area | Effort | Files to Edit | Sources |
|---|-------|-------------|--------|---------------|---------|
| 2.11 | **Kid Mode PIN protection** - children can toggle off | Profile/KidMode | M | `src/features/profile/screens/KidModeSettingsScreen.tsx`, `src/features/profile/stores/kidModeStore.ts` | [30] Quick Win #7 |
| 2.12 | **DownloadsScreen EmptyState** - custom props don't match API | Downloads | S | `src/features/downloads/screens/DownloadsScreen.tsx` | [30] Quick Win #9 |
| 2.13 | **Storage Summary "Manage" button** | Storage | S | `src/shared/components/StorageSummary.tsx` | [30] Quick Win #10 |
| 2.14 | **Icon size standardization** - enforce scale() usage | Global | S | Create wrapper or lint rule | [30] Quick Win #6 |

**Phase 2 Summary:** 24 items (1L + 8M + 15S)

---

## Phase 3: Optimization
**Performance improvements, UX polish, documentation**

### 3A. Performance

| # | Issue | Screen/Area | Effort | Files to Edit | Sources |
|---|-------|-------------|--------|---------------|---------|
| 3.1 | **CDPlayerScreen re-renders** | CDPlayerScreen | M | Memoize components, optimize PanResponder | [28] |
| 3.2 | **libraryCache memory limits** | Cache layer | M | `src/core/cache/libraryCache.ts` - add LRU eviction | [29] |
| 3.3 | **SearchScreen virtualization** | Search | S | Ensure FlatList optimization, add getItemLayout | [28] |
| 3.4 | **Large useMemo blocks** | Browse | S | Break into smaller memoized values | [28] |
| 3.5 | **NarratorDetailScreen caching** | NarratorDetail | S | Add cached data support | [27], [28] |

### 3B. UX Polish

| # | Issue | Screen/Area | Effort | Files to Edit | Sources |
|---|-------|-------------|--------|---------------|---------|
| 3.6 | **Queue visual distinction** - "Play Next" vs "Up Next" | Queue | S | Improve section headers | [27] |
| 3.7 | **Genre filter prominence** | Browse | S | Make chips more prominent | [27] |
| 3.8 | **Swipe sensitivity tuning** | MarkBooksScreen | S | Tune thresholds | [27] |
| 3.9 | **Volume icon behavior** | CDPlayerScreen | S | Clarify interaction | [27] |
| 3.10 | **Refresh button visibility** | BookDetail | S | Visible in all states | [27] |
| 3.11 | **Priority editing UX** | Wishlist | S | Improve star interaction | [27] |
| 3.12 | **Step animation** | PreferencesOnboarding | S | Add transitions | [27] |

### 3C. Documentation (NEW from [31])

| # | Issue | Screen/Area | Effort | Files to Edit | Sources |
|---|-------|-------------|--------|---------------|---------|
| 3.13 | **Progress display guidelines** | Docs | S | Document: Cards=%, Player=time, Series=count | [31] A7 |
| 3.14 | **Mood system distinction** | Docs | S | Clarify Preferences moods vs Mood Discovery moods | [31] A8, §4.4 |

**Phase 3 Summary:** 14 items (2M + 12S)

---

## Phase 4: New Features
**Missing functionality from spec**

### 4A. High Priority Features

| # | Feature | Screen/Area | Effort | Files to Edit | Sources |
|---|---------|-------------|--------|---------------|---------|
| 4.1 | **A-Z Scrubber sidebar** | AuthorsList, NarratorsList | M | Create `src/shared/components/AlphabetScrubber.tsx` | [27], [30] #8 |
| 4.2 | **"Your Genres" personalized section** | GenresList | M | Create `usePersonalizedGenres.ts` | [27] |
| 4.3 | **"Your Authors" personalized section** | AuthorsList | M | Create `usePersonalizedAuthors.ts` | [27] |
| 4.4 | **Batch selection for Reading History** | ReadingHistory | M | Add selection mode, batch actions | [27] |
| 4.5 | **Download quota slider** | StorageSettings | S | `StorageSettingsScreen.tsx` | [27] |

### 4B. Medium Priority Features

| # | Feature | Screen/Area | Effort | Files to Edit | Sources |
|---|---------|-------------|--------|---------------|---------|
| 4.7 | **View mode toggle** (Grouped/A-Z) | GenresList | M | Fiction/Non-Fiction grouping | [27] |
| 4.8 | **Series filter by status** | SeriesList | S | In-progress, completed, not started | [27] |
| 4.9 | **Hero continue card** | MyLibrary | M | Add hero card at top | [27] |
| 4.10 | **"Browse Full Library" CTA** | MyLibrary | S | Add button | [27] |
| 4.11 | **Follow/track narrator** | NarratorDetail | M | Create followService | [27] |
| 4.12 | **Top Narrators in stats** | Stats | S | Add section | [27] |
| 4.13 | **MoodDiscovery 2x3 grid** | MoodDiscovery | S | Expand from 2x2 | [27] |

### 4C. Low Priority / Nice-to-Have

| # | Feature | Screen/Area | Effort | Files to Edit | Sources |
|---|---------|-------------|--------|---------------|---------|
| 4.14 | **Quick action pills on Home** | Home | M | Sleep, Speed, Queue pills | [27] |
| 4.15 | **Joystick response curve graph** | JoystickSettings | L | Interactive visualization | [27] |
| 4.16 | **Joystick test scrubber** | JoystickSettings | M | Test area | [27] |
| 4.17 | **Server discovery/scan** | Login | M | Network scan for ABS servers | [27] |
| 4.18 | **Genre description display** | GenreDetail | S | Show if available | [27] |
| 4.19 | **Wishlist edit sheet** (TODO) | Wishlist | S | Implement edit (line 125) | [28] |
| 4.20 | **Track series notifications** | SeriesDetail | S | Bell icon prominence | [27] |
| 4.21 | **Edit collection** | CollectionDetail | M | Server-side support required | [27] |

**Phase 4 Summary:** 20 items (1L + 10M + 9S)

---

## Summary

| Phase | Items | Effort Breakdown |
|-------|-------|------------------|
| Phase 1: Critical | 8 | 3L + 2M + 3S |
| Phase 2: Alignment | 24 | 1L + 8M + 15S |
| Phase 3: Optimization | 14 | 2M + 12S |
| Phase 4: New Features | 20 | 1L + 10M + 9S |
| **Total** | **66 items** | **5L + 22M + 39S** |

**Change from Original:** +17 items (was 49)

---

## Revised Execution Order

### Sprint 1: Stability & Quick Wins
1. 1.1 Error boundaries [M] - blocks crashes
2. 1.7 StackedCovers bug [S] - 30 min fix
3. 1.8 Wishlist link [S] - 30 min fix
4. 2.3 Cross-feature imports [S] - architecture win
5. 2.4 Duplicate components [S] - cleanup

### Sprint 2: Pattern Consolidation
1. 2.15 useFilteredLibrary hook [M] - consolidates Kid Mode
2. 2.18 EmptyState standardization [S]
3. 2.19 getBookMetadata helper [M] - enables type safety
4. 2.6 Console.log cleanup [M]
5. 2.11 Kid Mode PIN [M] - security

### Sprint 3: Big Refactors
1. 1.3 CDPlayerScreen extraction [L]
2. 2.1 MyLibraryScreen tabs [M]
3. 1.5 Type safety [L] - uses getBookMetadata

### Sprint 4: Store Cleanup
1. 1.6 sqliteCache split [L]
2. 2.2 playerStore split [L] - after CDPlayer is smaller
3. 2.5 useDiscoverData split [M]

### Sprint 5+: Features & Polish
1. 4.1 A-Z Scrubber [M]
2. 1.2 StandardPlayerScreen [L]
3. Remaining Phase 3-4 items

---

## Risk Mitigation (Updated)

| High-Risk Item | Mitigation | Flag |
|----------------|------------|------|
| playerStore split (2.2) | **[30] flags seeking mode as "working well"** - preserve isSeeking behavior exactly, add tests first | CONFLICT |
| sqliteCache split (1.6) | **[30] notes libraryCache has 39 dependents** - preserve existing API surface | CONFLICT |
| useFilteredLibrary (2.15) + cross-feature imports (2.3) | Both touch kidModeStore - sequence 2.3 first, then 2.15 | DEPENDENCY |
| getBookMetadata (2.19) + type safety (1.5) | 2.19 enables 1.5 - must complete 2.19 first | DEPENDENCY |

---

## Success Metrics (Updated)

| Metric | Current | After Sprint 1 | After Sprint 2 | Final Target |
|--------|---------|----------------|----------------|--------------|
| Files > 2000 lines | 4 | 4 | 4 | 0 |
| `as any` casts | 202 | 200 | 150 | <50 |
| Error boundaries | 1 | All screens | All screens | All screens |
| Console statements | 492 | 490 | <100 | <50 |
| Cross-feature imports | 25+ | 0 | 0 | 0 |
| Duplicate hooks | 10+ | 10 | 4 | 0 |
| Known bugs | 2 | 0 | 0 | 0 |
| Kid Mode PIN | No | No | Yes | Yes |

---

## Appendix: Source Document Cross-Reference

### Items by Source Count

| Sources | Count | Examples |
|---------|-------|----------|
| 3+ sources | 8 | Error boundaries, CDPlayerScreen, type safety |
| 2 sources | 12 | Console cleanup, cross-feature imports |
| 1 source | 46 | Most feature additions |

### Coverage Gaps

All issues from [30] Quick Wins now included.
All issues from [31] §7 Recommendations now included.
