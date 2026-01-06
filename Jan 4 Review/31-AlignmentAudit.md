# Cross-Document Alignment Audit

**Date:** January 5, 2026
**Documents Reviewed:** 31 (01-30 + 32-ActionPlan)
**Purpose:** Identify inconsistencies, duplicate logic, pattern violations, and data flow conflicts

---

## 1. Inconsistencies Between Screens Doing Similar Things

### 1.1 Book Filtering Patterns

| Screen | Doc | Filter Location | Pattern |
|--------|-----|-----------------|---------|
| HomeScreen | 01-HomeTab | `useHomeData.ts:55` | `filterForKidMode()` early in hook |
| DiscoverTab | 03-DiscoverTab | `useDiscoverData.ts:144` | `filterForKidMode()` on rawLibraryItems |
| SearchScreen | 10-Search | `SearchScreen.tsx:232` | `filterForKidMode()` on results |
| MyLibraryScreen | 02-LibraryTab | `MyLibraryScreen.tsx:394` | `filterForKidMode()` on all lists |

**Inconsistency:** Four different files implement the same Kid Mode filtering at different points in the data pipeline.

**Resolution:** Create single `useFilteredLibrary()` hook that applies Kid Mode + other common filters.

---

### 1.2 Progress Display Formats

| Screen | Doc | Format | Example |
|--------|-----|--------|---------|
| HomeScreen | 01-HomeTab | Percentage | "75% complete" |
| MyLibraryScreen | 02-LibraryTab | Percentage | "75%" |
| CDPlayerScreen | 05-PlayerArchitecture | Time | "1:30:45 / 2:00:00" |
| BookDetailScreen | 08-EntityDetailScreens | Both | Progress bar + time |
| SeriesDetailScreen | 08-EntityDetailScreens | Count | "3 of 7 books" |

**Inconsistency:** No standard for how progress should be displayed.

**Resolution:** Document progress display guidelines:
- Cards: percentage
- Player: elapsed / total time
- Series: book count
- Detail: progress bar with percentage

---

### 1.3 Favorite Storage Locations

| Entity Type | Doc | Store | Storage Key |
|-------------|-----|-------|-------------|
| Books | 02-LibraryTab | `myLibraryStore` | `my-library-store` → `libraryIds` |
| Series | 02-LibraryTab | `myLibraryStore` | `my-library-store` → `favoriteSeriesNames` |
| Authors | 13-Preferences | `preferencesStore` | `user-preferences-storage` → `favoriteAuthors` |
| Narrators | 13-Preferences | `preferencesStore` | `user-preferences-storage` → `favoriteNarrators` |

**Inconsistency:** Book/Series favorites in one store, Author/Narrator favorites in another.

**Resolution:** Consider consolidating all favorites into single `favoritesStore` or document why separation exists.

---

### 1.4 Swipe-to-Dismiss Implementations

| Screen | Doc | Component | Threshold |
|--------|-----|-----------|-----------|
| DiscoverTab | 18-HiddenItems | `SwipeableBookCard` | 80px or velocity > 500 |
| ReadingHistoryWizard | 14-ReadingHistory | `MarkBooksScreen` | Swipe gestures (different thresholds) |
| DownloadsScreen | 15-Downloads | Swipe-to-delete | Unknown threshold |

**Inconsistency:** Multiple swipe gesture implementations with different thresholds.

**Resolution:** Create shared `useSwipeGesture` hook with configurable thresholds.

---

### 1.5 Empty State Patterns

| Screen | Doc | Has Empty State | CTA Button |
|--------|-----|-----------------|------------|
| DownloadsScreen | 15-Downloads | Yes | "Browse Library" |
| SearchScreen | 10-Search | Yes | No CTA |
| MyLibraryScreen | 02-LibraryTab | Partial | Per-tab different |
| WishlistScreen | 19-Wishlist | Yes | FAB for add |
| HiddenItemsScreen | 18-HiddenItems | Yes | Explains how to hide |

**Inconsistency:** Empty states have inconsistent structure and CTAs.

**Resolution:** Standardize `EmptyState` component with required props: icon, title, message, optional CTA.

---

## 2. Duplicate Logic to Consolidate

### 2.1 Book Metadata Access

**Found in docs:**
- 02-LibraryTab: `(item.media?.metadata as any)?.authorName`
- 08-EntityDetailScreens: Similar casts for series, narrator
- 28-TechnicalDebt: Notes 202 `as any` casts across 61 files

**Duplicate Pattern:**
```typescript
// Same unsafe access pattern everywhere
const author = (item.media?.metadata as any)?.authorName;
const series = (item.media?.metadata as any)?.series;
const narrator = (item.media?.metadata as any)?.narratorName;
```

**Resolution:** Create typed helper:
```typescript
// @/shared/utils/bookMetadata.ts
export function getBookMetadata(item: LibraryItem): BookMetadata;
```

---

### 2.2 Continue Listening Logic

**Found in docs:**
- 01-HomeTab: `useContinueListening` hook
- 02-LibraryTab: In-progress tab uses similar filtering
- 03-DiscoverTab: `inProgressItems` in `useDiscoverData`
- 25-DataDependencyMatrix: Shows 3 screens using same data differently

**Duplicate Logic:**
```typescript
// Pattern repeated in multiple places:
items.filter(item => {
  const progress = item.userMediaProgress?.progress || 0;
  return progress > 0 && progress < 1;
}).sort((a, b) => b.lastUpdate - a.lastUpdate);
```

**Resolution:** Single `useInProgressBooks()` hook used by all screens.

---

### 2.3 Download Status Checking

**Found in docs:**
- 15-Downloads: `useDownloadStatus(itemId)` hook
- 25-DataDependencyMatrix: Multiple screens check `useIsOfflineAvailable`
- 05-PlayerArchitecture: Player checks download status for playback decisions

**Duplicate Checks:**
```typescript
// Various ways to check if downloaded:
const { isDownloaded } = useDownloadStatus(itemId);
const { isAvailable } = useIsOfflineAvailable(itemId);
downloadManager.isDownloaded(itemId);
```

**Resolution:** Consolidate to single `useDownloadState(itemId)` returning all status info.

---

### 2.4 Series Progress Calculation

**Found in docs:**
- 02-LibraryTab: Calculates series completion for cards
- 08-EntityDetailScreens: SeriesDetailScreen calculates books read/total

**Duplicate Logic:**
```typescript
// Calculating how many books complete in series
const completedCount = seriesBooks.filter(b => isFinished(b.id)).length;
const totalCount = seriesBooks.length;
const seriesProgress = completedCount / totalCount;
```

**Resolution:** Create `useSeriesProgress(seriesName)` hook.

---

### 2.5 Time Formatting

**Found in docs:**
- 05-PlayerArchitecture: Player formats elapsed/remaining
- 21-Stats: Stats formats listening hours
- 15-Downloads: Downloads formats file sizes

**Multiple Format Functions Likely Exist:**
- Format seconds to "1:30:45"
- Format duration to "8h 30m"
- Format bytes to "2.5 GB"

**Resolution:** Consolidate in `@/shared/utils/format.ts` with:
- `formatTime(seconds)` → "1:30:45"
- `formatDuration(seconds)` → "8h 30m"
- `formatBytes(bytes)` → "2.5 GB"

---

## 3. Screens Not Following Established Patterns

### 3.1 File Size Violations (from 28-TechnicalDebt)

| File | Lines | Limit | Violation |
|------|-------|-------|-----------|
| CDPlayerScreen.tsx | 4,398 | 400 | 11x over |
| sqliteCache.ts | 3,310 | 400 | 8x over |
| playerStore.ts | 2,838 | 400 | 7x over |
| MyLibraryScreen.tsx | 2,020 | 400 | 5x over |
| SearchScreen.tsx | 1,798 | 400 | 4x over |

**Pattern Violation:** All screens should be under 400 lines per project guidelines.

---

### 3.2 Cross-Feature Import Violations (from 29-RefactoringPriority)

| Import | From Feature | To Feature | Violation |
|--------|--------------|------------|-----------|
| `useContinueListening` | home | library, discover | Cross-feature |
| `useMyLibraryStore` | library | home, discover | Cross-feature |
| `useKidModeStore` | profile | home, discover, search, library | Cross-feature |
| `SearchBar` | search | Other screens | Cross-feature |

**Pattern Violation:** Features should not import from other features.

**Resolution from 32-ActionPlan item 2.3:**
- Move `useContinueListening` → `@/shared/hooks/`
- Move `useMyLibraryStore` → `@/shared/stores/`
- Move `useKidModeStore` → `@/shared/stores/`
- Move `SearchBar` → `@/shared/components/`

---

### 3.3 Duplicate Component Names (from 29-RefactoringPriority)

| Component | Location 1 | Location 2 |
|-----------|-----------|------------|
| `SeriesCard.tsx` | `features/home/components/` | `features/series/components/` |
| `SwipeableBookCard.tsx` | `features/discover/components/` | `features/reading-history-wizard/components/` |

**Pattern Violation:** Components should have unique names or be shared.

---

### 3.4 Error Handling Gaps (from 28-TechnicalDebt)

| Issue | Status |
|-------|--------|
| Error boundaries on screens | Only 1 (FloatingTabBar) |
| Silent catch blocks | Multiple screens log but don't show user |
| Console.log in production | 492 occurrences |

**Pattern Violation:** All screens should have error boundaries and user-facing error feedback.

---

### 3.5 Kid Mode PIN Missing (from 17-KidModeSettings)

**Doc states:** "Kid Mode has NO unlock mechanism - there is no PIN, password, or parental lock."

**Implication:** Children can simply toggle Kid Mode off.

**Pattern Gap:** Parental control features typically require unlock mechanism.

---

## 4. Data Flow Conflicts & Redundancies

### 4.1 Progress Storage Redundancy

**From 25-DataDependencyMatrix and 14-ReadingHistory:**

| Storage Layer | What's Stored | Location |
|---------------|---------------|----------|
| SQLite | `user_books.progress`, `currentTime`, `duration` | `sqliteCache.ts` |
| Zustand | `playerStore.position`, `duration` | Memory + partial persist |
| Server | `userMediaProgress` | API sync |

**Conflict:** Progress exists in 3 places. SQLite is documented as "single source of truth" but playerStore also persists some progress.

**Resolution:** Clarify in architecture:
- SQLite = persistent local truth
- playerStore = ephemeral playback state (not persisted)
- Server = sync target

---

### 4.2 Finished Books Dual Sources

**From 14-ReadingHistory:**

| Source | How Checked |
|--------|-------------|
| SQLite `user_books.isFinished` | `useFinishedBooks()` |
| Server `userMediaProgress.progress >= 0.95` | Combined in `useReadingHistory` |
| `completionStore` | Quick UI toggles |

**Conflict:** Three ways to check if a book is finished:
```typescript
// From SQLite
sqliteCache.getUserBook(id)?.isFinished

// From server progress
item.userMediaProgress?.progress >= 0.95

// From completion store
completionStore.isComplete(id)
```

**Resolution:** `useReadingHistory.isFinished(id)` should be the ONLY check used.

---

### 4.3 Dismissal/Hidden Items vs Preferences

**From 13-Preferences:**
```typescript
dismissedItemsStore → AsyncStorage key: 'dismissed-items-store'
```

**From 18-HiddenItems:**
```typescript
dismissedItemsStore → AsyncStorage key: 'dismissed-items-store'
```

**These are the same** - no conflict, just documented in two places.

---

### 4.4 Mood System Overlap

**From 12-MoodSystem:**
- Mood Discovery sessions: temporary (24h expiry)
- Mood-to-genre mapping for filtering

**From 13-Preferences:**
- User preference moods: permanent
- Different mood options than Mood Discovery

**Conflict documented in 13-Preferences:**
> "The Preferences moods ('Adventurous', 'Relaxing', etc.) are **distinct** from the Mood Discovery session moods ('comfort', 'thrills', 'escape', etc.)."

| System | Moods | Purpose | Persistence |
|--------|-------|---------|-------------|
| Preferences | Adventurous, Relaxing, Thoughtful, etc. | Long-term taste profile | Permanent |
| Mood Discovery | comfort, thrills, escape, etc. | Current listening mood | 24h session |

**This is intentional** but confusing. Consider aligning mood naming.

---

### 4.5 Library Cache Redundancy

**From 25-DataDependencyMatrix:**

| Cache | TTL | Storage |
|-------|-----|---------|
| `libraryCache` (AsyncStorage) | 30 days | `library_cache_v1` |
| React Query cache | 5 min | Memory |
| Individual hooks | Various | Memory |

**Redundancy:** Same data cached multiple times at different layers.

**This is intentional** (stale-while-revalidate pattern) but:
- 16-StorageSettings notes: "Large libraries may exceed AsyncStorage limits on Android, falling back to in-memory caching."
- No clear cache invalidation strategy between layers.

---

### 4.6 Auto-Download Series Trigger

**From 16-StorageSettings:**
> "When user reaches 80% progress on a book in a series, app automatically queues the next book."

**From 06-QueueScreen:**
- Queue has `autoSeriesBookId` for auto-advance within series

**From 15-Downloads:**
- No mention of the 80% trigger in downloads doc

**Gap:** Auto-download trigger not documented in Downloads doc where implementation would live.

---

## 5. Cross-Reference Matrix

### Documents That Should Agree

| Topic | Docs | Status |
|-------|------|--------|
| Kid Mode filtering | 01, 02, 03, 10, 17 | Consistent |
| Download states | 15, 16, 26 | Consistent |
| Progress tracking | 05, 14, 25 | Minor conflicts (3 sources) |
| Favorites storage | 02, 13 | Split across stores |
| Mood systems | 12, 13 | Intentionally different |
| File size limits | 28, 29 | Consistent (both note violations) |
| Error handling | 27, 28, 30 | Consistent (all note gaps) |

### Action Plan Coverage

**32-ActionPlan addresses:**
- [x] Error boundaries (1.1)
- [x] CDPlayerScreen split (1.3)
- [x] Cross-feature imports (2.3)
- [x] Duplicate components (2.4)
- [x] Console.log cleanup (2.6)
- [x] Type safety (1.5)

**Not in 32-ActionPlan but found here:**
- [ ] Favorite store consolidation
- [ ] Progress display standardization
- [ ] Mood naming alignment
- [ ] Swipe gesture hook consolidation
- [ ] Empty state standardization

---

## 6. Priority Summary

### Critical Inconsistencies

1. **Progress storage redundancy** - 3 sources of truth for same data
2. **Cross-feature imports** - Architectural violation
3. **File size violations** - 5 files over limit

### High Priority Duplications

1. **Kid Mode filtering** - 4 implementations
2. **Continue Listening logic** - 3 implementations
3. **Book metadata access** - 202 unsafe casts

### Medium Priority Gaps

1. **Favorites split** - Books/Series vs Authors/Narrators
2. **Swipe gestures** - Multiple implementations
3. **Empty states** - Inconsistent patterns
4. **Progress display** - No standard

### Low Priority Cleanups

1. **Mood naming** - Confusing but intentional
2. **Error boundaries** - Already in action plan
3. **Duplicate components** - Already in action plan

---

## 7. Recommended Additions to 32-ActionPlan

| # | Issue | Phase | Effort |
|---|-------|-------|--------|
| A1 | Create `useFilteredLibrary()` hook for Kid Mode | 2A | S |
| A2 | Consolidate favorites into single store OR document why split | 2A | M |
| A3 | Create shared `useSwipeGesture` hook | 2B | S |
| A4 | Standardize `EmptyState` component API | 2B | S |
| A5 | Create `getBookMetadata()` typed helper | 2A | S |
| A6 | Create `useSeriesProgress()` hook | 2A | S |
| A7 | Document progress display guidelines | Docs | S |
| A8 | Align or clearly distinguish Mood systems | Docs | S |
