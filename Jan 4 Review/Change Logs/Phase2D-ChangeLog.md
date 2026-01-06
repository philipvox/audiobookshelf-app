# Phase 2D Change Log: Screen Refactors

**Date:** January 5, 2026
**Duration:** ~30 minutes
**Items Completed:** 2.17 (partial - core services)

---

## Summary

Phase 2D contains large refactoring tasks. Progress was made on 2.17 (console.log cleanup) by converting core services to use the logger utility. Items 2.14, 2.15, and 2.16 are deferred due to their complexity and scope.

---

## Item Status Overview

| Item | Status | Notes |
|------|--------|-------|
| 2.14 MyLibraryScreen refactor | ⏸️ Deferred | 2,020 lines → 5 tab components |
| 2.15 useDiscoverData.ts split | ⏸️ Deferred | 803 lines → 5 focused hooks |
| 2.16 playerStore.ts split | ⏸️ Deferred | 2,838 lines → 5 domain stores (LARGE) |
| 2.17 Console.log cleanup | 🔄 In Progress | 9 files converted (~246 calls, 44%) |

---

## Item 2.17: Console.log Cleanup (Partial)

### Scope Assessment

- **Total occurrences:** 557 console.* calls
- **Total files:** 64 files
- **This session:** 9 files converted (~246 calls)
- **Remaining:** ~311 calls in 55 files

### Files Modified

#### 1. src/core/auth/authService.ts

**Changes:** 19 console.* calls → log.*

```typescript
// Before
console.error('Failed to store token:', error);
console.log(`[AuthService] Session restored for user: ${user.username}`);

// After
import { authLogger as log } from '@/shared/utils/logger';
log.error('Failed to store token:', error);
log.info(`Session restored for user: ${user.username}`);
```

**Console calls converted:**
- `console.error` → `log.error` (11 occurrences)
- `console.log` → `log.debug/info` (6 occurrences)
- `console.warn` → `log.warn` (2 occurrences)

---

#### 2. src/core/services/appInitializer.ts

**Changes:** 21 console.* calls → log.*

```typescript
// Before
console.log('[AppInitializer] Starting parallel initialization...');
console.warn('[AppInitializer] Font loading failed:', err);

// After
import { createLogger } from '@/shared/utils/logger';
const log = createLogger('AppInit');
log.info('Starting parallel initialization...');
log.warn('Font loading failed:', err);
```

**Console calls converted:**
- `console.log` → `log.info/debug` (14 occurrences)
- `console.warn` → `log.warn` (7 occurrences)

---

#### 3. src/core/services/finishedBooksSync.ts

**Changes:** 6 console.* calls → log.*

```typescript
// Before
console.warn(`[FinishedBooksSync] Failed to sync ${book.bookId}:`, err);
console.log(`[FinishedBooksSync] Synced ${synced}, failed ${failed}`);

// After
import { syncLogger as log } from '@/shared/utils/logger';
log.warn(`Failed to sync ${book.bookId}:`, err);
log.info(`Synced ${synced}, failed ${failed}`);
```

---

#### 4. src/core/services/websocketService.ts

**Changes:** 18 console.* calls → log.*

```typescript
// Before
console.log('[WebSocket] Connected');
console.error('[WebSocket] Connection error:', error);
console.log('[WebSocket] Item updated:', payload.id);

// After
import { createLogger } from '@/shared/utils/logger';
const log = createLogger('WebSocket');
log.info('Connected');
log.error('Connection error:', error);
log.debug('Item updated:', payload.id);
```

**Log level mapping:**
| Original | New Level | Rationale |
|----------|-----------|-----------|
| Connection state changes | `info` | Important for debugging |
| Item events | `debug` | High frequency, only needed for troubleshooting |
| Errors | `error` | Always visible |
| App state changes | `debug` | Background info |

---

#### 5. src/core/auth/authContext.tsx

**Changes:** 5 console.* calls → log.*

```typescript
// Before
console.warn('[AuthContext] Auth failure detected - logging out');

// After
import { authLogger as log } from '@/shared/utils/logger';
log.warn('Auth failure detected - logging out');
```

---

#### 6. src/core/cache/libraryCache.ts

**Changes:** 24 console.* calls → log.*

```typescript
// Before
DEBUG && console.log('[LibraryCache] Using cached data (5 min old)');
console.error('[LibraryCache] Failed to load:', error);

// After
import { createLogger } from '@/shared/utils/logger';
const log = createLogger('LibraryCache');
log.debug('Using cached data (5 min old)');
log.error('Failed to load:', error);
```

**Note:** Removed `DEBUG` constant - logger handles environment-aware filtering.

---

#### 7. src/features/queue/stores/queueStore.ts

**Changes:** 29 console.* calls → log.*

```typescript
// Before
console.log('[QueueStore] Initialized with 3 items, autoplay: true');
console.error('[QueueStore] addToQueue error:', err);

// After
import { createLogger } from '@/shared/utils/logger';
const log = createLogger('QueueStore');
log.info('Initialized with 3 items, autoplay: true');
log.error('addToQueue error:', err);
```

---

#### 8. src/core/services/sqliteCache.ts

**Changes:** 116 console.* calls → log.*

```typescript
// Before
console.log('[SQLiteCache] Initializing database...');
console.error('[SQLiteCache] Failed to initialize:', err);
console.warn('[SQLiteCache] getLibraryItems error:', err);

// After
import { createLogger } from '@/shared/utils/logger';
const log = createLogger('SQLiteCache');
log.info('Initializing database...');
log.error('Failed to initialize:', err);
log.warn('getLibraryItems error:', err);
```

**Log level mapping:**
- Initialization & migration events → `log.info`
- Error cases → `log.error`
- Query/operation errors → `log.warn`
- Cache hits, debug info → `log.debug`

---

## Migration Pattern

For other files, follow this pattern:

### 1. Import the logger

```typescript
// Option A: Use a pre-configured logger
import { apiLogger, authLogger, playerLogger, syncLogger } from '@/shared/utils/logger';
const log = apiLogger;

// Option B: Create a custom logger
import { createLogger } from '@/shared/utils/logger';
const log = createLogger('ModuleName');
```

### 2. Replace console calls

| Old | New | When to use |
|-----|-----|-------------|
| `console.log('[Prefix] message')` | `log.debug('message')` | Verbose/frequent logs |
| `console.log('[Prefix] message')` | `log.info('message')` | Important state changes |
| `console.warn('[Prefix] message')` | `log.warn('message')` | Warnings |
| `console.error('[Prefix] message')` | `log.error('message')` | Errors |

### 3. Remove prefix from message

The logger adds the module prefix automatically:
```typescript
// Before
console.log('[WebSocket] Connected to server');

// After (prefix added by logger)
log.info('Connected to server');
// Output: [WebSocket][info +5ms] Connected to server
```

---

## Remaining Work for 2.17

### Priority Files (High traffic)

| File | Console calls | Priority | Status |
|------|---------------|----------|--------|
| sqliteCache.ts | 116 | High - core DB layer | ✅ Done |
| queueStore.ts | 29 | High - player queue | ✅ Done |
| libraryCache.ts | 24 | High - data caching | ✅ Done |
| playerStore.ts | 8 | Medium - already well-documented | ✅ Done |

### Can Skip (Debug utilities)

| File | Reason |
|------|--------|
| audioDebug.ts | Intentional debug utility |
| perfDebug.ts | Performance measurement tool |
| runtimeMonitor.ts | Runtime diagnostics |

---

## Items Deferred to Future Sprint

### 2.14 MyLibraryScreen Refactor

**Current state:** 2,020 lines
**Target:** Extract 5 tab components
**Reason deferred:**
- Large scope requiring careful component extraction
- Needs thorough testing across all tabs
- Dependencies on useFilteredLibrary (now available)

### 2.15 useDiscoverData.ts Split

**Current state:** 803 lines
**Target:** Split to 5 focused hooks
**Reason deferred:**
- Complex data flow with multiple derived states
- getFeaturedReason integration needed
- Requires understanding full discover flow

### 2.16 playerStore.ts Split

**Current state:** 2,838 lines
**Target:** Split to 5 domain stores
**Effort:** LARGE
**Reason deferred:**
- Most complex store in the app
- Critical path for audio playback
- Requires careful state migration plan
- Highest risk refactor

---

## Phase 2D Summary

| Item | Status | Progress |
|------|--------|----------|
| 2.14 MyLibraryScreen | ⏸️ Deferred | 0% |
| 2.15 useDiscoverData | ⏸️ Deferred | 0% |
| 2.16 playerStore | ⏸️ Deferred | 0% |
| 2.17 Console.log cleanup | 🔄 In Progress | ~44% (246/557 calls) |

---

## Next Steps

1. **Continue 2.17** - Convert remaining high-priority files
2. **Consider 2.14** in dedicated sprint with full testing
3. **Consider 2.16** with detailed migration plan

---

## Benefits Achieved

1. **Core services now use structured logging:**
   - Auth flow fully logged with proper levels
   - App initialization tracked
   - WebSocket events categorized
   - Sync operations logged

2. **Debug logs hidden in production:**
   - Default log level is WARN in production
   - Reduces console noise
   - Performance improvement

3. **Pattern established for remaining files:**
   - Clear migration guide
   - Pre-configured module loggers available
