# Mood Discovery System Documentation

## Overview

The Mood Discovery System is a 5-step quiz that captures the user's current listening preferences and filters/ranks book recommendations for 24 hours. It's designed to answer "What do I want to listen to RIGHT NOW?" rather than permanent profile data.

**Key Philosophy:** Sessions are ephemeral (24-hour expiry) because mood is temporary.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     MOOD DISCOVERY FLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │   5-Step     │────▶│   Commit     │────▶│   Session    │    │
│  │   Quiz UI    │     │   Session    │     │  (24 hours)  │    │
│  └──────────────┘     └──────────────┘     └──────────────┘    │
│         │                    │                     │            │
│         ▼                    ▼                     ▼            │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │ moodSession  │     │ AsyncStorage │     │  useDiscover │    │
│  │    Store     │────▶│   Persist    │     │    Data()    │    │
│  │   (draft)    │     │  (session)   │     │  filtering   │    │
│  └──────────────┘     └──────────────┘     └──────────────┘    │
│                                                    │            │
│                              ┌─────────────────────┘            │
│                              ▼                                  │
│  ┌────────────────────────────────────────────────────────────┐│
│  │                  DISCOVER TAB OUTPUT                        ││
│  │  • Hero recommendation uses top mood match                  ││
│  │  • Row titles become mood-aware ("Cozy Picks for You")      ││
│  │  • All rows filtered to mood-matched books (≥30% match)     ││
│  │  • Sort order changes to match score descending             ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## The 5-Step Quiz

**File:** `src/features/mood-discovery/screens/MoodDiscoveryScreen.tsx`

### Step Configuration

| Step | Dimension | Required | Question | Options |
|------|-----------|----------|----------|---------|
| 1 | **Mood** | Yes | "It's your perfect listening moment. Where are you?" | comfort, thrills, escape, laughs, feels, thinking |
| 2 | **Energy/Pace** | No | "What kind of energy fits right now?" | slow, steady, fast, any |
| 3 | **Tone/Weight** | No | "What emotional territory feels right?" | light, balanced, heavy, any |
| 4 | **World** | No | "Where do you want the story to take you?" | contemporary, historical, fantasy, scifi, any |
| 5 | **Length** | No | "How much time do you have?" | short, medium, long, any |

### Mood Options (Step 1 - Required)

| ID | Label | Description |
|----|-------|-------------|
| `comfort` | "Curled up at home" | Cozy, warm, familiar |
| `thrills` | "Edge of your seat" | Heart racing, can't stop |
| `escape` | "Lost in another world" | Far from reality |
| `laughs` | "Laughing out loud" | Light, not serious |
| `feels` | "Feeling all the feels" | Emotional, moving |
| `thinking` | "Mind blown" | Learning, questioning |

### Pace Options (Step 2)

| ID | Label | Description |
|----|-------|-------------|
| `slow` | "Slow & savory" | Take your time, soak it in |
| `steady` | "Steady rhythm" | Balanced, keeps you moving |
| `fast` | "Can't put it down" | Rapid-fire, zero downtime |
| `any` | "Surprise me" | I'm flexible (default) |

### Weight Options (Step 3)

| ID | Label | Description |
|----|-------|-------------|
| `light` | "Light & bright" | Feel-good, uplifting, easy |
| `balanced` | "Shade & light" | Some clouds, some sunshine |
| `heavy` | "Deep & intense" | Dark themes, emotional weight |
| `any` | "I'll take anything" | Mood isn't picky today (default) |

### World Options (Step 4)

| ID | Label | Description |
|----|-------|-------------|
| `contemporary` | "Right here, right now" | Modern day, realistic |
| `historical` | "Back in time" | Past eras, different worlds |
| `fantasy` | "Realms of magic" | Impossible things, mythical |
| `scifi` | "Among the stars" | Future tech, space, what-ifs |
| `any` | "Anywhere is fine" | Setting doesn't matter (default) |

### Length Options (Step 5)

| ID | Label | Hours |
|----|-------|-------|
| `short` | "Quick listen" | ≤6 hours |
| `medium` | "Weekend companion" | 6-12 hours |
| `long` | "Epic journey" | ≥12 hours |
| `any` | "Doesn't matter" | Any length (default) |

---

## Quiz Navigation Flow

```
                    ┌───────────────────────────────┐
                    │       MoodDiscoveryScreen     │
                    └───────────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ▼              ▼              ▼
              ┌─────────┐   ┌──────────┐   ┌─────────┐
              │  Back   │   │   Next   │   │  Skip   │
              │ (step−) │   │ (step+) │   │ (commit)│
              └─────────┘   └──────────┘   └─────────┘
                                   │
                   ┌───────────────┼───────────────┐
                   │               │               │
              Step 1-4         Step 5          Any step
                   │               │            (if mood set)
                   ▼               ▼               ▼
              nextStep()     commitSession()  commitSession()
                                   │
                                   ▼
                         ┌─────────────────┐
                         │ navigation.back │
                         │ (return to app) │
                         └─────────────────┘
```

---

## Session Persistence

**Store:** `src/features/mood-discovery/stores/moodSessionStore.ts`
**AsyncStorage Key:** `mood-session-storage`

### MoodSession Interface

```typescript
interface MoodSession {
  mood: Mood;              // Required - primary emotional filter
  pace: Pace;              // Optional - story pacing preference
  weight: Weight;          // Optional - emotional intensity
  world: World;            // Optional - setting/genre family
  length: LengthPreference; // Optional - duration preference
  createdAt: number;       // Timestamp when created
  expiresAt: number;       // Timestamp when expires (24h later)
}
```

### What Gets Persisted

| Data | Persistence | Notes |
|------|-------------|-------|
| Session object | AsyncStorage | Survives app restart |
| Quiz draft | Memory only | Lost on screen close |
| Expiry timestamp | Part of session | Auto-cleared when expired |

### Session Lifecycle

1. **Creation:** `commitSession()` called after quiz completion
2. **Validation:** `validateSession()` checks expiry on app launch/rehydration
3. **Expiry:** 24 hours after creation (`SESSION_DURATION_MS = 24 * 60 * 60 * 1000`)
4. **Extension:** `quickTune()` resets expiry to 24h from now
5. **Manual Clear:** User taps "X" button or `clearSession()` called

---

## MoodResults Screen

**File:** `src/features/mood-discovery/screens/MoodResultsScreen.tsx`

### Features

- **QuickTuneBar** - Shows active filters with edit/clear buttons
- **Grouped Results** - Books organized by match quality:
  - Perfect (80%+ match)
  - Great (60-79% match)
  - Good (40-59% match)
  - Partial (20-39% match)
- **Grid Layout** - 3-column grid of MoodBookCard components
- **Empty States** - For no session, loading, and no matches

### Result Grouping

```typescript
// From useMoodRecommendationsByQuality()
{
  perfect: ScoredBook[];  // ≥80% match
  great: ScoredBook[];    // 60-79%
  good: ScoredBook[];     // 40-59%
  partial: ScoredBook[];  // 20-39%
  low: ScoredBook[];      // <20% (not displayed)
}
```

---

## Scoring Algorithm

**File:** `src/features/mood-discovery/hooks/useMoodRecommendations.ts`

### Score Weights

| Dimension | Points | Notes |
|-----------|--------|-------|
| Mood Match (Primary) | 40 | Genre contains mood keywords |
| Mood Match (Secondary) | 20 | Theme/trope matches mood |
| Pace Match | 15 | Description/genre contains pace indicators |
| Weight Match | 15 | Description/genre contains weight indicators |
| World Match | 20 | Genre contains world setting keywords |
| Length Match | 10 | Duration within preference range |
| Theme Bonus | 15 max | Tag-based mood scoring |
| Trope Bonus | 15 max | Romance tropes matching mood |

### Genre Mappings

Each mood maps to genre keywords:

```typescript
MOOD_GENRE_MAP = {
  comfort: ['cozy', 'romance', 'heartwarming', 'feel-good', ...],
  thrills: ['thriller', 'mystery', 'suspense', 'crime', ...],
  escape: ['fantasy', 'science fiction', 'adventure', ...],
  laughs: ['humor', 'comedy', 'satire', 'witty', ...],
  feels: ['emotional', 'drama', 'literary fiction', ...],
  thinking: ['literary', 'philosophy', 'thought-provoking', ...],
}
```

### Match Percentage Calculation

```typescript
// Base score from dimensions
const maxBaseScore = maxMoodScore + maxPaceScore + maxWeightScore +
                     maxWorldScore + maxLengthScore;
let percent = (baseScore / maxBaseScore) * 100;

// Theme/trope bonuses can boost up to +20%
percent += themeBoost + tropeBoost;

// Preference boosts from reading history can add up to +15%
if (hasHistory) {
  percent += Math.min(15, preferenceBoost);
}

return Math.min(100, Math.round(percent));
```

---

## Tag-Based Scoring

**File:** `src/features/mood-discovery/utils/tagScoring.ts`

Uses explicit tags from `item.media.tags` (not parsed from descriptions):

| Match Type | Points |
|------------|--------|
| Tag's primary mood matches session | 15 |
| Tag's secondary mood matches | 7 |
| Pace tag matches | 10 |
| Weight tag matches | 10 |
| World tag matches | 12 |
| Length tag matches | 8 |
| Romance trope primary match | 8 |
| Romance trope secondary match | 4 |

Max tag score capped at 40 points.

---

## Influence on DiscoverTab

**File:** `src/features/discover/hooks/useDiscoverData.ts`

### When Mood Session Active

1. **Hero Recommendation** - Uses top mood match with mood-aware reason
2. **Row Titles** - Dynamically generated based on mood:
   - "Cozy Picks for You" (comfort mood)
   - "New Thrilling Arrivals" (thrills mood)
   - "Quick Escapist Listens" (escape + short)
3. **Row Content** - All rows filtered to ≥30% mood match
4. **Sort Order** - Books sorted by match score descending

### Mood-Aware Title Generation

```typescript
function getMoodCategoryTitle(baseTitle: string, session: MoodSession): string {
  const moodAdjective = getMoodAdjective(session.mood);
  // 'comfort' → 'Cozy', 'thrills' → 'Thrilling', etc.

  switch (baseTitle) {
    case 'Not Started':
      return `${moodAdjective} Picks for You`;
    case 'New This Week':
      return `New ${moodAdjective} Arrivals`;
    case 'Short & Sweet':
      return `Quick ${moodAdjective} Listens`;
    // ...etc
  }
}
```

### Filtering Logic

```typescript
const filterByMood = (items: LibraryItem[], minMatchPercent = 20) => {
  if (!hasMoodSession) return items;

  // Filter to items with mood score above minimum
  const filtered = items.filter(item => {
    const score = moodScoreMap.get(item.id);
    return score && score.matchPercent >= minMatchPercent;
  });

  // Sort by mood score descending
  filtered.sort((a, b) => {
    const scoreA = moodScoreMap.get(a.id)?.matchPercent || 0;
    const scoreB = moodScoreMap.get(b.id)?.matchPercent || 0;
    return scoreB - scoreA;
  });

  return filtered;
};
```

---

## UI Components

### QuickTuneBar
**File:** `src/features/mood-discovery/components/QuickTuneBar.tsx`

Floating bar on MoodResults screen:
- Timer showing session remaining time
- Edit button to reopen quiz
- Clear button to end session
- Horizontal scroll of active filter chips

### MoodFilterPills
**File:** `src/features/discover/components/MoodFilterPills.tsx`

Browse screen header overlay:
- Compact timer (tappable for full time popup)
- Filter chips for active preferences
- Edit/Clear actions
- Browse By shortcut

### MoodDiscoveryCard
**File:** `src/features/mood-discovery/components/MoodDiscoveryCard.tsx`

Entry point card shown when no session active:
- "What are you in the mood for?" prompt
- Tap to launch quiz

### MoodBookCard
**File:** `src/features/mood-discovery/components/MoodBookCard.tsx`

Book card with match percentage badge shown in MoodResults grid.

---

## Integration Points

### Where Mood Data is Consumed

| Screen/Component | How It Uses Mood |
|------------------|------------------|
| BrowseScreen | Shows MoodFilterPills, passes session to useDiscoverData |
| DiscoverTab rows | All rows filtered/sorted by mood when session active |
| Hero recommendation | Top mood match becomes hero with mood reason |
| FilteredBooksScreen | Can filter by `mood_matched` type |
| BookDetailScreen | Could show match badge (not currently implemented) |

### Store Selectors

```typescript
// Check if session exists and not expired
useHasActiveSession()

// Get active session (null if expired)
useActiveSession()

// Get draft state for quiz UI
useMoodDraft()

// Get quiz navigation actions
useQuizActions()

// Get session info + clear/quickTune actions
useSessionInfo()
```

---

## Key Files Summary

| File | Purpose |
|------|---------|
| `types.ts` | All type definitions, mood/pace/weight/world/length configs |
| `stores/moodSessionStore.ts` | Zustand store with session + draft state |
| `screens/MoodDiscoveryScreen.tsx` | 5-step quiz UI |
| `screens/MoodResultsScreen.tsx` | Results grid with grouped matches |
| `hooks/useMoodRecommendations.ts` | Scoring algorithm + book ranking |
| `hooks/useMoodFilteredBooks.ts` | Simple length-based filtering |
| `utils/tagScoring.ts` | Tag-based mood scoring |
| `constants/tagMoodMap.ts` | Tag → mood dimension mappings |
| `components/QuickTuneBar.tsx` | Session info bar for results |
| `components/MoodFilterPills.tsx` | Session chips for browse screen |
| `components/MoodBookCard.tsx` | Book card with match badge |
| `components/MoodDiscoveryCard.tsx` | Entry point "set mood" card |

---

## Session Expiry Behavior

- **On App Launch:** `validateSession()` called during rehydration
- **Timer Display:** Updates every minute (or every second when <1min left)
- **Expired Session:** Automatically cleared, UI reverts to non-mood state
- **Manual Clear:** Immediate, no confirmation

---

## Data Flow Summary

```
User completes quiz
       │
       ▼
commitSession() creates MoodSession
       │
       ├──────────────────────────────────────┐
       ▼                                      ▼
AsyncStorage persists session          useMoodRecommendations()
       │                                scores all books
       │                                      │
       ▼                                      ▼
Session survives restart              moodScoreMap populated
       │                                      │
       └──────────────┬───────────────────────┘
                      ▼
              useDiscoverData()
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
    filterByMood() applied    Hero uses top    Titles become
    to all rows               mood match       mood-aware
```
