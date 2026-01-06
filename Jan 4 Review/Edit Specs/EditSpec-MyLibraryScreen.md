# Edit Specification: MyLibrary Screen

**Covers Action Plan Items:** 2.1, 2.9, 4.9, 4.10
**Priority:** High (Phase 2)
**Effort:** M (Medium) - 1-2 days

---

## Current State

### MyLibraryScreen.tsx
- **File:** `src/features/library/screens/MyLibraryScreen.tsx`
- **Lines:** 2,020 (fourth largest file)
- **`as any` casts:** 16 occurrences
- **Inline styles:** Mixed with StyleSheet
- **5 tabs inline:**
  - All
  - Downloaded
  - In Progress
  - Completed
  - Favorites

### Data Sources
- Downloads via `useDownloads()` hook
- In-progress via `useContinueListening()` hook (cross-feature import from home)
- Library cache via `useLibraryCache()`
- Favorites from `useMyLibraryStore()` and `usePreferencesStore()`
- Finished books via `useFinishedBookIds()`
- Kid mode filtering via `useKidModeStore()` (cross-feature import from profile)

---

## Issues Identified

| Issue | Source | Severity |
|-------|--------|----------|
| 2,020 lines - 5 tabs inline | [28], [29], [30] #6 | High |
| 16 `as any` casts for metadata | [28] | High |
| Inline styles mixed with StyleSheet | [28] | Medium |
| Cross-feature imports (home, profile) | [29], [31] §3.2 | Medium |
| No hero continue card (spec gap) | [27] | Medium |
| No "Browse Full Library" CTA | [27] | Low |
| Kid Mode filter duplicated here | [31] §1.1 | Medium |

---

## Alignment Requirements

From [31] Alignment Audit:
- Progress display: Cards should show percentage format
- Kid Mode filtering: Should use consolidated `useFilteredLibrary()` hook after 2.15 is done
- Favorites: Books/Series in myLibraryStore, Authors/Narrators in preferencesStore (documented split)

From [27] Implementation Completeness:
- Missing: Hero "currently reading" card at top
- Missing: "Browse Full Library" CTA button

---

## Target State

### File Structure
```
src/features/library/
├── screens/
│   └── MyLibraryScreen.tsx    (~400 lines - composition + state)
├── components/
│   ├── tabs/
│   │   ├── AllBooksTab.tsx        (~300 lines)
│   │   ├── DownloadedTab.tsx      (~250 lines)
│   │   ├── InProgressTab.tsx      (~200 lines)
│   │   ├── CompletedTab.tsx       (~200 lines)
│   │   └── FavoritesTab.tsx       (~350 lines)
│   ├── ContinueListeningHero.tsx  (exists)
│   ├── LibraryEmptyState.tsx      (exists)
│   ├── SortPicker.tsx             (exists)
│   └── StorageSummary.tsx         (exists)
└── hooks/
    └── useLibraryTabs.ts          (~150 lines - shared tab logic)
```

---

## Specific Changes

### 2.1: Extract Tab Components

#### Step 1: Create useLibraryTabs hook

**New file:** `src/features/library/hooks/useLibraryTabs.ts`

```typescript
interface UseLibraryTabsReturn {
  enrichedBooks: EnrichedBook[];
  serverInProgressBooks: LibraryItem[];
  favoritedBooks: LibraryItem[];
  finishedBookIds: Set<string>;
  isLoading: boolean;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
}

export function useLibraryTabs(): UseLibraryTabsReturn {
  const { downloads } = useDownloads();
  const { items: libraryItems } = useLibraryCache();
  const { inProgressBooks } = useContinueListening();
  const { libraryIds, favoriteSeriesNames } = useMyLibraryStore();
  const { finishedBookIds } = useFinishedBookIds();

  // Enrichment logic moved here from screen
  const enrichedBooks = useMemo(() => { ... }, [downloads, libraryItems]);

  return {
    enrichedBooks,
    serverInProgressBooks: inProgressBooks,
    favoritedBooks,
    finishedBookIds: new Set(finishedBookIds),
    isLoading,
    isRefreshing,
    refresh,
  };
}
```

#### Step 2: Extract AllBooksTab

**New file:** `src/features/library/components/tabs/AllBooksTab.tsx`

```typescript
interface AllBooksTabProps {
  books: EnrichedBook[];
  sortOption: SortOption;
  onSortChange: (option: SortOption) => void;
  onBookPress: (book: LibraryItem) => void;
  searchQuery: string;
}

export const AllBooksTab: React.FC<AllBooksTabProps> = React.memo(({
  books,
  sortOption,
  onSortChange,
  onBookPress,
  searchQuery,
}) => {
  const filteredBooks = useMemo(() => {
    let result = books;
    if (searchQuery) {
      result = result.filter(b =>
        b.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return sortBooks(result, sortOption);
  }, [books, searchQuery, sortOption]);

  if (filteredBooks.length === 0) {
    return <LibraryEmptyState tab="all" />;
  }

  return (
    <FlatList
      data={filteredBooks}
      renderItem={({ item }) => <BookCard book={item} onPress={onBookPress} />}
      keyExtractor={item => item.id}
      numColumns={3}
      contentContainerStyle={styles.grid}
    />
  );
});
```

#### Step 3: Extract DownloadedTab

**New file:** `src/features/library/components/tabs/DownloadedTab.tsx`

```typescript
interface DownloadedTabProps {
  downloads: EnrichedBook[];
  activeDownloads: DownloadItem[];
  sortOption: SortOption;
  onSortChange: (option: SortOption) => void;
  onBookPress: (book: LibraryItem) => void;
  searchQuery: string;
}

export const DownloadedTab: React.FC<DownloadedTabProps> = React.memo(({
  downloads,
  activeDownloads,
  sortOption,
  onSortChange,
  onBookPress,
  searchQuery,
}) => {
  // Storage summary at top
  // Active downloads section
  // Downloaded books grid

  return (
    <ScrollView>
      <StorageSummary />
      {activeDownloads.length > 0 && (
        <View style={styles.activeSection}>
          <SectionHeader title="Downloading" count={activeDownloads.length} />
          {activeDownloads.map(d => <DownloadItem key={d.id} item={d} />)}
        </View>
      )}
      <FlatList
        data={filteredDownloads}
        renderItem={renderBook}
        numColumns={3}
        scrollEnabled={false}
      />
    </ScrollView>
  );
});
```

#### Step 4: Extract InProgressTab

**New file:** `src/features/library/components/tabs/InProgressTab.tsx`

```typescript
interface InProgressTabProps {
  books: LibraryItem[];
  onBookPress: (book: LibraryItem) => void;
}

export const InProgressTab: React.FC<InProgressTabProps> = React.memo(({
  books,
  onBookPress,
}) => {
  if (books.length === 0) {
    return <LibraryEmptyState tab="in-progress" />;
  }

  return (
    <FlatList
      data={books}
      renderItem={({ item }) => (
        <BookCard
          book={item}
          onPress={onBookPress}
          showProgress
        />
      )}
      keyExtractor={item => item.id}
      numColumns={3}
    />
  );
});
```

#### Step 5: Extract CompletedTab

**New file:** `src/features/library/components/tabs/CompletedTab.tsx`

```typescript
interface CompletedTabProps {
  books: EnrichedBook[];
  finishedBookIds: Set<string>;
  onBookPress: (book: LibraryItem) => void;
}

export const CompletedTab: React.FC<CompletedTabProps> = React.memo(({
  books,
  finishedBookIds,
  onBookPress,
}) => {
  const completedBooks = useMemo(() =>
    books.filter(b => b.progress >= 0.95 || finishedBookIds.has(b.id)),
    [books, finishedBookIds]
  );

  // ...
});
```

#### Step 6: Extract FavoritesTab

**New file:** `src/features/library/components/tabs/FavoritesTab.tsx`

```typescript
interface FavoritesTabProps {
  favoritedBooks: LibraryItem[];
  favoriteSeriesNames: string[];
  favoriteAuthors: string[];
  favoriteNarrators: string[];
  onBookPress: (book: LibraryItem) => void;
  onSeriesPress: (seriesName: string) => void;
  onAuthorPress: (authorId: string) => void;
}

export const FavoritesTab: React.FC<FavoritesTabProps> = React.memo(({
  // Sections for books, series, authors, narrators
  // Each with own rendering logic
}) => { ... });
```

#### Step 7: Simplify MyLibraryScreen

**Updated:** `src/features/library/screens/MyLibraryScreen.tsx`

```typescript
export const MyLibraryScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('recent');

  const {
    enrichedBooks,
    serverInProgressBooks,
    favoritedBooks,
    finishedBookIds,
    isRefreshing,
    refresh,
  } = useLibraryTabs();

  const renderTab = useCallback(() => {
    switch (activeTab) {
      case 'all':
        return <AllBooksTab books={enrichedBooks} {...sharedProps} />;
      case 'downloaded':
        return <DownloadedTab downloads={enrichedBooks} {...sharedProps} />;
      case 'in-progress':
        return <InProgressTab books={serverInProgressBooks} {...sharedProps} />;
      case 'completed':
        return <CompletedTab books={enrichedBooks} finishedBookIds={finishedBookIds} {...sharedProps} />;
      case 'favorites':
        return <FavoritesTab {...favoritesProps} />;
    }
  }, [activeTab, enrichedBooks, serverInProgressBooks, ...]);

  return (
    <View style={styles.container}>
      <SearchHeader value={searchQuery} onChangeText={setSearchQuery} />
      <TabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      <RefreshControl refreshing={isRefreshing} onRefresh={refresh}>
        {renderTab()}
      </RefreshControl>
    </View>
  );
};
```

### 2.9: Inline Styles Cleanup

Move all inline styles to StyleSheet:

```typescript
// Before (scattered throughout)
<View style={{ marginTop: 12, paddingHorizontal: 16 }}>

// After
<View style={styles.sectionContainer}>

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
});
```

### 4.9: Hero Continue Card

Add hero card at top of screen (above tabs):

```typescript
export const MyLibraryScreen: React.FC = () => {
  const { currentBook } = useContinueListening();

  return (
    <View style={styles.container}>
      {currentBook && (
        <ContinueListeningHero
          book={currentBook}
          onPress={() => navigateToBook(currentBook.id)}
        />
      )}
      <SearchHeader ... />
      <TabBar ... />
      {renderTab()}
    </View>
  );
};
```

### 4.10: Browse Full Library CTA

Add button at bottom of All tab when user has few items:

```typescript
// In AllBooksTab.tsx
{filteredBooks.length < 20 && (
  <TouchableOpacity
    style={styles.browseLibraryCta}
    onPress={() => navigation.navigate('Browse')}
  >
    <Text style={styles.ctaText}>Browse Full Library</Text>
    <ChevronRight size={scale(20)} color={colors.accent} />
  </TouchableOpacity>
)}
```

---

## Cross-Screen Dependencies

| Change | Affects | Action |
|--------|---------|--------|
| useLibraryTabs hook | Only MyLibraryScreen | Internal refactor |
| Hero card | ContinueListeningHero component | Already exists |
| Browse CTA | Navigation to BrowseScreen | Uses existing navigation |

**Note:** After completing 2.3 (cross-feature imports), update:
- `useContinueListening` import from `@/shared/hooks/` instead of `@/features/home/`
- `useKidModeStore` import from `@/shared/stores/` instead of `@/features/profile/`

---

## Testing Criteria

- [ ] All 5 tabs render correctly
- [ ] Tab switching is instant (no re-fetch)
- [ ] Search filters books in real-time
- [ ] Sort picker changes book order
- [ ] Pull-to-refresh works on all tabs
- [ ] Downloaded books show correct status icons
- [ ] In-progress shows server-synced books
- [ ] Completed shows finished + 95%+ progress books
- [ ] Favorites shows books, series, authors, narrators
- [ ] Hero card shows currently playing book
- [ ] Browse CTA navigates to Discover tab
- [ ] Kid Mode filters adult content

---

## Effort Breakdown

| Task | Effort | Risk |
|------|--------|------|
| Create useLibraryTabs hook | 2 hours | Low |
| Extract AllBooksTab | 2 hours | Low |
| Extract DownloadedTab | 2 hours | Low |
| Extract InProgressTab | 1 hour | Low |
| Extract CompletedTab | 1 hour | Low |
| Extract FavoritesTab | 3 hours | Low |
| Simplify MyLibraryScreen | 2 hours | Low |
| Inline styles cleanup | 1 hour | Low |
| Add Hero card | 1 hour | Low |
| Add Browse CTA | 30 min | Low |
| Testing | 2 hours | - |

**Total: 1-2 days**
