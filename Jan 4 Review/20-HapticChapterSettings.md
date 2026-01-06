# Haptic Settings & Chapter Cleaning Settings Documentation

**Files:**
- `src/features/profile/screens/HapticSettingsScreen.tsx` - Haptic settings UI
- `src/features/profile/stores/hapticSettingsStore.ts` - Haptic state
- `src/core/native/haptics.ts` - Haptic service implementation
- `src/features/profile/screens/ChapterCleaningSettingsScreen.tsx` - Chapter settings UI
- `src/features/profile/stores/chapterCleaningStore.ts` - Chapter cleaning state
- `src/core/services/chapterNormalizer.ts` - Chapter name parser

---

# Haptic Settings

## Overview

Haptic feedback provides tactile confirmation for actions. Users can enable/disable haptics globally or per-category.

## All Options

### Master Toggle

| Setting | Key | Default | Description |
|---------|-----|---------|-------------|
| Haptic Feedback | `enabled` | `true` | Master kill switch - disables ALL haptics when false |

### Category Toggles (only visible when master is enabled)

| Category | Key | Default | Description | Haptic Methods |
|----------|-----|---------|-------------|----------------|
| **Playback Controls** | `playbackControls` | `true` | Play/pause, skip forward/back | `playbackToggle()`, `skip()`, `chapterChange()` |
| **Timeline Scrubbing** | `scrubberFeedback` | `true` | Scrubbing feedback, chapter markers | `seek()`, `chapterMarker()`, `chapterSnap()` |
| **Speed Control** | `speedControl` | `true` | Speed selection changes | `speedChange()`, `speedBoundary()`, `speedDefault()` |
| **Sleep Timer** | `sleepTimer` | `true` | Timer set, warning, expiration | `sleepTimerSet()`, `sleepTimerClear()`, `sleepTimerWarning()`, `sleepTimerExpired()` |
| **Downloads** | `downloads` | `true` | Download start and completion | `downloadStart()`, `downloadComplete()`, `downloadFailed()` |
| **Bookmarks** | `bookmarks` | `true` | Create, delete, jump to bookmark | `bookmarkCreated()`, `bookmarkDeleted()`, `bookmarkJump()` |
| **Completions** | `completions` | `true` | Book and series celebrations | `bookComplete()`, `seriesComplete()`, `progressMilestone()` |
| **UI Interactions** | `uiInteractions` | `true` | Buttons, toggles, long press | `buttonPress()`, `toggle()`, `longPress()`, `success()`, `warning()`, `error()`, `destructiveConfirm()` |

## Defaults

```typescript
const DEFAULT_SETTINGS: HapticSettings = {
  enabled: true,
  playbackControls: true,
  scrubberFeedback: true,
  speedControl: true,
  sleepTimer: true,
  downloads: true,
  bookmarks: true,
  completions: true,
  uiInteractions: true,
};
```

**All haptics enabled by default.**

## Storage

| Key | Storage |
|-----|---------|
| `haptic-settings` | AsyncStorage (Zustand persist) |

## How Settings Are Applied

### Category Check Pattern

Every haptic method checks its category before firing:

```typescript
// haptics.ts:166-169
playbackToggle(): void {
  if (!this.isCategoryEnabled('playbackControls')) return;
  this.impact('medium');
}
```

### isCategoryEnabled Logic

```typescript
// haptics.ts:81-86
isCategoryEnabled(category: HapticCategory): boolean {
  const settings = loadSettingsStore();
  return settings.enabled && settings[category];  // Master AND category
}
```

**Both master toggle AND category toggle must be true.**

## Haptic Patterns

### Impact Feedback (Physical Taps)

| Style | expo-haptics | Used For |
|-------|--------------|----------|
| `light` | `ImpactFeedbackStyle.Light` | Skip, bookmark delete, speed default |
| `medium` | `ImpactFeedbackStyle.Medium` | Play/pause, toggle, pull-to-refresh |
| `heavy` | `ImpactFeedbackStyle.Heavy` | Long press, important action |
| `soft` | `ImpactFeedbackStyle.Soft` | Chapter change, swipe complete |
| `rigid` | `ImpactFeedbackStyle.Rigid` | (Reserved) |

### Notification Feedback (System Events)

| Type | Used For |
|------|----------|
| `success` | Download complete, bookmark created, book complete |
| `warning` | Sleep timer warning/expired, destructive confirm |
| `error` | Download failed |

### Compound Patterns

```typescript
// speedBoundary: Double-tap pattern for min/max speed
this.impact('medium');
setTimeout(() => this.impact('light'), 50);

// bookComplete: Success + light tap
this.notification('success');
setTimeout(() => this.impact('light'), 100);

// seriesComplete: Success + medium + light (celebration)
this.notification('success');
setTimeout(() => {
  this.impact('medium');
  setTimeout(() => this.impact('light'), 100);
}, 150);

// destructiveConfirm: Heavy + medium (warning)
this.impact('heavy');
setTimeout(() => this.impact('medium'), 80);
```

## React Hook

```typescript
const {
  buttonPress,
  playbackToggle,
  speedChange,
  downloadComplete,
  bookComplete,
  // ... 30+ methods
} = useHaptics();
```

---

# Chapter Cleaning Settings

## Overview

Cleans up inconsistent chapter names from various metadata sources (ID3 tags, filenames, APIs) for a polished display. **Original metadata is never modified** - cleaning is display-only.

Based on analysis of 68,515 real chapter titles across 2,064 audiobooks.

## All Options

### Cleaning Level (Radio Selection)

| Level | Key | Default | Description |
|-------|-----|---------|-------------|
| **Off** | `'off'` | | Show chapter names exactly as stored |
| **Light** | `'light'` | | Remove track numbers and file extensions |
| **Standard** | `'standard'` | **Default** | Normalize chapter formatting to consistent style |
| **Aggressive** | `'aggressive'` | | Remove book titles and fully standardize |

### Advanced Toggle

| Setting | Key | Default | Description |
|---------|-----|---------|-------------|
| Show Original Names | `showOriginalNames` | `false` | Display original metadata for debugging |

## Defaults

```typescript
const DEFAULT_SETTINGS: ChapterCleaningSettings = {
  level: 'standard',
  showOriginalNames: false,
};
```

## Level Descriptions

```typescript
CLEANING_LEVEL_INFO = {
  off: {
    label: 'Off',
    description: 'Show chapter names exactly as stored',
    example: '"01-BookTitle-Ch1.mp3" shown as-is',
  },
  light: {
    label: 'Light',
    description: 'Remove track numbers and file extensions',
    example: '"01 - Chapter 1" -> "Chapter 1"',
  },
  standard: {
    label: 'Standard',
    description: 'Normalize chapter formatting to consistent style',
    example: '"Ch 1" -> "Chapter 1"',
  },
  aggressive: {
    label: 'Aggressive',
    description: 'Remove book titles and fully standardize',
    example: '"Harry Potter Ch 1" -> "Chapter 1"',
  },
};
```

## Storage

| Key | Storage |
|-----|---------|
| `chapter-cleaning-settings` | AsyncStorage (Zustand persist) |

## How Cleaning Is Applied

### Parser Flow

```
Raw Title -> normalizeCharacters() -> Pattern Matching -> ParsedChapter.displayName
```

### Pattern Matching Priority

1. **Front/Back Matter** - Prologue, Epilogue, Credits, etc. (preserved)
2. **Track-based** - `N - BookTitle: Chapter X` (most common ~50k occurrences)
3. **Direct Chapter** - `Chapter N: Title`
4. **Part** - `Part N: Title`
5. **Book** - `Book N: Title`
6. **Disc/Track** - `D01T01`, `Track 5`
7. **Number Only** - `42` -> `Chapter 42`

### Example Transformations

| Input | Output (Standard) |
|-------|-------------------|
| `01 - The Great Gatsby: Chapter 1` | `Chapter 1` |
| `D01T05 - Interview With the Vampire` | `Chapter 5` |
| `Chapter Twenty-Three: The Discovery` | `Chapter 23: The Discovery` |
| `Prologue` | `Prologue` (preserved) |
| `Harry Potter Ch 1` | `Chapter 1` (aggressive removes book title) |

### Character Normalization

Applied to all levels:

```typescript
function normalizeCharacters(str: string): string {
  return str
    .replace(/[–—‑]/g, '-')         // Normalize dashes
    .replace(/\u00A0/g, ' ')        // Non-breaking space
    .replace(/['']/g, "'")          // Curly quotes
    .replace(/[""]/g, '"')
    .replace(/…/g, '...')           // Ellipsis
    .replace(/\s+/g, ' ')           // Collapse spaces
    .trim();
}
```

### Number Parsing

Supports:
- Arabic numerals: `1`, `42`, `100`
- Roman numerals: `I`, `XIV`, `XLII`
- Spelled-out: `One`, `Twenty-Three`, `One Hundred Five`

### Front/Back Matter Keywords

**Preserved without modification:**

| Front Matter | Back Matter |
|--------------|-------------|
| Opening Credits | Epilogue |
| Credits | Conclusion |
| Dedication | Afterword |
| Epigraph | Acknowledgements |
| Foreword | Author's Note |
| Preface | About the Author |
| Introduction | End Credits |
| Intro | Closing Credits |
| Prologue | |

### Caching

```typescript
// chapterNormalizer.ts:757-759
const chapterCache = new Map<string, ParsedChapter[]>();
const MAX_CACHE_SIZE = 50;

// Cache key: `${bookTitle}-${level}-${chaptersHash}`
```

**50 books cached** to avoid re-parsing on screen remounts.

## Parsed Chapter Structure

```typescript
interface ParsedChapter {
  original: string;           // Raw input
  trackNumber: number | null; // Extracted track number
  bookTitle: string | null;   // Extracted book title
  chapterType: 'chapter' | 'part' | 'book' | 'front_matter' | 'back_matter' | 'other';
  chapterNumber: number | null;
  chapterTitle: string | null;
  displayName: string;        // FINAL CLEANED NAME
  confidence: number;         // 0.0 - 1.0
}
```

## Convenience Functions

```typescript
// Get cleaned name for single chapter
const cleanName = getCleanChapterName('01 - Chapter 1', 'standard');

// Batch process with smart duplicate handling
const chapters = normalizeChapters(rawTitles, { level: 'standard' });

// Check if cleaning is enabled
const isEnabled = isChapterCleaningEnabled();

// Get current level (outside React)
const level = getChapterCleaningLevel();
```

## Smart Duplicate Handling

If all chapters parse to the same name, sequential numbers are appended:

```
["Track 1", "Track 1", "Track 1"] -> ["Chapter 1", "Chapter 2", "Chapter 3"]
```

If some chapters have duplicate names:

```
["Prologue", "Chapter 1", "Chapter 1"] -> ["Prologue", "Chapter 1 (1)", "Chapter 1 (2)"]
```

---

## UI Screen Locations

| Screen | Path | Notes |
|--------|------|-------|
| Haptic Settings | Profile -> Haptic Feedback | Master toggle hides categories when off |
| Chapter Cleaning | Profile -> Chapter Names | Recommended badge on "Standard" |
