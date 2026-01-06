# Kid Mode Settings Documentation

## Overview

Kid Mode is a content filtering system that restricts which audiobooks are visible throughout the app. When enabled, it filters books based on age categories, content ratings, allowed genres/tags, and blocked genres/tags.

**Settings Screen:** `src/features/profile/screens/KidModeSettingsScreen.tsx`
**Store:** `src/features/profile/stores/kidModeStore.ts`
**Filter Logic:** `src/shared/utils/kidModeFilter.ts`

---

## What Kid Mode Restricts

When Kid Mode is **enabled**, books are filtered based on a multi-layer system:

### Layer 1: Explicit Flag Check
```
metadata.explicit === true  →  BLOCKED
```
Books with the explicit flag set are always blocked.

### Layer 2: Blocked Genres/Tags (Always Active)
If a book has ANY blocked genre or tag, it's hidden regardless of other criteria.

**Default Blocked Genres:**
- erotica, erotic, adult, romance, dark romance
- dark fantasy, grimdark, horror, thriller, true crime
- paranormal romance, new adult, na, mature, 18+
- adult fiction, young adult, ya, teen, teen fiction

**Default Blocked Tags:**
- adult, mature, explicit, 18+, nsfw
- dark, grimdark, violent, gore

### Layer 3: Age Category Filtering (Optional)
If enabled, books with age category tags are filtered:

| Category | Allowed Tags | Typical Ages |
|----------|--------------|--------------|
| Children's | children's, childrens, kids, juvenile, middle grade, picture books | 0-12 |
| Teens | teens, teen, teen fiction | 10-15 |
| Young Adult | young adult, young-adult, ya | 13-18 |
| Adult | adult, adult fiction, mature, 18+ | 18+ |

**Logic:** Book passes if its category index ≤ max category index.
Example: Max = "Children's" → only Children's books pass.

### Layer 4: Content Rating Filtering (Optional)
If enabled, books with content rating tags are filtered:

| Rating | Allowed Tags | Typical Ages |
|--------|--------------|--------------|
| G | g, rated g, rating: g, general audience, all ages | All Ages |
| PG | pg, rated pg, rating: pg, parental guidance | 8+ |
| PG-13 | pg-13, pg13, rated pg-13, rating: pg-13, 13+ | 13+ |
| R | r, rated r, rating: r, mature, 17+, 18+ | 17+ |

**Logic:** Book passes if its rating index ≤ max rating index.
Example: Max = "G" → only G-rated books pass.

### Layer 5: Allowed Genres/Tags (Optional)
If no age category or rating tag is found AND allowed filtering is enabled:

**Default Allowed Genres:**
- children, children's, childrens, kids
- middle grade, picture books, juvenile

**Default Allowed Tags:**
- kids, children, family, family-friendly
- all-ages, kid-friendly, child-friendly

**Logic:** Book must have at least ONE allowed genre OR tag to pass.

---

## Filter Decision Flowchart

```
                              ┌─────────────────┐
                              │   Start Filter  │
                              └────────┬────────┘
                                       │
                              ┌────────▼────────┐
                              │ explicit=true?  │
                              └────────┬────────┘
                                   yes │ no
                              ┌────────▼────────┐
                              │     BLOCK       │
                              └─────────────────┘
                                       │ no
                              ┌────────▼────────┐
                              │ Has blocked     │
                              │ genre or tag?   │
                              └────────┬────────┘
                                   yes │ no
                              ┌────────▼────────┐
                              │     BLOCK       │
                              └─────────────────┘
                                       │ no
                      ┌────────────────▼────────────────┐
                      │ Age filtering enabled?          │
                      └────────────────┬────────────────┘
                                  yes  │  no
                      ┌────────────────▼────────────────┐
                      │ Has age category tag?           │
                      └────────────────┬────────────────┘
                                  yes  │  no
                      ┌────────────────▼────────────────┐
                      │ Category ≤ max category?        │
                      └────────────────┬────────────────┘
                              yes │         │ no
                                  │  ┌──────▼──────┐
                                  │  │   BLOCK     │
                                  │  └─────────────┘
                                  │
                      ┌───────────▼─────────────────────┐
                      │ Rating filtering enabled?       │
                      └───────────────┬─────────────────┘
                                 yes  │  no
                      ┌───────────────▼─────────────────┐
                      │ Has content rating tag?         │
                      └───────────────┬─────────────────┘
                                 yes  │  no
                      ┌───────────────▼─────────────────┐
                      │ Rating ≤ max rating?            │
                      └───────────────┬─────────────────┘
                             yes │         │ no
                                 │  ┌──────▼──────┐
                                 │  │   BLOCK     │
                                 │  └─────────────┘
                                 │
                      ┌──────────▼──────────────────────┐
                      │ Found age category OR rating?   │
                      └──────────────┬──────────────────┘
                                yes  │  no
                      ┌──────────────▼──────────────────┐
                      │          PASS                   │
                      └─────────────────────────────────┘
                                     │ no
                      ┌──────────────▼──────────────────┐
                      │ Allowed filtering enabled?      │
                      └──────────────┬──────────────────┘
                                 no  │  yes
                      ┌──────────────▼──────────────────┐
                      │         PASS                    │
                      └─────────────────────────────────┘
                                     │ yes
                      ┌──────────────▼──────────────────┐
                      │ Has allowed genre OR tag?       │
                      └──────────────┬──────────────────┘
                             yes │         │ no
                      ┌──────────▼────┐ ┌──▼───────────┐
                      │    PASS       │ │    BLOCK     │
                      └───────────────┘ └──────────────┘
```

---

## How Restrictions Are Enforced App-Wide

Kid Mode filtering is applied at the **data layer** in each major screen:

### Screens with Kid Mode Enforcement

| Screen | Hook/File | Enforcement Point |
|--------|-----------|-------------------|
| **HomeScreen** | `useHomeData.ts:55` | Filters `inProgressItems`, `libraryBooks`, recently listened |
| **DiscoverTab** | `useDiscoverData.ts:144` | Filters `rawLibraryItems` before any processing |
| **SearchScreen** | `SearchScreen.tsx:232` | Filters search results and autocomplete |
| **MyLibraryScreen** | `MyLibraryScreen.tsx:394` | Filters all book lists (in-progress, favorites, downloaded) |

### Implementation Pattern

Each screen follows this pattern:
```typescript
// 1. Get Kid Mode state from store
const kidModeEnabled = useKidModeStore((state) => state.enabled);

// 2. Apply filter early, before any derived computations
const filteredItems = useMemo(
  () => filterForKidMode(rawItems, kidModeEnabled),
  [rawItems, kidModeEnabled]
);

// 3. All subsequent logic uses filteredItems, not rawItems
```

### Coverage Summary

| Feature | Filtered |
|---------|----------|
| Home "Continue Listening" | ✅ |
| Home "Your Books" | ✅ |
| Home "Your Series" | ✅ (via books) |
| Home "Recently Added" | ✅ |
| Discover all rows | ✅ |
| Discover hero | ✅ |
| Search results | ✅ |
| Search autocomplete | ✅ |
| My Library tabs | ✅ |
| Book Detail | ❌ (accessible via direct link) |
| Queue | ❌ (shows what's playing) |
| Downloads | ❌ (shows downloaded files) |

**Note:** BookDetail and Queue don't filter because:
- BookDetail may be accessed via external link/notification
- Queue shows currently queued items regardless of mode

---

## Unlock Mechanism

### Current Implementation
Kid Mode has **NO unlock mechanism** - there is no PIN, password, or parental lock.

The toggle on/off is a simple switch in Profile → Kid Mode Settings.

### Master Toggle Location
**ProfileScreen:** Profile → Kid Mode → Toggle switch

```
┌─────────────────────────────────────────┐
│  👶  Kid Mode                           │
│  ────────────────────────────────────   │
│  Active - filtering content   [====●]   │
│                                  ON     │
└─────────────────────────────────────────┘
```

### Settings Access
All Kid Mode settings are freely accessible:
1. Navigate to Profile tab
2. Tap "Kid Mode"
3. Full settings screen with no authentication

### Implications
- **No parental lock** - children can disable Kid Mode
- **Design philosophy** - trusted household environment assumed
- **Future consideration** - PIN protection could be added

---

## Store Persistence

**AsyncStorage Key:** `kid-mode-store`

### Persisted State

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | `false` | Master toggle |
| `useAgeFiltering` | boolean | `true` | Enable age category filtering |
| `maxAgeCategory` | AgeCategory | `'childrens'` | Maximum allowed age category |
| `useRatingFiltering` | boolean | `true` | Enable content rating filtering |
| `maxRating` | ContentRating | `'g'` | Maximum allowed rating |
| `useAllowedGenresTags` | boolean | `true` | Require allowed genres/tags |
| `allowedGenres` | string[] | See defaults | Genres that pass filter |
| `allowedTags` | string[] | See defaults | Tags that pass filter |
| `blockedGenres` | string[] | See defaults | Genres that block |
| `blockedTags` | string[] | See defaults | Tags that block |

### Persistence Behavior
- Settings persist across app restarts
- Settings persist across logout/login
- Settings are device-specific (not synced to server)

---

## Settings Screen UI

### Sections

1. **Master Toggle** - Enable/disable Kid Mode
2. **Info Card** - Explains filtering logic
3. **Age Category Filtering** - Toggle + category picker
4. **Content Rating Filtering** - Toggle + rating picker
5. **Allowed Genres & Tags** - Toggle + editable chip lists
6. **Blocked Genres** - Editable chip list
7. **Blocked Tags** - Editable chip list
8. **Tips** - Quick reference for settings

### Customization Features
- Add custom genres/tags to allowed or blocked lists
- Remove any genre/tag from lists
- Reset all lists to defaults (confirmation required)

### Visual Indicators
- Green chips = allowed items
- Red chips = blocked items
- Gold highlight = selected category/rating
- Dimmed options = categories/ratings above max

---

## API

### Store Selectors

```typescript
// Check if enabled (outside React)
isKidModeEnabled(): boolean

// Get all settings (outside React)
getKidModeSettings(): KidModeFilterSettings

// Hook for all settings
useKidModeSettings(): KidModeFilterSettings
```

### Filter Functions

```typescript
// Check single item
isKidFriendly(item: LibraryItem, settings?: KidModeFilterSettings): boolean

// Filter array (with enabled check)
filterForKidMode<T extends LibraryItem>(
  items: T[],
  kidModeEnabled: boolean,
  settings?: KidModeFilterSettings
): T[]

// Filter using global store state
applyKidModeFilter<T extends LibraryItem>(items: T[]): T[]

// Get age category from tags
getAgeCategoryFromTags(tags: string[]): AgeCategory | null

// Get content rating from tags
getRatingFromTags(tags: string[]): ContentRating | null
```

---

## Key Files

| File | Purpose |
|------|---------|
| `src/features/profile/screens/KidModeSettingsScreen.tsx` | Settings UI |
| `src/features/profile/stores/kidModeStore.ts` | Zustand store with state + actions |
| `src/shared/utils/kidModeFilter.ts` | Filter logic functions |
| `src/features/profile/screens/ProfileScreen.tsx` | Entry point with ON/OFF badge |

---

## Tips & Best Practices

### For AudiobookShelf Server Admins
1. **Use age category tags** - Add "Children's", "Teens", etc. to books
2. **Use content rating tags** - Add "G", "PG", "PG-13", "R" to books
3. **Use genre taxonomy** - Consistent genre naming enables filtering

### For App Users
1. **Test your settings** - Check that appropriate books appear/disappear
2. **Customize blocked list** - Add any genres/tags you want to exclude
3. **Reset if confused** - Use reset button to return to defaults

### Filtering Priority
1. Explicit flag (highest priority - always blocks)
2. Blocked genres/tags (always checked)
3. Age category (if tag present + filtering enabled)
4. Content rating (if tag present + filtering enabled)
5. Allowed genres/tags (fallback for untagged books)
