# Hidden Items Documentation

## Overview

The Hidden Items feature allows users to dismiss books they're not interested in from recommendations. Hidden books are removed from the Browse/Discover screens but can be restored at any time from the Profile screen.

**Key Components:**
- `dismissedItemsStore` - Zustand store for hidden state
- `SwipeableBookCard` - Swipe-to-dismiss UI wrapper
- `DismissToast` - Undo notification toast
- `HiddenItemsScreen` - Recovery/management screen

---

## How Hiding Works

### User Interaction Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                       Browse Screen                               │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  SwipeableBookCard wraps recommendation cards                │ │
│  │                                                              │ │
│  │  User swipes left on a book card                             │ │
│  │      ↓                                                       │ │
│  │  "Not Interested" action revealed                            │ │
│  │      ↓                                                       │ │
│  │  Continue swipe past threshold (80px) or velocity > 500      │ │
│  │      ↓                                                       │ │
│  │  Card animates off-screen                                    │ │
│  │      ↓                                                       │ │
│  │  dismissItem(bookId, 'not_interested') called                │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  DismissToast appears at bottom                              │ │
│  │  "Removed from recommendations" + [Undo] button              │ │
│  │  Auto-hides after 5 seconds                                  │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Swipe Gesture Implementation

**File:** `src/features/discover/components/SwipeableBookCard.tsx`

```typescript
const SWIPE_THRESHOLD = 80;      // Pixels to trigger dismiss
const DISMISS_VELOCITY = 500;    // Velocity to auto-dismiss

const panGesture = Gesture.Pan()
  .enabled(enabled)
  .activeOffsetX([-10, 10])      // Horizontal swipe only
  .onUpdate((event) => {
    // Only allow left swipe (negative translateX)
    if (event.translationX < 0) {
      translateX.value = event.translationX;
    }
  })
  .onEnd((event) => {
    const shouldDismiss =
      translateX.value < -SWIPE_THRESHOLD ||
      event.velocityX < -DISMISS_VELOCITY;

    if (shouldDismiss) {
      // Animate off-screen and call dismiss
      isDismissing.value = true;
      translateX.value = withTiming(-screenWidth, { duration: 200 }, () => {
        runOnJS(handleDismiss)();
      });
    } else {
      // Snap back to original position
      translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
    }
  });
```

### Visual Feedback During Swipe

As the user swipes, a "Not Interested" indicator fades in:

```typescript
// Action indicator opacity based on swipe distance
const actionStyle = useAnimatedStyle(() => ({
  opacity: interpolate(
    Math.abs(translateX.value),
    [0, SWIPE_THRESHOLD],
    [0, 1],
    Extrapolation.CLAMP
  ),
  transform: [{
    scale: interpolate(
      Math.abs(translateX.value),
      [0, SWIPE_THRESHOLD],
      [0.5, 1],
      Extrapolation.CLAMP
    ),
  }],
}));
```

---

## Where Hidden State Lives

### Zustand Store

**File:** `src/features/recommendations/stores/dismissedItemsStore.ts`

```typescript
interface DismissedItem {
  id: string;
  dismissedAt: number;
  reason?: 'not_interested' | 'already_read' | 'dislike_author';
}

interface DismissedItemsState {
  // Map of bookId -> dismissal info
  dismissedItems: Record<string, DismissedItem>;

  // Most recently dismissed item (for undo)
  lastDismissed: DismissedItem | null;

  // Actions
  dismissItem: (id: string, reason?: DismissedItem['reason']) => void;
  undoLastDismissal: () => void;
  undismissItem: (id: string) => void;
  isDismissed: (id: string) => boolean;
  getDismissedIds: () => string[];
  clearAllDismissals: () => void;
}
```

### Persistence

The store uses Zustand's persist middleware with AsyncStorage:

```typescript
export const useDismissedItemsStore = create<DismissedItemsState>()(
  persist(
    (set, get) => ({
      // ... state and actions
    }),
    {
      name: 'dismissed-items-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

**Storage Key:** `dismissed-items-store`

### Data Structure Example

```json
{
  "state": {
    "dismissedItems": {
      "li_abc123": {
        "id": "li_abc123",
        "dismissedAt": 1704326400000,
        "reason": "not_interested"
      },
      "li_def456": {
        "id": "li_def456",
        "dismissedAt": 1704240000000,
        "reason": "not_interested"
      }
    },
    "lastDismissed": {
      "id": "li_abc123",
      "dismissedAt": 1704326400000,
      "reason": "not_interested"
    }
  },
  "version": 0
}
```

---

## How Recommendations Filter Hidden Items

**File:** `src/features/recommendations/hooks/useRecommendations.ts`

Hidden items are filtered out early in the recommendation pipeline:

```typescript
// Get dismissed items to filter from recommendations
const dismissedIds = useDismissedIds();

// Filter out items already in user's library AND items with any progress
const availableItems = allItems.filter(item => {
  // Exclude items in user's library (downloaded/saved)
  if (libraryIds.includes(item.id)) return false;

  // Exclude items the user has started listening to
  const progress = (item as any).userMediaProgress?.progress || 0;
  if (progress > 0) return false;

  // Exclude middle-of-series books (only show first book or next book)
  if (!isSeriesAppropriate(item)) return false;

  // Exclude dismissed items ("Not Interested")
  if (dismissedIds.includes(item.id)) return false;

  return true;
});
```

---

## Undo Flow

### Toast Component

**File:** `src/features/discover/components/DismissToast.tsx`

When a book is dismissed, a toast appears with an undo option:

```typescript
const TOAST_DURATION = 5000; // 5 seconds before auto-hide

export function DismissToast({ onUndone }: DismissToastProps) {
  const lastDismissed = useLastDismissed();
  const undoLastDismissal = useDismissedItemsStore((s) => s.undoLastDismissal);

  const handleUndo = useCallback(() => {
    undoLastDismissal();
    hideToast();
    onUndone?.();
  }, [undoLastDismissal, hideToast, onUndone]);

  useEffect(() => {
    if (lastDismissed) {
      // Show toast with slide-up animation
      translateY.value = withTiming(0, { duration: 300 });
      opacity.value = withTiming(1, { duration: 300 });

      // Auto-hide after 5 seconds
      translateY.value = withDelay(TOAST_DURATION, withTiming(100));
      opacity.value = withDelay(TOAST_DURATION, withTiming(0));
    }
  }, [lastDismissed]);

  // ... render toast with "Removed from recommendations" + Undo button
}
```

### Undo Action

```typescript
// In dismissedItemsStore
undoLastDismissal: () => {
  const { lastDismissed } = get();
  if (!lastDismissed) return;

  set((state) => {
    // Remove the last dismissed item from the map
    const { [lastDismissed.id]: _, ...rest } = state.dismissedItems;
    return {
      dismissedItems: rest,
      lastDismissed: null,  // Clear so toast hides
    };
  });
},
```

---

## Recovery Flow

### Access Point

**File:** `src/features/profile/screens/ProfileScreen.tsx`

Users access hidden items management from the Profile screen:

```typescript
// Display count badge
const hiddenItemsCount = useDismissedCount();

<ProfileLink
  Icon={EyeOff}
  label="Hidden Books"
  subtitle={hiddenItemsCount > 0
    ? `${hiddenItemsCount} hidden from recommendations`
    : 'No hidden books'}
  badge={hiddenItemsCount > 0 ? String(hiddenItemsCount) : undefined}
  onPress={() => navigation.navigate('HiddenItems')}
/>
```

### Hidden Items Screen

**File:** `src/features/profile/screens/HiddenItemsScreen.tsx`

#### Features
- List of all hidden books with cover, title, author
- Individual restore button per book
- "Clear All" button to restore all at once
- Tap on book navigates to BookDetail
- Empty state when no hidden books

#### UI Layout

```
┌─────────────────────────────────────────────────────┐
│                    Hidden Books        [Clear All]  │
├─────────────────────────────────────────────────────┤
│ These books won't appear in your recommendations.   │
│ Tap the restore button to bring them back.          │
├─────────────────────────────────────────────────────┤
│ ┌──────┐                                            │
│ │ 📖   │  Book Title                      [↩️]      │
│ │      │  Author Name                               │
│ └──────┘                                            │
├─────────────────────────────────────────────────────┤
│ ┌──────┐                                            │
│ │ 📖   │  Another Book                    [↩️]      │
│ │      │  Different Author                          │
│ └──────┘                                            │
└─────────────────────────────────────────────────────┘
```

#### Restore Single Item

```typescript
const handleRestore = useCallback((id: string) => {
  undismissItem(id);  // Removes from dismissedItems map
}, [undismissItem]);

// In store
undismissItem: (id: string) => {
  set((state) => {
    const { [id]: _, ...rest } = state.dismissedItems;
    return { dismissedItems: rest };
  });
},
```

#### Restore All Items

```typescript
const handleClearAll = useCallback(() => {
  Alert.alert(
    'Restore All Books',
    'This will restore all hidden books back to your recommendations. Are you sure?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Restore All',
        onPress: () => {
          haptics.selection();
          clearAllDismissals();
        },
      },
    ]
  );
}, [clearAllDismissals]);

// In store
clearAllDismissals: () => {
  set({ dismissedItems: {}, lastDismissed: null });
},
```

#### Empty State

```typescript
{isEmpty ? (
  <View style={styles.emptyState}>
    <Text style={styles.emptyTitle}>No Hidden Books</Text>
    <Text style={styles.emptyText}>
      Swipe left on any book card in the Browse tab to hide it from recommendations.
    </Text>
  </View>
) : (
  <FlatList ... />
)}
```

---

## Selector Hooks

The store provides optimized selector hooks to prevent unnecessary re-renders:

```typescript
// Get array of dismissed IDs (memoized)
export const useDismissedIds = () => {
  const dismissedItems = useDismissedItemsStore(
    useShallow((state) => state.dismissedItems)
  );
  return useMemo(() => Object.keys(dismissedItems), [dismissedItems]);
};

// Check if specific book is dismissed
export const useIsDismissed = (id: string) =>
  useDismissedItemsStore((state) => id in state.dismissedItems);

// Get last dismissed item (for toast)
export const useLastDismissed = () =>
  useDismissedItemsStore((state) => state.lastDismissed);

// Get count of dismissed items (for badge)
export const useDismissedCount = () => {
  const dismissedItems = useDismissedItemsStore(
    useShallow((state) => state.dismissedItems)
  );
  return useMemo(() => Object.keys(dismissedItems).length, [dismissedItems]);
};
```

---

## Dismissal Reasons

The system supports multiple dismissal reasons (currently only `not_interested` is used):

```typescript
reason?: 'not_interested' | 'already_read' | 'dislike_author';
```

This could be extended in the future for:
- More granular filtering (e.g., never show this author again)
- Analytics on why users hide books
- Different restoration behavior based on reason

---

## State Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        dismissedItemsStore                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  dismissedItems: Record<bookId, DismissedItem>                          │
│  lastDismissed: DismissedItem | null                                    │
│                                                                         │
│  ┌─────────────────┐    ┌──────────────────┐    ┌───────────────────┐  │
│  │ dismissItem()   │    │ undoLastDismiss- │    │ undismissItem()   │  │
│  │                 │    │ al()             │    │                   │  │
│  │ Adds to map     │    │ Removes last     │    │ Removes specific  │  │
│  │ Sets lastDis-   │    │ from map         │    │ item from map     │  │
│  │ missed          │    │ Clears lastDis-  │    │                   │  │
│  │                 │    │ missed           │    │                   │  │
│  └────────┬────────┘    └────────┬─────────┘    └─────────┬─────────┘  │
│           │                      │                        │             │
└───────────┼──────────────────────┼────────────────────────┼─────────────┘
            │                      │                        │
            ▼                      ▼                        ▼
┌───────────────────┐    ┌───────────────────┐    ┌───────────────────────┐
│ SwipeableBookCard │    │ DismissToast      │    │ HiddenItemsScreen     │
│                   │    │                   │    │                       │
│ User swipes left  │    │ Shows undo button │    │ Shows all hidden      │
│ → dismissItem()   │    │ → undoLastDis-    │    │ → undismissItem()     │
│                   │    │    missal()       │    │ → clearAllDismissals()│
└───────────────────┘    └───────────────────┘    └───────────────────────┘
```

---

## Related Files

| File | Purpose |
|------|---------|
| `src/features/recommendations/stores/dismissedItemsStore.ts` | State management |
| `src/features/discover/components/SwipeableBookCard.tsx` | Swipe-to-dismiss wrapper |
| `src/features/discover/components/DismissToast.tsx` | Undo notification |
| `src/features/profile/screens/HiddenItemsScreen.tsx` | Recovery screen |
| `src/features/profile/screens/ProfileScreen.tsx` | Entry point (profile link) |
| `src/features/recommendations/hooks/useRecommendations.ts` | Filters out hidden items |
| `src/navigation/AppNavigator.tsx` | Route registration |
