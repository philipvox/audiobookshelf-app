# Action Plan

Prioritized roadmap for AudiobookShelf app improvements derived from Implementation Completeness (doc 27), Technical Debt (doc 28), and Refactoring Priority (doc 29).

---

## Phase 1: Critical Fixes
**Blocking issues, broken flows, crashes**

| # | Issue | Screen/Area | Effort | Files to Edit |
|---|-------|-------------|--------|---------------|
| 1.1 | **Add error boundaries to all screens** | All screens | M | `src/navigation/AppNavigator.tsx`, create `src/shared/components/ErrorBoundary.tsx` |
| 1.2 | **StandardPlayerScreen missing** (0% complete) | Player | L | Create `src/features/player/screens/StandardPlayerScreen.tsx` |
| 1.3 | **CDPlayerScreen refactor** - 4,398 lines unmaintainable | CDPlayerScreen | L | `src/features/player/screens/CDPlayerScreen.tsx` → extract to: `PlayerTimeline.tsx`, `PlayerControls.tsx`, `PlayerHeader.tsx`, `ChapterListSheet.tsx`, `BookmarksSheet.tsx`, `SleepTimerSheet.tsx` |
| 1.4 | **Silent catch blocks** - errors swallowed with no user feedback | Search, BookDetail, AuthorDetail | M | `src/features/search/screens/SearchScreen.tsx`, `src/features/book-detail/screens/BookDetailScreen.tsx`, `src/features/author/screens/AuthorDetailScreen.tsx` |
| 1.5 | **Type safety for API responses** - 202 `as any` casts | Global | L | `src/core/types/api.ts` (create), update: `playerStore.ts`, `downloadManager.ts`, `sqliteCache.ts`, detail screens |
| 1.6 | **sqliteCache.ts split** - 3,310 lines, mixed domains | Database layer | L | `src/core/services/sqliteCache.ts` → split to: `sqliteDownloads.ts`, `sqliteStats.ts`, `sqliteQueue.ts`, `sqliteUserBooks.ts`, `sqliteFacade.ts` |

---

## Phase 2: Alignment Work
**Make everything consistent, fix architectural issues**

### 2A. Code Architecture

| # | Issue | Screen/Area | Effort | Files to Edit |
|---|-------|-------------|--------|---------------|
| 2.1 | **MyLibraryScreen refactor** - 2,020 lines, 5 tabs inline | MyLibrary | M | `src/features/library/screens/MyLibraryScreen.tsx` → extract: `AllBooksTab.tsx`, `DownloadedTab.tsx`, `InProgressTab.tsx`, `SeriesTab.tsx`, `AuthorsTab.tsx` |
| 2.2 | **playerStore.ts split** - 2,838 lines | Player state | L | `src/features/player/stores/playerStore.ts` → split to: `playbackStore.ts`, `chapterStore.ts`, `bookmarksStore.ts`, `sleepTimerStore.ts`, `speedStore.ts`, `playerUIStore.ts` |
| 2.3 | **Cross-feature imports** - violates module boundaries | Architecture | S | Move `src/features/home/hooks/useContinueListening.ts` → `src/shared/hooks/`, Move `src/features/library/stores/myLibraryStore.ts` → `src/shared/stores/`, Move `src/features/profile/stores/kidModeStore.ts` → `src/shared/stores/`, Move search `SearchBar` → `src/shared/components/` |
| 2.4 | **Duplicate components** - SeriesCard, SwipeableBookCard | Home, Series, Discover | S | Consolidate `src/features/home/components/SeriesCard.tsx` + `src/features/series/components/SeriesCard.tsx` → `src/shared/components/SeriesCard.tsx`, Same for `SwipeableBookCard.tsx` |
| 2.5 | **useDiscoverData.ts split** - 803 lines | Browse/Discover | M | `src/features/discover/hooks/useDiscoverData.ts` → split to: `useFeaturedData.ts`, `useGenreData.ts`, `useMoodData.ts`, `usePopularData.ts` |
| 2.6 | **Console.log cleanup** - 492 occurrences | Global | M | Create `src/shared/utils/logger.ts`, update: `sqliteCache.ts` (116), `queueStore.ts` (29), `appInitializer.ts` (21), `events/listeners.ts` (19), `websocketService.ts` (18), `authService.ts` (19) |

### 2B. Design System Consistency

| # | Issue | Screen/Area | Effort | Files to Edit |
|---|-------|-------------|--------|---------------|
| 2.7 | **Deprecated color tokens** - gold/goldDark/goldSubtle | Theme | S | `src/shared/theme/colors.ts` - update all references to use `primary/primaryDark/primarySubtle` |
| 2.8 | **Deprecated hooks** - useResponsive, useThemeColors | Shared hooks | S | Remove `src/shared/hooks/useResponsive.ts`, update callers to use `@/shared/theme` direct imports |
| 2.9 | **Inline styles cleanup** | MyLibraryScreen | S | `src/features/library/screens/MyLibraryScreen.tsx` - consolidate inline styles to StyleSheet |
| 2.10 | **HomeScreen design divergence** - uses HeroSection instead of CD disc | Home | M | `src/features/home/screens/HomeScreen.tsx`, `src/features/home/components/HeroSection.tsx` - evaluate if CD disc design should be restored per spec |

---

## Phase 3: Optimization
**Performance improvements, UX polish**

### 3A. Performance

| # | Issue | Screen/Area | Effort | Files to Edit |
|---|-------|-------------|--------|---------------|
| 3.1 | **CDPlayerScreen re-renders** - many Animated.Values, complex gesture handling | CDPlayerScreen | M | `src/features/player/screens/CDPlayerScreen.tsx` - memoize components, optimize PanResponder |
| 3.2 | **libraryCache memory** - no size limits, LRU eviction | Cache layer | M | `src/core/cache/libraryCache.ts` - add cache size limits, implement LRU eviction |
| 3.3 | **SearchScreen virtualization** - large result sets | Search | S | `src/features/search/screens/SearchScreen.tsx` - ensure FlatList optimization, add getItemLayout |
| 3.4 | **Large useMemo blocks** in BrowseScreen | Browse | S | `src/features/discover/hooks/useDiscoverData.ts` - break into smaller memoized values |
| 3.5 | **NarratorDetailScreen caching** - always requires server | NarratorDetail | S | `src/features/narrator/screens/NarratorDetailScreen.tsx` - add cached data support |

### 3B. UX Polish

| # | Issue | Screen/Area | Effort | Files to Edit |
|---|-------|-------------|--------|---------------|
| 3.6 | **Queue visual distinction** - "Play Next" vs "Up Next" unclear | Queue | S | `src/features/queue/screens/QueueScreen.tsx` - improve section headers styling |
| 3.7 | **Genre filter prominence** | Browse | S | `src/features/discover/screens/BrowseScreen.tsx` - make genre filter chips more prominent |
| 3.8 | **Swipe sensitivity tuning** | MarkBooksScreen | S | `src/features/reading-history-wizard/screens/MarkBooksScreen.tsx` - tune swipe thresholds |
| 3.9 | **Volume icon behavior** | CDPlayerScreen | S | `src/features/player/screens/CDPlayerScreen.tsx` - clarify volume control interaction |
| 3.10 | **Refresh button visibility** | BookDetail | S | `src/features/book-detail/screens/BookDetailScreen.tsx` - ensure refresh button visible in all states |
| 3.11 | **Priority editing UX** | Wishlist | S | `src/features/wishlist/screens/WishlistScreen.tsx` - improve star priority interaction |
| 3.12 | **Step animation** | PreferencesOnboarding | S | `src/features/reading-preferences/screens/PreferencesOnboardingScreen.tsx` - add transition animations |

---

## Phase 4: New Features
**Missing functionality from spec**

### 4A. High Priority Features

| # | Feature | Screen/Area | Effort | Files to Edit |
|---|---------|-------------|--------|---------------|
| 4.1 | **A-Z Scrubber sidebar** | AuthorsList, NarratorsList | M | `src/features/author/screens/AuthorsListScreen.tsx`, `src/features/narrator/screens/NarratorsListScreen.tsx`, create `src/shared/components/AlphabetScrubber.tsx` |
| 4.2 | **"Your Genres" personalized section** | GenresList | M | `src/features/genres/screens/GenresListScreen.tsx`, `src/features/genres/hooks/usePersonalizedGenres.ts` (create) |
| 4.3 | **"Your Authors" personalized section** | AuthorsList | M | `src/features/author/screens/AuthorsListScreen.tsx`, `src/features/author/hooks/usePersonalizedAuthors.ts` (create) |
| 4.4 | **Batch selection for Reading History** | ReadingHistory | M | `src/features/reading-history/screens/ReadingHistoryScreen.tsx` - add selection mode, batch actions (Delete, Undo, Export) |
| 4.5 | **Download quota slider** | StorageSettings | S | `src/features/profile/screens/StorageSettingsScreen.tsx` |
| 4.6 | **Wishlist link from Profile** | Profile | S | `src/features/profile/screens/ProfileScreen.tsx` - restore Wishlist row |

### 4B. Medium Priority Features

| # | Feature | Screen/Area | Effort | Files to Edit |
|---|---------|-------------|--------|---------------|
| 4.7 | **View mode toggle** (Grouped/A-Z) | GenresList | M | `src/features/genres/screens/GenresListScreen.tsx` - add toggle, implement Fiction/Non-Fiction grouping |
| 4.8 | **Series filter by status** | SeriesList | S | `src/features/series/screens/SeriesListScreen.tsx` - add filter (in-progress, completed, not started) |
| 4.9 | **Hero continue card** | MyLibrary | M | `src/features/library/screens/MyLibraryScreen.tsx` - add hero card at top showing current book |
| 4.10 | **"Browse Full Library" CTA** | MyLibrary | S | `src/features/library/screens/MyLibraryScreen.tsx` - add button at bottom |
| 4.11 | **Follow/track narrator** | NarratorDetail | M | `src/features/narrator/screens/NarratorDetailScreen.tsx`, `src/core/services/followService.ts` (create or extend) |
| 4.12 | **Top Narrators in stats** | Stats | S | `src/features/stats/screens/StatsScreen.tsx` - add narrator section |
| 4.13 | **MoodDiscovery 2x3 grid** | MoodDiscovery | S | `src/features/mood-discovery/screens/MoodDiscoveryScreen.tsx` - expand from 2x2 to 2x3 options |

### 4C. Low Priority / Nice-to-Have

| # | Feature | Screen/Area | Effort | Files to Edit |
|---|---------|-------------|--------|---------------|
| 4.14 | **Quick action pills on Home** | Home | M | `src/features/home/screens/HomeScreen.tsx` - add Sleep, Speed, Queue pills |
| 4.15 | **Joystick response curve graph** | JoystickSettings | L | `src/features/profile/screens/JoystickSeekSettingsScreen.tsx` - add interactive visualization |
| 4.16 | **Joystick test scrubber** | JoystickSettings | M | `src/features/profile/screens/JoystickSeekSettingsScreen.tsx` - add test area |
| 4.17 | **Server discovery/scan** | Login | M | `src/core/auth/screens/LoginScreen.tsx` - add network scan for ABS servers |
| 4.18 | **Genre description display** | GenreDetail | S | `src/features/genres/screens/GenreDetailScreen.tsx` - show description if available |
| 4.19 | **Wishlist edit sheet** (TODO) | Wishlist | S | `src/features/wishlist/screens/WishlistScreen.tsx:125` - implement edit functionality |
| 4.20 | **Track series notifications** | SeriesDetail | S | `src/features/series/screens/SeriesDetailScreen.tsx` - make bell icon more prominent |
| 4.21 | **Edit collection** | CollectionDetail | M | `src/features/collections/screens/CollectionDetailScreen.tsx` - add edit mode (server-side support required) |

---

## Summary by Phase

| Phase | Items | Total Effort |
|-------|-------|--------------|
| Phase 1: Critical | 6 | 3L + 2M + 1S |
| Phase 2: Alignment | 10 | 2L + 4M + 4S |
| Phase 3: Optimization | 12 | 2M + 10S |
| Phase 4: New Features | 21 | 2L + 9M + 10S |
| **Total** | **49 items** | |

---

## Effort Legend

| Size | Time Estimate | Description |
|------|---------------|-------------|
| **S** (Small) | 2-4 hours | Single file, straightforward change |
| **M** (Medium) | 1-2 days | Multiple files, moderate complexity |
| **L** (Large) | 2-5 days | Significant refactor, high risk |

---

## Recommended Execution Order

### Sprint 1 (Week 1-2)
1. 1.1 Error boundaries (blocks crashes)
2. 1.4 Silent catch blocks (user sees errors)
3. 2.3 Cross-feature imports (quick architecture win)
4. 2.4 Duplicate components (cleanup)
5. 2.6 Console.log cleanup with logger

### Sprint 2 (Week 3-4)
1. 1.3 CDPlayerScreen extraction (highest LOC)
2. 2.1 MyLibraryScreen tabs extraction
3. 3.1 CDPlayerScreen performance
4. 4.6 Wishlist link restore

### Sprint 3 (Week 5-6)
1. 1.5 Type safety for API responses
2. 1.6 sqliteCache split
3. 2.2 playerStore split
4. 2.5 useDiscoverData split

### Sprint 4 (Week 7-8)
1. 4.1 A-Z Scrubber
2. 4.2 Your Genres section
3. 4.3 Your Authors section
4. 4.4 Batch selection for Reading History

### Sprint 5+ (Ongoing)
1. 1.2 StandardPlayerScreen (new feature)
2. Remaining Phase 4 features based on user demand
3. Performance optimizations as metrics indicate

---

## Risk Mitigation

| High-Risk Item | Mitigation Strategy |
|----------------|---------------------|
| playerStore split | Add comprehensive tests first, use feature flags, keep old code path |
| sqliteCache split | Add cache versioning, test migration, backup strategy |
| CDPlayerScreen split | Extract components one at a time, visual regression testing |
| Type safety changes | Incremental - each PR reduces `any` count, no breaking changes |

---

## Success Metrics

| Metric | Current | Phase 1 Target | Phase 2 Target | Final Target |
|--------|---------|----------------|----------------|--------------|
| Largest file (LOC) | 4,398 | 4,398 | 2,000 | <1,000 |
| playerStore (LOC) | 2,838 | 2,838 | 2,838 | <800 |
| `as any` casts | 202 | 180 | 100 | <50 |
| Error boundaries | 1 | 10+ | 10+ | All screens |
| Console statements | 492 | 492 | <100 | <50 |
| Cross-feature imports | 25+ | 25+ | 0 | 0 |
| Duplicate components | 4 | 4 | 0 | 0 |
| Implementation completeness | 84% | 85% | 88% | 95% |
