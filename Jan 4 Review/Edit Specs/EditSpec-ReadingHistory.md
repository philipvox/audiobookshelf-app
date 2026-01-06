# Edit Specification: Reading History

**Covers Action Plan Items:** 2.24, 3.8, 4.4
**Priority:** Medium (Phase 2-4)
**Effort:** M (Medium) - 1-2 days

---

## Current State

### MarkBooksScreen.tsx (Reading History Wizard)
- **File:** `src/features/reading-history-wizard/screens/MarkBooksScreen.tsx`
- **Lines:** ~600
- **Features:** Card stack with swipe gestures, progress bar, undo

### ReadingHistoryScreen.tsx
- **File:** `src/features/reading-history-wizard/screens/ReadingHistoryScreen.tsx`
- **Lines:** ~500
- **Features:** Stats header, sort picker, book list
- **Missing:** Batch selection mode, batch actions (Delete, Undo, Export)

---

## Issues Identified

| Issue | Source | Severity |
|-------|--------|----------|
| Swipe sensitivity could be tuned | [27] | Low |
| No batch selection mode | [27] | Low |
| 3 ways to check if book finished | [31] §4.2 | Medium |

---

## Specific Changes

### 2.24: Standardize Finished Book Checking

**File:** `src/features/reading-history-wizard/screens/ReadingHistoryScreen.tsx`

```typescript
// Before - multiple ways to check finished
const isFinished1 = sqliteCache.getUserBook(id)?.isFinished;
const isFinished2 = item.userMediaProgress?.progress >= 0.95;
const isFinished3 = completionStore.isComplete(id);

// After - single source of truth
import { useIsFinished } from '@/shared/hooks/useIsFinished';

const { isFinished, finishedBookIds } = useIsFinished();

// Use consistently
const finishedBooks = libraryItems.filter(item => isFinished(item));
```

### 3.8: Tune Swipe Sensitivity

**File:** `src/features/reading-history-wizard/screens/MarkBooksScreen.tsx`

**Current thresholds (may need adjustment):**
```typescript
const SWIPE_THRESHOLD = 80;  // px
const VELOCITY_THRESHOLD = 500;  // px/s
```

**Tuned values:**
```typescript
// Slightly lower threshold for easier swiping
const SWIPE_THRESHOLD = 60;  // Reduced from 80
const VELOCITY_THRESHOLD = 400;  // Reduced from 500

// Add haptic feedback at threshold
const handleGestureUpdate = (translationX: number) => {
  const absX = Math.abs(translationX);

  // Trigger haptic when crossing threshold
  if (absX >= SWIPE_THRESHOLD && !hasTriggeredHaptic.current) {
    haptics.impact('light');
    hasTriggeredHaptic.current = true;
  } else if (absX < SWIPE_THRESHOLD * 0.8) {
    hasTriggeredHaptic.current = false;
  }
};
```

### 4.4: Add Batch Selection Mode

**File:** `src/features/reading-history-wizard/screens/ReadingHistoryScreen.tsx`

**Add selection state:**
```typescript
const [isSelecting, setIsSelecting] = useState(false);
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

const toggleSelection = (id: string) => {
  setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    return next;
  });
};

const selectAll = () => {
  setSelectedIds(new Set(finishedBooks.map(b => b.id)));
};

const clearSelection = () => {
  setSelectedIds(new Set());
};
```

**Add selection UI:**
```typescript
// Header with selection toggle
<View style={styles.header}>
  <Text style={styles.title}>Reading History</Text>
  <TouchableOpacity onPress={() => setIsSelecting(!isSelecting)}>
    <Text style={styles.selectButton}>
      {isSelecting ? 'Done' : 'Select'}
    </Text>
  </TouchableOpacity>
</View>

// Selection bar when selecting
{isSelecting && (
  <View style={styles.selectionBar}>
    <TouchableOpacity onPress={selectAll}>
      <Text style={styles.selectionAction}>Select All</Text>
    </TouchableOpacity>
    <Text style={styles.selectedCount}>
      {selectedIds.size} selected
    </Text>
    <TouchableOpacity onPress={clearSelection}>
      <Text style={styles.selectionAction}>Clear</Text>
    </TouchableOpacity>
  </View>
)}

// Modify book row to show checkbox
const renderBookRow = ({ item }: { item: LibraryItem }) => (
  <TouchableOpacity
    style={styles.bookRow}
    onPress={() => isSelecting ? toggleSelection(item.id) : navigateToBook(item.id)}
  >
    {isSelecting && (
      <View style={[styles.checkbox, selectedIds.has(item.id) && styles.checkboxSelected]}>
        {selectedIds.has(item.id) && <Check size={scale(16)} color="#fff" />}
      </View>
    )}
    <Image source={{ uri: coverUrl }} style={styles.cover} />
    <View style={styles.bookInfo}>
      <Text style={styles.bookTitle}>{title}</Text>
      <Text style={styles.bookAuthor}>{author}</Text>
    </View>
  </TouchableOpacity>
);
```

**Add batch actions:**
```typescript
// Batch action bar at bottom
{isSelecting && selectedIds.size > 0 && (
  <View style={styles.batchActionBar}>
    <TouchableOpacity
      style={styles.batchAction}
      onPress={handleBatchUndo}
    >
      <Undo size={scale(20)} color={colors.textPrimary} />
      <Text style={styles.batchActionText}>Mark Unfinished</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.batchAction}
      onPress={handleBatchExport}
    >
      <Share size={scale(20)} color={colors.textPrimary} />
      <Text style={styles.batchActionText}>Export</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[styles.batchAction, styles.batchActionDestructive]}
      onPress={handleBatchDelete}
    >
      <Trash2 size={scale(20)} color={colors.error} />
      <Text style={[styles.batchActionText, styles.batchActionTextDestructive]}>
        Remove
      </Text>
    </TouchableOpacity>
  </View>
)}
```

**Implement batch actions:**
```typescript
const handleBatchUndo = async () => {
  Alert.alert(
    'Mark as Unfinished',
    `Mark ${selectedIds.size} books as not finished?`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          for (const id of selectedIds) {
            await unmarkBookFinished(id);
          }
          clearSelection();
          setIsSelecting(false);
          haptics.notification('success');
        },
      },
    ]
  );
};

const handleBatchExport = async () => {
  const selectedBooks = finishedBooks.filter(b => selectedIds.has(b.id));
  const exportData = selectedBooks.map(book => ({
    title: getBookMetadata(book).title,
    author: getBookMetadata(book).authorName,
    finishedAt: getProgress(book).lastUpdate,
  }));

  // Share as JSON or formatted text
  await Share.share({
    message: JSON.stringify(exportData, null, 2),
    title: 'Reading History Export',
  });
};

const handleBatchDelete = () => {
  Alert.alert(
    'Remove from History',
    `Remove ${selectedIds.size} books from your reading history?`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          for (const id of selectedIds) {
            await removeFromHistory(id);
          }
          clearSelection();
          setIsSelecting(false);
          haptics.notification('success');
        },
      },
    ]
  );
};
```

---

## Cross-Screen Dependencies

| Change | Affects |
|--------|---------|
| useIsFinished hook | Depends on 2.24 in PatternConsolidation |
| Batch actions | Uses finishedBooksSync service |
| Export | Uses Share API |

---

## Testing Criteria

### Swipe Sensitivity
- [ ] Cards swipe with reasonable effort
- [ ] Haptic fires at threshold
- [ ] Quick flicks register correctly
- [ ] Slow drags work smoothly

### Batch Selection
- [ ] Tap "Select" enters selection mode
- [ ] Checkboxes appear on all items
- [ ] Tap toggles selection
- [ ] "Select All" selects all
- [ ] "Clear" deselects all
- [ ] Counter shows correct count

### Batch Actions
- [ ] "Mark Unfinished" confirms and updates
- [ ] "Export" opens share sheet with data
- [ ] "Remove" confirms and removes
- [ ] Actions clear selection and exit mode

---

## Effort Breakdown

| Task | Effort | Risk |
|------|--------|------|
| Standardize isFinished checking | 1 hour | Low |
| Tune swipe thresholds | 30 min | Low |
| Add selection state | 1 hour | Low |
| Add selection UI | 1.5 hours | Low |
| Implement batch actions | 2 hours | Low |
| Testing | 1.5 hours | - |

**Total: 1-2 days**
