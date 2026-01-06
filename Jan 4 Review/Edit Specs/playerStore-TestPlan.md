# playerStore Refactor - Test Plan

**Related Spec:** `EditSpec-playerStore-Refactor.md`
**Created:** January 5, 2026
**Purpose:** Manual test checklist to verify player functionality after each refactor phase

---

## Manual Test Checklist

### Core Playback

- [ ] Play book (streaming)
- [ ] Play book (downloaded/offline)
- [ ] Pause and resume
- [ ] Smart rewind applies after pause (based on pause duration)
- [ ] Background playback continues
- [ ] App kill and resume at correct position
- [ ] Lock screen controls work

### Seeking

- [ ] Drag slider to seek
- [ ] Tap on timeline to seek
- [ ] Skip forward button
- [ ] Skip backward button
- [ ] Hold skip button for continuous seek
- [ ] Chapter jump (next/prev)
- [ ] Jump to specific chapter from list
- [ ] Position display updates during drag (no jitter)
- [ ] Position commits correctly on release
- [ ] No stale position after seek completes
- [ ] Mini player position syncs with full player during seek
- [ ] Automotive controls seek correctly

### Sleep Timer

- [ ] Set timer (15m, 30m, 45m, 1h, end of chapter)
- [ ] Timer counts down correctly
- [ ] Playback pauses when timer expires
- [ ] Extend timer (+15 min)
- [ ] Clear timer
- [ ] Shake-to-extend works when enabled
- [ ] 60-second warning haptic

### Speed

- [ ] Change speed (0.5x to 3x)
- [ ] Speed applies immediately
- [ ] Per-book speed remembered when switching books
- [ ] New book uses global default
- [ ] Speed persists across app restart

### Bookmarks

- [ ] Add bookmark at current position
- [ ] Bookmark saves with correct timestamp
- [ ] Edit bookmark title/note
- [ ] Delete bookmark
- [ ] Jump to bookmark seeks correctly
- [ ] Bookmarks load for correct book only
- [ ] Bookmarks persist across app restart

### Completion

- [ ] Completion sheet shows when book finishes
- [ ] "Mark as Finished" updates reading history
- [ ] Auto-mark works when enabled
- [ ] Book removed from queue on finish
- [ ] Next book auto-plays (if queue has items)

### Settings

- [ ] Skip forward interval persists
- [ ] Skip backward interval persists
- [ ] Disc animation toggle works
- [ ] All 15 AsyncStorage settings survive app restart

### Edge Cases

- [ ] Download completes while playing → seamless switch to local file
- [ ] Network loss during streaming → graceful error, can resume
- [ ] Load book that's already playing → no duplicate load
- [ ] Rapid play/pause doesn't break state
- [ ] Seek while paused → position correct on resume

---

## Full Integration Scenarios

### Scenario A: Normal Listening Session

```
1. Load book
2. Play
3. Seek (drag slider)
4. Chapter jump (next)
5. Add bookmark
6. Pause
7. Wait 30+ seconds
8. Resume
9. VERIFY: Smart rewind applied (position slightly before pause point)
10. Stop
```

**Pass Criteria:** All steps complete without error, smart rewind observable

### Scenario B: Sleep Timer Flow

```
1. Play book
2. Set sleep timer (use shortest for testing, or mock time)
3. Let countdown proceed
4. At 60s remaining: VERIFY warning haptic
5. Extend timer (+15 min)
6. VERIFY: Timer increased
7. Let timer expire
8. VERIFY: Playback paused automatically
```

**Pass Criteria:** Timer counts down, extends correctly, pauses on expiry

### Scenario C: Book Completion

```
1. Play book near end (seek to ~30s before end)
2. Let playback finish naturally
3. VERIFY: Completion sheet appears
4. Tap "Mark as Finished"
5. VERIFY: Book marked in reading history
6. VERIFY: Book removed from queue (if was in queue)
7. VERIFY: Next book plays (if queue has items)
```

**Pass Criteria:** Completion flow triggers, state updates correctly

### Scenario D: Multi-Book Session

```
1. Play Book A
2. Change speed to 1.5x
3. VERIFY: Speed applies immediately
4. Load Book B (different book)
5. VERIFY: Book B uses global default speed (1.0x)
6. Change Book B speed to 2.0x
7. Return to Book A
8. VERIFY: Book A still at 1.5x
9. Restart app
10. Load Book A
11. VERIFY: Speed still 1.5x
```

**Pass Criteria:** Per-book speed memory works, persists across restart

### Scenario E: Offline Playback

```
1. Enable airplane mode
2. Play downloaded book
3. Seek to various positions
4. Add bookmark
5. Play until near end
6. Let book finish
7. VERIFY: Completion works offline
8. Disable airplane mode
9. VERIFY: All data syncs when online
```

**Pass Criteria:** Full functionality works offline, syncs when reconnected

---

## Regression Triggers

**If any of these happen, STOP and fix before continuing:**

| Trigger | Severity | Action |
|---------|----------|--------|
| Playback doesn't start | CRITICAL | Revert phase, debug |
| Position jumps unexpectedly | CRITICAL | Revert phase, debug |
| Seeking causes jitter or wrong position | CRITICAL | Revert phase, debug |
| App crashes on any player action | CRITICAL | Revert phase, debug |
| State doesn't persist after app restart | HIGH | Fix before next phase |
| Audio continues after pause | HIGH | Fix before next phase |
| Smart rewind doesn't apply | MEDIUM | Note, can fix later |
| Haptics don't fire | LOW | Note, can fix later |

---

## Phase-Specific Test Focus

### After Phase 1 (Utilities)
- [ ] Core Playback: All items
- [ ] Smart rewind applies after pause
- [ ] Scenario A passes

### After Phase 2 (Settings Store)
- [ ] Settings: All items
- [ ] App restart preserves all settings

### After Phase 3 (Bookmarks Store)
- [ ] Bookmarks: All items
- [ ] Bookmarks persist across restart

### After Phase 4 (Sleep Timer Store)
- [ ] Sleep Timer: All items
- [ ] Scenario B passes

### After Phase 5 (Speed Store)
- [ ] Speed: All items
- [ ] Scenario D passes

### After Phase 6 (Completion Store)
- [ ] Completion: All items
- [ ] Scenario C passes
- [ ] Queue integration works (book removed on finish)

### After Phase 7 (Seeking Store) - CRITICAL
- [ ] Seeking: ALL items (most important phase)
- [ ] Edge Cases: Seek while paused
- [ ] Mini player sync
- [ ] Automotive controls
- [ ] NO JITTER during drag
- [ ] NO STALE POSITION after release

### After Phase 8 (Selectors)
- [ ] All UI displays correct values
- [ ] Chapter display updates during seek
- [ ] Progress percentages correct

### After Phase 9 (Facade)
- [ ] ALL scenarios pass (A through E)
- [ ] No regressions from any phase
- [ ] Import errors resolved

---

## Rollback Plan

### Before Starting

```bash
# Create backup before any changes
cp src/features/player/stores/playerStore.ts \
   src/features/player/stores/playerStore.backup.ts
```

### If Phase Fails

1. **Immediate:** Restore from backup
   ```bash
   cp src/features/player/stores/playerStore.backup.ts \
      src/features/player/stores/playerStore.ts
   ```

2. **Debug:** Identify root cause in isolation
   - Create test file for specific store
   - Verify cross-store communication
   - Check for circular dependencies

3. **Retry:** Re-attempt extraction with fix applied

4. **Escalate:** If 3 attempts fail, reconsider split boundary

### Never Merge Until

- [ ] All 9 phases complete
- [ ] All scenarios (A-E) pass
- [ ] Full regression checklist green
- [ ] Tested on both iOS and Android
- [ ] Tested online and offline

---

## Test Environment Checklist

Before testing each phase:

- [ ] Fresh app install (or clear AsyncStorage)
- [ ] At least 2 books available (1 downloaded, 1 streaming)
- [ ] One book with multiple chapters
- [ ] Queue has at least 1 item
- [ ] Both iOS and Android devices available
- [ ] Can test offline mode (airplane mode)

---

## Sign-Off

| Phase | Tester | Date | Pass/Fail | Notes |
|-------|--------|------|-----------|-------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |
| 6 | | | | |
| 7 | | | | |
| 8 | | | | |
| 9 | | | | |
| **Final** | | | | |
