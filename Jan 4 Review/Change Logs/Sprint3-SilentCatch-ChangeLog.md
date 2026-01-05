# Sprint 3: Silent Catch Blocks - Change Log

**Date:** January 5, 2026
**Task:** Add user-facing error feedback for silent catch blocks

---

## Summary

Added user-facing error feedback (via useToast) to catch blocks for user-initiated actions, while converting remaining console.log/warn/error calls to the centralized logger.

### Pattern Used

```typescript
import { logger } from '@/shared/utils/logger';
import { useToast } from '@/shared/hooks/useToast';

const { showError } = useToast();

// In catch block:
} catch (error) {
  logger.error('[Module] Error message:', error);
  showError('User-friendly error message. Please try again.');
}
```

---

## Files Updated

### User-Initiated Actions (with showError)

| File | Action | Error Message |
|------|--------|---------------|
| `SearchScreen.tsx` | Clear search history | "Failed to clear search history. Please try again." |
| `SearchScreen.tsx` | Remove from history | "Failed to remove search item. Please try again." |
| `ReadingHistoryScreen.tsx` | Sync all | "Sync failed. Please try again." |
| `ReadingHistoryScreen.tsx` | Sync selected | "Sync failed. Please try again." |
| `CDPlayerScreen.tsx` | Start download | "Failed to start download. Please try again." |
| `HeroSection.tsx` | Queue download | "Failed to start download. Please try again." |

### Logger Conversion Only (Background Operations)

These files had console statements converted to logger, but no user notification added since they are background operations with graceful fallbacks:

| File | Reason |
|------|--------|
| `AuthorDetailScreen.tsx` | API fetch with cache fallback |
| `StorageSettingsScreen.tsx` | Already had Alert for user feedback |
| `LoginScreen.tsx` | Background load of last server URL |

---

## Files NOT Updated (Intentionally Excluded)

### Debug/Monitoring Tools
- `src/utils/runtimeMonitor.ts`
- `src/shared/utils/audioDebug.ts`
- `src/utils/perfDebug.ts`
- `src/core/monitoring/sentry.ts`
- `src/core/analytics/analyticsService.ts`
- `src/features/debug/screens/DebugStressTestScreen.tsx`
- `src/features/player/services/audioService.ts` (uses audioLog)

### Background/Infrastructure Operations
These are non-user-initiated operations where errors don't require user notification:
- `src/shared/theme/ThemeContext.tsx` - Theme load/save
- `src/shared/hooks/useImageColors.ts` - Image color extraction
- `src/features/search/hooks/useServerSearch.ts` - Server search
- `src/features/completion/stores/completionStore.ts` - Hydration
- `src/core/api/offlineApi.ts` - Network status check
- `src/core/queryClient.ts` - Prefetch operations

---

## Design Decisions

1. **User-initiated actions get user feedback**: Actions where the user pressed a button (clear history, download, sync) show toast errors on failure.

2. **Background operations use logger only**: Automatic operations (loading cached data, prefetching) only log errors without bothering the user.

3. **Graceful fallbacks don't need errors**: When there's a working fallback (e.g., API fails but cache works), no user notification is shown.

4. **Keep haptic feedback where present**: Some catch blocks already had haptic error feedback; we added toast messages in addition to haptics for clarity.

---

## Benefits

1. **Better UX** - Users know when their actions fail
2. **Actionable feedback** - "Please try again" gives users a clear next step
3. **Non-intrusive for background ops** - Users aren't bothered by infrastructure errors
4. **Debugging preserved** - All errors still logged via logger for debugging
