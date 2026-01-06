# Edit Specification: Search Screen

**Covers Action Plan Items:** 1.4, 3.3
**Priority:** High (Phase 1) / Medium (Phase 3)
**Effort:** S-M (Small-Medium) - 4-8 hours

---

## Current State

### SearchScreen.tsx
- **File:** `src/features/search/screens/SearchScreen.tsx`
- **Lines:** 1,798
- **`as any` casts:** 2 occurrences
- **Silent catch blocks:** 4 try-catch blocks with just `console.error`
- **Autocomplete:** Embedded inline, not separated

### Features
- Large search input with clear button
- Recent searches with remove
- Filter tabs (All, Authors, Series, Genres)
- Duration filter pills
- Autocomplete dropdown
- Results sections (Books, Series, Authors)

---

## Issues Identified

| Issue | Source | Severity |
|-------|--------|----------|
| Silent catch blocks - no user feedback | [28], 1.4 | Medium |
| FlatList may not be optimized for large results | [28], 3.3 | Low |
| Autocomplete overlay embedded | [28] | Low |
| Kid Mode filtering duplicated here | [31] §1.1 | Low |

---

## Alignment Requirements

From [31] Alignment Audit:
- Kid Mode filtering should use consolidated `useFilteredLibrary()` hook
- Empty state should use standardized `EmptyState` component

From [27] Implementation Completeness:
- 88% complete - minor gaps in genre filter tab

---

## Target State

- All errors show user-facing feedback (toast or inline error)
- FlatList optimized with `getItemLayout`
- Kid Mode uses shared hook
- Autocomplete extracted to component

---

## Specific Changes

### 1.4: Fix Silent Catch Blocks

**Current pattern (4 locations):**
```typescript
try {
  const results = await apiClient.get('/api/search', { query });
  setResults(results);
} catch (error) {
  console.error('Search failed:', error);
  // No user feedback!
}
```

**Updated pattern:**
```typescript
import { useToast } from '@/shared/hooks/useToast';

const { showToast } = useToast();

try {
  const results = await apiClient.get('/api/search', { query });
  setResults(results);
} catch (error) {
  console.error('Search failed:', error);
  showToast({
    type: 'error',
    message: 'Search failed. Please try again.',
  });
  // Optionally set error state
  setError('Unable to search. Check your connection.');
}
```

**Locations to update:**
1. Main search query (~line 340)
2. Autocomplete fetch (~line 280)
3. Recent searches load (~line 200)
4. Filter application (~line 400)

**Add inline error state:**
```typescript
const [error, setError] = useState<string | null>(null);

// In render
{error && (
  <View style={styles.errorContainer}>
    <AlertCircle size={scale(20)} color={colors.error} />
    <Text style={styles.errorText}>{error}</Text>
    <TouchableOpacity onPress={handleRetry}>
      <Text style={styles.retryText}>Retry</Text>
    </TouchableOpacity>
  </View>
)}
```

### 3.3: FlatList Optimization

**Add getItemLayout for fixed-height items:**
```typescript
const BOOK_CARD_HEIGHT = scale(180);
const AUTHOR_ROW_HEIGHT = scale(72);
const SERIES_CARD_HEIGHT = scale(120);

const getItemLayout = useCallback(
  (data: unknown, index: number) => ({
    length: BOOK_CARD_HEIGHT,
    offset: BOOK_CARD_HEIGHT * index,
    index,
  }),
  []
);

<FlatList
  data={bookResults}
  renderItem={renderBookCard}
  keyExtractor={item => item.id}
  getItemLayout={getItemLayout}
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  windowSize={5}
  initialNumToRender={10}
/>
```

### Extract Autocomplete Component

**New file:** `src/features/search/components/AutocompleteOverlay.tsx`

```typescript
interface AutocompleteOverlayProps {
  query: string;
  suggestions: string[];
  isVisible: boolean;
  onSuggestionPress: (suggestion: string) => void;
  onDismiss: () => void;
}

export const AutocompleteOverlay: React.FC<AutocompleteOverlayProps> = ({
  query,
  suggestions,
  isVisible,
  onSuggestionPress,
  onDismiss,
}) => {
  if (!isVisible || suggestions.length === 0) return null;

  return (
    <View style={styles.overlay}>
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>
      <View style={styles.suggestionsContainer}>
        {suggestions.map((suggestion, index) => (
          <TouchableOpacity
            key={index}
            style={styles.suggestionRow}
            onPress={() => onSuggestionPress(suggestion)}
          >
            <Search size={scale(16)} color={colors.textSecondary} />
            <Text style={styles.suggestionText}>
              {highlightMatch(suggestion, query)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};
```

### Update Kid Mode Filtering

**After 2.15 is complete:**
```typescript
// Before
import { useKidModeStore } from '@/features/profile/stores/kidModeStore';
const { isEnabled } = useKidModeStore();
const filtered = isEnabled ? results.filter(isKidFriendly) : results;

// After
import { useFilteredLibrary } from '@/shared/hooks/useFilteredLibrary';
const { filteredItems } = useFilteredLibrary({ items: results });
```

---

## Cross-Screen Dependencies

| Component | Impact |
|-----------|--------|
| useToast hook | May need to create if not exists |
| useFilteredLibrary | Depends on 2.15 completion |
| AutocompleteOverlay | Internal extraction |

---

## Testing Criteria

- [ ] Search errors show user-friendly message
- [ ] Retry button works after error
- [ ] Large result sets scroll smoothly
- [ ] Autocomplete appears quickly on typing
- [ ] Autocomplete dismisses on tap outside
- [ ] Kid Mode filters adult content from results
- [ ] Empty results show EmptyState component

---

## Effort Breakdown

| Task | Effort | Risk |
|------|--------|------|
| Fix 4 silent catch blocks | 1.5 hours | Low |
| Add error UI component | 1 hour | Low |
| Add getItemLayout optimization | 1 hour | Low |
| Extract AutocompleteOverlay | 1.5 hours | Low |
| Update Kid Mode filtering | 30 min | Low |
| Testing | 1.5 hours | - |

**Total: 4-8 hours**
