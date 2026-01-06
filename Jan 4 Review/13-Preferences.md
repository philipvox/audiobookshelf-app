# Preferences & PreferencesOnboarding

Documentation of the user preferences system: genre/mood selection, storage mechanism, and downstream effects on content surfacing.

---

## Overview

The Preferences system allows users to specify their audiobook tastes through a Q&A-style onboarding flow. These preferences inform the recommendation engine to surface personalized content throughout the app.

**Feature Location:** `src/features/recommendations/`

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ENTRY POINTS                                 │
├─────────────────────────────────────────────────────────────────────┤
│  PreferencesPromoCard (BrowseScreen)  →  PreferencesOnboardingScreen │
│  ProfileScreen → PreferencesScreen    →  PreferencesOnboardingScreen │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      PREFERENCES STORE                               │
│                   (Zustand + AsyncStorage)                           │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  moods: string[]           favoriteGenres: string[]         │    │
│  │  preferredLength: string   prefersSeries: boolean | null    │    │
│  │  favoriteAuthors: string[] favoriteNarrators: string[]      │    │
│  │  hasCompletedOnboarding: boolean                            │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    RECOMMENDATION ENGINE                             │
│                     useRecommendations hook                          │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Scores books based on:                                      │    │
│  │  1. Reading history (finished books) - highest weight        │    │
│  │  2. Listening history (in-progress) - medium weight          │    │
│  │  3. User preferences (onboarding) - base weight              │    │
│  │  4. Mood-to-genre mapping                                    │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    CONTENT SURFACING                                 │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  BrowseScreen / DiscoverTab:                                 │    │
│  │  - Grouped recommendation rows                               │    │
│  │  - Hero recommendation                                       │    │
│  │  - "Because you finished X" titles                           │    │
│  │  - "More by [Author]" sections                               │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Key Files

| File | Purpose |
|------|---------|
| `src/features/recommendations/stores/preferencesStore.ts` | Zustand store for user preferences |
| `src/features/recommendations/screens/PreferencesOnboardingScreen.tsx` | Q&A onboarding wizard |
| `src/features/recommendations/screens/PreferencesScreen.tsx` | View/edit preferences from Profile |
| `src/features/recommendations/hooks/useRecommendations.ts` | Recommendation scoring engine |
| `src/features/recommendations/stores/dismissedItemsStore.ts` | Tracks dismissed recommendations |
| `src/features/discover/components/PreferencesPromoCard.tsx` | Promo card for onboarding |
| `src/features/discover/hooks/useDiscoverData.ts` | Consumes recommendations for Browse |

---

## Data Model

### UserPreferences Interface

**Location:** `src/features/recommendations/stores/preferencesStore.ts:11-32`

```typescript
export interface UserPreferences {
  // Genres/tags the user likes
  favoriteGenres: string[];

  // Preferred audiobook length
  preferredLength: 'short' | 'medium' | 'long' | 'any';

  // Favorite authors (by name)
  favoriteAuthors: string[];

  // Favorite narrators (by name)
  favoriteNarrators: string[];

  // Prefers series or standalone
  prefersSeries: boolean | null;

  // Has completed onboarding
  hasCompletedOnboarding: boolean;

  // Mood preferences
  moods: string[];
}
```

### Initial State

```typescript
const initialState: UserPreferences = {
  favoriteGenres: [],
  preferredLength: 'any',
  favoriteAuthors: [],
  favoriteNarrators: [],
  prefersSeries: null,
  hasCompletedOnboarding: false,
  moods: [],
};
```

---

## Storage

### Persistence Layer

**Technology:** Zustand with `persist` middleware + AsyncStorage

**Location:** `src/features/recommendations/stores/preferencesStore.ts:60-121`

```typescript
export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      // ... state and actions
    }),
    {
      name: 'user-preferences-storage',  // AsyncStorage key
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

**Storage Key:** `user-preferences-storage`

### Store Actions

| Action | Purpose |
|--------|---------|
| `setFavoriteGenres(genres)` | Replace all favorite genres |
| `toggleGenre(genre)` | Add/remove single genre |
| `setPreferredLength(length)` | Set length preference |
| `setFavoriteAuthors(authors)` | Replace all favorite authors |
| `toggleAuthor(author)` | Add/remove single author |
| `setFavoriteNarrators(narrators)` | Replace all favorite narrators |
| `toggleNarrator(narrator)` | Add/remove single narrator |
| `setPrefersSeries(value)` | Set series preference (true/false/null) |
| `setMoods(moods)` | Replace all mood preferences |
| `toggleMood(mood)` | Add/remove single mood |
| `completeOnboarding()` | Mark onboarding as complete |
| `resetPreferences()` | Reset to initial state |

---

## Onboarding Flow

### PreferencesOnboardingScreen

**Location:** `src/features/recommendations/screens/PreferencesOnboardingScreen.tsx`

A 4-step Q&A wizard that collects user preferences:

| Step | Question | Type | Options |
|------|----------|------|---------|
| 1 | "What kind of reading mood are you usually in?" | Multi-select | Adventurous, Relaxing, Thoughtful, Escapist, Suspenseful, Romantic, Educational, Funny |
| 2 | "What genres do you enjoy?" | Multi-select | Top 20 genres from user's library (dynamic) |
| 3 | "How long do you like your audiobooks?" | Single-select | Short (<8h), Medium (8-20h), Long (20h+), Any |
| 4 | "Do you enjoy book series?" | Single-select | Yes, No, Both |

### Mood Options

**Location:** `src/features/recommendations/screens/PreferencesOnboardingScreen.tsx:44-53`

```typescript
const MOOD_OPTIONS = [
  { label: 'Adventurous', value: 'Adventurous' },
  { label: 'Relaxing', value: 'Relaxing' },
  { label: 'Thoughtful', value: 'Thoughtful' },
  { label: 'Escapist', value: 'Escapist' },
  { label: 'Suspenseful', value: 'Suspenseful' },
  { label: 'Romantic', value: 'Romantic' },
  { label: 'Educational', value: 'Educational' },
  { label: 'Funny', value: 'Funny' },
];
```

### Length Options

```typescript
const LENGTH_OPTIONS = [
  { label: 'Quick listens (under 8 hours)', value: 'short' },
  { label: 'Medium (8-20 hours)', value: 'medium' },
  { label: 'Epic journeys (20+ hours)', value: 'long' },
  { label: 'No preference', value: 'any' },
];
```

### Series Options

```typescript
const SERIES_OPTIONS = [
  { label: 'Yes, I love getting invested!', value: 'true' },
  { label: 'No, standalones for me', value: 'false' },
  { label: 'Both are great', value: 'null' },
];
```

### Genre Selection

Genres are dynamically pulled from the user's library cache:

```typescript
const availableGenres = isLoaded
  ? getGenresByPopularity().map(g => g.name)
  : [];

// Shows top 20 genres from user's actual library
options: availableGenres.slice(0, 20).map(g => ({
  label: g,
  value: g,
})),
```

---

## Downstream Effects on Content Surfacing

### 1. Recommendation Scoring Engine

**Location:** `src/features/recommendations/hooks/useRecommendations.ts:63-498`

The hook scores books based on multiple signals with weighted priorities:

#### Scoring Weights

| Signal Source | Weight Range | Priority |
|---------------|--------------|----------|
| Author from read history | 40-80 points | Highest |
| Narrator from read history | 30-60 points | High |
| Genre from read history | 5-50 points | High |
| Author from listening history | 25-50 points | Medium |
| Narrator from listening history | 18-36 points | Medium |
| Genre from listening history | 3-30 points | Medium |
| Genre from preferences | 30 points/match | Base |
| Author from preferences | 25 points | Base |
| Narrator from preferences | 20 points | Base |
| Mood-to-genre match | 15 points | Base |
| Series preference match | 10 points | Low |
| Length preference match | 10 points | Low |

#### Mood-to-Genre Mapping

**Location:** `src/features/recommendations/hooks/useRecommendations.ts:501-510`

```typescript
const MOOD_GENRE_MAP: Record<string, string[]> = {
  'Adventurous': ['adventure', 'action', 'thriller', 'fantasy', 'sci-fi'],
  'Relaxing': ['cozy', 'romance', 'slice of life', 'contemporary'],
  'Thoughtful': ['literary', 'philosophy', 'biography', 'history'],
  'Escapist': ['fantasy', 'sci-fi', 'paranormal', 'urban fantasy'],
  'Suspenseful': ['thriller', 'mystery', 'horror', 'suspense', 'crime'],
  'Romantic': ['romance', 'contemporary romance', 'historical romance'],
  'Educational': ['non-fiction', 'history', 'science', 'self-help', 'business'],
  'Funny': ['humor', 'comedy', 'satire', 'comedic'],
};
```

### 2. Grouped Recommendations

**Location:** `src/features/recommendations/hooks/useRecommendations.ts:394-487`

Books are grouped into titled rows based on match reasons:

| Group Title | Trigger |
|-------------|---------|
| "Based on your reading history" | Author/narrator/genre from finished books |
| "Based on what you're listening to" | Author/narrator/genre from in-progress books |
| "Based on your genres" | Genre preference match |
| "Authors you might like" | Author match |
| "Great narrators" | Narrator match |
| "Recommended for You" | Fallback for ungrouped items |

### 3. Source Attribution

Each recommendation group can have source attribution for personalized titles:

```typescript
interface RecommendationSourceAttribution {
  itemId: string;
  itemTitle: string;
  type: 'finished' | 'listening' | 'author' | 'narrator' | 'genre';
}
```

This enables titles like:
- "Because you finished The Blade Itself"
- "More like The Way of Kings"
- "Because you love Mystery"
- "More by Brandon Sanderson"
- "Narrated by Steven Pacey"

### 4. Browse/Discover Screen Integration

**Location:** `src/features/discover/hooks/useDiscoverData.ts:169`

```typescript
const { groupedRecommendations, hasPreferences } = useRecommendations(libraryItems, 30);
```

The `useDiscoverData` hook:
1. Consumes `groupedRecommendations` from `useRecommendations`
2. Converts them to `ContentRow` objects with priority 2.0, 2.3, 2.6
3. Displays up to 3 recommendation groups (capped to prevent UI clutter)
4. Uses `hasPreferences` to decide whether to show `PreferencesPromoCard`

### 5. PreferencesPromoCard Display Logic

**Location:** `src/features/browse/screens/BrowseScreen.tsx:253-256`

```typescript
{/* Show when user hasn't set preferences AND has no reading history */}
{!showSkeleton && selectedGenre === 'All' && !hasPreferences && (
  <PreferencesPromoCard />
)}
```

The `hasPreferences` flag is `true` when ANY of:
- User completed onboarding (`hasCompletedOnboarding === true`)
- User has finished at least one book
- User has at least one book in progress

---

## Dismissed Items Store

**Location:** `src/features/recommendations/stores/dismissedItemsStore.ts`

Allows users to dismiss recommendations they're not interested in:

```typescript
interface DismissedItem {
  id: string;
  dismissedAt: number;
  reason?: 'not_interested' | 'already_read' | 'dislike_author';
}
```

**Features:**
- Swipe-to-dismiss functionality
- Undo last dismissal
- Clear all dismissals
- Persisted to AsyncStorage

**Storage Key:** `dismissed-items-store`

---

## Navigation

### Routes

| Route | Component | Access |
|-------|-----------|--------|
| `Preferences` | `PreferencesScreen` | Profile > Reading Preferences |
| `PreferencesOnboarding` | `PreferencesOnboardingScreen` | Promo card or Preferences screen |

### Hidden UI Elements During Onboarding

**Location:** `src/navigation/components/FloatingTabBar.tsx:226`

```typescript
const hiddenRoutes = ['ReadingHistoryWizard', 'MoodDiscovery', 'MoodResults', 'PreferencesOnboarding'];
```

Both `FloatingTabBar` and `GlobalMiniPlayer` are hidden during the onboarding flow.

---

## PreferencesScreen (View/Edit)

**Location:** `src/features/recommendations/screens/PreferencesScreen.tsx`

Displays current preferences with ability to:
- View all selected moods, genres, length, and series preferences
- Edit preferences (re-runs onboarding)
- Reset all preferences to defaults

### Empty State

When `hasCompletedOnboarding === false`:
- Shows sparkle icon
- "Set up your preferences" message
- "Get Started" button → navigates to onboarding

### Populated State

When `hasCompletedOnboarding === true`:
- Shows tags for moods and genres
- Shows text for length and series preferences
- "Edit Preferences" button
- "Reset All" button

---

## Data Flow Diagram

```
User Action                    Store Update                 Content Effect
───────────────────────────────────────────────────────────────────────────

[Selects "Mystery" genre]  →  favoriteGenres: ["Mystery"]  →  Books with
                                                               "Mystery" genre
                                                               score +30 points

[Selects "Suspenseful"]    →  moods: ["Suspenseful"]       →  Books matching
                                                               thriller, mystery,
                                                               horror score +15

[Chooses "Short"]          →  preferredLength: "short"     →  Books <8 hours
                                                               score +10 points

[Prefers series]           →  prefersSeries: true          →  Series books
                                                               score +10 points

[Completes onboarding]     →  hasCompletedOnboarding: true →  PreferencesPromoCard
                                                               hidden from Browse
```

---

## Integration with Other Systems

### Library Cache

Genre options in onboarding come from `getGenresByPopularity()` which scans the library cache.

### Reading History (SQLite)

The recommendation engine loads finished books from SQLite `read_history` table:

```typescript
sqliteCache.getReadHistoryStats().then(setHistoryStats);
sqliteCache.getFinishedUserBooks().then(books => {
  setFinishedBookIds(new Set(books.map(b => b.bookId)));
});
```

### Mood Discovery System

Note: The Preferences moods ("Adventurous", "Relaxing", etc.) are **distinct** from the Mood Discovery session moods ("comfort", "thrills", "escape", etc.). They serve different purposes:

| System | Purpose | Persistence |
|--------|---------|-------------|
| Preferences moods | Long-term taste profile | Permanent (AsyncStorage) |
| Mood Discovery session | Current listening mood | Temporary (24h sessions) |

---

## Summary

The Preferences system provides a lightweight onboarding experience that:

1. **Collects** user preferences through a 4-step Q&A wizard
2. **Stores** preferences in a Zustand store persisted to AsyncStorage
3. **Scores** library items based on preference matches + reading history
4. **Groups** recommendations into themed rows with source attribution
5. **Surfaces** personalized content on the Browse/Discover screen

The system gracefully degrades: users without explicit preferences still receive recommendations based on their reading and listening history.
