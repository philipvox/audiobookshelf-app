# Edit Specification: Book Detail Screen

**Covers Action Plan Items:** 1.4, 3.10
**Priority:** High (Phase 1) / Medium (Phase 3)
**Effort:** S (Small) - 2-4 hours

---

## Current State

### BookDetailScreen.tsx
- **File:** `src/features/book-detail/screens/BookDetailScreen.tsx`
- **Lines:** 1,078
- **`as any` casts:** 12 occurrences
- **Silent catch blocks:** 6 try-catch blocks with just `console.error`
- **Tab navigation:** Manual state (Overview/Chapters tabs)

### Features
- Genre tags (gold accent)
- Large title
- Author/Narrator links (tappable)
- Cover image (~50% width)
- Downloaded/Queue pills
- Play button
- Overview/Chapters tabs
- Description with Read more
- Series info
- Duration + Published

---

## Issues Identified

| Issue | Source | Severity |
|-------|--------|----------|
| 12 `as any` casts for metadata | [28] | High |
| 6 silent catch blocks | [28] | Medium |
| Refresh button not visible in all states | [27] | Low |

---

## Alignment Requirements

From [27] Implementation Completeness:
- 90% complete
- Gap: Refresh button (⟳) in header not visible in all states

---

## Specific Changes

### 1.4: Fix Silent Catch Blocks

**6 locations to update:**

```typescript
// Pattern used 6 times
try {
  await someApiCall();
} catch (error) {
  console.error('Operation failed:', error);
  // No user feedback!
}
```

**Locations:**
1. Book data fetch (~line 180)
2. Chapter list fetch (~line 220)
3. Progress sync (~line 280)
4. Download initiation (~line 340)
5. Add to queue (~line 380)
6. Add to favorites (~line 420)

**Updated pattern:**
```typescript
import { useToast } from '@/shared/hooks/useToast';

const { showToast } = useToast();

// For data fetching errors
const [loadError, setLoadError] = useState<string | null>(null);

try {
  const data = await apiClient.get(`/api/items/${bookId}`);
  setBook(data);
  setLoadError(null);
} catch (error) {
  console.error('Failed to load book:', error);
  setLoadError('Unable to load book details.');
  showToast({
    type: 'error',
    message: 'Failed to load book details.',
  });
}

// For action errors (download, queue, favorite)
try {
  await addToQueue(book);
  showToast({
    type: 'success',
    message: 'Added to queue',
  });
} catch (error) {
  console.error('Failed to add to queue:', error);
  showToast({
    type: 'error',
    message: 'Failed to add to queue. Please try again.',
  });
}
```

**Add error state UI:**
```typescript
// If critical data fails to load
{loadError && (
  <View style={styles.errorContainer}>
    <AlertCircle size={scale(48)} color={colors.textSecondary} />
    <Text style={styles.errorTitle}>Unable to Load</Text>
    <Text style={styles.errorMessage}>{loadError}</Text>
    <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
      <RefreshCw size={scale(18)} color="#000" />
      <Text style={styles.retryText}>Try Again</Text>
    </TouchableOpacity>
  </View>
)}
```

### 3.10: Fix Refresh Button Visibility

**Current issue:** Refresh button only shown in certain states

**Update header to always show refresh:**
```typescript
const [isRefreshing, setIsRefreshing] = useState(false);

const handleRefresh = useCallback(async () => {
  setIsRefreshing(true);
  try {
    await refetchBook();
    await refetchChapters();
    await syncProgress();
  } finally {
    setIsRefreshing(false);
  }
}, [refetchBook, refetchChapters, syncProgress]);

// In header component
<TouchableOpacity
  onPress={handleRefresh}
  disabled={isRefreshing}
  style={styles.headerButton}
  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
>
  {isRefreshing ? (
    <ActivityIndicator size="small" color={colors.textPrimary} />
  ) : (
    <RefreshCw size={scale(22)} color={colors.textPrimary} />
  )}
</TouchableOpacity>
```

**Ensure header has space for refresh:**
```typescript
const renderHeader = () => (
  <View style={styles.header}>
    <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
      <ChevronLeft size={scale(24)} color={colors.textPrimary} />
    </TouchableOpacity>

    <View style={styles.headerSpacer} />

    {/* Always visible refresh button */}
    <TouchableOpacity onPress={handleRefresh} style={styles.headerButton}>
      <RefreshCw size={scale(22)} color={colors.textPrimary} />
    </TouchableOpacity>

    {/* More options */}
    <TouchableOpacity onPress={handleMore} style={styles.headerButton}>
      <MoreVertical size={scale(22)} color={colors.textPrimary} />
    </TouchableOpacity>
  </View>
);
```

### Fix `as any` Casts

**Use getBookMetadata helper after 2.19:**
```typescript
// Before (12 occurrences)
const title = (book.media?.metadata as any)?.title;
const author = (book.media?.metadata as any)?.authorName;
const narrator = (book.media?.metadata as any)?.narratorName;
const description = (book.media?.metadata as any)?.description;
const series = (book.media?.metadata as any)?.series;
const genres = (book.media?.metadata as any)?.genres;
const publishedYear = (book.media?.metadata as any)?.publishedYear;
const publisher = (book.media?.metadata as any)?.publisher;
// ... etc

// After
import { getBookMetadata, getProgress, getPrimarySeries } from '@/shared/utils/bookMetadata';

const {
  title,
  authorName,
  narratorName,
  description,
  genres,
  publishedYear,
  publisher,
  duration,
} = getBookMetadata(book);

const primarySeries = getPrimarySeries(book);
const { progress, isFinished, currentTime } = getProgress(book);
```

---

## Cross-Screen Dependencies

| Change | Affects |
|--------|---------|
| Error toast | May need to create useToast if not exists |
| getBookMetadata | Depends on 2.19 completion |
| Refresh behavior | Calls React Query refetch |

---

## Testing Criteria

### Error Handling
- [ ] Network error shows toast and retry option
- [ ] Retry button fetches fresh data
- [ ] Action errors (queue, favorite) show appropriate toasts
- [ ] Success actions show confirmation toasts

### Refresh Button
- [ ] Refresh icon always visible in header
- [ ] Tap refreshes book data
- [ ] Shows loading spinner while refreshing
- [ ] Disabled during refresh operation
- [ ] Works in both Overview and Chapters tabs

### General
- [ ] Book loads correctly from navigation params
- [ ] Author/Narrator names tap to navigate
- [ ] Genre tags display correctly
- [ ] Play button starts playback
- [ ] Download/Queue pills show correct state

---

## Effort Breakdown

| Task | Effort | Risk |
|------|--------|------|
| Fix 6 catch blocks with toast | 1 hour | Low |
| Add error state UI | 30 min | Low |
| Fix refresh button visibility | 30 min | Low |
| Fix 12 as any casts | 30 min | Low |
| Testing | 1 hour | - |

**Total: 2-4 hours**
