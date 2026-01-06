# Navigation Patterns Documentation

## Overview

The app uses React Navigation v7 with a combination of:
- **Bottom Tab Navigator** - Main tabs (Home, Library, Browse, Profile)
- **Native Stack Navigator** - Push screens and modals
- **Global Overlays** - Player, mini-player, completion sheet

**File:** `src/navigation/AppNavigator.tsx`

---

## Navigation Architecture

```
AppNavigator
├── Unauthenticated
│   └── Login
│
└── Authenticated (AuthenticatedApp)
    └── NavigationContainer
        ├── Stack.Navigator
        │   ├── Main (Tab.Navigator)
        │   │   ├── HomeTab
        │   │   ├── LibraryTab
        │   │   ├── DiscoverTab
        │   │   └── ProfileTab
        │   │
        │   ├── Push Screens (26 screens)
        │   └── Modal Screens (5 screens)
        │
        └── Global Overlays
            ├── CDPlayerScreen
            ├── GlobalMiniPlayer
            ├── NavigationBar (FloatingTabBar)
            ├── NetworkStatusBar
            └── BookCompletionSheet
```

---

## Screen Types

### Push Screens (Standard Navigation)

Push screens slide in from the right with native back gesture support.

| Screen | Route Name | Parameters |
|--------|------------|------------|
| SearchScreen | `Search` | None |
| SeriesListScreen | `SeriesList` | None |
| AuthorsListScreen | `AuthorsList` | None |
| NarratorsListScreen | `NarratorsList` | None |
| GenresListScreen | `GenresList` | None |
| GenreDetailScreen | `GenreDetail` | `{ genreName: string }` |
| FilteredBooksScreen | `FilteredBooks` | `{ filter: FilterConfig }` |
| SeriesDetailScreen | `SeriesDetail` | `{ seriesName: string }` |
| AuthorDetailScreen | `AuthorDetail` | `{ authorName: string }` |
| NarratorDetailScreen | `NarratorDetail` | `{ narratorName: string }` |
| CollectionDetailScreen | `CollectionDetail` | `{ collectionId: string }` |
| BookDetailScreen | `BookDetail` | `{ id: string }` |
| PreferencesScreen | `Preferences` | None |
| QueueScreen | `QueueScreen` | None |
| DownloadsScreen | `Downloads` | None |
| StatsScreen | `Stats` | None |
| WishlistScreen | `Wishlist` | None |
| ManualAddScreen | `ManualAdd` | None |
| PlaybackSettingsScreen | `PlaybackSettings` | None |
| StorageSettingsScreen | `StorageSettings` | None |
| JoystickSeekSettingsScreen | `JoystickSeekSettings` | None |
| HapticSettingsScreen | `HapticSettings` | None |
| ChapterCleaningSettingsScreen | `ChapterCleaningSettings` | None |
| HiddenItemsScreen | `HiddenItems` | None |
| KidModeSettingsScreen | `KidModeSettings` | None |
| CassetteTestScreen | `CassetteTest` | None |
| DebugStressTestScreen | `DebugStressTest` | None (DEV only) |

### Modal Screens

Modal screens slide up from the bottom with swipe-to-dismiss.

| Screen | Route Name | Presentation | Behavior |
|--------|------------|--------------|----------|
| PreferencesOnboardingScreen | `PreferencesOnboarding` | `modal` | Card modal, swipe down to dismiss |
| MoodDiscoveryScreen | `MoodDiscovery` | `modal` | Card modal, X button to close |
| MoodResultsScreen | `MoodResults` | `modal` | Card modal, continues from MoodDiscovery |
| ReadingHistoryScreen | `ReadingHistory` | `modal` | Card modal |
| MarkBooksScreen | `ReadingHistoryWizard` | `fullScreenModal` | Full screen, no swipe dismiss |

```typescript
// Modal screen configuration
<Stack.Screen
  name="PreferencesOnboarding"
  component={PreferencesOnboardingScreen}
  options={{ presentation: 'modal' }}
/>

<Stack.Screen
  name="ReadingHistoryWizard"
  component={MarkBooksScreen}
  options={{ presentation: 'fullScreenModal' }}
/>
```

### Tab Screens

| Tab | Route Name | Screen | Icon |
|-----|------------|--------|------|
| Home | `HomeTab` | HomeScreen | House |
| Library | `LibraryTab` | MyLibraryScreen | Books |
| Browse | `DiscoverTab` | BrowseScreen | Compass |
| Profile | `ProfileTab` | ProfileScreen | Person |

---

## Gesture Handling

### Native Back Gesture (iOS)

All push screens support iOS edge swipe-back gesture by default via `createNativeStackNavigator`.

### Android Hardware Back Button

The player screen handles Android back button specially:

```typescript
// CDPlayerScreen.tsx
useEffect(() => {
  if (!isPlayerVisible) return;

  const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
    // If a sheet is open, close it first
    if (activeSheet !== 'none') {
      setActiveSheet('none');
      return true;  // Handled
    }
    // Close player
    handleClose();
    return true;  // Handled
  });

  return () => backHandler.remove();
}, [isPlayerVisible, activeSheet, handleClose]);
```

### Swipe Gestures

#### Mini Player → Full Player (Swipe Up)

```typescript
// GlobalMiniPlayer.tsx
const SWIPE_THRESHOLD = -50;  // 50px upward

const panGesture = Gesture.Pan()
  .onUpdate((event) => {
    'worklet';
    if (event.translationY < 0) {
      translateY.value = event.translationY;
    }
  })
  .onEnd((event) => {
    'worklet';
    if (event.translationY < SWIPE_THRESHOLD) {
      runOnJS(handleOpenPlayer)();
    }
    translateY.value = withTiming(0, { duration: 150 });
  });
```

#### Swipeable List Items

Used in Queue and Downloads screens:

```typescript
// SwipeableQueueItem.tsx
<Swipeable
  ref={swipeableRef}
  renderRightActions={renderRightActions}
  rightThreshold={40}
  overshootRight={false}
>
  {/* Item content */}
</Swipeable>
```

- **Swipe Left** → Reveals remove/delete action
- **rightThreshold={40}** → 40px swipe triggers action reveal

#### Swipeable Book Cards (Recommendations)

```typescript
// SwipeableBookCard.tsx
const SWIPE_THRESHOLD = 80;
const DISMISS_VELOCITY = 500;

// Swipe left to dismiss ("Not Interested")
if (translateX.value < -SWIPE_THRESHOLD || event.velocityX < -DISMISS_VELOCITY) {
  // Animate off-screen and dismiss
}
```

### Timeline Scrubbing

Both CDPlayerScreen and GlobalMiniPlayer support drag-to-seek on the timeline:

```typescript
const scrubGesture = Gesture.Pan()
  .onStart(() => {
    'worklet';
    isDragging.value = true;
  })
  .onUpdate((event) => {
    'worklet';
    // Calculate new position from gesture
    const newProgress = ...;
    markerProgress.value = newProgress;
  })
  .onEnd(() => {
    'worklet';
    isDragging.value = false;
    runOnJS(handleSeekComplete)(markerProgress.value);
  });
```

---

## Deep Link Support

### Current Status: Not Implemented

The app does **not** currently have deep link configuration. No URL scheme or universal links are set up.

### Potential Deep Link Routes

If implemented, typical routes would be:

| URL Pattern | Target Screen |
|-------------|---------------|
| `secretlibrary://book/{id}` | BookDetailScreen |
| `secretlibrary://series/{name}` | SeriesDetailScreen |
| `secretlibrary://author/{name}` | AuthorDetailScreen |
| `secretlibrary://search?q={query}` | SearchScreen |
| `secretlibrary://player` | CDPlayerScreen |

### App Configuration

```json
// app.json - No URL scheme currently configured
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.secretlibrary.app"
    },
    "android": {
      "package": "com.secretlibrary.app"
    }
  }
}
```

---

## Navigation Patterns by Feature

### Detail Screen Pattern

All detail screens follow the same pattern:

```typescript
// Entry
navigation.navigate('BookDetail', { id: bookId });

// Screen
const route = useRoute<RouteProp<BookDetailRouteParams, 'BookDetail'>>();
const { id: bookId } = route.params;

// Back navigation
const handleBack = useCallback(() => {
  if (navigation.canGoBack()) {
    navigation.goBack();
  } else {
    navigation.navigate('Main');
  }
}, [navigation]);
```

### Settings Screen Pattern

Settings screens are pushed from ProfileScreen:

```typescript
// ProfileScreen.tsx
navigation.navigate('PlaybackSettings');
navigation.navigate('StorageSettings');
navigation.navigate('HiddenItems');
// etc.
```

### Modal Flow Pattern

Multi-step modals (like MoodDiscovery):

```typescript
// Step 1: Open modal
navigation.navigate('MoodDiscovery');

// Step 2: Complete and go to results (within modal stack)
navigation.navigate('MoodResults');

// Step 3: Close modal
navigation.goBack(); // or explicit close
```

### Player Navigation

The player is a **global overlay**, not a navigation screen:

```typescript
// Open full player
usePlayerStore.getState().togglePlayer();

// Close full player
usePlayerStore.getState().closePlayer();

// Tap mini player
const handleOpenPlayer = useCallback(() => {
  togglePlayer();
}, [togglePlayer]);
```

---

## Tab Bar Visibility

The FloatingTabBar hides on certain routes:

```typescript
const hiddenRoutes = [
  'ReadingHistoryWizard',
  'MoodDiscovery',
  'MoodResults',
  'PreferencesOnboarding'
];

if (hiddenRoutes.includes(currentRouteName) || isPlayerVisible) {
  return null;
}
```

---

## Navigation Helpers

### useNavigationBarHeight

Returns the total height of the navigation bar for content padding:

```typescript
// NavigationBar.tsx
export function useNavigationBarHeight(): number {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, spacing.md);
  return TAB_BAR_HEIGHT + bottomPadding;  // 52 + padding
}
```

### Safe Navigation

Screens handle cases where they can't go back:

```typescript
const handleBack = () => {
  if (navigation.canGoBack()) {
    navigation.goBack();
  } else {
    // Fallback to main tabs
    navigation.navigate('Main');
  }
};
```

---

## Screen Parameter Types

### Route Params Interface

```typescript
// Common parameter patterns
type BookDetailRouteParams = {
  BookDetail: { id: string };
};

type SeriesDetailRouteParams = {
  SeriesDetail: { seriesName: string };
};

type AuthorDetailRouteParams = {
  AuthorDetail: { authorName: string };
};

type NarratorDetailRouteParams = {
  NarratorDetail: { narratorName: string };
};

type GenreDetailRouteParams = {
  GenreDetail: { genreName: string };
};

type FilteredBooksRouteParams = {
  FilteredBooks: { filter: FilterConfig };
};
```

---

## Navigation State Tracking

For development/debugging, navigation changes are tracked:

```typescript
// AppNavigator.tsx
const onNavigationStateChange = () => {
  if (__DEV__) {
    const currentRoute = navigationRef.current?.getCurrentRoute();
    const currentRouteName = currentRoute?.name;

    if (currentRouteName && currentRouteName !== routeNameRef.current) {
      routeNameRef.current = currentRouteName;
      navigationMonitor.recordNavigation(currentRouteName);
    }
  }
};
```

---

## Screen Transitions

### Default Transitions

- **Push screens**: Slide from right (iOS), slide up (Android)
- **Modal screens**: Slide from bottom with card presentation
- **Full screen modal**: Full slide from bottom, no dismiss gesture

### Custom Transitions

The app uses default native stack transitions. No custom animations are configured.

---

## Related Files

| File | Purpose |
|------|---------|
| `src/navigation/AppNavigator.tsx` | Main navigation configuration |
| `src/navigation/components/FloatingTabBar.tsx` | Bottom tab bar |
| `src/navigation/components/NavigationBar.tsx` | Tab bar re-export + height hook |
| `src/navigation/components/GlobalMiniPlayer.tsx` | Mini player with swipe gesture |
| `src/features/player/screens/CDPlayerScreen.tsx` | Full player with back handler |
| `src/features/queue/components/SwipeableQueueItem.tsx` | Swipeable list pattern |
| `src/features/discover/components/SwipeableBookCard.tsx` | Swipe-to-dismiss pattern |

---

## Summary Table

| Screen Type | Presentation | Back Gesture | Swipe Dismiss | Tab Bar |
|-------------|--------------|--------------|---------------|---------|
| Tab Screens | Tab | N/A | N/A | Visible |
| Push Screens | Push | iOS edge swipe | No | Visible |
| Modal | Card | iOS edge swipe | Yes (down) | Hidden |
| Full Screen Modal | Full | No | No | Hidden |
| Player Overlay | Custom | Android back | No | Hidden |
| Mini Player | Fixed | N/A | Swipe up opens full | Visible |
