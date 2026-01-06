# FilteredBooks Documentation

## Overview

The FilteredBooks system provides a unified way to display filtered book collections across the app. It consists of:

1. **FilteredBooksScreen** - A dedicated screen for viewing filtered book lists
2. **FilterOptions** (libraryCache) - Core filtering logic with multiple criteria
3. **ContentRow** navigation - "View All" links from discover rows to filtered views
4. **Series filtering** - Smart series-aware filtering to show appropriate books

**Key Files:**
- `src/features/library/screens/FilteredBooksScreen.tsx` - Main screen
- `src/core/cache/libraryCache.ts` - `FilterOptions` interface and `filterItems()` function
- `src/features/discover/types.ts` - `FilterType` enum and `ContentRow` navigation params
- `src/shared/utils/seriesFilter.ts` - Series-aware filtering utilities

---

## Filter Types (Navigation)

The `FilterType` enum defines the preset filter modes available via navigation:

```typescript
type FilterType =
  | 'new_this_week'     // Books added in last 7 days
  | 'short_books'       // Duration < 5 hours
  | 'long_listens'      // Duration >= 10 hours
  | 'not_started'       // Unfinished books (any)
  | 'recommended'       // All recommendations (fallback)
  | 'mood_matched'      // Books matching active mood session
  | 'continue_series';  // Next book in in-progress series
```

---

## Navigation Parameters

**Location:** `src/features/library/screens/FilteredBooksScreen.tsx:60-65`

```typescript
interface FilteredBooksParams {
  title: string;              // Screen header title (e.g., "New This Week")
  filterType: FilterType;     // Which preset filter to apply
  genre?: string;             // Optional genre filter (e.g., "Mystery")
  minMatchPercent?: number;   // For mood_matched: minimum match threshold (default: 20)
}
```

### Example Navigation Calls

```typescript
// From ContentRowCarousel "View All" button
navigation.navigate('FilteredBooks', {
  title: 'New This Week',
  filterType: 'new_this_week',
});

// With genre filter
navigation.navigate('FilteredBooks', {
  title: 'Mystery - Short Books',
  filterType: 'short_books',
  genre: 'Mystery',
});

// With mood matching
navigation.navigate('FilteredBooks', {
  title: 'Cozy Reads',
  filterType: 'mood_matched',
  minMatchPercent: 30,
});
```

---

## Filter Criteria (FilterOptions)

**Location:** `src/core/cache/libraryCache.ts:81-93`

The `filterItems()` function in libraryCache accepts these criteria:

| Criterion | Type | Description |
|-----------|------|-------------|
| `query` | string | Text search (title, author, narrator, series) |
| `genres` | string[] | Match any of these genres |
| `authors` | string[] | Match any of these authors |
| `narrators` | string[] | Match any of these narrators |
| `series` | string[] | Match any of these series |
| `minDuration` | number | Minimum duration in hours |
| `maxDuration` | number | Maximum duration in hours |
| `hasProgress` | boolean | Has any listening progress (> 0%) |
| `isFinished` | boolean | Is finished (>= 95% progress) or not |
| `sortBy` | string | Sort field (title, author, dateAdded, duration, progress) |
| `sortOrder` | 'asc' \| 'desc' | Sort direction |

### Text Search Logic

**Location:** `src/core/cache/libraryCache.ts:444-519`

The text search uses a multi-pass matching strategy:

1. **Substring match** - Direct `includes()` check on title/author/narrator/series
2. **Word prefix match** - Each word's prefix matches (e.g., "sand" → "Sanderson")
3. **Space-insensitive + accent-normalized** - "earthsea" → "A Wizard of Earth Sea", "carre" → "John le Carré"
4. **Multi-word search** - All significant words (>2 chars) must appear somewhere

---

## How Filters Combine

Filters are applied **sequentially** (AND logic):

```typescript
// In filterItems() - src/core/cache/libraryCache.ts:439-599
filterItems: (filters: FilterOptions) => {
  let items = get().items;

  // 1. Text search (if provided)
  if (filters.query?.trim()) { items = items.filter(...); }

  // 2. Genre filter (if provided) - match ANY genre
  if (filters.genres?.length) { items = items.filter(...); }

  // 3. Author filter (if provided) - match ANY author
  if (filters.authors?.length) { items = items.filter(...); }

  // 4. Narrator filter (if provided) - match ANY narrator
  if (filters.narrators?.length) { items = items.filter(...); }

  // 5. Series filter (if provided) - match ANY series
  if (filters.series?.length) { items = items.filter(...); }

  // 6. Duration range
  if (filters.minDuration !== undefined) { items = items.filter(...); }
  if (filters.maxDuration !== undefined) { items = items.filter(...); }

  // 7. Progress filters
  if (filters.hasProgress === true) { items = items.filter(...); }
  if (filters.isFinished === true) { items = items.filter(...); }

  // 8. Sorting (if specified)
  if (filters.sortBy) { items = [...items].sort(...); }

  return items;
}
```

**Key Combination Rules:**
- Multiple filters = AND (all must pass)
- Multiple values within a filter = OR (any can match)
  - e.g., `genres: ['Mystery', 'Thriller']` matches books with either genre
- Duration uses range (min AND max if both specified)
- `isFinished: false` excludes finished books (useful for recommendations)

---

## FilteredBooksScreen Implementation

**Location:** `src/features/library/screens/FilteredBooksScreen.tsx:140-262`

Each `filterType` applies a specific filtering pipeline:

### `new_this_week`
```typescript
const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
result = libraryItems
  .filter(item => (item.addedAt || 0) * 1000 > oneWeekAgo)  // Added recently
  .filter(item => !isFinished(item.id))                      // Not finished
  .filter(isSeriesAppropriate)                               // Series-aware
  .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));     // Newest first
```

### `short_books`
```typescript
const SHORT_BOOK_THRESHOLD = 5 * 60 * 60; // 5 hours
result = libraryItems
  .filter(item => duration > 0 && duration < SHORT_BOOK_THRESHOLD)
  .filter(item => !isFinished(item.id))
  .filter(isSeriesAppropriate)
  .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
```

### `long_listens`
```typescript
const LONG_BOOK_THRESHOLD = 10 * 60 * 60; // 10 hours
result = libraryItems
  .filter(item => duration >= LONG_BOOK_THRESHOLD)
  .filter(item => !isFinished(item.id))
  .filter(isSeriesAppropriate)
  .sort((a, b) => durationB - durationA);  // Longest first
```

### `not_started`
```typescript
result = libraryItems
  .filter(item => !isFinished(item.id))
  .filter(isSeriesAppropriate)
  .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
```

### `mood_matched`
```typescript
// Uses useMoodRecommendations hook with active session
const moodIds = new Set(moodRecommendations.map(r => r.id));
result = libraryItems.filter(item => moodIds.has(item.id));
result.sort((a, b) => scoreB - scoreA);  // Best match first
```

### `continue_series`
```typescript
// Find in-progress series and get next book
for (const [seriesName, maxSeq] of seriesFromProgress) {
  const nextInSeries = libraryItems.find(item => {
    const seq = parseFloat(series.sequence) || 0;
    return series.name === seriesName && seq > maxSeq && !isFinished(item.id);
  });
  if (nextInSeries) result.push(nextInSeries);
}
```

### Post-Filters (Applied to All Types)

After the type-specific filter, these are always applied:

```typescript
// Genre filter (if genre param provided and not "All")
if (genre && genre !== 'All') {
  result = result.filter(item => {
    const genres = metadata.genres || [];
    return genres.some(g => g.toLowerCase() === genre.toLowerCase());
  });
}

// Search filter (from screen's search bar)
if (searchQuery.trim()) {
  result = result.filter(item => {
    const title = metadata.title.toLowerCase();
    const author = metadata.authorName.toLowerCase();
    return title.includes(query) || author.includes(query);
  });
}
```

---

## Series-Aware Filtering

**Location:** `src/shared/utils/seriesFilter.ts`

The `createSeriesFilter()` function prevents showing "middle books" in series:

### Rules

| Scenario | Result |
|----------|--------|
| Not in a series | Always show |
| Only book in series | Always show (treated as standalone) |
| First book in series (user hasn't started) | Show |
| Next book in series (user has started) | Show |
| Book ahead of user's progress | Hide |
| Omnibus "1-3" at start | Show if user at book 1 or hasn't started |
| Omnibus "4-6" ahead of user | Hide if user hasn't reached book 4 |

### Implementation

```typescript
function isSeriesAppropriate(
  item: LibraryItem,
  seriesProgressMap: Map<string, number>,  // User's progress per series
  seriesCountMap: Map<string, number>,      // Total books per series
  seriesFirstBookMap: Map<string, number>   // First sequence per series
): boolean {
  const seriesInfo = getSeriesInfo(item);
  if (!seriesInfo) return true;  // Not in series

  const seriesBookCount = seriesCountMap.get(seriesName) || 0;
  if (seriesBookCount <= 1) return true;  // Single-book series

  const userProgress = seriesProgressMap.get(seriesName) || 0;
  const firstBookSequence = seriesFirstBookMap.get(seriesName) || 1;

  if (userProgress > 0) {
    // User has started: allow up to next book
    return bookSequence <= userProgress + 1;
  }

  // User hasn't started: only show first book
  return bookSequence === firstBookSequence;
}
```

---

## URL/Param Structure

### React Navigation Route

**Location:** `src/navigation/AppNavigator.tsx:168`

```typescript
<Stack.Screen name="FilteredBooks" component={FilteredBooksScreen} />
```

### ContentRow Navigation Integration

**Location:** `src/features/discover/types.ts:56-61`

```typescript
interface ContentRow {
  // ... other fields
  seeAllRoute?: string;        // "FilteredBooks"
  filterType?: FilterType;     // "new_this_week", "short_books", etc.
  filterParams?: {             // Additional params
    genre?: string;
    minMatchPercent?: number;
  };
}
```

**Location:** `src/features/discover/components/ContentRowCarousel.tsx:186-197`

```typescript
const handleSeeAll = useCallback(() => {
  if (row.filterType) {
    navigation.navigate('FilteredBooks', {
      title: row.title,
      filterType: row.filterType,
      ...row.filterParams,  // genre, minMatchPercent
    });
  }
}, [navigation, row]);
```

### Row-to-Filter Mapping

**Location:** `src/features/discover/hooks/useDiscoverData.ts`

| Row | Route | FilterType | Additional Params |
|-----|-------|------------|-------------------|
| New This Week | FilteredBooks | `new_this_week` | - |
| Short & Sweet | FilteredBooks | `short_books` | - |
| Long Listens | FilteredBooks | `long_listens` | - |
| Not Started | FilteredBooks | `not_started` | - |
| Continue Series | FilteredBooks | `continue_series` | - |
| Recommendations | FilteredBooks | `recommended` | - |
| Mood-based rows | FilteredBooks | `mood_matched` | `minMatchPercent: 20` |

---

## Screen Features

### FilteredBooksScreen Components

1. **Header** - Back button + dynamic title from params
2. **Search Bar** - Real-time search within filtered results
3. **Results Count** - Shows "X books" badge
4. **Grid View** - 3-column virtualized FlatList
5. **Pull-to-Refresh** - Refreshes library cache

### UI Constants

```typescript
const NUM_COLUMNS = 3;
const PADDING = 16;
const GAP = 10;
const CARD_WIDTH = (screenWidth - PADDING * 2 - GAP * 2) / 3;

// Duration thresholds
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const SHORT_BOOK_THRESHOLD = 5 * 60 * 60;   // 5 hours
const LONG_BOOK_THRESHOLD = 10 * 60 * 60;   // 10 hours
```

---

## Data Flow Diagram

```
User taps "View All" on ContentRow
        │
        ▼
┌───────────────────────────┐
│  navigation.navigate(     │
│    'FilteredBooks',       │
│    { title, filterType,   │
│      genre?, minMatch? }  │
│  )                        │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│  FilteredBooksScreen      │
│  reads route.params       │
└───────────┬───────────────┘
            │
            ├──────────────────────────────────────┐
            │                                      │
            ▼                                      ▼
┌─────────────────────┐              ┌─────────────────────┐
│  useLibraryCache()  │              │  useReadingHistory()│
│  → all items        │              │  → isFinished,      │
│                     │              │    hasBeenStarted   │
└─────────┬───────────┘              └──────────┬──────────┘
          │                                     │
          └───────────────┬─────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  createSeriesFilter() │
              │  → isSeriesAppropriate│
              └───────────┬───────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  switch(filterType)   │
              │  Apply filter logic   │
              │  + genre filter       │
              │  + search filter      │
              └───────────┬───────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  FlatList displays    │
              │  filteredBooks[]      │
              │  (3-column grid)      │
              └───────────────────────┘
```

---

## Mood Filtering Integration

**Location:** `src/features/mood-discovery/hooks/useMoodFilteredBooks.ts`

When `filterType === 'mood_matched'`, the screen uses the mood recommendation system:

```typescript
const { recommendations: moodRecommendations } = useMoodRecommendations({
  session: moodSession,       // Active mood session from store
  minMatchPercent: 20,        // From route params (default: 20)
  limit: 500,                 // Get all matches
});

// Filter to only mood-matched books, sorted by match score
const moodIds = new Set(moodRecommendations.map(r => r.id));
result = libraryItems.filter(item => moodIds.has(item.id));
result.sort((a, b) => {
  const scoreA = moodRecommendations.find(r => r.id === a.id)?.matchPercent || 0;
  const scoreB = moodRecommendations.find(r => r.id === b.id)?.matchPercent || 0;
  return scoreB - scoreA;  // Highest match first
});
```

---

## Usage Examples

### Programmatic Navigation

```typescript
// Navigate to short books in Mystery genre
navigation.navigate('FilteredBooks', {
  title: 'Quick Mystery Reads',
  filterType: 'short_books',
  genre: 'Mystery',
});

// Navigate to mood-matched with high threshold
navigation.navigate('FilteredBooks', {
  title: 'Perfect for Your Mood',
  filterType: 'mood_matched',
  minMatchPercent: 40,
});
```

### Using filterItems Directly

```typescript
const { filterItems } = useLibraryCache();

// Complex filter: short mysteries by specific author
const results = filterItems({
  genres: ['Mystery', 'Thriller'],
  authors: ['Agatha Christie'],
  maxDuration: 8,  // hours
  isFinished: false,
  sortBy: 'dateAdded',
  sortOrder: 'desc',
});
```
