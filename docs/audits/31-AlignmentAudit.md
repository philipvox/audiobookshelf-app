# Documentation Alignment Audit

**Date:** 2026-01-05
**Documents Reviewed:** 18 markdown files
**Auditor:** Claude Code

---

## Executive Summary

This audit cross-references all documentation files to identify inconsistencies, duplicate logic, pattern violations, and data flow issues that should be addressed to improve codebase maintainability and consistency.

---

## 1. Cross-Screen Inconsistencies

### 1.1 Accessibility Implementation Inconsistency

| Screen | A11y Score | Status |
|--------|------------|--------|
| HomeScreen | 95/100 | Fixed |
| MyLibraryScreen | 85/100 | Fixed |
| CDPlayerScreen | 90/100 | Fixed |
| ProfileScreen | NOT AUDITED | Unknown |
| BrowseScreen | NOT AUDITED | Unknown |
| SearchScreen | NOT AUDITED | Unknown |
| BookDetailScreen | NOT AUDITED | Unknown |

**Issue:** Only 3 of the main screens have been audited. The remaining screens likely have accessibility gaps similar to those found in audited screens.

**Resolution:**
- Create audits for ProfileScreen, BrowseScreen, SearchScreen, and BookDetailScreen using the `_AUDIT_TEMPLATE.md`
- Apply same accessibility fixes (labels, roles, hints) consistently

### 1.2 Reduced Motion Support Inconsistency

| Screen | Uses `useReducedMotion` | Has Static Fallback |
|--------|-------------------------|---------------------|
| HomeScreen | No | No |
| CDPlayerScreen | Yes | Yes |
| MyLibraryScreen | N/A (minimal animation) | N/A |

**Issue:** CDPlayerScreen properly implements reduced motion support, but HomeScreen has disc animations that don't respect this preference.

**Resolution:** Apply CDPlayerScreen's reduced motion pattern to HomeScreen:
```typescript
// Pattern from CDPlayerScreen to apply to HomeScreen
const reducedMotion = useReducedMotion();
// Pass to HomeDiscSection and disable animation when true
```

### 1.3 Book/Play Button Handler Naming Inconsistency

| Screen | Play Handler | Resume Handler |
|--------|--------------|----------------|
| HomeScreen | `handlePlayBook` | `handleResumeBook` |
| MyLibraryScreen | `handlePlayBook` | `handleResumeBook` |
| CDPlayerScreen | `handlePlayPause` | N/A |

**Issue:** Similar functionality uses different naming across screens. `handlePlayBook` vs `handleResumeBook` distinction is unclear in some screens.

**Resolution:** Standardize naming convention:
- `handlePlay` - Start playback from beginning
- `handleResume` - Continue from last position
- `handleTogglePlayback` - Toggle play/pause

### 1.4 Progress Display Format Inconsistency

Documentation shows different progress tracking approaches:

| Location | Format | Example |
|----------|--------|---------|
| HomeScreen | Percentage | `75%` |
| MyLibraryScreen | Percentage | `75%` |
| CDPlayerScreen | Time-based | `1:30:45 / 2:00:00` |
| ARCHITECTURE_FLOWS.md | Both | Progress + currentTime |

**Issue:** No single source of truth for how progress should be displayed to users.

**Resolution:** Document standard progress display guidelines:
- Cards: Show percentage
- Player: Show time with progress bar
- Lists: Show percentage with time remaining

---

## 2. Duplicate Logic to Consolidate

### 2.1 Book Filtering Logic

**Found In:**
- `MyLibraryScreen` - 13 useMemo calculations for filtering/transforming
- `useDiscoverData.ts` - Multiple filter functions for genres, authors, dismissals
- `RECOMMENDATIONS_IMPLEMENTATION_PLAN.md` - Proposes `filterDismissed()` function

**Duplicate Code Pattern:**
```typescript
// Pattern duplicated across features:
const filteredBooks = libraryItems.filter(item => {
  const author = (item.media?.metadata as any)?.authorName;
  if (dismissedAuthors.includes(author)) return false;
  // ... more filters
});
```

**Resolution:** Create shared utility in `@/shared/utils/libraryFilters.ts`:
```typescript
export function filterLibraryItems(items: LibraryItem[], filters: FilterOptions): LibraryItem[];
export function filterByAuthor(items: LibraryItem[], authorName: string): LibraryItem[];
export function filterByGenre(items: LibraryItem[], genre: string): LibraryItem[];
export function excludeDismissed(items: LibraryItem[], dismissals: DismissedItems): LibraryItem[];
```

### 2.2 Book-to-Summary Conversion

**Found In:**
- `useDiscoverData.ts` - `convertToBookSummary()`
- `MyLibraryScreen` - `enrichedBooks` useMemo
- `RECOMMENDATIONS_IMPLEMENTATION_PLAN.md` - Similar conversion in examples

**Issue:** Each feature independently transforms `LibraryItem` to display-ready format.

**Resolution:** Create shared type and converter:
```typescript
// @/shared/utils/bookTransforms.ts
export interface BookSummary {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  progress?: number;
  duration?: number;
}

export function toBookSummary(item: LibraryItem, progress?: number): BookSummary;
```

### 2.3 Time Formatting Functions

**Found In:**
- CDPlayerScreen - `formatTimeHHMMSS()`
- PLAYER_PERFORMANCE_AUDIT.md - Suggests memoizing `formatTime`
- Multiple screens likely have local time formatting

**Issue:** Time formatting is not standardized.

**Resolution:** Consolidate in `@/shared/utils/format.ts`:
```typescript
export function formatTime(seconds: number): string;           // "1:30:45"
export function formatTimeShort(seconds: number): string;      // "1h 30m"
export function formatTimeRemaining(seconds: number): string;  // "30 min left"
```

### 2.4 Similarity Scoring Logic

**Found In:**
- `RECOMMENDATIONS_IMPLEMENTATION_PLAN.md` - Proposes `similarityScoring.ts`
- `RECOMMENDATIONS_IMPLEMENTATION_PLAN.md` - Proposes `hiddenGemScoring.ts`

**Issue:** Two different scoring systems proposed that share common patterns.

**Resolution:** Create unified scoring system:
```typescript
// @/features/discover/utils/scoring.ts
interface BookScore {
  book: LibraryItem;
  score: number;
  factors: ScoreFactor[];
}

export function scoreBooks(library: LibraryItem[], criteria: ScoringCriteria): BookScore[];
```

---

## 3. Pattern Violations

### 3.1 Cross-Feature Import Violations

**Documented Rule** (CLAUDE.md, architecture.md, DOCUMENTATION.md):
> Features should NOT import from other features. Shared code goes in `src/shared/`.

**Violations Found:**

| Importing Screen | Imports From | Violation |
|-----------------|--------------|-----------|
| MyLibraryScreen | `@/features/downloads/components/DownloadItem` | Direct cross-feature import |
| MyLibraryScreen | `@/features/home/components/SectionHeader` | Direct cross-feature import |
| MyLibraryScreen | `@/features/home/hooks/useContinueListening` | Direct cross-feature import |
| HomeScreen | `@/features/queue/components/QueuePanel` | Direct cross-feature import |
| CDPlayerScreen | `@/features/queue/components/QueuePanel` | Direct cross-feature import |

**Resolution:**
1. Move `SectionHeader` to `@/shared/components/`
2. Move `DownloadItem` to `@/shared/components/`
3. Move `QueuePanel` to `@/shared/components/`
4. Create `useContinueListening` in a shared hook or replicate in each feature

### 3.2 File Size Violations

**Documented Rule** (CLAUDE.md, docs/CLAUDE.md):
> Maximum 400 lines per file

**Violations Found:**

| File | Lines | Violation Level |
|------|-------|-----------------|
| `playerStore.ts` | ~2579 | Severe (6x limit) |
| `audioService.ts` | ~1237 | Severe (3x limit) |
| `CDPlayerScreen.tsx` | ~1811 | Severe (4.5x limit) |
| `MyLibraryScreen.tsx` | ~1751 | Severe (4x limit) |
| `HomeScreen.tsx` | ~403 | Minor |

**Resolution:**
1. `playerStore.ts` - Split into:
   - `playerStore/state.ts` - State definitions
   - `playerStore/actions.ts` - Action implementations
   - `playerStore/selectors.ts` - Derived state selectors
   - `playerStore/index.ts` - Combined export

2. `CDPlayerScreen.tsx` - Extract sub-components:
   - `CDDisc.tsx` (already identified as internal)
   - `CDProgressBar.tsx` (already identified as internal)
   - `ChapterSheet.tsx`
   - `ControlButtons.tsx`

### 3.3 Store Subscription Pattern Inconsistency

**Documented Pattern** (STATE_MANAGEMENT.md):
> Use `useShallow` for multiple property selection

**Found Patterns:**

| Screen | Pattern | Compliant |
|--------|---------|-----------|
| CDPlayerScreen | Uses `useShallow` for main state | Yes |
| CDPlayerScreen | 12+ individual action subscriptions | No |
| MyLibraryScreen | Individual subscriptions | Unknown |

**Resolution:** Batch action subscriptions as documented in PLAYER_PERFORMANCE_AUDIT.md:
```typescript
const actions = usePlayerStore(
  useShallow((s) => ({
    closePlayer: s.closePlayer,
    play: s.play,
    pause: s.pause,
    // ... more actions
  }))
);
```

### 3.4 List Virtualization Missing

**Documented Best Practice** (DOCUMENTATION.md, GETTING_STARTED.md):
> Ensure lists use `FlashList` or `FlatList` with proper `keyExtractor`

**Violations:**

| Screen | List Type | Issue |
|--------|-----------|-------|
| MyLibraryScreen | ScrollView | No virtualization for book lists |
| HomeScreen | Animated.ScrollView | No virtualization for sections |

**Resolution:**
1. Convert MyLibraryScreen main content to `FlatList` or `SectionList`
2. Consider `FlashList` for better performance

---

## 4. Data Flow Conflicts & Redundancies

### 4.1 Progress Tracking Redundancy

**Documented Architecture** (ARCHITECTURE_FLOWS.md):
```
Tier 1: Real-Time (Memory) - playerStore.position
Tier 2: Local Persistence - SQLite playback_progress
Tier 3: Server Sync - POST /api/me/progress
```

**Conflict Found:**

| Storage | Key/Table | Feature |
|---------|-----------|---------|
| AsyncStorage | `player-progress` | Player feature |
| SQLite | `playback_progress` | Core services |
| Zustand persist | `player-settings` | Player store |

**Issue:** Progress is stored in both AsyncStorage (via Zustand persist) AND SQLite. This creates sync complexity and potential conflicts.

**Resolution:** Clarify single source of truth:
- SQLite: Authoritative local storage
- AsyncStorage: Settings only (not progress)
- Remove progress persistence from Zustand store config

### 4.2 Library Cache Conflict

**Documented in ARCHITECTURE_FLOWS.md:**
```
libraryCache.ts - In-memory cache
AsyncStorage key: 'library_cache_v2'
```

**Documented in PROFILE_TAB.md:**
```
my-library-store - User's library (book IDs, favorites, preferences)
```

**Issue:** Library data is cached in multiple places:
1. `libraryCache` (in-memory + AsyncStorage)
2. `myLibraryStore` (Zustand + AsyncStorage)
3. React Query cache

**Resolution:** Define clear responsibilities:
- `libraryCache`: Raw server data cache
- `myLibraryStore`: User-specific metadata (favorites, sort preferences)
- React Query: API response caching with staleTime

### 4.3 Continue Listening Data Source Conflict

**Found In Multiple Places:**

| Location | Source | Purpose |
|----------|--------|---------|
| HomeScreen | `useHomeData` | "Continue Listening" section |
| MyLibraryScreen | `useContinueListening` | Hero card |
| useDiscoverData | `inProgressItems` | Multiple rows |

**Issue:** Same "in progress" data fetched/computed differently in each location.

**Resolution:** Create single source of truth:
```typescript
// @/core/hooks/useInProgressBooks.ts
export function useInProgressBooks() {
  // Single implementation for all screens
}
```

### 4.4 Dismissal Storage Conflict

**Documented in PROFILE_TAB.md:**
```
dismissed-items-store - Hidden recommendations
```

**Planned in RECOMMENDATIONS_IMPLEMENTATION_PLAN.md:**
```
preferencesStore - dismissedBooks, dismissedAuthors, dismissedGenres
```

**Issue:** Plan proposes adding dismissals to `preferencesStore`, but there's already a `dismissed-items-store`.

**Resolution:** Consolidate into single store:
```typescript
// Either use existing dismissed-items-store
// Or migrate to preferencesStore and deprecate dismissed-items-store
```

### 4.5 Author/Narrator Data Inconsistency

**Documented in api.md:**
```
No dedicated narrator endpoint. Narrators are in item.media.metadata.narratorName as comma-separated string.
```

**But MyLibraryScreen documents:**
```typescript
getAllNarrators() // from @/core/cache
```

**Issue:** Narrator data is extracted from items but cached separately. No clear documentation of this caching strategy.

**Resolution:** Document narrator caching strategy and ensure consistency with author caching.

---

## 5. Documentation Gaps

### 5.1 Missing Screen Audits

The following screens need audits created:
- [ ] ProfileScreen
- [ ] BrowseScreen/DiscoverScreen
- [ ] SearchScreen
- [ ] BookDetailScreen
- [ ] SeriesDetailScreen
- [ ] AuthorDetailScreen
- [ ] NarratorDetailScreen
- [ ] DownloadsScreen
- [ ] StatsScreen

### 5.2 Inconsistent Feature Names

| Documentation | Code Reference | Actual Name |
|---------------|----------------|-------------|
| "BrowseScreen" | Some docs | "DiscoverScreen" or "MoodDiscoveryScreen" |
| "browse" feature | architecture.md | "discover" or "mood-discovery" |

**Resolution:** Audit actual codebase and align documentation naming.

### 5.3 Version/Changelog Discrepancy

**CLAUDE.md states:**
```
Current Version: See src/constants/version.ts
```

But no explicit version documentation in the 18 reviewed docs.

**Resolution:** Add version history to CHANGELOG.md alignment.

---

## 6. Priority Matrix

### Critical (Fix Immediately)

| Issue | Impact | Effort |
|-------|--------|--------|
| Cross-feature import violations | Architecture decay | Medium |
| Progress storage redundancy | Data corruption risk | High |
| Missing screen audits | Accessibility gaps | Medium |

### High (Fix This Sprint)

| Issue | Impact | Effort |
|-------|--------|--------|
| Large file violations | Maintainability | High |
| Duplicate filtering logic | Code bloat | Medium |
| List virtualization missing | Performance | Medium |

### Medium (Fix Next Sprint)

| Issue | Impact | Effort |
|-------|--------|--------|
| Time formatting duplication | Inconsistency | Low |
| Reduced motion inconsistency | Accessibility | Low |
| Naming convention alignment | Developer experience | Low |

### Low (Backlog)

| Issue | Impact | Effort |
|-------|--------|--------|
| Documentation naming alignment | Confusion | Low |
| Store subscription pattern | Minor performance | Low |

---

## 7. Recommended Actions

### Immediate Actions

1. **Create Missing Audits**
   - Copy `_AUDIT_TEMPLATE.md` for each missing screen
   - Audit ProfileScreen, BrowseScreen, SearchScreen, BookDetailScreen

2. **Move Shared Components**
   - `SectionHeader` → `@/shared/components/`
   - `DownloadItem` → `@/shared/components/`
   - `QueuePanel` → `@/shared/components/`

3. **Clarify Progress Storage**
   - Document authoritative source
   - Remove redundant storage

### Short-Term Actions

1. **Create Shared Utilities**
   - `@/shared/utils/libraryFilters.ts`
   - `@/shared/utils/bookTransforms.ts`
   - Update `@/shared/utils/format.ts` with time utilities

2. **Split Large Files**
   - Start with `playerStore.ts` (highest impact)
   - Then `CDPlayerScreen.tsx`

3. **Add Virtualization**
   - Convert MyLibraryScreen book lists to FlatList

### Long-Term Actions

1. **Standardize Patterns**
   - Document standard handler naming conventions
   - Document progress display guidelines
   - Create style guide for new screens

2. **Unify Recommendation System**
   - Implement consolidated scoring system
   - Merge dismissal stores

---

## 8. Cross-Reference Matrix

| Doc A | Doc B | Conflict/Inconsistency |
|-------|-------|------------------------|
| ARCHITECTURE_FLOWS.md | PROFILE_TAB.md | Progress storage (SQLite vs AsyncStorage) |
| CLAUDE.md | MyLibraryScreen.audit.md | File size limits (400 vs 1751 lines) |
| architecture.md | HomeScreen.audit.md | Cross-feature imports prohibited but exist |
| STATE_MANAGEMENT.md | CDPlayerScreen.audit.md | useShallow pattern not fully applied |
| RECOMMENDATIONS_IMPLEMENTATION_PLAN.md | PROFILE_TAB.md | Dismissal storage location |
| api.md | MyLibraryScreen.audit.md | Narrator data handling |
| GETTING_STARTED.md | MyLibraryScreen.audit.md | Virtualization requirement |
| docs/CLAUDE.md | DOCUMENTATION.md | Feature module pattern (slightly different descriptions) |

---

## Revision History

| Date | Changes | Author |
|------|---------|--------|
| 2026-01-05 | Initial audit of 18 documentation files | Claude Code |
