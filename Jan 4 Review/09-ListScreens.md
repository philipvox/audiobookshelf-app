# List Screens Documentation

## Overview

The app has four main list screens for browsing library content:

| Screen | File | Primary List Component |
|--------|------|------------------------|
| SeriesListScreen | `src/features/library/screens/SeriesListScreen.tsx` | `FlatList` (2-column grid) |
| AuthorsListScreen | `src/features/library/screens/AuthorsListScreen.tsx` | `SectionList` (A-Z sections) |
| NarratorsListScreen | `src/features/library/screens/NarratorsListScreen.tsx` | `SectionList` (A-Z sections) |
| GenresListScreen | `src/features/library/screens/GenresListScreen.tsx` | `ScrollView` / `SectionList` (dual view) |

All screens use the **library cache** (`useLibraryCache`) as their data source, providing instant loading from in-memory data.

---

## Data Sources

### Library Cache

All list screens pull data from the centralized library cache:

```typescript
// src/core/cache/libraryCache.ts
export function getAllSeries(): SeriesInfo[] {
  const { series } = useLibraryCache.getState();
  return Array.from(series.values()).sort((a, b) => b.bookCount - a.bookCount);
}

export function getAllAuthors(): AuthorInfo[] {
  const { authors } = useLibraryCache.getState();
  return Array.from(authors.values()).sort((a, b) => b.bookCount - a.bookCount);
}

export function getAllNarrators(): NarratorInfo[] {
  const { narrators } = useLibraryCache.getState();
  return Array.from(narrators.values()).sort((a, b) => b.bookCount - a.bookCount);
}

export function getAllGenres(): string[] {
  return useLibraryCache.getState().genres;
}
```

### Data Types

```typescript
interface SeriesInfo {
  name: string;
  bookCount: number;
  books: LibraryItem[];  // Full book objects
}

interface AuthorInfo {
  id?: string;
  name: string;
  bookCount: number;
  imagePath?: string;
  description?: string;
  books?: LibraryItem[];
}

interface NarratorInfo {
  name: string;
  bookCount: number;
  books?: LibraryItem[];
}
```

---

## Pagination Strategy

**Note: These screens do NOT use server-side pagination.** All data is loaded into the library cache at startup, and the screens render from this in-memory cache.

### Virtual List Optimization

FlatList/SectionList handle large lists through **windowed rendering**:

```typescript
// SeriesListScreen.tsx - FlatList configuration
<FlatList
  data={sortedSeries}
  initialNumToRender={8}      // Render 8 items initially
  maxToRenderPerBatch={6}     // Render 6 items per batch while scrolling
  windowSize={5}              // Render 5 screens worth of content
  ...
/>
```

### Performance Parameters

| Screen | Component | initialNumToRender | maxToRenderPerBatch | windowSize |
|--------|-----------|-------------------|---------------------|------------|
| SeriesList | FlatList | 8 | 6 | 5 |
| AuthorsList | SectionList | default | default | default |
| NarratorsList | SectionList | default | default | default |
| GenresList | SectionList | default | default | default |

### getItemLayout Optimization

For consistent row heights, `getItemLayout` enables instant scrolling:

```typescript
// AuthorsListScreen.tsx & NarratorsListScreen.tsx
getItemLayout={(data, index) => ({
  length: 72,       // Fixed row height
  offset: 72 * index,
  index,
})}

// GenresListScreen.tsx (flat view)
getItemLayout={(data, index) => ({
  length: 56,       // Fixed row height
  offset: 56 * index,
  index,
})}
```

---

## Search & Filter

### Search Implementation

All screens implement local client-side search:

```typescript
// Common pattern across all screens
const [searchQuery, setSearchQuery] = useState('');

const filteredItems = useMemo(() => {
  if (!searchQuery.trim()) return allItems;
  const lowerQuery = searchQuery.toLowerCase();
  return allItems.filter(item => item.name.toLowerCase().includes(lowerQuery));
}, [allItems, searchQuery]);
```

### Search UI Components

```typescript
<View style={styles.searchContainer}>
  <Icon name="Search" size={18} color={themeColors.textTertiary} />
  <TextInput
    placeholder="Search {type}..."
    placeholderTextColor={themeColors.textTertiary}
    value={searchQuery}
    onChangeText={setSearchQuery}
    returnKeyType="search"
    autoCapitalize="none"
    autoCorrect={false}
  />
  {searchQuery.length > 0 && (
    <TouchableOpacity onPress={() => setSearchQuery('')}>
      <Icon name="XCircle" size={18} />
    </TouchableOpacity>
  )}
</View>
```

---

## Sort Options

### SeriesListScreen

| Sort Type | Direction | Logic |
|-----------|-----------|-------|
| `name` | asc/desc | `a.name.localeCompare(b.name)` |
| `bookCount` | asc/desc | `a.bookCount - b.bookCount` |

**Special behavior:** Favorites always sorted to top regardless of sort type.

```typescript
// Sort, then move favorites to top
sorted.sort((a, b) => {
  const aFav = cachedFavorites.includes(a.name);
  const bFav = cachedFavorites.includes(b.name);
  if (aFav && !bFav) return -1;
  if (!aFav && bFav) return 1;
  return 0;
});
```

### AuthorsListScreen & NarratorsListScreen

| Sort Type | Logic |
|-----------|-------|
| `name` | A-Z alphabetical (with section headers) |
| `bookCount` | Most books first |
| `recent` | Most recently added first |

When sorted by `name`, sections are created for A-Z navigation:

```typescript
const sections = useMemo(() => {
  if (sortBy !== 'name') {
    return [{ title: '', data: sortedItems }];  // Single section
  }

  const sectionMap = new Map<string, Item[]>();
  sortedItems.forEach(item => {
    const letter = item.name[0].toUpperCase();
    const section = sectionMap.get(letter) || [];
    section.push(item);
    sectionMap.set(letter, section);
  });

  return [...sectionMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([title, data]) => ({ title, data }));
}, [sortedItems, sortBy]);
```

### GenresListScreen

| View Mode | Sort Behavior |
|-----------|---------------|
| `grouped` | By meta-category (Fiction, Non-Fiction, etc.) |
| `flat` | A-Z alphabetical with section headers |

---

## A-Z Alphabet Scrubber

### AlphabetScrubber Component

**File:** `src/shared/components/AlphabetScrubber.tsx`

Used by AuthorsList, NarratorsList, and GenresList (flat view).

#### Features
- **Tap-to-jump**: Tap any letter to scroll to that section
- **Drag scrubbing**: Drag finger along bar for rapid navigation
- **Haptic feedback**: Light impact feedback on letter changes
- **Dynamic letters**: Only shows letters that have content

#### Implementation

```typescript
interface AlphabetScrubberProps {
  letters: string[];              // Available letters
  activeLetter?: string;          // Currently highlighted
  onLetterSelect: (letter: string) => void;
  visible?: boolean;
  style?: object;
}
```

#### Scroll Integration

```typescript
const handleLetterPress = useCallback((letter: string) => {
  const sectionIndex = sections.findIndex(s => s.title === letter);
  if (sectionIndex >= 0 && sectionListRef.current) {
    sectionListRef.current.scrollToLocation({
      sectionIndex,
      itemIndex: 0,
      animated: true,
      viewPosition: 0,
    });
  }
}, [sections]);
```

#### Visibility Rules

```typescript
// Only show when:
// - More than 1 letter available
// - Not searching (search hides scrubber)
// - Sorting by name (non-alphabetical sorts hide scrubber)
<AlphabetScrubber
  letters={availableLetters}
  onLetterSelect={handleLetterPress}
  visible={availableLetters.length > 1 && !isSearching}
/>
```

---

## Personalized Sections

### "Your Authors" / "Your Narrators" / "Your Genres"

All three screens show a personalized horizontal scroll section based on listening history.

```typescript
// Common pattern - uses useContinueListening() as source
const { items: inProgressItems } = useContinueListening();

const yourItems = useMemo(() => {
  const listenedBookIds = new Set(inProgressItems.map(item => item.id));
  if (listenedBookIds.size === 0) return [];

  // Count occurrences in listened books
  const counts = new Map<string, number>();
  allItems.forEach(item => {
    const books = filterItems({ [filterKey]: [item.name] }) || [];
    const listenedCount = books.filter(b => listenedBookIds.has(b.id)).length;
    if (listenedCount > 0) {
      counts.set(item.name, listenedCount);
    }
  });

  // Return top items by listened count
  return allItems
    .filter(item => counts.has(item.name))
    .sort((a, b) => (counts.get(b.name) || 0) - (counts.get(a.name) || 0))
    .slice(0, 8);  // Max 8 items
}, [allItems, inProgressItems, filterItems]);
```

### Visibility

- Hidden during search
- Only shown if user has listening history

---

## Screen-Specific Features

### SeriesListScreen

#### Fanned Cover Display
Each series card shows up to 5 book covers in a "fanned" arrangement:
```typescript
const MAX_VISIBLE_BOOKS = 5;
const FAN_OFFSET = 18;     // Horizontal offset between covers
const FAN_ROTATION = 8;    // Rotation angle in degrees
```

#### Progress Tracking
Shows completion dots and remaining time:
```typescript
function getSeriesProgress(books) {
  let completed = 0, inProgress = 0;
  books.forEach(book => {
    const progress = book.userMediaProgress?.progress || 0;
    if (progress >= 0.95) completed++;
    else if (progress > 0) inProgress++;
  });
  return { completed, inProgress, notStarted: books.length - completed - inProgress };
}
```

#### Single-Book Series Filtering
```typescript
const hideSingleBookSeries = useMyLibraryStore((state) => state.hideSingleBookSeries);

if (hideSingleBookSeries) {
  result = result.filter(s => s.bookCount > 1);
}
```

#### Favorite Heart Button
Each card has a favorite toggle via `SeriesHeartButton` component.

### AuthorsListScreen

#### Author Images
Displays author photos if available, otherwise color-coded initials:
```typescript
{author.id && author.imagePath ? (
  <Image source={apiClient.getAuthorImageUrl(author.id)} />
) : (
  <Text style={styles.avatarText}>{getInitials(author.name)}</Text>
)}
```

#### Top Genres Display
Shows up to 2 most common genres per author:
```typescript
const topGenres = [...genreCounts.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 2)
  .map(([genre]) => genre);
```

### NarratorsListScreen

- Same structure as AuthorsListScreen
- Always uses initials (narrators don't have images)

### GenresListScreen

#### Dual View Mode
```typescript
type ViewMode = 'grouped' | 'flat';

// Toggle between views
{viewMode === 'grouped' || isSearching ? renderGroupedView() : renderFlatView()}
```

#### Meta-Categories (Grouped View)
Genres are organized into collapsible meta-categories:
- Fiction, Non-Fiction, Mystery & Thriller, Science Fiction & Fantasy, etc.

```typescript
const META_CATEGORIES: MetaCategory[] = [
  { id: 'fiction', label: 'Fiction', icon: 'BookOpen' },
  { id: 'nonfiction', label: 'Non-Fiction', icon: 'GraduationCap' },
  // ... more categories
];
```

#### Popular Genres Section
Shows top 6 genres by book count.

#### Sparse Genre Filtering
```typescript
const MIN_BOOKS_TO_SHOW = 1;  // From genreCategories.ts
// Genres with fewer books are hidden
.filter(g => g.bookCount >= MIN_BOOKS_TO_SHOW);
```

---

## Performance Considerations

### 1. In-Memory Cache

All data comes from `useLibraryCache`, which holds the entire library in memory. This provides:
- **Instant rendering**: No network latency
- **Offline support**: Works without server connection
- **Consistent state**: Single source of truth

### 2. Memoization

Heavy computations are memoized:
```typescript
// Data derivation
const sortedItems = useMemo(() => { ... }, [filteredItems, sortBy]);
const sections = useMemo(() => { ... }, [sortedItems, sortBy]);
const availableLetters = useMemo(() => { ... }, [sections]);
```

### 3. Callback Stability

Event handlers use `useCallback` to prevent unnecessary re-renders:
```typescript
const handleLetterPress = useCallback((letter: string) => { ... }, [sections]);
const handleRefresh = useCallback(async () => { ... }, [refreshCache]);
```

### 4. Image Caching

Cover images use expo-image with disk caching:
```typescript
<Image
  source={coverUrl}
  cachePolicy="memory-disk"
  transition={150}  // Smooth fade-in
/>
```

### 5. FlatList Virtualization

For large series lists:
```typescript
<FlatList
  initialNumToRender={8}      // Start with visible items
  maxToRenderPerBatch={6}     // Batch updates
  windowSize={5}              // Keep 5 screens in memory
/>
```

### 6. getItemLayout for Instant Scroll

Fixed-height rows enable instant scroll positioning:
```typescript
getItemLayout={(data, index) => ({
  length: 72,
  offset: 72 * index,
  index,
})}
```

### 7. Sticky Section Headers

Only enabled for alphabetical sorting:
```typescript
<SectionList
  stickySectionHeadersEnabled={sortBy === 'name'}
/>
```

---

## Refresh Behavior

### Pull-to-Refresh

All screens support pull-to-refresh:
```typescript
const [isRefreshing, setIsRefreshing] = useState(false);

const handleRefresh = useCallback(async () => {
  setIsRefreshing(true);
  try {
    await refreshCache();  // Re-fetch from server
  } finally {
    setIsRefreshing(false);
  }
}, [refreshCache]);

<RefreshControl
  refreshing={isRefreshing}
  onRefresh={handleRefresh}
  tintColor={ACCENT}
/>
```

---

## Loading States

### Initial Load

Shown while library cache is loading:
```typescript
if (!isLoaded) {
  return (
    <View style={styles.loadingContainer}>
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
}
```

### Empty States

```typescript
{filteredItems.length === 0 && (
  <View style={styles.emptyState}>
    <Icon name="Search" size={48} color={themeColors.textTertiary} />
    <Text style={styles.emptyText}>No {type} found</Text>
    <Text style={styles.emptySubtext}>Try a different search term</Text>
  </View>
)}
```

---

## Theme Support

All screens support light and dark modes via `useThemeColors()`:

```typescript
const themeColors = useThemeColors();
const isDarkMode = useIsDarkMode();

// Applied to all UI elements
<View style={{ backgroundColor: themeColors.background }}>
<Text style={{ color: themeColors.text }}>
<Text style={{ color: themeColors.textSecondary }}>
```

---

## Navigation

### Entry Points
- From Browse screen category pills
- From navigation drawer
- From Search results "View All" links

### Exit Points
```typescript
const handleBack = () => {
  if (navigation.canGoBack()) {
    navigation.goBack();
  } else {
    navigation.navigate('Main');
  }
};
```

### Detail Screen Navigation
```typescript
// Series
navigation.navigate('SeriesDetail', { seriesName });

// Author
navigation.navigate('AuthorDetail', { authorName });

// Narrator
navigation.navigate('NarratorDetail', { narratorName });

// Genre
navigation.navigate('GenreDetail', { genreName });
```

---

## Related Files

| File | Purpose |
|------|---------|
| `src/core/cache/libraryCache.ts` | Central data cache |
| `src/shared/components/AlphabetScrubber.tsx` | A-Z navigation component |
| `src/features/library/constants/genreCategories.ts` | Meta-category definitions |
| `src/features/library/components/GenreSections.tsx` | Genre section components |
| `src/features/library/components/GenreCards.tsx` | Genre card components |
| `src/shared/components/SeriesHeartButton.tsx` | Favorite toggle button |
