# Entity Detail Screens Documentation

## Overview

Entity detail screens display information about non-book entities (Series, Author, Narrator, Genre, Collection) and list their associated books. All screens share common patterns while having entity-specific behaviors.

---

## Shared Patterns

### Visual Design
All entity detail screens follow a consistent visual pattern:

| Component | Implementation |
|-----------|----------------|
| **Hero Background** | Blurred first book cover + gradient fade |
| **Stacked Covers** | Fanned display of book covers (up to 5) |
| **Entity Title** | Large centered title |
| **Stats Line** | Book count + total duration |
| **Progress Stats** | Completed/in-progress badges |
| **Book List** | FlatList with ListHeaderComponent |

### Common UI Components
```
┌──────────────────────────────────────┐
│ [←]                     [Actions]    │  ← Header with back + actions
├──────────────────────────────────────┤
│                                      │
│     [Blurred Background Image]       │
│                                      │
│       📚 📚 📚 📚 📚                │  ← Stacked covers
│                                      │
│         Entity Name                  │
│      X books · Yh total              │
│                                      │
│  [✓ N completed] [📖 M in progress] │  ← Progress stats
│                                      │
├──────────────────────────────────────┤
│  [Entity-specific sections...]       │
├──────────────────────────────────────┤
│  All Books (N)                       │
│  ┌────────────────────────────────┐  │
│  │ Cover │ Title, Series, Meta   │  │  ← Book rows
│  │       │ Duration · Narrator    │  │
│  │       │ [Progress bar]         │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

### Data Fetching

| Screen | Data Source | Cache Strategy |
|--------|-------------|----------------|
| SeriesDetail | `useLibraryCache().getSeries(name)` | In-memory LibraryCache |
| AuthorDetail | `useLibraryCache().getAuthor(name)` + API fallback | Cache + API for author books |
| NarratorDetail | `useLibraryCache().getNarrator(name)` | In-memory LibraryCache |
| GenreDetail | `useLibraryCache().filterItems({genres})` | In-memory LibraryCache |
| CollectionDetail | `useQuery` + `apiClient.getCollection(id)` | React Query (5min stale) |

### Navigation to BookDetail

All screens use the same pattern:
```typescript
const handleBookPress = useCallback((bookId: string) => {
  navigation.navigate('BookDetail', { id: bookId });
}, [navigation]);
```

### Common Helper Functions

```typescript
// Get metadata from LibraryItem
const getMetadata = (item: LibraryItem) => item.media?.metadata as any;

// Get user progress (0-1)
const getProgress = (item: LibraryItem): number => {
  const progress = (item as any).userMediaProgress;
  return progress?.progress || 0;
};

// Format duration
const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};
```

---

## Screen-Specific Details

### SeriesDetailScreen
**File:** `src/features/series/screens/SeriesDetailScreen.tsx`

#### Unique Features
- **Sequence-based sorting** - Books sorted by series sequence (#1, #2, etc.)
- **Batch download** - Download all/remaining books in series
- **Track series** - Get notifications for new books
- **Favorite series** - Add to My Library favorites
- **Grid/List toggle** - Switch between view modes
- **Downloaded filter** - Show only downloaded books
- **Continue Series** - Quick action to resume from current book

#### Route Params
```typescript
{ seriesName: string }
```

#### Header Actions
| Action | Icon | Function |
|--------|------|----------|
| Track | Bell/BellOff | `trackSeries()`/`untrackSeries()` |
| Favorite | Heart | `addSeriesToFavorites()`/`removeSeriesFromFavorites()` |

#### Book Sorting Logic
1. If books have real sequence numbers → sort by sequence
2. If no sequences → sort by publish date, then title
3. User can toggle asc/desc order

#### Custom Components
- `SeriesProgressHeader` - Shows next book to read with progress
- `BatchActionButtons` - Download all, continue listening
- `SeriesBookRow` - Book item with sequence badge

---

### AuthorDetailScreen
**File:** `src/features/author/screens/AuthorDetailScreen.tsx`

#### Unique Features
- **Author image** - Center of stacked covers (with initials fallback)
- **Follow author** - Get notifications for new books
- **Expandable bio** - Read more/less for long descriptions
- **Genre tags** - Top 3 genres from author's books
- **Series section** - Horizontal scroll of author's series
- **Continue Listening** - In-progress books sorted by highest progress
- **Similar Authors** - Based on genre overlap
- **Sort options** - Title, Recent, Duration, Series

#### Route Params
```typescript
{ authorName: string } | { name: string }
```

#### Data Fetching
```typescript
// Cache lookup first
const authorInfo = getAuthor(authorName);

// Then API fetch for complete book list
const authorData = await apiClient.getAuthor(authorInfo.id, { include: 'items' });
```

#### Header Actions
| Action | Icon | Function |
|--------|------|----------|
| Follow | Bell/BellOff | `followAuthor()`/`unfollowAuthor()` |

#### Tappable Elements
- Narrator name → Navigate to NarratorDetail
- Series card → Navigate to SeriesDetail
- Similar author → Navigate to AuthorDetail

---

### NarratorDetailScreen
**File:** `src/features/narrator/screens/NarratorDetailScreen.tsx`

#### Unique Features
- **Narrator initials** - Center of stacked covers (with Mic icon fallback)
- **Authors section** - Horizontal scroll of authors they've narrated for
- **Simpler than AuthorDetail** - No follow, no bio, no similar narrators

#### Route Params
```typescript
{ narratorName: string } | { name: string }
```

#### Data Source
```typescript
const narratorInfo = getNarrator(narratorName);
// Books come from cache matching - no API call
```

#### Tappable Elements
- Author name → Navigate to AuthorDetail
- Author card → Navigate to AuthorDetail

---

### GenreDetailScreen
**File:** `src/features/library/screens/GenreDetailScreen.tsx`

#### Unique Features
- **Search within genre** - Filter books by title/author
- **Sort modal** - 7 sort options with bottom sheet
- **Simple stacked covers** - 3 book covers, no entity avatar
- **Uses ScrollView** - Not FlatList (smaller dataset)
- **Uses BookCard component** - Shared card component

#### Route Params
```typescript
{ genreName: string }
```

#### Data Source
```typescript
const genreBooks = filterItems({ genres: [genreName] });
```

#### Sort Options
| ID | Label | Icon |
|----|-------|------|
| `recentlyAdded` | Recently Added | Clock |
| `titleAsc` | Title A-Z | ArrowUp |
| `titleDesc` | Title Z-A | ArrowDown |
| `authorAsc` | Author A-Z | User |
| `authorDesc` | Author Z-A | User |
| `durationAsc` | Duration (Short to Long) | Timer |
| `durationDesc` | Duration (Long to Short) | Timer |

---

### CollectionDetailScreen
**File:** `src/features/collections/screens/CollectionDetailScreen.tsx`

#### Unique Features
- **Server-managed** - Collections are created/edited in AudiobookShelf server
- **Description field** - Can have collection description
- **Stats row** - Books, Total duration, Completed count
- **Uses React Query** - Only screen using React Query for data
- **Fixed dark theme** - Doesn't support light mode
- **Uses BookCard** - Shared card component

#### Route Params
```typescript
{ collectionId: string }
```

#### Data Source
```typescript
// React Query with API call
const { data } = useQuery({
  queryKey: queryKeys.collections.detail(collectionId),
  queryFn: () => apiClient.getCollection(collectionId),
  staleTime: 5 * 60 * 1000,
});
```

---

## Navigation Map

```
Entity Detail Screens
├── SeriesDetail
│   └── BookDetail (on book tap)
│
├── AuthorDetail
│   ├── BookDetail (on book tap)
│   ├── NarratorDetail (on narrator tap)
│   ├── SeriesDetail (on series card tap)
│   └── AuthorDetail (on similar author tap)
│
├── NarratorDetail
│   ├── BookDetail (on book tap)
│   └── AuthorDetail (on author tap)
│
├── GenreDetail
│   └── BookDetail (on book tap)
│
└── CollectionDetail
    └── BookDetail (on book tap)
```

---

## State Management

### Stores Used

| Store | Used By | Purpose |
|-------|---------|---------|
| `useLibraryCache` | All except Collection | In-memory cache of library items |
| `usePlayerStore` | Series, Author, Narrator | Current playing book, loadBook() |
| `useWishlistStore` | Series, Author | Track/follow functionality |
| `useMyLibraryStore` | Series | Favorite series |
| `useDownloads` | Series | Download status tracking |

### Refresh Patterns

| Screen | Refresh Method |
|--------|----------------|
| SeriesDetail | `refreshCache()` from useLibraryCache |
| AuthorDetail | `refreshCache()` from useLibraryCache |
| NarratorDetail | `refreshCache()` from useLibraryCache |
| GenreDetail | `refreshCache()` from useLibraryCache |
| CollectionDetail | `refetch()` from React Query |

---

## Performance Optimizations

All screens implement:
- `removeClippedSubviews={true}`
- `windowSize={5}`
- `maxToRenderPerBatch={5}`
- `initialNumToRender={10}`
- `React.memo()` for StackedCovers
- `useMemo()` for computed data (sorted books, stats)
- `useCallback()` for event handlers

---

## Key Files Summary

| Entity | Screen | Hook/Data |
|--------|--------|-----------|
| Series | `src/features/series/screens/SeriesDetailScreen.tsx` | `useLibraryCache().getSeries()` |
| Author | `src/features/author/screens/AuthorDetailScreen.tsx` | `useLibraryCache().getAuthor()` + API |
| Narrator | `src/features/narrator/screens/NarratorDetailScreen.tsx` | `useLibraryCache().getNarrator()` |
| Genre | `src/features/library/screens/GenreDetailScreen.tsx` | `useLibraryCache().filterItems()` |
| Collection | `src/features/collections/screens/CollectionDetailScreen.tsx` | `useCollectionDetails()` |
