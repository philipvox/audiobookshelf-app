# EditSpec: playerStore.ts Refactor

**File:** `src/features/player/stores/playerStore.ts`
**Current Lines:** 2,838
**Target Lines:** <400 per file (7 files)
**Risk Level:** HIGH - Core playback functionality

---

## 1. Current Responsibilities

The playerStore currently handles **12 distinct domains**:

### 1.1 Core Playback State (Lines 95-183)
- `currentBook`, `viewingBook` - What's loaded/displayed
- `position`, `duration` - Current playback position
- `isPlaying`, `isLoading`, `isBuffering` - Playback state flags
- `playbackRate` - Current speed
- `chapters`, `viewingChapters` - Chapter data

### 1.2 Seeking State (Lines 116-121)
- `isSeeking`, `seekPosition`, `seekStartPosition`, `seekDirection`
- Blocking position updates during seek operations
- Continuous seeking (hold button)

### 1.3 Book Loading (Lines 913-1492)
- `loadBook()` - ~580 lines, handles online/offline paths
- Position resolution (local vs server)
- Multi-file audiobook track building
- Download completion listener setup
- Auto-queue next series book

### 1.4 Playback Control (Lines 1604-1776)
- `play()`, `pause()` - With smart rewind integration
- Stuck detection and recovery
- Listening session tracking
- Event bus emissions

### 1.5 Seeking Operations (Lines 1778-1868)
- `startSeeking()`, `updateSeekPosition()`, `commitSeek()`, `cancelSeek()`
- `seekTo()` - Instant seek
- `startContinuousSeeking()`, `stopContinuousSeeking()` - Hold-to-seek

### 1.6 Chapter Navigation (Lines 1963-2005)
- `jumpToChapter()`, `nextChapter()`, `prevChapter()`
- `getCurrentChapter()`

### 1.7 Sleep Timer (Lines 2044-2146)
- `setSleepTimer()`, `extendSleepTimer()`, `clearSleepTimer()`
- Shake-to-extend integration
- Warning haptics at 60s

### 1.8 Playback Speed (Lines 2011-2042)
- `setPlaybackRate()`, `setGlobalDefaultRate()`, `getBookSpeed()`
- Per-book speed memory (`bookSpeedMap`)

### 1.9 Smart Rewind (Lines 379-473, 1687-1737)
- Pause timestamp tracking
- Rewind calculation based on pause duration
- AsyncStorage persistence

### 1.10 Bookmarks (Lines 2541-2635)
- `addBookmark()`, `updateBookmark()`, `removeBookmark()`, `loadBookmarks()`
- SQLite persistence

### 1.11 Book Completion (Lines 2641-2722)
- `markBookFinished()`, `dismissCompletionSheet()`
- Completion sheet state
- Reading history integration

### 1.12 Settings Persistence (Lines 2222-2314)
- 15 AsyncStorage keys for various settings
- `loadPlayerSettings()` - Bulk load on init

### 1.13 Module-Level State (Lines 354-376)
- `currentLoadId` - Load cancellation
- `lastProgressSave` - Throttling
- `lastFinishedBookId` - Duplicate finish prevention
- `seekInterval` - Continuous seek timer
- `autoDownloadCheckedBooks` - Prevent repeated triggers

### 1.14 Helper Functions (Lines 540-762)
- `setupDownloadCompletionListener()`
- `getDownloadPath()`
- `mapSessionChapters()`, `extractChaptersFromBook()`
- `getBookDuration()`, `findChapterIndex()`
- `checkAutoDownloadNextInSeries()`

### 1.15 Listening Sessions (Lines 478-534)
- `startListeningSession()`, `endListeningSession()`
- SQLite recording for stats

### 1.16 Selectors (Lines 2729-2841)
- 14 custom selector hooks
- Derived state calculations

---

## 2. Proposed Split

### 2.1 File Structure

```
src/features/player/stores/
├── playerStore.ts          # Re-export facade (~50 lines)
├── playbackStore.ts        # Core playback state (~400 lines)
├── seekingStore.ts         # Seeking operations (~200 lines)
├── sleepTimerStore.ts      # Sleep timer logic (~150 lines)
├── bookmarksStore.ts       # Bookmarks CRUD (~150 lines)
├── speedStore.ts           # Playback speed (~150 lines)
├── completionStore.ts      # Book completion (~150 lines)
├── playerSettingsStore.ts  # Settings persistence (~200 lines)
└── selectors.ts            # All selector hooks (~150 lines)

src/features/player/utils/
├── bookLoading.ts          # loadBook helper logic (~300 lines)
├── smartRewind.ts          # Smart rewind logic (~100 lines)
├── listeningSession.ts     # Session tracking (~100 lines)
└── downloadListener.ts     # Download completion (~150 lines)
```

### 2.2 Store Responsibilities

#### `playbackStore.ts` (~400 lines)
**State:**
- `currentBook`, `viewingBook`, `chapters`, `viewingChapters`
- `position`, `duration`, `isPlaying`, `isLoading`, `isBuffering`
- `isOffline`, `isPlayerVisible`, `lastPlayedBookId`

**Actions:**
- `loadBook()` - Uses helpers from `bookLoading.ts`
- `cleanup()`
- `viewBook()`, `playViewingBook()`, `isViewingDifferentBook()`
- `play()`, `pause()`
- `updatePlaybackState()` - Internal callback
- `togglePlayer()`, `closePlayer()`

**Subscribes to:** seekingStore (for isSeeking check in updatePlaybackState)

#### `seekingStore.ts` (~200 lines)
**State:**
- `isSeeking`, `seekPosition`, `seekStartPosition`, `seekDirection`

**Actions:**
- `startSeeking()`, `updateSeekPosition()`, `commitSeek()`, `cancelSeek()`
- `seekTo()`
- `startContinuousSeeking()`, `stopContinuousSeeking()`
- `skipForward()`, `skipBackward()`
- `jumpToChapter()`, `nextChapter()`, `prevChapter()`
- `getCurrentChapter()`

**Reads from:** playbackStore (position, duration, chapters)

#### `sleepTimerStore.ts` (~150 lines)
**State:**
- `sleepTimer`, `sleepTimerInterval`
- `shakeToExtendEnabled`, `isShakeDetectionActive`

**Actions:**
- `setSleepTimer()`, `extendSleepTimer()`, `clearSleepTimer()`
- `setShakeToExtendEnabled()`

**Triggers:** playbackStore.pause() when timer expires

#### `bookmarksStore.ts` (~150 lines)
**State:**
- `bookmarks: Bookmark[]`

**Actions:**
- `addBookmark()`, `updateBookmark()`, `removeBookmark()`, `loadBookmarks()`

**Reads from:** playbackStore (currentBook for bookId)

#### `speedStore.ts` (~150 lines)
**State:**
- `playbackRate`, `bookSpeedMap`, `globalDefaultRate`

**Actions:**
- `setPlaybackRate()`, `setGlobalDefaultRate()`, `getBookSpeed()`

**Persists to:** AsyncStorage

#### `completionStore.ts` (~150 lines)
**State:**
- `showCompletionPrompt`, `autoMarkFinished`
- `showCompletionSheet`, `completionSheetBook`

**Actions:**
- `setShowCompletionPrompt()`, `setAutoMarkFinished()`
- `markBookFinished()`, `dismissCompletionSheet()`

**Reads from:** playbackStore (currentBook, duration)

#### `playerSettingsStore.ts` (~200 lines)
**State:**
- `controlMode`, `progressMode`
- `skipForwardInterval`, `skipBackInterval`
- `discAnimationEnabled`, `useStandardPlayer`
- `smartRewindEnabled`, `smartRewindMaxSeconds`

**Actions:**
- All setters for above settings
- `loadPlayerSettings()` - Bulk init

**Persists to:** AsyncStorage

#### `selectors.ts` (~150 lines)
All 14 exported selector hooks moved here:
- `useDisplayPosition`, `useSeekDelta`, `useCurrentChapterIndex`
- `useCurrentChapter`, `useChapterProgress`, `useBookProgress`
- `useIsSeeking`, `useSeekDirection`, `useIsViewingDifferentBook`
- `useViewingBook`, `usePlayingBook`, `useIsShakeDetectionActive`
- `useSleepTimerState`

---

## 3. Shared State & Cross-Store Communication

### 3.1 State Read Dependencies

```
                    ┌─────────────────┐
                    │  playbackStore  │
                    │  (owns books,   │
                    │   position,     │
                    │   chapters)     │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  seekingStore   │ │  bookmarksStore │ │ completionStore │
│  (reads pos,    │ │  (reads book)   │ │  (reads book,   │
│   duration,     │ │                 │ │   duration)     │
│   chapters)     │ │                 │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### 3.2 Cross-Store Actions

| Source Store | Action | Target Store | Trigger |
|--------------|--------|--------------|---------|
| sleepTimerStore | Timer expires | playbackStore | `pause()` |
| playbackStore | Position update | (external) | `updatePlaybackState()` checks `seekingStore.isSeeking` |
| playbackStore | Book finished | completionStore | Show completion sheet |
| seekingStore | Seek committed | playbackStore | Position synced via audioService callback |

### 3.3 Module-Level State Assignment

Current module-level variables (lines 354-376) must be assigned to specific stores:

| Variable | Assigned To | Purpose |
|----------|-------------|---------|
| `currentLoadId` | playbackStore | Load cancellation token |
| `lastProgressSave` | playbackStore | Throttle progress saves |
| `autoDownloadCheckedBooks` | playbackStore | Prevent duplicate auto-download triggers |
| `lastFinishedBookId` | completionStore | Prevent duplicate finish handling |
| `seekInterval` | seekingStore | Continuous seek timer reference |

**Implementation Notes:**
- These remain module-level variables within their respective store files
- They are NOT Zustand state (not reactive, not persisted)
- Access via closure within store actions
- Reset on cleanup/logout as appropriate

### 3.4 Cross-Store Write Pattern

**CRITICAL: Use `getState()` for all cross-store writes. Never subscribe for write operations.**

```typescript
// CORRECT: Use getState() for imperative cross-store writes
// In sleepTimerStore - timer expiration
const timerExpired = () => {
  usePlaybackStore.getState().pause();
};

// In seekingStore - after seek commits
const commitSeek = async () => {
  await audioService.seekTo(seekPosition);
  // Position will sync via audioService callback to playbackStore
  // No direct write needed - audioService is source of truth
};

// In completionStore - remove from queue on book finish
const markBookFinished = async (bookId: string) => {
  // ... mark finished logic ...
  const { useQueueStore } = await import('@/features/queue/stores/queueStore');
  if (useQueueStore.getState().isInQueue(bookId)) {
    await useQueueStore.getState().removeFromQueue(bookId);
  }
};

// WRONG: Don't subscribe for writes (causes infinite loops, race conditions)
// usePlaybackStore.subscribe((s) => s.position, (pos) => {
//   useSomeOtherStore.getState().updatePosition(pos); // BAD!
// });
```

**Pattern Summary:**
- **Read subscriptions:** OK for derived state, UI updates
- **Write operations:** Always use `getState()` imperatively
- **audioService:** Owns position truth, stores sync via callbacks

### 3.5 Communication Pattern (Read Subscriptions)

Use **Zustand's subscribeWithSelector** for cross-store READ subscriptions only:

```typescript
// In sleepTimerStore - pause countdown when playback stops (READ only)
usePlaybackStore.subscribe(
  (s) => s.isPlaying,
  (isPlaying) => {
    if (!isPlaying) {
      // Pause timer countdown (internal state change, not cross-store write)
    }
  }
);
```

---

## 4. Migration Path

### Phase 1: Extract Pure Utilities (Safe, No State Changes)
**Files to create:**
- `src/features/player/utils/smartRewind.ts`
- `src/features/player/utils/listeningSession.ts`
- `src/features/player/utils/downloadListener.ts`
- `src/features/player/utils/bookLoading.ts`

**Steps:**
1. Move helper functions without modifying playerStore API
2. Import and call from playerStore
3. Test playback works

**Risk:** LOW - No API changes
**Effort:** 4 hours

### Phase 2: Extract Settings Store
**Files to create:**
- `src/features/player/stores/playerSettingsStore.ts`

**Steps:**
1. Move all settings state and setters
2. Keep re-exports in playerStore for compatibility
3. Update `loadPlayerSettings()` to call new store
4. Test all settings persist correctly

**Risk:** LOW - Settings are independent
**Effort:** 3 hours

### Phase 3: Extract Bookmarks Store
**Files to create:**
- `src/features/player/stores/bookmarksStore.ts`

**Steps:**
1. Move bookmarks state and CRUD actions
2. Add dependency on playbackStore for currentBook
3. Keep re-exports in playerStore
4. Test bookmark create/edit/delete

**Risk:** LOW - Bookmarks are independent
**Effort:** 2 hours

### Phase 4: Extract Sleep Timer Store
**Files to create:**
- `src/features/player/stores/sleepTimerStore.ts`

**Steps:**
1. Move sleep timer state and actions
2. Add subscription to playbackStore for pause trigger
3. Keep re-exports in playerStore
4. Test timer countdown, extension, shake detection

**Risk:** MEDIUM - Timer triggers pause
**Effort:** 3 hours

### Phase 5: Extract Speed Store
**Files to create:**
- `src/features/player/stores/speedStore.ts`

**Steps:**
1. Move speed state (`playbackRate`, `bookSpeedMap`, `globalDefaultRate`)
2. Move speed actions
3. Integrate with audioService.setPlaybackRate
4. Keep re-exports in playerStore
5. Test per-book speed memory

**Risk:** MEDIUM - Affects playback
**Effort:** 3 hours

### Phase 6: Extract Completion Store
**Files to create:**
- `src/features/player/stores/completionStore.ts`

**Steps:**
1. Move completion sheet state
2. Move `markBookFinished()` action
3. Add dependency on playbackStore for book/duration
4. Keep re-exports in playerStore
5. Test completion flow

**Risk:** MEDIUM - Touches queue, reading history
**Effort:** 3 hours

**IMPORTANT: queueStore Coordination**
The existing `queueStore` (`src/features/queue/stores/queueStore.ts`) already handles:
- Queue management (`addToQueue`, `removeFromQueue`, `playNext`)
- Auto-add next series book (`checkAndAddSeriesBook`)
- Book finish handling integration

`completionStore` should:
- Call `useQueueStore.getState().removeFromQueue(bookId)` on finish - DO NOT duplicate removal logic
- Call `useQueueStore.getState().playNext()` if queue has items after completion
- NOT implement its own queue logic - delegate to queueStore

Verify queueStore integration tests pass after extraction.

### Phase 7: Extract Seeking Store (CRITICAL - HIGHEST RISK)
**Files to create:**
- `src/features/player/stores/seekingStore.ts`

**Steps:**
1. Move seeking state (`isSeeking`, `seekPosition`, etc.)
2. Move all seek actions
3. Add read access to playbackStore for position/duration/chapters
4. Modify playbackStore.updatePlaybackState to check seekingStore.isSeeking
5. Keep re-exports in playerStore
6. Test all seek scenarios: drag, tap, chapter jump, continuous

**Risk:** HIGH - Core UX, seeking is complex
**Effort:** 6-10 hours (HIGHEST RISK PHASE)

**Why This Is The Highest Risk Phase:**
- Seeking state (`isSeeking`) gates position updates in `updatePlaybackState`
- Cross-store read required: seekingStore reads playbackStore's position/duration/chapters
- Continuous seeking uses module-level `seekInterval` timer
- Any bug causes visible jitter, stuck position, or broken scrubbing
- Must coordinate with audioService callbacks

**Recommended Approach:**
1. Extract state first, keep actions in playbackStore temporarily
2. Test that `isSeeking` check still works via cross-store read
3. Move actions one-by-one, testing each:
   - `startSeeking`, `commitSeek`, `cancelSeek` (core)
   - `seekTo` (instant seek)
   - `startContinuousSeeking`, `stopContinuousSeeking` (timer-based)
   - Chapter navigation (`jumpToChapter`, `nextChapter`, `prevChapter`)
4. Full regression test all seek scenarios before proceeding

### Phase 8: Extract Selectors
**Files to create:**
- `src/features/player/stores/selectors.ts`

**Steps:**
1. Move all 14 selector hooks
2. Import from appropriate stores
3. Re-export from playerStore for compatibility
4. Test UI components using selectors

**Risk:** LOW - Pure derived state
**Effort:** 2 hours

### Phase 9: Create Facade & Cleanup
**Steps:**
1. Convert playerStore.ts to thin facade re-exporting from sub-stores
2. Deprecation warnings for direct playerStore imports
3. Update imports in consuming files (optional, can be gradual)
4. Remove dead code from playerStore

**Risk:** LOW - Just re-organization
**Effort:** 4 hours

---

## 5. Files Affected

### 5.1 Direct Imports (37 files)

**Player Feature (14 files):**
- `src/features/player/screens/CDPlayerScreen.tsx`
- `src/features/player/screens/SpeedPanel.tsx`
- `src/features/player/screens/SleepTimerPanel.tsx`
- `src/features/player/sheets/SpeedSheet.tsx`
- `src/features/player/sheets/SleepTimerSheet.tsx`
- `src/features/player/components/ProgressBar.tsx`
- `src/features/player/components/BookCompletionSheet.tsx`
- `src/features/player/services/backgroundSyncService.ts`
- `src/features/player/stores/settingsStore.ts`
- `src/features/player/utils/types.ts`
- `src/features/player/types/seek.ts`
- `src/features/player/index.ts`

**Navigation (3 files):**
- `src/navigation/AppNavigator.tsx`
- `src/navigation/components/FloatingTabBar.tsx`
- `src/navigation/components/GlobalMiniPlayer.tsx`

**Other Features (15 files):**
- `src/features/home/screens/HomeScreen.tsx`
- `src/features/home/hooks/useHomeData.ts`
- `src/features/library/screens/MyLibraryScreen.tsx`
- `src/features/library/components/HorizontalBookItem.tsx`
- `src/features/book-detail/screens/BookDetailScreen.tsx`
- `src/features/book-detail/components/ChaptersTab.tsx`
- `src/features/series/screens/SeriesDetailScreen.tsx`
- `src/features/series/components/SeriesBookRow.tsx`
- `src/features/series/components/BatchActionButtons.tsx`
- `src/features/author/screens/AuthorDetailScreen.tsx`
- `src/features/narrator/screens/NarratorDetailScreen.tsx`
- `src/features/search/screens/SearchScreen.tsx`
- `src/features/discover/components/HeroSection.tsx`
- `src/features/automotive/automotiveService.ts`
- `src/features/automotive/useAutomotive.ts`
- `src/features/profile/screens/PlaybackSettingsScreen.tsx`

**Shared (4 files):**
- `src/shared/components/BookCard.tsx`
- `src/shared/components/CoverPlayButton.tsx`
- `src/shared/hooks/useMiniPlayerPadding.ts`
- `src/shared/hooks/useBookCardState.ts`

**Test (1 file):**
- `src/features/library/components/__tests__/HorizontalBookItem.test.tsx`

### 5.2 Migration Strategy for Imports

**Facade approach:** Keep `usePlayerStore` export from `playerStore.ts`. Consuming files don't need immediate updates.

```typescript
// playerStore.ts (facade)
export { usePlaybackStore, usePlaybackStore as usePlayerStore } from './playbackStore';
export { useSeekingStore } from './seekingStore';
// ... re-export all stores

// Re-export combined type for backwards compatibility
export type PlayerState = PlaybackState & SeekingState & ...;
```

---

## 6. Risk Assessment

### 6.1 Critical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Playback stops working | Medium | Critical | Phase by phase, test after each |
| Position updates break | Medium | High | Keep seeking logic atomic in Phase 7 |
| State desync between stores | Medium | High | Use subscribeWithSelector, avoid circular deps |
| Race conditions in loadBook | Low | High | Don't split loadBook, only extract helpers |

### 6.2 Moderate Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Sleep timer doesn't pause | Low | Medium | Test timer-pause integration in Phase 4 |
| Speed not persisted | Low | Medium | Verify AsyncStorage in Phase 5 |
| Completion sheet broken | Low | Medium | Test full finish flow in Phase 6 |
| Selectors return stale data | Medium | Low | Test all UI components using selectors |

### 6.3 Low Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Import errors after refactor | High | Low | Facade provides backwards compat |
| Settings lost on update | Low | Low | Don't change AsyncStorage keys |
| Bookmarks duplicated/lost | Low | Low | SQLite is authoritative |

---

## 7. Test Criteria

### 7.1 Phase 1 (Utilities) - Must Pass Before Proceeding
- [ ] Book loads and plays (online streaming)
- [ ] Book loads and plays (offline/downloaded)
- [ ] Smart rewind applies after pause
- [ ] Listening session recorded to SQLite

### 7.2 Phase 2 (Settings) - Must Pass
- [ ] All settings persist across app restart
- [ ] Skip intervals work in player
- [ ] Disc animation toggle works
- [ ] Standard player toggle works

### 7.3 Phase 3 (Bookmarks) - Must Pass
- [ ] Create bookmark at current position
- [ ] Edit bookmark title/note
- [ ] Delete bookmark
- [ ] Bookmarks load for correct book
- [ ] Jump to bookmark works

### 7.4 Phase 4 (Sleep Timer) - Must Pass
- [ ] Timer counts down correctly
- [ ] Playback pauses when timer expires
- [ ] Extend timer adds 15 minutes
- [ ] Shake-to-extend works when enabled
- [ ] Clear timer stops countdown

### 7.5 Phase 5 (Speed) - Must Pass
- [ ] Speed change applies immediately
- [ ] Per-book speed remembered
- [ ] New book uses global default
- [ ] Speed persists across app restart

### 7.6 Phase 6 (Completion) - Must Pass
- [ ] Completion sheet shows when book finishes
- [ ] "Mark as Finished" updates SQLite
- [ ] Auto-mark works when enabled
- [ ] Book removed from queue on finish

### 7.7 Phase 7 (Seeking) - CRITICAL - Must Pass
- [ ] Drag slider seeks to position
- [ ] Tap on timeline seeks
- [ ] Chapter jump works
- [ ] Skip forward/backward works
- [ ] Continuous rewind (hold button) works
- [ ] Position display updates during seek
- [ ] Position commits on release
- [ ] No jitter during seek
- [ ] No stale position after seek

### 7.8 Phase 8 (Selectors) - Must Pass
- [ ] `useDisplayPosition` returns seek position during seek
- [ ] `useCurrentChapter` updates during seek
- [ ] `useBookProgress` calculates correctly
- [ ] All 14 selectors work

### 7.9 Full Integration Test
- [ ] Load book → Play → Seek → Chapter jump → Pause → Resume with smart rewind
- [ ] Set sleep timer → Let it pause → Extend → Let it expire
- [ ] Add bookmark → Edit → Jump to it → Delete
- [ ] Change speed → Load different book → Speed remembered
- [ ] Finish book → Completion sheet → Mark finished → Next book plays

---

## 8. Effort Estimate

| Phase | Description | Hours | Cumulative | Risk |
|-------|-------------|-------|------------|------|
| 1 | Extract utilities | 4h | 4h | Low |
| 2 | Settings store | 3h | 7h | Low |
| 3 | Bookmarks store | 2h | 9h | Low |
| 4 | Sleep timer store | 3h | 12h | Medium |
| 5 | Speed store | 3h | 15h | Medium |
| 6 | Completion store | 3h | 18h | Medium |
| 7 | Seeking store | **6-10h** | 24-28h | **HIGHEST** |
| 8 | Selectors | 2h | 26-30h | Low |
| 9 | Facade & cleanup | 4h | 30-34h | Low |
| | **Buffer (20%)** | 6-7h | **36-41h** | |

**Total Estimate: 36-41 hours (4.5-5 days)**

**Phase 7 Variance Note:** The 6-10 hour range accounts for:
- Best case (6h): Clean extraction, no cross-store bugs
- Worst case (10h): Position sync issues requiring debugging, jitter fixes

---

## 9. Recommended Execution Order

1. **Phase 1 first** - Establishes patterns, low risk
2. **Phase 2-3-4** - Independent stores, build confidence
3. **Phase 5-6** - Slightly more integrated
4. **Phase 7 LAST** - Highest risk, do after other stores stable
5. **Phase 8-9** - Cleanup after everything works

**Do NOT parallelize phases.** Each phase must be complete and tested before starting the next.

---

## 10. Success Metrics

| Metric | Before | After |
|--------|--------|-------|
| playerStore.ts lines | 2,838 | ~50 (facade) |
| Largest single file | 2,838 | <400 |
| Number of stores | 1 | 8 |
| Distinct responsibilities per file | 16 | 1-2 |
| Test coverage | Unknown | Each store testable in isolation |

---

## 11. Rollback Plan

If issues discovered after deployment:

1. **Immediate:** Revert to previous playerStore.ts (single file)
2. **Short-term:** Fix issues in split stores, re-test
3. **Long-term:** Keep both implementations, feature flag to switch

**Recommendation:** Complete refactor in a feature branch, extensive QA before merge.
