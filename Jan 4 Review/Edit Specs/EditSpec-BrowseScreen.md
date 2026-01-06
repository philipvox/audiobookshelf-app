# Edit Specification: Browse/Discover Screen

**Covers Action Plan Items:** 2.5, 3.4, 3.7
**Priority:** High (Phase 2) / Medium (Phase 3)
**Effort:** M (Medium) - 1-2 days

---

## Current State

### BrowseScreen.tsx
- **File:** `src/features/browse/screens/BrowseScreen.tsx`
- **Lines:** ~600
- **Status:** Well-organized

### useDiscoverData.ts
- **File:** `src/features/discover/hooks/useDiscoverData.ts`
- **Lines:** 803
- **Large useMemo blocks:** 5+
- **FIX comments:** 5 indicating workarounds
- **Domains mixed:** Featured, genres, moods, popular, new this week

---

## Issues Identified

| Issue | Source | Severity |
|-------|--------|----------|
| useDiscoverData.ts is 803 lines | [28] | Medium |
| 5 FIX comments indicate workarounds | [28] | Medium |
| Many large useMemo blocks | [28] | Low |
| Genre filter could be more prominent | [27] | Low |

---

## Alignment Requirements

From [27] Implementation Completeness:
- 92% complete
- Gap: Genre filter could be more prominent
- Gap: Mood session overlay implemented differently

From [31] Alignment Audit:
- Kid Mode filtering duplicated here at line 144

---

## Specific Changes

### 2.5: Split useDiscoverData.ts

**Current:** Single 803-line hook
**Target:** Multiple focused hooks

**New file structure:**
```
src/features/discover/hooks/
├── useDiscoverData.ts       (~200 lines - composition)
├── useFeaturedData.ts       (~150 lines)
├── useGenreData.ts          (~150 lines)
├── useMoodData.ts           (~150 lines)
├── usePopularData.ts        (~100 lines)
└── useNewThisWeek.ts        (~100 lines)
```

**useFeaturedData.ts:**
```typescript
import { useMemo } from 'react';
import { useLibraryCache } from '@/core/cache';
import { useFilteredLibrary } from '@/shared/hooks/useFilteredLibrary';

export function useFeaturedData() {
  const { items } = useLibraryCache();
  const { filteredItems } = useFilteredLibrary({ items });

  const featuredBook = useMemo(() => {
    // Logic to select featured book
    // Could be random, recently added, or recommended
    return filteredItems[Math.floor(Math.random() * Math.min(10, filteredItems.length))];
  }, [filteredItems]);

  const recommendationReason = useMemo(() => {
    // Generate recommendation reason
    return getFeaturedReason(featuredBook);
  }, [featuredBook]);

  return {
    featuredBook,
    recommendationReason,
  };
}
```

**useGenreData.ts:**
```typescript
import { useMemo } from 'react';
import { useLibraryCache } from '@/core/cache';
import { useFilteredLibrary } from '@/shared/hooks/useFilteredLibrary';

export function useGenreData() {
  const { items } = useLibraryCache();
  const { filteredItems } = useFilteredLibrary({ items });

  const genres = useMemo(() => {
    const genreMap = new Map<string, number>();

    filteredItems.forEach(item => {
      const bookGenres = item.media?.metadata?.genres || [];
      bookGenres.forEach(genre => {
        genreMap.set(genre, (genreMap.get(genre) || 0) + 1);
      });
    });

    return Array.from(genreMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredItems]);

  const topGenres = useMemo(() => genres.slice(0, 10), [genres]);

  return {
    genres,
    topGenres,
  };
}
```

**useMoodData.ts:**
```typescript
import { useMemo } from 'react';
import { useMoodSessionStore } from '../stores/moodSessionStore';
import { useFilteredLibrary } from '@/shared/hooks/useFilteredLibrary';

export function useMoodData() {
  const { currentSession, isSessionActive } = useMoodSessionStore();
  const { filteredItems } = useFilteredLibrary({ items: libraryItems });

  const moodMatches = useMemo(() => {
    if (!isSessionActive || !currentSession) return [];

    return filteredItems
      .map(item => ({
        item,
        score: calculateMoodScore(item, currentSession.moods),
      }))
      .filter(({ score }) => score > 0.4)
      .sort((a, b) => b.score - a.score);
  }, [filteredItems, currentSession, isSessionActive]);

  return {
    isSessionActive,
    currentSession,
    moodMatches,
  };
}
```

**usePopularData.ts:**
```typescript
export function usePopularData() {
  const { items } = useLibraryCache();
  const { filteredItems } = useFilteredLibrary({ items });

  const popularSeries = useMemo(() => {
    // Group by series, count total listens
    const seriesStats = calculateSeriesPopularity(filteredItems);
    return seriesStats.slice(0, 10);
  }, [filteredItems]);

  const topAuthors = useMemo(() => {
    // Group by author, count books
    const authorStats = calculateAuthorPopularity(filteredItems);
    return authorStats.slice(0, 10);
  }, [filteredItems]);

  return {
    popularSeries,
    topAuthors,
  };
}
```

**Updated useDiscoverData.ts (composition):**
```typescript
export function useDiscoverData() {
  const { featuredBook, recommendationReason } = useFeaturedData();
  const { topGenres, genres } = useGenreData();
  const { isSessionActive, moodMatches } = useMoodData();
  const { popularSeries, topAuthors } = usePopularData();
  const { newThisWeek } = useNewThisWeek();

  return {
    // Featured
    featuredBook,
    recommendationReason,

    // Genres
    genres,
    topGenres,

    // Mood
    isSessionActive,
    moodMatches,

    // Popular
    popularSeries,
    topAuthors,

    // New
    newThisWeek,
  };
}
```

### 3.4: Break Large useMemo Blocks

Instead of one giant useMemo that computes everything:

```typescript
// BEFORE (in single useMemo)
const { featured, genres, popular, authors, newBooks } = useMemo(() => {
  // 100+ lines of computation
}, [items, filters, ...]);

// AFTER (split across focused hooks)
const featured = useFeaturedData();  // Own memoization
const genres = useGenreData();       // Own memoization
const popular = usePopularData();    // Own memoization
// etc.
```

### 3.7: Make Genre Filter More Prominent

**Current:** Horizontal scroll chips
**Updated:** Larger, more visible filter section

```typescript
// In BrowseScreen.tsx
<View style={styles.genreFilterSection}>
  <Text style={styles.filterLabel}>Filter by Genre</Text>
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.genreChipsContainer}
  >
    <TouchableOpacity
      style={[
        styles.genreChip,
        selectedGenre === null && styles.genreChipActive,
      ]}
      onPress={() => setSelectedGenre(null)}
    >
      <Text style={[styles.genreChipText, selectedGenre === null && styles.genreChipTextActive]}>
        All
      </Text>
    </TouchableOpacity>

    {topGenres.map(genre => (
      <TouchableOpacity
        key={genre.name}
        style={[
          styles.genreChip,
          selectedGenre === genre.name && styles.genreChipActive,
        ]}
        onPress={() => setSelectedGenre(genre.name)}
      >
        <Text style={[styles.genreChipText, selectedGenre === genre.name && styles.genreChipTextActive]}>
          {genre.name}
        </Text>
        <Text style={styles.genreChipCount}>({genre.count})</Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
</View>

const styles = StyleSheet.create({
  genreFilterSection: {
    paddingVertical: spacing.lg,
    backgroundColor: colors.backgroundSecondary,
    marginBottom: spacing.md,
  },
  filterLabel: {
    fontSize: scale(13),
    fontWeight: '600',
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  genreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.backgroundTertiary,
    borderRadius: radius.full,
    marginLeft: spacing.sm,
  },
  genreChipActive: {
    backgroundColor: colors.accent,
  },
  genreChipText: {
    fontSize: scale(14),
    color: colors.textPrimary,
  },
  genreChipTextActive: {
    color: '#000',
    fontWeight: '600',
  },
  genreChipCount: {
    fontSize: scale(12),
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
});
```

---

## Cross-Screen Dependencies

| Change | Affects |
|--------|---------|
| useDiscoverData split | Only BrowseScreen consumes |
| useFilteredLibrary | Depends on 2.15 completion |
| Genre filter | May affect navigation to GenreDetailScreen |

---

## Testing Criteria

- [ ] BrowseScreen loads with all sections
- [ ] Featured book displays with recommendation reason
- [ ] Genre chips filter content correctly
- [ ] Mood discovery entry card shows/hides correctly
- [ ] New this week shows recent additions
- [ ] Popular series shows series cards
- [ ] Top authors shows author rows
- [ ] Performance not degraded by hook split

---

## Effort Breakdown

| Task | Effort | Risk |
|------|--------|------|
| Create useFeaturedData | 1 hour | Low |
| Create useGenreData | 1 hour | Low |
| Create useMoodData | 1 hour | Low |
| Create usePopularData | 1 hour | Low |
| Create useNewThisWeek | 30 min | Low |
| Update useDiscoverData as composition | 1 hour | Low |
| Update BrowseScreen imports | 30 min | Low |
| Make genre filter more prominent | 1 hour | Low |
| Testing | 1.5 hours | - |

**Total: 1-2 days**
