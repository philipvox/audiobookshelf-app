# Edit Specification: Series Screens

**Covers Action Plan Items:** 1.7, 4.8, 4.20
**Priority:** Critical (1.7) / Medium (4.8, 4.20)
**Effort:** S (Small) - 2-4 hours

---

## Current State

### SeriesDetailScreen.tsx
- **File:** `src/features/series/screens/SeriesDetailScreen.tsx`
- **Lines:** ~800
- **`as any` casts:** 9 occurrences
- **Bug:** StackedCovers at line 616 passes only `bookIds` without `coverUrls`

### SeriesListScreen.tsx
- **File:** `src/features/library/screens/SeriesListScreen.tsx`
- **Lines:** ~400
- **Status:** Well-organized
- **Gap:** No filter by status (in-progress, completed, not started)

---

## Issues Identified

| Issue | Source | Severity |
|-------|--------|----------|
| StackedCovers bug - missing coverUrls prop | [30] Quick Win #5 | Medium |
| 9 `as any` casts for metadata | [28] | Medium |
| No series status filter | [27] | Low |
| Bell icon (track notifications) not prominent | [27] | Low |

---

## Alignment Requirements

From [30] Executive Summary:
- Quick Win #5: "Fix StackedCovers bug - 30 minutes"
- Component requires both `bookIds` and `coverUrls`

From [27] Implementation Completeness:
- 92% complete for SeriesDetailScreen
- 82% complete for SeriesListScreen

---

## Specific Changes

### 1.7: Fix StackedCovers Bug (CRITICAL)

**File:** `src/features/series/screens/SeriesDetailScreen.tsx`
**Line:** ~616

**Current (broken):**
```typescript
<StackedCovers
  bookIds={seriesBooks.map(b => b.id)}
  // Missing: coverUrls prop!
/>
```

**Fixed:**
```typescript
import { useCoverUrl } from '@/core/cache';

// Get cover URLs for all books in series
const coverUrls = useMemo(() =>
  seriesBooks.map(book => {
    const coverPath = book.media?.coverPath;
    return coverPath ? getCoverUrl(book.id, coverPath) : null;
  }).filter(Boolean) as string[],
  [seriesBooks]
);

<StackedCovers
  bookIds={seriesBooks.map(b => b.id)}
  coverUrls={coverUrls}
/>
```

**Or use the hook per book:**
```typescript
// If StackedCovers internally handles cover URLs
// Verify the component API and pass correct props
```

### 4.8: Add Series Filter by Status

**File:** `src/features/library/screens/SeriesListScreen.tsx`

**Add filter state:**
```typescript
type SeriesFilter = 'all' | 'in-progress' | 'completed' | 'not-started';

const [filter, setFilter] = useState<SeriesFilter>('all');
```

**Add filter chips:**
```typescript
const FILTER_OPTIONS: { value: SeriesFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'not-started', label: 'Not Started' },
];

<ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  style={styles.filterContainer}
>
  {FILTER_OPTIONS.map(option => (
    <TouchableOpacity
      key={option.value}
      style={[
        styles.filterChip,
        filter === option.value && styles.filterChipActive,
      ]}
      onPress={() => setFilter(option.value)}
    >
      <Text
        style={[
          styles.filterText,
          filter === option.value && styles.filterTextActive,
        ]}
      >
        {option.label}
      </Text>
    </TouchableOpacity>
  ))}
</ScrollView>
```

**Filter logic:**
```typescript
import { useSeriesProgress } from '@/shared/hooks/useSeriesProgress';

const filteredSeries = useMemo(() => {
  if (filter === 'all') return allSeries;

  return allSeries.filter(series => {
    const books = getSeriesBooks(series.name);
    const { completedBooks, inProgressBooks, totalBooks } = calculateSeriesProgress(books);

    switch (filter) {
      case 'completed':
        return completedBooks === totalBooks;
      case 'in-progress':
        return inProgressBooks > 0 || (completedBooks > 0 && completedBooks < totalBooks);
      case 'not-started':
        return completedBooks === 0 && inProgressBooks === 0;
      default:
        return true;
    }
  });
}, [allSeries, filter]);
```

### 4.20: Make Bell Icon More Prominent

**File:** `src/features/series/screens/SeriesDetailScreen.tsx`

**Current (subtle):**
```typescript
<TouchableOpacity onPress={toggleTrackSeries}>
  <Bell size={scale(20)} color={isTracked ? colors.accent : colors.textSecondary} />
</TouchableOpacity>
```

**More prominent:**
```typescript
<TouchableOpacity
  style={[
    styles.trackButton,
    isTracked && styles.trackButtonActive,
  ]}
  onPress={toggleTrackSeries}
>
  <Bell
    size={scale(20)}
    color={isTracked ? '#000' : colors.textPrimary}
    fill={isTracked ? colors.accent : 'none'}
  />
  <Text style={[styles.trackText, isTracked && styles.trackTextActive]}>
    {isTracked ? 'Tracking' : 'Track'}
  </Text>
</TouchableOpacity>

const styles = StyleSheet.create({
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  trackButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  trackText: {
    marginLeft: spacing.xs,
    fontSize: scale(14),
    color: colors.textPrimary,
  },
  trackTextActive: {
    color: '#000',
  },
});
```

### Fix `as any` Casts

**Use getBookMetadata helper after 2.19:**
```typescript
// Before (9 occurrences)
const author = (book.media?.metadata as any)?.authorName;

// After
import { getBookMetadata } from '@/shared/utils/bookMetadata';
const { authorName } = getBookMetadata(book);
```

---

## Cross-Screen Dependencies

| Change | Affects |
|--------|---------|
| StackedCovers fix | Only SeriesDetailScreen |
| Filter chips | SeriesListScreen internal |
| Bell icon | SeriesDetailScreen internal |
| getBookMetadata | Depends on 2.19 completion |

---

## Testing Criteria

- [ ] StackedCovers displays all book covers correctly
- [ ] Series filter shows correct series per status
- [ ] In-progress filter shows series with partial completion
- [ ] Completed filter shows fully finished series
- [ ] Not-started shows series with 0 progress
- [ ] Track button toggles and persists
- [ ] Track button styling is prominent

---

## Effort Breakdown

| Task | Effort | Risk |
|------|--------|------|
| Fix StackedCovers bug | 30 min | Low |
| Add filter state and UI | 1 hour | Low |
| Implement filter logic | 1 hour | Low |
| Update bell icon styling | 30 min | Low |
| Fix as any casts (9) | 30 min | Low |
| Testing | 1 hour | - |

**Total: 2-4 hours**
