# Spine System Rollback Guide

**Last Updated**: January 13, 2026
**Version**: v0.6.176+

## Quick Reference

```typescript
// INSTANT ROLLBACK (in production)
__spineSystem.disable();

// Verify rollback
console.log(__spineSystem.getFlags());
// → { useNewSystem: false }
```

---

## When to Rollback

Roll back to the old spine system if you observe any of these issues:

### Critical Issues (Rollback Immediately)
- **App crashes** when opening library or bookshelf views
- **Blank screens** where book spines should appear
- **Memory leaks** causing progressive slowdown
- **Missing book spines** (no covers showing)
- **Corrupt visual rendering** (garbled text, overlapping elements)

### Non-Critical Issues (Consider Rollback)
- **Performance degradation** (laggy scrolling, slow renders)
- **Incorrect genre styling** (wrong fonts/colors for specific genres)
- **Inconsistent dimensions** (spines jumping sizes unexpectedly)
- **Color extraction failures** (all spines showing fallback colors)

### Monitor These Metrics
- Library load time (should be <500ms for 1000 books)
- Memory usage (should not exceed baseline +20MB)
- Frame rate during scroll (should maintain 60fps)
- Spine cache hit rate (should be >90% after initial load)

---

## Rollback Methods

### Method 1: Instant Rollback (Feature Flag)

**Best For**: Production emergencies, quick testing

**Steps**:
1. Open the app in development mode or attach debugger
2. Access the debug console (Metro bundler or React Native Debugger)
3. Execute the rollback command:

```typescript
__spineSystem.disable();
```

4. Restart the app to apply changes (kills the JS bundle)
5. Verify rollback:

```typescript
console.log(__spineSystem.getFlags());
// Should show: { useNewSystem: false }
```

**What Happens**:
- All spine generation immediately switches to old system
- Adapter layer redirects all calls to `spineCalculations.ts`
- No code changes needed - instant rollback via runtime flag
- AsyncStorage persists the flag across app restarts

**Reverting Rollback**:
```typescript
__spineSystem.enable();
```

---

### Method 2: Code-Level Rollback (Git Revert)

**Best For**: If feature flag doesn't work, permanent rollback needed

**Steps**:

1. **Identify the migration commit**:
```bash
git log --oneline --grep="spine system" -10
# Look for: "feat: migrate to new modular spine system"
```

2. **Revert the migration commit**:
```bash
git revert <commit-hash> --no-commit
# Example: git revert a1b2c3d --no-commit
```

3. **Review changes**:
```bash
git diff --cached
# Verify that imports are reverting from adapter back to spineCalculations
```

4. **Test the rollback**:
```bash
npm start
# Test library, bookshelf, series views
```

5. **Commit the revert**:
```bash
git commit -m "revert: rollback to old spine system due to [ISSUE]

Reverts commit <hash>

Reason: [Describe the critical issue]
- What failed: [Specific symptoms]
- Impact: [User-facing problems]
- Rollback verified: [Testing done]

Refs: #[issue-number]"
```

6. **Push and deploy**:
```bash
git push origin <branch>
# Deploy to production
```

---

### Method 3: Gradual Rollback (Selective)

**Best For**: Rolling back specific features while keeping others

**Steps**:

1. **Identify problematic module**:
```bash
# Example: If color extraction is broken
cd src/features/home/utils/spine/colors
```

2. **Revert specific imports**:

In affected files (e.g., `BookSpineVertical.tsx`):
```typescript
// Change from:
import { getSpineColorForGenres } from '../utils/spine/adapter';

// Back to:
import { getSpineColorForGenres } from '../utils/spineCalculations';
```

3. **Keep other modules on new system**:
```typescript
// These can stay on new system if working:
import { calculateBookDimensions, hashString } from '../utils/spine/adapter';
```

4. **Test incrementally**:
- Test the specific feature you rolled back
- Verify other features still work
- Monitor for side effects

---

## Verification Checklist

After rolling back, verify these critical paths:

### Visual Verification
- [ ] Library view shows book spines correctly
- [ ] Bookshelf view renders without crashes
- [ ] Genre-specific styling displays properly
- [ ] Downloaded books show indicator correctly
- [ ] Progress bars appear on spines
- [ ] Color extraction works (or shows fallbacks)

### Functional Verification
- [ ] Tapping spines opens book detail
- [ ] Scrolling is smooth (60fps)
- [ ] Search filters work correctly
- [ ] Series view displays properly
- [ ] Genre browse page loads
- [ ] Author/narrator pages work

### Performance Verification
- [ ] Library loads in <500ms (for 1000 books)
- [ ] Memory usage is stable
- [ ] No console errors in logs
- [ ] Cache hit rate >90%
- [ ] No frame drops during scroll

### Data Integrity Verification
- [ ] No data loss (favorites, progress, bookmarks)
- [ ] SQLite cache still accessible
- [ ] AsyncStorage values intact
- [ ] Downloaded books still available

---

## Troubleshooting Rollback Issues

### Issue: Feature flag rollback doesn't work

**Symptoms**: `__spineSystem.disable()` runs but new system still active

**Solution**:
```typescript
// 1. Check current state
console.log(__spineSystem.getFlags());

// 2. Force disable at app startup
// In App.tsx, add BEFORE any spine imports:
import { disableNewSpineSystem } from '@/features/home/utils/spine/featureFlags';
disableNewSpineSystem();

// 3. Clear AsyncStorage if needed
import AsyncStorage from '@react-native-async-storage/async-storage';
await AsyncStorage.removeItem('spine:useNewSystem');

// 4. Restart app completely (kill and relaunch)
```

---

### Issue: Git revert has merge conflicts

**Symptoms**: `git revert` shows conflicts in imports

**Solution**:
```bash
# 1. Abort the revert
git revert --abort

# 2. Manual revert of key files
git show <commit-hash> -- src/features/home/utils/spine/adapter.ts > old-adapter.txt
# Review the diff to see what changed

# 3. Manually update imports in each file:
# Find all files using adapter
grep -r "from.*spine/adapter" src/ --include="*.tsx" --include="*.ts"

# 4. Change each import back to spineCalculations
# Example using sed:
find src/ -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's|spine/adapter|spineCalculations|g' {} +

# 5. Test thoroughly before committing
npm start
```

---

### Issue: Old system file is missing

**Symptoms**: Import error: `Cannot find module 'spineCalculations'`

**Solution**:
```bash
# 1. Check if old file exists
ls -la src/features/home/utils/spineCalculations.ts

# 2. If deleted, restore from git history
git checkout HEAD~5 -- src/features/home/utils/spineCalculations.ts

# 3. If not in recent history, find the commit
git log --all --full-history -- "*/spineCalculations.ts"

# 4. Restore from specific commit
git checkout <commit-hash> -- src/features/home/utils/spineCalculations.ts

# 5. Commit the restored file
git add src/features/home/utils/spineCalculations.ts
git commit -m "restore: bring back old spine system file"
```

---

## Monitoring After Rollback

### Key Metrics to Watch (48 hours)

**Performance**:
```typescript
// In production, log these metrics
const loadStart = Date.now();
// ... load library
const loadTime = Date.now() - loadStart;
console.log('[Spine] Library load:', loadTime, 'ms');

// Memory usage
const memory = performance.memory?.usedJSHeapSize;
console.log('[Spine] Memory:', (memory / 1024 / 1024).toFixed(1), 'MB');
```

**Error Tracking**:
```typescript
// In ErrorBoundary or error handler
if (error.message.includes('spine')) {
  logToAnalytics('spine_error', {
    system: 'old', // or 'new'
    error: error.message,
    stack: error.stack,
  });
}
```

**User Feedback**:
- Monitor support tickets for spine-related issues
- Check crash reports for spine-related stack traces
- Review app store reviews for visual complaints

---

## Reporting Issues

When reporting issues that required rollback, include:

### Required Information
1. **Version**: App version (from `constants/version.ts`)
2. **System**: Which spine system was active (old/new)
3. **Symptom**: Exact error or visual issue
4. **Impact**: How many users affected, severity
5. **Rollback Method**: Which method was used
6. **Outcome**: Did rollback resolve the issue?

### Helpful Debug Info
```typescript
// Gather this before rollback
const debugInfo = {
  spineSystem: __spineSystem.getFlags(),
  cacheSize: useSpineCacheStore.getState().cache.size,
  memoryUsage: performance.memory?.usedJSHeapSize,
  librarySize: /* number of books */,
  deviceInfo: {
    platform: Platform.OS,
    version: Platform.Version,
  },
};

console.log('[Rollback Debug]', JSON.stringify(debugInfo, null, 2));
```

### Issue Template
```markdown
## Spine System Rollback Report

**Version**: v0.6.176
**Date**: YYYY-MM-DD
**System**: New Spine System
**Rollback Method**: Feature Flag / Git Revert / Gradual

### Issue Description
[Describe what went wrong]

### Impact
- Users affected: [number or percentage]
- Severity: Critical / High / Medium / Low
- First observed: [timestamp]

### Symptoms
- [ ] Crashes
- [ ] Visual corruption
- [ ] Performance degradation
- [ ] Other: [describe]

### Rollback Process
1. [Steps taken]
2. [Time to rollback]
3. [Verification done]

### Outcome
- [ ] Issue resolved after rollback
- [ ] Partial improvement
- [ ] No change (deeper issue)

### Debug Info
\`\`\`json
[Paste debugInfo from above]
\`\`\`

### Next Steps
[What needs to be fixed before re-enabling new system]
```

---

## Re-Enabling After Rollback

Once issues are fixed:

1. **Test in development thoroughly**:
```bash
npm start
# Test all spine-related features for 30+ minutes
```

2. **Enable for beta testers first**:
```typescript
// Gradual rollout
const isBetaUser = checkBetaStatus();
if (isBetaUser) {
  __spineSystem.enable();
}
```

3. **Monitor metrics closely**:
- First 24 hours: Check every 2 hours
- Days 2-7: Check daily
- After 1 week: Normal monitoring

4. **Document lessons learned**:
```markdown
## Post-Mortem: [Issue Name]

### Root Cause
[What caused the issue]

### Detection
[How it was discovered]

### Resolution
[How it was fixed]

### Prevention
[Changes made to prevent recurrence]
```

---

## Emergency Contacts

If rollback doesn't resolve issues:

1. **Check MIGRATION_GUIDE.md** for advanced troubleshooting
2. **Review REFACTORING_SUMMARY.md** for architectural context
3. **Inspect adapter.ts** for feature flag logic
4. **Test with minimal repro** in isolated component

---

## Appendix: File Locations

### Feature Flag System
- `src/features/home/utils/spine/featureFlags.ts` - Runtime flags

### Adapter Layer (Compatibility)
- `src/features/home/utils/spine/adapter.ts` - Forwards calls to new or old system

### Old System (Rollback Target)
- `src/features/home/utils/spineCalculations.ts` - Original 2,907-line implementation

### New System (Current)
- `src/features/home/utils/spine/` - Modular 12-file architecture
  - `constants.ts` - All magic numbers
  - `core/` - Dimension and hashing logic
  - `genre/` - Genre matching and profiles
  - `colors/` - Color extraction
  - `typography/` - Font and layout logic
  - `config.ts` - SpineConfig builder
  - `generator.ts` - Main API

### Updated Components (18 files)
- `src/features/home/stores/spineCache.ts`
- `src/features/home/components/BookSpineVertical.tsx`
- `src/features/home/components/BookshelfView.tsx`
- `src/features/browse/components/SeriesCard.tsx`
- `src/features/library/components/GenreCards.tsx`
- [... and 13 others]

---

**End of Rollback Guide**

For questions or issues with this guide, see:
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Migration details
- [README.md](./README.md) - Architecture overview
- [REFACTORING_SUMMARY.md](./REFACTORING_SUMMARY.md) - Change summary
