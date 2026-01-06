# Validation Report: Edit Specifications Review

**Date:** January 5, 2026
**Reviewed:** 18 EditSpec files against 32b-ActionPlan-Revised.md

---

## Summary

| Category | Issues Found |
|----------|--------------|
| Contradictions | 4 |
| Missing Dependencies | 11 |
| Wrong Effort Estimates | 7 |
| Unclear/Vague | 12 |
| **Total** | **34** |

---

## 1. Contradictions Between Specs

### C1: useFilteredLibrary vs useKidModeStore Location (BLOCKING)
**Specs:** EditSpec-PatternConsolidation.md, EditSpec-CodeCleanup.md

**Issue:** PatternConsolidation (2.15) creates `useFilteredLibrary` that imports:
```typescript
import { useKidModeStore } from '@/shared/stores/kidModeStore';
```

But CodeCleanup (2.3) is what moves `kidModeStore` to shared. The PatternConsolidation spec assumes the store is already moved.

**Resolution:** Add explicit note that 2.3 must complete before 2.15. Update PatternConsolidation spec intro.

---

### C2: calculateSeriesProgress vs useSeriesProgress Naming
**Specs:** EditSpec-SeriesScreens.md, EditSpec-PatternConsolidation.md

**Issue:** SeriesScreens (4.8) filter logic uses:
```typescript
const { completedBooks, inProgressBooks, totalBooks } = calculateSeriesProgress(books);
```

But PatternConsolidation (2.20) creates a hook called `useSeriesProgress()`, not a function called `calculateSeriesProgress()`.

**Resolution:** Update SeriesScreens to use `useSeriesProgress` hook instead of undefined function.

---

### C3: Favorites Store Ambiguity
**Specs:** EditSpec-PatternConsolidation.md, EditSpec-AuthorNarratorScreens.md

**Issue:** PatternConsolidation (2.16) says:
> "Decide: consolidate to `favoritesStore` OR document why split"

But AuthorNarratorScreens (4.11) already uses:
```typescript
import { usePreferencesStore } from '@/features/recommendations/stores/preferencesStore';
```

This assumes the current split architecture remains, which contradicts the "consolidate" option.

**Resolution:** Make decision first (recommend: document split), then update both specs to reflect decision.

---

### C4: useToast Hook Existence
**Specs:** EditSpec-SearchScreen.md, EditSpec-BookDetailScreen.md, EditSpec-AuthorNarratorScreens.md

**Issue:** All three specs reference:
```typescript
import { useToast } from '@/shared/hooks/useToast';
```

But each says "may need to create if not exists" - nobody owns creating it.

**Resolution:** Add useToast creation to ErrorBoundaries spec (1.1) since it's the first to need toast feedback, or create separate "Shared Utilities" spec.

---

## 2. Missing Dependencies

### D1: getBookMetadata Chain (HIGH PRIORITY)
**Affected specs:** 7 specs reference `getBookMetadata` from TypeSafety (2.19)

| Spec | References getBookMetadata |
|------|---------------------------|
| EditSpec-BookDetailScreen.md | Lines 201-215 |
| EditSpec-SeriesScreens.md | Lines 217-225 |
| EditSpec-AuthorNarratorScreens.md | Lines 234-237 |
| EditSpec-PatternConsolidation.md | Lines 312, 393, 504 |
| EditSpec-GenreScreens.md | Lines 148-149 |
| EditSpec-BrowseScreen.md | Lines 71-79 |
| EditSpec-ReadingHistory.md | Lines 40-52 |

**Issue:** TypeSafety (2.19) must complete before these can be implemented.

**Resolution:** Add 2.19 to Sprint 1 or early Sprint 2. Mark as blocker for 6 other specs.

---

### D2: Phase 2 Internal Sequencing
**Affected specs:** EditSpec-MyLibraryScreen.md, EditSpec-BrowseScreen.md

**Issue:** MyLibraryScreen (2.1) says:
> "After completing 2.3 (cross-feature imports), update useContinueListening import"

But 2.1 and 2.3 are both Phase 2 with no explicit order.

**Resolution:** Add sequencing to action plan:
```
2.3 Cross-feature imports → 2.1 MyLibraryScreen → 2.15 useFilteredLibrary → 2.5 useDiscoverData
```

---

### D3: useInProgressBooks Not Linked to useContinueListening
**Specs:** EditSpec-PatternConsolidation.md, EditSpec-MyLibraryScreen.md

**Issue:** PatternConsolidation creates `useInProgressBooks` (2.21) as new hook. MyLibraryScreen still references `useContinueListening`. Are these meant to replace each other?

**Resolution:** Clarify relationship. Recommend: `useContinueListening` returns `useInProgressBooks().inProgressBooks[0]` (first item).

---

### D4: SQLite Split Before Pattern Consolidation
**Specs:** EditSpec-SQLiteCache.md, EditSpec-PatternConsolidation.md

**Issue:** PatternConsolidation (2.24) references:
```typescript
sqliteCache.getUserBook(id)?.isFinished  // Deprecated
```

But SQLiteCache split (1.6) changes import paths:
```typescript
import { getUserBook } from '@/core/services/sqlite/sqliteUserBooks';
```

**Resolution:** Either complete 1.6 before 2.24, or ensure 2.24 uses facade pattern imports.

---

### D5: GenreScreens Missing completedBooks
**Spec:** EditSpec-GenreScreens.md

**Issue:** "Your Genres" section (4.2) uses:
```typescript
[...inProgressBooks, ...completedBooks].forEach(book => {
```

But `completedBooks` is not defined. Should use `useIsFinished` from 2.24 or `useFinishedBookIds`.

**Resolution:** Update spec to:
```typescript
const { finishedBookIds } = useFinishedBookIds();
// Filter library items by finished IDs
```

---

### D6: AlphabetScrubber Not in Shared Components Index
**Spec:** EditSpec-AuthorNarratorScreens.md

**Issue:** Creates `src/shared/components/AlphabetScrubber.tsx` but doesn't update `src/shared/components/index.ts` exports.

**Resolution:** Add export step to spec.

---

### D7: PinInputModal Uses PinInput Component
**Spec:** EditSpec-ProfileScreen.md

**Issue:** PinInputModal references `<PinInput ... />` component that doesn't exist:
```typescript
<PinInput
  value={step === 'confirm' ? confirmPin : pin}
  onChange={step === 'confirm' ? setConfirmPin : setPin}
  length={4}
  secure
/>
```

**Resolution:** Either create PinInput component spec or use TextInput with styling.

---

### D8: BrowseScreen getFeaturedReason Function
**Spec:** EditSpec-BrowseScreen.md

**Issue:** useFeaturedData references undefined function:
```typescript
return getFeaturedReason(featuredBook);
```

**Resolution:** Define the function or mark as TODO.

---

### D9: QueueWishlistScreens Missing updateWishlistItem
**Spec:** EditSpec-QueueWishlistScreens.md

**Issue:** Edit sheet handler references:
```typescript
updateWishlistItem(editingItem.id, updates);
```

This function is not shown in WishlistStore.

**Resolution:** Add function to store or use existing API.

---

### D10: useDownloadState Uses Nonexistent Hook
**Spec:** EditSpec-PatternConsolidation.md

**Issue:** `useDownloadState` imports:
```typescript
import { useDownloads, useDownloadStatus, useIsOfflineAvailable } from '@/core/hooks/useDownloads';
```

But then only uses `useDownloads` and `useIsOfflineAvailable`, not `useDownloadStatus`.

**Resolution:** Remove unused import from example.

---

### D11: MoodDiscoverySettings Server Discovery
**Spec:** EditSpec-MoodDiscoverySettings.md

**Issue:** Server discovery (4.17) uses:
```typescript
const response = await fetch(`${url}/api/ping`, {
  method: 'GET',
  timeout: 500,  // Not a valid fetch option!
});
```

`timeout` is not a valid option for fetch API.

**Resolution:** Use AbortController for timeout, or use axios.

---

## 3. Wrong Effort Estimates

### E1: TypeSafety Effort Mismatch
**Spec:** EditSpec-TypeSafety.md

| Label | Actual |
|-------|--------|
| "L (Large) - 1-2 weeks" | Breakdown totals ~22 hours (3-4 days) |

**Issue:** The effort breakdown doesn't match the estimate. 22 hours is M, not L.

**Recommendation:** Relabel as "M-L (Medium-Large) - 4-6 days" or acknowledge the 1-2 weeks includes testing across the codebase.

---

### E2: ErrorBoundaries Labeled M, Could Be S
**Spec:** EditSpec-ErrorBoundaries.md

| Label | Actual |
|-------|--------|
| "M (Medium) - 4-6 hours" | Breakdown totals 6 hours exactly |

**Issue:** 6 hours is borderline S-M. This is closer to S.

**Recommendation:** Relabel as "S-M (Small-Medium) - 4-6 hours".

---

### E3: HomeScreen Effort Too High
**Spec:** EditSpec-HomeScreen.md

| Label | Actual |
|-------|--------|
| "M (Medium) - 1-2 days" | Breakdown totals 5.5 hours |

**Issue:** 5.5 hours is less than one day. Labeled as "1-2 days".

**Recommendation:** Relabel as "S-M (Small-Medium) - 4-6 hours".

---

### E4: ProfileScreen Underestimated
**Spec:** EditSpec-ProfileScreen.md

| Label | Actual |
|-------|--------|
| "S-M (Small-Medium) - 2-6 hours" | Breakdown totals 6.5 hours |

**Issue:** Kid Mode PIN alone is ~5.5 hours. With Wishlist link, total is 6.5 hours, exceeding the 2-6 hour range.

**Recommendation:** Relabel as "M (Medium) - 6-8 hours".

---

### E5: MoodDiscoverySettings Effort High
**Spec:** EditSpec-MoodDiscoverySettings.md

| Label | Actual |
|-------|--------|
| "M-L (Medium-Large) - 2-4 days" | Breakdown totals 14.5 hours |

**Issue:** 14.5 hours is approximately 2 days, which is at the low end. But the spec covers 8 action items across 5 screens.

**Recommendation:** Label is reasonable, but spec should note it covers multiple screens.

---

### E6: AuthorNarratorScreens Covers 5 Items
**Spec:** EditSpec-AuthorNarratorScreens.md

| Label | Actual |
|-------|--------|
| "M (Medium) - 2-3 days" | Breakdown totals 9.5 hours |

**Issue:** 9.5 hours is just over 1 day. Labeled as "2-3 days".

**Recommendation:** Relabel as "M (Medium) - 1-2 days".

---

### E7: GenreScreens Effort Reasonable
**Spec:** EditSpec-GenreScreens.md

| Label | Actual |
|-------|--------|
| "M (Medium) - 1-2 days" | Breakdown totals 8 hours |

**Observation:** 8 hours = 1 day. This is accurate.

---

## 4. Unclear or Too Vague

### V1: TypeSafety Screen Coverage Incomplete
**Spec:** EditSpec-TypeSafety.md

**Issue:** Spec lists 6 priority files to update but notes 202 `as any` casts across 61 files. Where are the other 55 files?

**Resolution:** Add section: "Remaining Files (Opportunistic)" with list of all files to update, sorted by `any` count.

---

### V2: StandardPlayerScreen Undefined
**Spec:** EditSpec-PlayerArchitecture.md

**Issue:** StandardPlayerScreen is described as "Audible-style alternative player with linear progress bar" but:
- What makes it "Audible-style"?
- How does user switch between CD and Standard player?
- What features does it omit vs CDPlayerScreen?

**Resolution:** Add detailed comparison table:
```
| Feature | CDPlayerScreen | StandardPlayerScreen |
|---------|----------------|---------------------|
| Timeline | Chapter-normalized | Linear |
| Cover art | CD disc | Static image |
| ...
```

---

### V3: Console.log Cleanup Scope Unclear
**Spec:** EditSpec-CodeCleanup.md

**Issue:** Lists 6 files to update but mentions 492 occurrences across 43 files.

**Resolution:** Add complete file list with occurrence counts, prioritized by count.

---

### V4: Favorites Consolidation No Guidance
**Spec:** EditSpec-PatternConsolidation.md (2.16)

**Issue:** Says "Decide: consolidate to `favoritesStore` OR document why split" with no recommendation.

**Resolution:** Add recommendation:
> Recommended: Document split. Books/Series relate to library content (myLibraryStore), while Authors/Narrators relate to discovery preferences (preferencesStore). This separation is intentional.

---

### V5: HomeScreen Design Decision Process
**Spec:** EditSpec-HomeScreen.md (2.10)

**Issue:** "Option A: Keep Current" vs "Option B: Restore CD Disc" - this is a decision process, not an implementation spec.

**Resolution:** Make the decision now:
> Decision: Keep HeroSection. Add documentation explaining divergence from original spec.

---

### V6: useFeaturedData Random Selection
**Spec:** EditSpec-BrowseScreen.md

**Issue:** Featured book selection is:
```typescript
return filteredItems[Math.floor(Math.random() * Math.min(10, filteredItems.length))];
```

This is clearly placeholder logic.

**Resolution:** Define actual selection criteria:
- Priority 1: Book currently reading (if exists)
- Priority 2: Recently added with high ratings
- Priority 3: Random from top 10 if no other signal

---

### V7: Server Discovery Naive Implementation
**Spec:** EditSpec-MoodDiscoverySettings.md (4.17)

**Issue:** Implementation scans IPs sequentially:
```typescript
for (let i = 1; i <= 50; i++) {
  const ip = `${subnet}.${i}`;
  for (const port of ports) {
```

This would take 50 × 3 × 500ms = 75 seconds minimum.

**Resolution:** Add note that implementation needs:
- Parallel IP scanning (Promise.all with batches)
- mDNS/Bonjour discovery as alternative
- Previously-connected servers list

---

### V8: GENRE_GROUPS Hardcoded Categories
**Spec:** EditSpec-GenreScreens.md

**Issue:** Genre grouping uses hardcoded list:
```typescript
'Fiction': ['Fantasy', 'Science Fiction', 'Mystery', ...]
```

No guidance on:
- How to maintain this list
- What happens with genres not matching any group
- Whether this should be configurable

**Resolution:** Move to configuration file. Add fallback logic for unmatched genres.

---

### V9: PIN Hash Function Insecure
**Spec:** EditSpec-ProfileScreen.md

**Issue:** Uses custom hash:
```typescript
function hashPin(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString();
}
```

Comment says "use proper crypto in production" but doesn't specify.

**Resolution:** Use `expo-crypto`:
```typescript
import * as Crypto from 'expo-crypto';
const hash = await Crypto.digestStringAsync(
  Crypto.CryptoDigestAlgorithm.SHA256,
  pin + 'salt'
);
```

---

### V10: EmptyState Props Not Defined
**Spec:** EditSpec-PatternConsolidation.md (2.18)

**Issue:** Shows updated EmptyState but says DownloadsScreen uses "custom props" without specifying what they are.

**Resolution:** List the custom props that need to be migrated:
- `onBrowse` → `onCtaPress`
- `colors` → removed (uses theme)

---

### V11: useSwipeGesture Missing Complete Logic
**Spec:** EditSpec-PatternConsolidation.md (2.17)

**Issue:** Hook only fires callbacks at swipe end, doesn't handle mid-swipe feedback (showing action preview).

**Resolution:** Add `onSwipeProgress` callback for visual feedback during swipe.

---

### V12: Logger Utility Config Not Persistent
**Spec:** EditSpec-CodeCleanup.md

**Issue:** Logger config is in memory:
```typescript
const config: LoggerConfig = {
  enabled: __DEV__,
  ...
};
```

If user changes `setMinLevel('error')`, it resets on app restart.

**Resolution:** Add AsyncStorage persistence for log level preference, or note this is intentional.

---

## Action Items

### Critical (Block Implementation)
1. Create useToast hook spec or add to ErrorBoundaries (C4)
2. Define getBookMetadata implementation order (D1)
3. Fix calculateSeriesProgress → useSeriesProgress naming (C2)

### High Priority (Update Before Implementation)
4. Add Phase 2 sequencing: 2.3 → 2.15 → 2.5 (D2)
5. Define completedBooks source in GenreScreens (D5)
6. Fix fetch timeout implementation (D11)
7. Make favorites split/consolidate decision (C3)

### Medium Priority (Clarify Spec)
8. Add remaining TypeSafety files list (V1)
9. Define StandardPlayerScreen features (V2)
10. Update effort estimates (E1-E6)
11. Add server discovery parallelization note (V7)

### Low Priority (Nice to Have)
12. Add PIN hash with expo-crypto (V9)
13. Add logger persistence note (V12)
14. Add genre group configuration (V8)

---

## Revised Dependency Graph

```
Phase 1
  1.1 ErrorBoundaries (+ create useToast)
    ↓
  1.7 StackedCovers bug
  1.8 Wishlist link

Phase 2 (Sequenced)
  2.3 Cross-feature imports (move kidModeStore)
    ↓
  2.19 getBookMetadata helper
    ↓
  2.15 useFilteredLibrary hook
    ↓
  2.1 MyLibraryScreen refactor
  2.5 useDiscoverData split
    ↓
  2.20 useSeriesProgress
  2.21 useInProgressBooks
  2.24 useIsFinished

Phase 1 (Large Refactors - Parallel Track)
  1.3 CDPlayerScreen
  1.5 Type safety (needs 2.19)
  1.6 sqliteCache split
```

---

## Conclusion

The edit specifications are generally well-structured but contain 34 issues that should be addressed before implementation begins. The most critical issues are:

1. **Dependency ordering** - Several specs assume other work is complete without explicitly stating it
2. **Missing utility creation** - useToast, PinInput, getFeaturedReason referenced but not defined
3. **Effort estimate inconsistencies** - 7 specs have estimates that don't match their breakdowns

Recommend addressing the 7 Critical/High Priority items before Sprint 1 begins.
