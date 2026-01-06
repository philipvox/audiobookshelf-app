# Edit Specification: Genre Screens (v2)

**Version:** 2 (post-validation)
**Changes from v1:** Fixed completedBooks reference to use useIsFinished hook, added dependency declarations

**Covers Action Plan Items:** 4.2, 4.7, 4.18
**Priority:** Medium (Phase 4)
**Effort:** M (Medium) - 1-2 days

---

## Dependencies

| This Spec | Depends On |
|-----------|------------|
| "Your Genres" section | 2.21 useInProgressBooks |
| completedBooks filtering | 2.6 useIsFinished (from PatternConsolidation) |
| getBookMetadata | 2.5 bookMetadata helper |

---

## Current State

### GenresListScreen.tsx
- **File:** `src/features/library/screens/GenresListScreen.tsx`
- **Lines:** ~400
- **Features:** Search, genre cards with stacked covers, book count
- **Missing:** View mode toggle, "Your Genres" section, grouped view

### GenreDetailScreen.tsx
- **File:** `src/features/library/screens/GenreDetailScreen.tsx`
- **Lines:** ~350
- **Features:** Stacked covers header, book count + duration, search, sort, book grid
- **Missing:** Genre description if available

---

## Issues Identified

| Issue | Source | Severity |
|-------|--------|----------|
| No view mode toggle (Grouped/A-Z) | [27] | Low |
| No "Your Genres" personalized section | [27] | Low |
| All genres in flat alphabetical list | [27] | Low |
| Genre description not shown | [27] | Low |
| completedBooks undefined | Validation | Medium |

---

## Specific Changes

### 4.7: Add View Mode Toggle

**File:** `src/features/library/screens/GenresListScreen.tsx`

**Add view mode state:**
```typescript
type ViewMode = 'alphabetical' | 'grouped';

const [viewMode, setViewMode] = useState<ViewMode>('alphabetical');
```

**Add toggle UI:**
```typescript
<View style={styles.viewModeContainer}>
  <TouchableOpacity
    style={[styles.viewModeButton, viewMode === 'alphabetical' && styles.viewModeButtonActive]}
    onPress={() => setViewMode('alphabetical')}
  >
    <Text style={[styles.viewModeText, viewMode === 'alphabetical' && styles.viewModeTextActive]}>
      A-Z
    </Text>
  </TouchableOpacity>
  <TouchableOpacity
    style={[styles.viewModeButton, viewMode === 'grouped' && styles.viewModeButtonActive]}
    onPress={() => setViewMode('grouped')}
  >
    <Text style={[styles.viewModeText, viewMode === 'grouped' && styles.viewModeTextActive]}>
      Grouped
    </Text>
  </TouchableOpacity>
</View>
```

**Implement grouped view:**
```typescript
const GENRE_GROUPS = {
  'Fiction': ['Fantasy', 'Science Fiction', 'Mystery', 'Thriller', 'Romance', 'Horror', 'Literary Fiction', 'Historical Fiction'],
  'Non-Fiction': ['Biography', 'History', 'Science', 'Self-Help', 'Business', 'True Crime', 'Philosophy', 'Psychology'],
  'Other': [],  // Catch-all for unmatched genres
};

const groupedGenres = useMemo(() => {
  if (viewMode !== 'grouped') return null;

  const groups: Record<string, Genre[]> = {
    'Fiction': [],
    'Non-Fiction': [],
    'Other': [],
  };

  genres.forEach(genre => {
    let assigned = false;
    for (const [groupName, genreList] of Object.entries(GENRE_GROUPS)) {
      if (genreList.some(g => genre.name.toLowerCase().includes(g.toLowerCase()))) {
        groups[groupName].push(genre);
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      groups['Other'].push(genre);
    }
  });

  return groups;
}, [genres, viewMode]);

// Render based on view mode
{viewMode === 'alphabetical' ? (
  <FlatList
    data={filteredGenres}
    renderItem={renderGenreCard}
    keyExtractor={item => item.name}
    numColumns={2}
  />
) : (
  <SectionList
    sections={Object.entries(groupedGenres).map(([title, data]) => ({ title, data }))}
    renderSectionHeader={({ section }) => (
      <Pressable onPress={() => toggleSection(section.title)}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionCount}>{section.data.length} genres</Text>
          <ChevronDown
            size={scale(20)}
            style={{ transform: [{ rotate: collapsedSections.has(section.title) ? '0deg' : '180deg' }] }}
          />
        </View>
      </Pressable>
    )}
    renderItem={({ item }) => renderGenreCard({ item })}
    keyExtractor={item => item.name}
  />
)}
```

### 4.2: Add "Your Genres" Personalized Section

**File:** `src/features/library/screens/GenresListScreen.tsx`

**Using proper hooks from dependencies:**
```typescript
import { useInProgressBooks } from '@/shared/hooks/useInProgressBooks';
import { useIsFinished } from '@/shared/hooks/useIsFinished';
import { getBookMetadata } from '@/shared/utils/bookMetadata';
import { useLibraryCache } from '@/core/cache';

const { inProgressBooks } = useInProgressBooks();
const { items: allBooks } = useLibraryCache();

// Get completed books using useIsFinished hook (from 2.6)
const completedBooks = useMemo(() => {
  return allBooks.filter(book => {
    const progress = book.userMediaProgress;
    return progress?.isFinished || (progress?.progress ?? 0) >= 0.95;
  });
}, [allBooks]);

// Get genres from user's listening history
const yourGenres = useMemo(() => {
  const genreCounts = new Map<string, number>();

  // Count genres from in-progress and completed books
  [...inProgressBooks, ...completedBooks].forEach(book => {
    const { genres } = getBookMetadata(book);
    genres.forEach(genre => {
      genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
    });
  });

  // Get top genres user has engaged with
  return allGenres
    .filter(g => genreCounts.has(g.name))
    .sort((a, b) => (genreCounts.get(b.name) || 0) - (genreCounts.get(a.name) || 0))
    .slice(0, 6);
}, [inProgressBooks, completedBooks, allGenres]);

// In render, before main list
{yourGenres.length > 0 && (
  <View style={styles.yourGenresSection}>
    <SectionHeader title="Your Genres" subtitle="Based on your listening" />
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {yourGenres.map(genre => (
        <GenreCard
          key={genre.name}
          genre={genre}
          variant="compact"
          onPress={() => navigateToGenre(genre.name)}
        />
      ))}
    </ScrollView>
  </View>
)}
```

**Alternative using useFilteredLibrary (after 2.15):**
```typescript
import { useFilteredLibrary } from '@/shared/hooks/useFilteredLibrary';

const { filteredItems } = useFilteredLibrary({
  items: allBooks,
  options: {
    status: ['finished'],
  },
});

const completedBooks = filteredItems;
```

### 4.18: Add Genre Description Display

**File:** `src/features/library/screens/GenreDetailScreen.tsx`

```typescript
// Genre descriptions (can be expanded or fetched from API)
const GENRE_DESCRIPTIONS: Record<string, string> = {
  'Fantasy': 'Imaginative fiction featuring supernatural elements, magic, and mythical creatures.',
  'Science Fiction': 'Speculative fiction exploring futuristic concepts, advanced technology, and space exploration.',
  'Mystery': 'Stories centered around solving crimes or puzzles, often featuring detectives or investigators.',
  'Thriller': 'Suspenseful narratives designed to keep readers on the edge of their seats.',
  'Romance': 'Stories focused on romantic relationships and emotional connections.',
  'Horror': 'Fiction designed to frighten, scare, or disgust through suspense and shocking imagery.',
  'Biography': 'True stories about the lives of notable individuals.',
  'History': 'Non-fiction exploring past events, periods, and figures.',
  'Science': 'Non-fiction explaining scientific concepts, discoveries, and research.',
  'Self-Help': 'Guides for personal improvement and development.',
  // ... add more as needed
};

const description = GENRE_DESCRIPTIONS[genreName] || null;

// In render, below header
{description && (
  <View style={styles.descriptionContainer}>
    <Text style={styles.description}>{description}</Text>
  </View>
)}

const styles = StyleSheet.create({
  descriptionContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    marginBottom: spacing.md,
  },
  description: {
    fontSize: scale(14),
    color: colors.textSecondary,
    lineHeight: scale(20),
  },
});
```

---

## Cross-Screen Dependencies

| Change | Affects |
|--------|---------|
| View mode toggle | GenresListScreen internal |
| Your Genres | Depends on useInProgressBooks (2.21) |
| Completed books | Depends on useIsFinished or useFilteredLibrary (2.6/2.15) |
| getBookMetadata | Depends on 2.5 completion |
| Genre descriptions | GenreDetailScreen internal |

---

## Testing Criteria

- [ ] A-Z view shows flat alphabetical list
- [ ] Grouped view shows Fiction/Non-Fiction/Other sections
- [ ] Sections are collapsible in grouped view
- [ ] "Your Genres" shows personalized recommendations
- [ ] Completed books filtering works correctly
- [ ] Genre description displays when available
- [ ] Search filters work in both view modes
- [ ] Genre cards navigate to detail screen

---

## Effort Breakdown

| Task | Effort | Risk |
|------|--------|------|
| Add view mode toggle UI | 1 hour | Low |
| Implement grouped view logic | 2 hours | Low |
| Add collapsible sections | 1 hour | Low |
| Add "Your Genres" section with proper hooks | 1.5 hours | Low |
| Add genre descriptions | 1 hour | Low |
| Testing | 1.5 hours | - |

**Total: 1-2 days**
