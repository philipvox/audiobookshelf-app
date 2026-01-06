# Search Documentation

**Files:**
- `src/features/search/screens/SearchScreen.tsx` - Main UI screen
- `src/features/search/utils/fuzzySearch.ts` - Fuzzy matching utilities
- `src/features/search/hooks/useSearch.ts` - Fuse.js-based search hook
- `src/core/cache/libraryCache.ts` - `filterItems()` search implementation
- `src/core/cache/searchIndex.ts` - Trigram-based search index

## Overview

Search is **fully local/offline** - it searches against the in-memory library cache, not the server. The implementation is optimized for audiobook-specific queries with:
- Fuzzy matching (typo tolerance)
- Accent normalization ("carre" matches "Carre")
- Space-insensitive matching ("earthsea" matches "Earth Sea")
- Multi-word matching ("long sun" matches "Lake of the Long Sun")
- Abbreviation expansion ("hp" -> "harry potter")

---

## Query Handling

### Debouncing

```typescript
// SearchScreen.tsx:51
const DEBOUNCE_MS = 300;

// Custom hook (lines 54-63)
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

**Key distinction:**
- **Autocomplete:** Uses **instant** `query` for responsiveness
- **Full results:** Uses **debounced** `debouncedQuery` (300ms delay) to reduce computation

### Query Flow

```
User types -> query (instant) -> autocomplete dropdown
                              |
                              v (300ms)
                     debouncedQuery -> filterItems() -> book/author/series results
```

---

## Searchable Entities

| Entity | Fields Searched | Where Displayed |
|--------|-----------------|-----------------|
| **Books** | title, author, narrator, series, genres | Main results, autocomplete |
| **Authors** | name | Entity list, autocomplete |
| **Narrators** | name | Entity list, autocomplete |
| **Series** | name | Series cards, autocomplete |
| **Genres** | name (filter only) | Filter panel chips |

### Search Field Weights (Fuse.js - useSearch.ts:42-49)

```typescript
const fuseOptions = {
  keys: [
    { name: 'title', weight: 0.4 },
    { name: 'author', weight: 0.25 },
    { name: 'narrator', weight: 0.15 },
    { name: 'series', weight: 0.15 },
    { name: 'genres', weight: 0.05 },
  ],
  threshold: 0.5,  // Fuzzy tolerance
  distance: 200,
};
```

### Score Boosting (searchIndex.ts:227-245)

```typescript
// Exact substring matches boost scores:
if (titleLower.includes(query))    score += 0.5;
if (authorLower.includes(query))   score += 0.3;
if (seriesLower.includes(query))   score += 0.25;
if (narratorLower.includes(query)) score += 0.2;
```

---

## Search Matching Strategies

### 1. Substring Match (Fast Path)
```typescript
// libraryCache.ts:464-471
if (
  title.includes(lowerQuery) ||
  author.includes(lowerQuery) ||
  narrator.includes(lowerQuery) ||
  series.includes(lowerQuery)
) return true;
```

### 2. Word Prefix Match
```typescript
// libraryCache.ts:476-482
// "sand" matches "Sanderson"
if (
  title.split(/\s+/).some(w => w.startsWith(lowerQuery)) ||
  author.split(/\s+/).some(w => w.startsWith(lowerQuery))
) return true;
```

### 3. Space-Insensitive + Accent Normalized
```typescript
// fuzzySearch.ts:23-29
function normalizeForSearch(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // Strip diacritics
    .replace(PUNCTUATION_REGEX, '');   // Strip spaces/punctuation
}

// Examples:
// "earthsea" matches "A Wizard of Earth Sea"
// "carre" matches "John le Carre"
// "leguin" matches "Ursula K. Le Guin"
```

### 4. Multi-Word Matching
```typescript
// libraryCache.ts:510-515
// Filters out short words ("a", "of", "the")
const significantWords = queryWords.filter(w => w.length > 2);
const combined = `${title} ${author} ${series}`;
if (significantWords.every(word => combined.includes(word))) {
  return true;
}

// "long sun" matches "Lake of the Long Sun"
// "wizard earthsea" matches "A Wizard of Earthsea"
```

### 5. Abbreviation Expansion
```typescript
// fuzzySearch.ts:310-321
const ABBREVIATIONS = {
  'hp': ['harry potter'],
  'lotr': ['lord of the rings'],
  'asoiaf': ['song of ice and fire', 'game of thrones'],
  'got': ['game of thrones'],
  'scifi': ['science fiction', 'sci-fi'],
};
```

### 6. "Did You Mean" Suggestions
```typescript
// fuzzySearch.ts:261-280
// Uses Levenshtein distance for spelling correction
function findSuggestions(
  query: string,
  candidates: string[],
  maxSuggestions = 3,
  minScore = 0.5
): Array<{ text: string; score: number }>
```

---

## Caching Architecture

### In-Memory Library Cache

| Cache | Storage | Search Method |
|-------|---------|---------------|
| Library items | Zustand store (`libraryCache.ts`) | `filterItems()` |
| Authors | `Map<string, AuthorInfo>` | `getAllAuthors()` |
| Narrators | `Map<string, NarratorInfo>` | `getAllNarrators()` |
| Series | `Map<string, SeriesInfo>` | `getAllSeries()` |
| Genres | `Set<string>` | `getAllGenres()` |

### Search Index (Trigram-based)

```typescript
// searchIndex.ts:103-170
class SearchIndex {
  private items: IndexedItem[] = [];
  private trigramIndex = new Map<string, Set<string>>(); // trigram -> item IDs
  private itemById = new Map<string, IndexedItem>();

  // Build time: O(n)
  // Search time: O(k) where k = matching trigrams
  // Memory: ~3x text size
}
```

**Trigram Example:**
```
"hello" -> ["  h", " he", "hel", "ell", "llo", "lo ", "o  "]
```

### Search History

```typescript
// SearchScreen.tsx:49-50
const SEARCH_HISTORY_KEY = 'search_history_v1';
const MAX_HISTORY = 10;

// Stored in AsyncStorage
await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(searches));
```

---

## Filter Panel

### Filter Tabs

| Tab | Filter Type | UI Component |
|-----|-------------|--------------|
| All | Sort options | Sort chips (title, author, date, duration) |
| Genres | Multi-select | Chip grid from `getAllGenres()` |
| Authors | Multi-select | Chip grid (top 50) |
| Series | Multi-select | Chip grid (top 50) |
| Duration | Single-select | Duration range chips |

### Duration Filters (lines 80-86)

```typescript
const DURATION_FILTERS = [
  { label: 'Any', min: undefined, max: undefined },
  { label: '< 5h', min: undefined, max: 5 },
  { label: '5-10h', min: 5, max: 10 },
  { label: '10-20h', min: 10, max: 20 },
  { label: '20h+', min: 20, max: undefined },
];
```

### Sort Options

| Option | Field | Direction |
|--------|-------|-----------|
| Title | `title` | A-Z / Z-A |
| Author | `author` | A-Z / Z-A |
| Date Added | `addedAt` | Newest / Oldest |
| Duration | `duration` | Shortest / Longest |

---

## Result Presentation

### Autocomplete Overlay (lines 797-920)

Shows while typing, before search is committed:

| Section | Max Items | Data Shown |
|---------|-----------|------------|
| Books | 2 | Title, author, duration |
| Authors | 2 | Name, book count, thumbnail |
| Series | 1 | Name, book count |
| Narrators | 1 | Name, book count |

**UX features:**
- Darkened backdrop per Baymard research
- Author thumbnails for enhanced discoverability
- Instant (non-debounced) for responsiveness

### Full Results Sections (lines 1066-1191)

| Section | Max Items | Card Type |
|---------|-----------|-----------|
| Books | First 5 | `BookCard` with play button |
| Series | 2 | Fanned cover cards |
| Authors | 2 | Avatar + name row |
| Narrators | 2 | Avatar + name row |

### Empty States

| State | Display |
|-------|---------|
| No query | Recent searches + Quick Browse grid |
| Loading | `SearchResultsSkeleton` |
| No results | "Did you mean" suggestions + Browse recovery + Tips |

---

## Offline Behavior

Search is **fully offline-capable** because:

1. **Data source:** In-memory library cache (loaded from AsyncStorage)
2. **Search logic:** Pure JavaScript filtering, no network calls
3. **Search history:** Stored in AsyncStorage

| Feature | Offline Support |
|---------|-----------------|
| Text search | Full |
| Filter by genre/author/series/duration | Full |
| Autocomplete | Full |
| Search history | Full |
| Cover images | Cached (may show placeholders) |

---

## Performance Characteristics

### filterItems() (libraryCache.ts)

```
10,000 books:
- Simple substring: ~5ms
- Multi-word + normalization: ~20ms
- With all filters: ~30ms
```

### SearchIndex (trigram-based)

```typescript
// searchIndex.ts:163-169
// Build: 350ms for 10,000 items
// Search: <10ms for any query
// Memory: ~3x text size
```

### Optimizations

1. **Early exits:** Fast substring check before expensive normalization
2. **Pre-computed normalization:** Query normalized once, not per-item
3. **Significant words only:** Filters "a", "of", "the" in multi-word queries
4. **Result limits:** Max 100 books, 20 authors/series/narrators

---

## Data Flow Diagram

```
+------------------+     +------------------+     +------------------+
|   SearchScreen   |     |  libraryCache    |     |   fuzzySearch    |
|       (UI)       |     |   (Zustand)      |     |    (utils)       |
+------------------+     +------------------+     +------------------+
        |                        |                        |
        | query (instant)        |                        |
        |----------------------->|                        |
        |                        | filterItems(filters)   |
        |                        |----------------------->|
        |                        |                        |
        |                        |<-- matched items ------|
        |<-- bookResults --------|                        |
        |                        |                        |
        | debouncedQuery (300ms) |                        |
        |----------------------->|                        |
        |                        | fuzzyMatch()           |
        |<-- authorResults ------|----------------------->|
        |<-- seriesResults ------|                        |
        |<-- narratorResults ----|                        |
        |                        |                        |
```

---

## Related Files

- `src/features/search/components/SearchBar.tsx` - Reusable search input
- `src/features/search/hooks/useServerSearch.ts` - Server-side search (unused in main screen)
- `src/features/search/hooks/useAllLibraryItems.ts` - Full library access
- `src/core/cache/index.ts` - Cache exports (`getAllGenres`, `getAllAuthors`, etc.)
- `src/shared/components/SearchResultsSkeleton.tsx` - Loading skeleton

---

## Key Implementation Notes

1. **Dual query system:** Instant for autocomplete, debounced for full results

2. **Kid Mode filtering:** Results are filtered through `filterForKidMode()` when enabled

3. **Navigation params:** Screen accepts `genre` param to pre-select genre filter

4. **Committed search state:** `hasCommittedSearch` tracks whether user pressed search vs still typing

5. **Keyboard handling:** `keyboardShouldPersistTaps="handled"` allows tapping results while keyboard is up

6. **Performance:** No network calls - entire search runs against local cache in <50ms
