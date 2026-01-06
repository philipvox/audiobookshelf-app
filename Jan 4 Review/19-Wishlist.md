# Wishlist and ManualAdd Documentation

## Overview

The Wishlist feature allows users to save books they want to read, including:
- Books from the server library (referenced by ID)
- Manually entered books (not yet in library)
- External search results (from Audnexus, etc.)

Additionally, users can follow authors and track series for future releases.

**Key Characteristic: Client-Side Only - No Server Sync**

---

## Data Model

### Core Types

**File:** `src/features/wishlist/types.ts`

#### WishlistItem

```typescript
interface WishlistItem {
  // Identity
  id: string;                          // Unique wishlist entry ID (wl_timestamp_random)
  libraryItemId?: string;              // Server book ID (if book exists in library)

  // Manual entry data (if book doesn't exist in library)
  manual?: {
    title: string;
    author: string;
    narrator?: string;
    series?: string;
    seriesSequence?: string;
    coverUrl?: string;
    isbn?: string;
    asin?: string;
    description?: string;
    estimatedDuration?: number;        // in seconds
    genres?: string[];
  };

  // Metadata
  addedAt: string;                     // ISO date string
  updatedAt: string;                   // ISO date string
  priority: WishlistPriority;
  status: WishlistStatus;
  source: WishlistSource;

  // Organization
  notes?: string;
  tags?: string[];

  // Future releases
  expectedReleaseDate?: string;
  notifyOnAvailable?: boolean;
}
```

#### WishlistPriority

```typescript
type WishlistPriority = 'must-read' | 'want-to-read' | 'maybe';
```

| Priority | Description | UI Color |
|----------|-------------|----------|
| `must-read` | High priority - read next | Red (#FF6B6B) |
| `want-to-read` | Normal priority | Gold (ACCENT) |
| `maybe` | Might read someday | Muted (0.4 opacity) |

#### WishlistSource

```typescript
type WishlistSource =
  | 'manual'           // User typed it in manually
  | 'server-search'    // Found via server library search
  | 'external-search'  // Found via external API (Audnexus, etc.)
  | 'author-follow'    // Added because user follows the author
  | 'series-track';    // Added because user tracks the series
```

#### WishlistStatus

```typescript
type WishlistStatus =
  | 'wishlist'         // On the wishlist, not yet available
  | 'available'        // Now available in user's library
  | 'downloaded'       // Downloaded and ready to listen
  | 'in-progress'      // Currently listening
  | 'completed';       // Finished listening
```

### Followed Authors

```typescript
interface FollowedAuthor {
  id: string;
  name: string;
  libraryAuthorId?: string;           // Server author ID (if exists)
  external?: {
    audnexusId?: string;
    goodreadsId?: string;
  };
  followedAt: string;
  imageUrl?: string;
  libraryBookCount?: number;
  wishlistBookCount?: number;
}
```

### Tracked Series

```typescript
interface TrackedSeries {
  id: string;
  name: string;
  librarySeriesId?: string;           // Server series ID (if exists)
  external?: {
    audnexusId?: string;
    goodreadsSeriesId?: string;
  };
  trackedAt: string;
  totalBooks?: number;
  ownedBooks?: number;
  wishlistBooks?: number;
  imageUrl?: string;
}
```

---

## State Management

### Zustand Store

**File:** `src/features/wishlist/stores/wishlistStore.ts`

```typescript
interface WishlistState {
  // Data
  items: WishlistItem[];
  followedAuthors: FollowedAuthor[];
  trackedSeries: TrackedSeries[];

  // UI State
  sortBy: WishlistSortOption;
  filters: WishlistFilters;

  // Actions
  addItem, addFromLibraryItem, addFromManualEntry, addFromExternalSearch,
  removeItem, updateItem, updatePriority, updateNotes, updateStatus,
  addTag, removeTag,
  followAuthor, unfollowAuthor, updateAuthor,
  trackSeries, untrackSeries, updateSeries,
  setSortBy, setFilters, clearFilters,

  // Queries
  isOnWishlist, getWishlistItem, getWishlistItemByLibraryId,
  isAuthorFollowed, isSeriesTracked,
  getFilteredItems, getSortedItems, getAllTags, getItemCount
}
```

### Persistence

```typescript
persist(
  (set, get) => ({ /* state */ }),
  {
    name: 'wishlist-store',
    storage: createJSONStorage(() => AsyncStorage),
    version: 1,
    partialize: (state) => ({
      items: state.items,
      followedAuthors: state.followedAuthors,
      trackedSeries: state.trackedSeries,
      sortBy: state.sortBy,
      // filters NOT persisted - reset on app restart
    }),
  }
)
```

**Storage Key:** `wishlist-store`

### ID Generation

```typescript
function generateId(): string {
  return `wl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
// Example: "wl_1704326400000_a1b2c3d"
```

---

## Sync Behavior

### No Server Sync

The wishlist is **entirely client-side**. There is no synchronization with the AudiobookShelf server.

**Implications:**
- Wishlist data is stored only on the device
- Data is not shared across devices
- Server library changes don't automatically update wishlist status
- Backup/restore is through app data backup only

### Relationship to Main Library

#### Library Item References

When adding a book from the server library:

```typescript
addFromLibraryItem: (libraryItemId, priority = 'want-to-read', notes) => {
  return get().addItem({
    libraryItemId,      // Server book ID stored as reference
    priority,
    notes,
    source: 'server-search',
  });
}
```

#### Display Data Resolution

When displaying a wishlist item:

```typescript
// In WishlistItemRow.tsx
const libraryItem = safeItem.libraryItemId ? getItem(safeItem.libraryItemId) : undefined;
const metadata = libraryItem?.media?.metadata;

// Prefer library item data over manual entry
const title = metadata?.title || item.manual?.title || 'Unknown Title';
const author = metadata?.authorName || item.manual?.author || 'Unknown Author';
```

**Priority Order:**
1. Server library item data (if `libraryItemId` exists and item found in cache)
2. Manual entry data (from `item.manual`)
3. Fallback defaults

#### Cover Images

```typescript
// Library items use server cover URL
const coverUrl = useCoverUrl(safeItem.libraryItemId || '');

// Manual entries may have external cover URL
const displayCover = item.manual?.coverUrl || (safeItem.libraryItemId ? coverUrl : undefined);
```

---

## Adding to Wishlist

### From Library Item (BookCard/Context Menu)

**Files:**
- `src/shared/components/BookCard.tsx`
- `src/shared/components/BookContextMenu.tsx`

```typescript
// Check if already on wishlist
const isOnWishlist = useIsOnWishlist(book.id);

// Add/remove toggle
const handleWishlistToggle = useCallback(() => {
  if (isOnWishlist) {
    const wishlistItem = getWishlistItemByLibraryId(book.id);
    if (wishlistItem) {
      removeItem(wishlistItem.id);
    }
  } else {
    addFromLibraryItem(book.id);
  }
}, [book, isOnWishlist, addFromLibraryItem, removeItem, getWishlistItemByLibraryId]);
```

### From Manual Entry (ManualAddScreen)

**File:** `src/features/wishlist/screens/ManualAddScreen.tsx`

Form fields:
- **Title** (required)
- **Author** (required)
- **Narrator** (optional)
- **Series** (optional)
- **Series #** (optional)
- **Notes** (optional)
- **Priority** (selector: must-read, want-to-read, maybe)

```typescript
addFromManualEntry(
  {
    title: formData.title.trim(),
    author: formData.author.trim(),
    narrator: formData.narrator.trim() || undefined,
    series: formData.series.trim() || undefined,
    seriesSequence: formData.seriesSequence.trim() || undefined,
  },
  priority,
  formData.notes.trim() || undefined
);
```

### From External Search

```typescript
addFromExternalSearch: (result, priority = 'want-to-read', notes) => {
  return get().addItem({
    manual: {
      title: result.title,
      author: result.author,
      narrator: result.narrator,
      series: result.series,
      seriesSequence: result.seriesSequence,
      coverUrl: result.coverUrl,
      isbn: result.isbn,
      asin: result.asin,
      description: result.description,
      estimatedDuration: result.duration,
      genres: result.genres,
    },
    priority,
    notes,
    source: 'external-search',
    expectedReleaseDate: result.releaseDate,
  });
}
```

---

## Wishlist Screen

**File:** `src/features/wishlist/screens/WishlistScreen.tsx`

### Tabs

| Tab | Content |
|-----|---------|
| All | All wishlist items |
| Must Read | Items with `priority: 'must-read'` |
| Authors | Followed authors list |
| Series | Tracked series list |

### Sort Options

```typescript
const SORT_OPTIONS = [
  { value: 'date-added', label: 'Recently Added' },
  { value: 'priority', label: 'Priority' },
  { value: 'title', label: 'Title' },
  { value: 'author', label: 'Author' },
];
```

### Filtering

```typescript
interface WishlistFilters {
  priority?: WishlistPriority[];
  status?: WishlistStatus[];
  source?: WishlistSource[];
  tags?: string[];
  hasNotes?: boolean;
}
```

### Item Actions

- **Tap** → Navigate to BookDetail (if library item) or show edit
- **Delete button** → Confirmation alert → Remove from wishlist
- **Long press** → Edit/context menu (planned)

---

## Followed Authors & Tracked Series

### Follow Author

```typescript
followAuthor: (authorName) => {
  // Check if already following (case-insensitive)
  const existing = get().followedAuthors.find(
    (a) => a.name?.toLowerCase() === authorName.toLowerCase()
  );
  if (existing) return existing.id;

  const newAuthor: FollowedAuthor = {
    id: generateId(),
    name: authorName,
    followedAt: now(),
  };
  set((state) => ({
    followedAuthors: [newAuthor, ...state.followedAuthors],
  }));
  return id;
}
```

### Track Series

```typescript
trackSeries: (seriesName) => {
  // Check if already tracking (case-insensitive)
  const existing = get().trackedSeries.find(
    (s) => s.name?.toLowerCase() === seriesName.toLowerCase()
  );
  if (existing) return existing.id;

  const newSeries: TrackedSeries = {
    id: generateId(),
    name: seriesName,
    trackedAt: now(),
  };
  set((state) => ({
    trackedSeries: [newSeries, ...state.trackedSeries],
  }));
  return id;
}
```

### Display Integration

When displaying followed authors/series, the app enriches with library cache data:

```typescript
const authorInfo = isLoaded && item.name ? getAuthor(item.name) : null;
const bookCount = authorInfo?.bookCount || 0;

// Shows "X books in library" or "Following"
```

---

## Convenience Hooks

```typescript
// Check if specific library item is on wishlist
export function useIsOnWishlist(libraryItemId: string): boolean

// Get wishlist item by library ID
export function useWishlistItemByLibraryId(libraryItemId: string): WishlistItem | undefined

// Get total wishlist count (for badges)
export function useWishlistCount(): number

// Get followed authors count
export function useFollowedAuthorsCount(): number

// Get tracked series count
export function useTrackedSeriesCount(): number

// Check if author is followed (by name)
export function useIsAuthorFollowed(authorName: string): boolean

// Check if series is tracked (by name)
export function useIsSeriesTracked(seriesName: string): boolean
```

---

## UI Components

### WishlistItemRow

**File:** `src/features/wishlist/components/WishlistItemRow.tsx`

Displays a single wishlist item with:
- Cover image (from library or manual entry URL)
- Priority badge (colored indicator)
- Title, author, narrator
- Series badge (if applicable)
- Duration (if known)
- Notes preview (if any)
- Delete button
- Chevron for navigation

### ManualAddScreen

**File:** `src/features/wishlist/screens/ManualAddScreen.tsx`

Full-screen form for manual book entry with:
- Text inputs for book metadata
- Priority selector (radio-style buttons)
- Validation (title and author required)
- Submit button at bottom

---

## Data Storage Example

```json
{
  "state": {
    "items": [
      {
        "id": "wl_1704326400000_a1b2c3d",
        "libraryItemId": "li_abc123",
        "priority": "must-read",
        "status": "wishlist",
        "source": "server-search",
        "addedAt": "2024-01-03T12:00:00.000Z",
        "updatedAt": "2024-01-03T12:00:00.000Z",
        "notes": "Recommended by friend"
      },
      {
        "id": "wl_1704240000000_e4f5g6h",
        "manual": {
          "title": "The Winds of Winter",
          "author": "George R. R. Martin",
          "series": "A Song of Ice and Fire",
          "seriesSequence": "6"
        },
        "priority": "want-to-read",
        "status": "wishlist",
        "source": "manual",
        "addedAt": "2024-01-02T12:00:00.000Z",
        "updatedAt": "2024-01-02T12:00:00.000Z",
        "expectedReleaseDate": "2025-01-01"
      }
    ],
    "followedAuthors": [
      {
        "id": "wl_1704153600000_i7j8k9l",
        "name": "Brandon Sanderson",
        "followedAt": "2024-01-01T12:00:00.000Z"
      }
    ],
    "trackedSeries": [
      {
        "id": "wl_1704067200000_m0n1o2p",
        "name": "The Stormlight Archive",
        "trackedAt": "2023-12-31T12:00:00.000Z"
      }
    ],
    "sortBy": "date-added"
  },
  "version": 1
}
```

---

## Navigation

### Entry Points

- **Profile Screen** → "Wishlist" link
- **BookCard** → Bookmark button (tap to add)
- **BookContextMenu** → "Add to Wishlist" option
- **WishlistScreen** → "+" button → ManualAddScreen

### Routes

```typescript
// In AppNavigator.tsx
<Stack.Screen name="Wishlist" component={WishlistScreen} />
<Stack.Screen name="ManualAdd" component={ManualAddScreen} />
```

---

## State Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          wishlistStore                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  items: WishlistItem[]                                                  │
│  followedAuthors: FollowedAuthor[]                                      │
│  trackedSeries: TrackedSeries[]                                         │
│  sortBy: WishlistSortOption                                             │
│  filters: WishlistFilters                                               │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                         Persisted to AsyncStorage                │   │
│  │                         Key: 'wishlist-store'                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                │                          │                    │
                ▼                          ▼                    ▼
┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────┐
│ BookCard              │  │ BookContextMenu       │  │ WishlistScreen    │
│                       │  │                       │  │                   │
│ Bookmark button       │  │ "Add to Wishlist"     │  │ View all items    │
│ on cover              │  │ menu option           │  │ Sort/filter       │
│                       │  │                       │  │ Authors/Series    │
│ → addFromLibraryItem  │  │ → addFromLibraryItem  │  │ → ManualAdd       │
└───────────────────────┘  └───────────────────────┘  └───────────────────┘
```

---

## Related Files

| File | Purpose |
|------|---------|
| `src/features/wishlist/stores/wishlistStore.ts` | State management |
| `src/features/wishlist/types.ts` | TypeScript interfaces |
| `src/features/wishlist/screens/WishlistScreen.tsx` | Main screen |
| `src/features/wishlist/screens/ManualAddScreen.tsx` | Manual entry form |
| `src/features/wishlist/components/WishlistItemRow.tsx` | Item display component |
| `src/features/wishlist/components/ManualAddSheet.tsx` | Bottom sheet (alternative UI) |
| `src/shared/components/BookCard.tsx` | Bookmark button integration |
| `src/shared/components/BookContextMenu.tsx` | Context menu integration |
| `src/navigation/AppNavigator.tsx` | Route registration |

---

## Future Considerations

The data model supports features not yet implemented:

1. **Notifications** (`notifyOnAvailable`) - Alert when book becomes available
2. **Status tracking** (`WishlistStatus`) - Track progression through wishlist
3. **External IDs** - Link to Audnexus, Goodreads for enriched data
4. **Server sync** - Could be added if AudiobookShelf API supports it
5. **Tags** - Custom organization beyond priorities
