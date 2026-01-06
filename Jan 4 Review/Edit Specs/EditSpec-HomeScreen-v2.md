# Edit Specification: Home Screen (v2)

**Version:** 2 (post-validation)
**Changes from v1:** Corrected effort estimate (5.5h → S), made design decision (keep HeroSection)

**Covers Action Plan Items:** 2.25, 4.13
**Priority:** Medium (Phase 2F / Phase 4)
**Effort:** S (Small) - 4-6 hours

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

---

## Design Decision: HeroSection vs CD Disc

**Decision:** Keep HeroSection (Option A)

**Rationale:**
1. CD disc design is now exclusive to `CDPlayerScreen` - having it on both would dilute its impact
2. HeroSection matches the Browse page pattern for consistency
3. Large cover provides better book identification at a glance
4. Original spec predates the CDPlayerScreen implementation

**Action:** Document in `docs/SCREENS.md`:

```markdown
## HomeScreen Design Notes

The original spec showed a CD disc design on the home screen. After implementation,
this was changed to a HeroSection with large cover image for the following reasons:
- CD disc is now the signature feature of the full-screen CDPlayerScreen
- HeroSection matches the Browse/Discover page pattern for consistency
- Large cover provides better book identification at a glance

This is an intentional design decision, not a missing feature.
```

---

## Issues Identified

| Issue | Source | Severity |
|-------|--------|----------|
| Design diverged from spec - no CD disc | [27] | Low (Resolved: intentional) |
| Quick action pills missing | [27] | Low |
| useContinueListening is cross-feature import | [29], [31] | Low |

---

## Specific Changes

### 2.25: Document Design Decision

**File to create/update:** `docs/SCREENS.md`

Add HomeScreen section as shown above explaining the HeroSection decision.

---

### 4.13: Add Quick Action Pills

**Add below HeroSection:**

```typescript
import { Moon, Gauge, Layers } from 'lucide-react-native';
import { usePlayerStore } from '@/features/player/stores/playerStore';
import { useQueueStore } from '@/features/queue/stores/queueStore';

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

// Format remaining sleep time
const formatTimeRemaining = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  }
  return `${mins}m`;
};

// In HomeScreen component
const { playbackRate, sleepTimer } = usePlayerStore();
const queueItems = useQueueStore((state) => state.items);
const queueCount = queueItems.length;

// In render, after hero section
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

---

### Update Cross-Feature Import

**After 2.1 (cross-feature imports) is complete:**
```typescript
// Before
import { useContinueListening } from '@/features/home/hooks/useContinueListening';

// After (moved to shared)
import { useInProgressBooks } from '@/shared/hooks/useInProgressBooks';

// Update usage
const { currentBook, inProgressBooks } = useInProgressBooks();
```

---

## Cross-Screen Dependencies

| Change | Affects |
|--------|---------|
| Quick action pills | Needs SleepTimer, SpeedSettings navigation targets |
| Store imports | playerStore, queueStore |
| useInProgressBooks | After 2.11 completion |

---

## Testing Criteria

- [ ] Hero section displays current book correctly
- [ ] Quick action pills show current values
- [ ] Sleep pill shows remaining time or "Off"
- [ ] Speed pill shows current rate (e.g., "1.5x")
- [ ] Queue pill shows count (or hides value if empty)
- [ ] Tapping pills navigates to correct screens
- [ ] Continue Listening grid shows in-progress books
- [ ] Recently Added shows new books
- [ ] Your Series shows series with progress

---

## Effort Breakdown

| Task | Effort | Risk |
|------|--------|------|
| Document design decision | 30 min | Low |
| Create QuickActionPill component | 1 hour | Low |
| Add quick actions to HomeScreen | 1 hour | Low |
| Wire up store values | 1 hour | Low |
| Update cross-feature imports | 30 min | Low |
| Testing | 1 hour | - |

**Total: 4-6 hours (S)**
