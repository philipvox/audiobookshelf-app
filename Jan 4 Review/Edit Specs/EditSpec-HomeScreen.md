# Edit Specification: Home Screen

**Covers Action Plan Items:** 2.10, 4.14
**Priority:** Medium (Phase 2 / Phase 4)
**Effort:** M (Medium) - 1-2 days

---

## Current State

### HomeScreen.tsx
- **File:** `src/features/home/screens/HomeScreen.tsx`
- **Lines:** 366 (well-organized)
- **Status:** Clean after recent redesign

### Current Layout
- Blurred cover background (HeroSection)
- Book title + author
- Large cover image (not CD disc)
- Continue Listening 2x2 grid
- Recently Added section
- Your Series section

### Design Divergence
- Uses HeroSection instead of CD disc design from original spec
- Quick action pills (Sleep, Speed, Queue) not present on home

---

## Issues Identified

| Issue | Source | Severity |
|-------|--------|----------|
| Design diverged from spec - no CD disc | [27] | Low |
| Quick action pills missing | [27] | Low |
| useContinueListening is cross-feature import | [29], [31] | Low |

---

## Alignment Requirements

From [27] Implementation Completeness:
- 85% complete
- Gap: CD disc design removed from home (moved to CDPlayerScreen)
- Gap: Quick action pills not present on home

From [31] Alignment Audit:
- Kid Mode filtering should use consolidated hook after 2.15

Decision needed: Restore CD disc OR document that HeroSection is intentional divergence

---

## Specific Changes

### 2.10: Evaluate Design Divergence

**Option A: Keep Current (HeroSection)**
Document in `docs/SCREENS.md` that design intentionally diverged:
```markdown
## HomeScreen Design Notes

The original spec showed a CD disc design on the home screen. After implementation,
this was changed to a HeroSection with large cover image for the following reasons:
- CD disc is now featured in the full-screen CDPlayerScreen
- HeroSection matches the Browse page pattern for consistency
- Large cover provides better book identification at a glance

This is an intentional design decision, not a missing feature.
```

**Option B: Restore CD Disc**
If product decision is to restore CD disc:

```typescript
// Replace HeroSection with CoverDisc component
import { CoverDisc } from '@/features/player/components/CoverDisc';

{currentBook && (
  <CoverDisc
    coverUrl={coverUrl}
    isPlaying={isPlaying}
    onPress={togglePlayer}
    size={scale(200)}
  />
)}
```

### 4.14: Add Quick Action Pills

**Add below HeroSection:**

```typescript
interface QuickActionProps {
  icon: LucideIcon;
  label: string;
  value?: string;
  onPress: () => void;
}

const QuickActionPill: React.FC<QuickActionProps> = ({
  icon: Icon,
  label,
  value,
  onPress,
}) => (
  <TouchableOpacity style={styles.pill} onPress={onPress}>
    <Icon size={scale(16)} color={colors.textPrimary} />
    <Text style={styles.pillLabel}>{label}</Text>
    {value && <Text style={styles.pillValue}>{value}</Text>}
  </TouchableOpacity>
);

// In HomeScreen render, after hero section
{currentBook && (
  <View style={styles.quickActions}>
    <QuickActionPill
      icon={Moon}
      label="Sleep"
      value={sleepTimer ? formatTimeRemaining(sleepTimer) : 'Off'}
      onPress={() => navigation.navigate('SleepTimer')}
    />
    <QuickActionPill
      icon={Gauge}
      label="Speed"
      value={`${playbackRate}x`}
      onPress={() => navigation.navigate('SpeedSettings')}
    />
    <QuickActionPill
      icon={Layers}
      label="Queue"
      value={queueCount > 0 ? `${queueCount}` : undefined}
      onPress={() => navigation.navigate('Queue')}
    />
  </View>
)}

const styles = StyleSheet.create({
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    gap: spacing.xs,
  },
  pillLabel: {
    fontSize: scale(13),
    color: colors.textSecondary,
  },
  pillValue: {
    fontSize: scale(13),
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
```

**Get values from stores:**
```typescript
const { playbackRate, sleepTimer } = usePlayerStore();
const queueCount = useQueueCount();
```

### Update Cross-Feature Import

**After 2.3 is complete:**
```typescript
// Before
import { useContinueListening } from '@/features/home/hooks/useContinueListening';

// After (moved to shared)
import { useContinueListening } from '@/shared/hooks/useContinueListening';
```

---

## Cross-Screen Dependencies

| Change | Affects |
|--------|---------|
| Quick action pills | Needs SleepTimer, Speed navigation targets |
| CoverDisc component | Shared with CDPlayerScreen |
| Store imports | playerStore, queueStore |

---

## Testing Criteria

- [ ] Hero section displays current book correctly
- [ ] Quick action pills show current values
- [ ] Sleep pill shows remaining time or "Off"
- [ ] Speed pill shows current rate
- [ ] Queue pill shows count (or hides if empty)
- [ ] Tapping pills navigates to correct screens
- [ ] Continue Listening grid shows in-progress books
- [ ] Recently Added shows new books
- [ ] Your Series shows series with progress

---

## Effort Breakdown

| Task | Effort | Risk |
|------|--------|------|
| Document design decision OR restore CD | 1 hour | Low |
| Create QuickActionPill component | 1 hour | Low |
| Add quick actions to HomeScreen | 1 hour | Low |
| Wire up store values | 1 hour | Low |
| Update cross-feature imports | 30 min | Low |
| Testing | 1 hour | - |

**Total: 1-2 days (if adding pills)**
