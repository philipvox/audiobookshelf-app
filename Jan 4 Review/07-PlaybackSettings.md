# PlaybackSettings and JoystickSeekSettings Documentation

## Overview

The app provides two distinct settings stores for player customization:
1. **PlaybackSettings** (`settingsStore.ts`) - Core playback controls: speed, skip intervals, smart rewind, sleep timer
2. **JoystickSeekSettings** (`joystickSeekStore.ts`) - Variable-speed seeking via drag gestures

Both stores use Zustand with AsyncStorage persistence, ensuring settings survive app restarts.

---

## PlaybackSettings Store

**Location:** `src/features/player/stores/settingsStore.ts`
**Storage Key:** `player-settings`

### All Configurable Options

| Setting | Type | Default | Range | Description |
|---------|------|---------|-------|-------------|
| `globalDefaultRate` | number | `1.0` | 0.5–3.0 | Default playback speed for new books |
| `bookSpeedMap` | Record<string, number> | `{}` | - | Per-book speed overrides |
| `skipForwardInterval` | number | `30` | 5–120 sec | Forward skip button duration |
| `skipBackInterval` | number | `15` | 5–120 sec | Back skip button duration |
| `smartRewindEnabled` | boolean | `true` | - | Auto-rewind on resume after pause |
| `smartRewindMaxSeconds` | number | `30` | 5–120 sec | Maximum smart rewind duration |
| `shakeToExtendEnabled` | boolean | `true` | - | Shake device to extend sleep timer |
| `snapToChapterEnabled` | boolean | `true` | - | Snap timeline scrub to chapter boundaries |
| `snapToChapterThreshold` | number | `2` | 1–10 sec | Proximity threshold for chapter snapping |

### Constants

```typescript
// Speed limits
MIN_PLAYBACK_RATE = 0.5;
MAX_PLAYBACK_RATE = 3.0;
DEFAULT_PLAYBACK_RATE = 1.0;

// Skip interval limits
MIN_SKIP_INTERVAL = 5;
MAX_SKIP_INTERVAL = 120;
DEFAULT_SKIP_FORWARD = 30;
DEFAULT_SKIP_BACK = 15;

// Smart rewind limits
MIN_SMART_REWIND = 5;
MAX_SMART_REWIND = 120;
DEFAULT_SMART_REWIND_MAX = 30;

// Snap threshold limits
MIN_SNAP_THRESHOLD = 1;
MAX_SNAP_THRESHOLD = 10;
DEFAULT_SNAP_THRESHOLD = 2;
```

### Store Actions

```typescript
// Playback rate
setBookSpeed(bookId: string, rate: number): void
getBookSpeed(bookId: string): number  // Returns book rate or global default
setGlobalDefaultRate(rate: number): void
clearBookSpeed(bookId: string): void

// Skip intervals
setSkipForwardInterval(seconds: number): void
setSkipBackInterval(seconds: number): void

// Smart rewind
setSmartRewindEnabled(enabled: boolean): void
setSmartRewindMaxSeconds(seconds: number): void

// Sleep timer
setShakeToExtendEnabled(enabled: boolean): void

// Timeline scrub
setSnapToChapterEnabled(enabled: boolean): void
setSnapToChapterThreshold(seconds: number): void

// Bulk operations
resetToDefaults(): void
importSettings(settings: Partial<PlaybackSettings>): void
exportSettings(): PlaybackSettings
```

### Convenience Hooks

```typescript
// Subscribes to store and returns current value
useBookSpeed(bookId: string | null): number
useSkipForwardInterval(): number
useSkipBackInterval(): number
useSmartRewindEnabled(): boolean
useSmartRewindMaxSeconds(): number
useSnapToChapterEnabled(): boolean
useSnapToChapterThreshold(): number
useSnapToChapterSettings(): { enabled: boolean; threshold: number }
```

---

## JoystickSeekSettings Store

**Location:** `src/features/player/stores/joystickSeekStore.ts`
**Storage Key:** `joystick-seek-settings`

### All Configurable Options

| Setting | Type | Default | Range | Description |
|---------|------|---------|-------|-------------|
| `enabled` | boolean | `true` | - | Enable joystick seek feature |
| `minSpeed` | number | `1` | 0.1–30× | Seek speed at minimal drag |
| `maxSpeed` | number | `300` | 30–600× | Seek speed at maximum drag |
| `curvePreset` | CurvePreset | `'custom'` | see below | Response curve preset |
| `curveExponent` | number | `4.0` | 0.2–4.0 | Custom curve exponent |
| `deadzone` | number | `12` | 0–30 pt | Dead zone before seeking starts |
| `hapticEnabled` | boolean | `true` | - | Vibrate during seeking |

### Curve Presets

```typescript
type CurvePreset = 'fine' | 'swift' | 'even' | 'rush' | 'custom';

CURVE_PRESETS = {
  fine: 1.5,    // Expo - precision at low drag, accelerates later
  swift: 0.65,  // Balanced response
  even: 1.0,    // Linear - constant acceleration rate
  rush: 0.4,    // Log - quick to high speeds
};
```

### Helper Functions

```typescript
// Calculate seek speed from normalized drag distance
calculateSeekSpeed(dragDistance: number, settings: JoystickSeekSettings): number

// Apply deadzone to raw displacement, returns 0-1 normalized distance
applyDeadzone(displacement: number, maxDisplacement: number, deadzone: number): number

// Format speed for display
formatSpeedLabel(speed: number): string  // "5 minutes per second"
formatSpeedShort(speed: number): string  // "300×"

// Get preset name from exponent value
getPresetFromExponent(exponent: number): CurvePreset
```

### Speed Calculation Example

```typescript
// With default settings (exponent 4.0, min 1×, max 300×):
calculateSeekSpeed(0.0, settings)   // → 1× (minimum)
calculateSeekSpeed(0.25, settings)  // → ~1× (slow start due to high exponent)
calculateSeekSpeed(0.5, settings)   // → ~19×
calculateSeekSpeed(0.75, settings)  // → ~95×
calculateSeekSpeed(1.0, settings)   // → 300× (maximum)
```

---

## How Settings Affect Player Behavior

### 1. Playback Speed (Real-Time)

**Location:** `playerStore.ts:2030-2038`

```typescript
// When user changes speed, it's applied immediately via audioService
setGlobalDefaultRate: (rate) => {
  set({ globalDefaultRate: rate });
  // Persisted to AsyncStorage
}

// Per-book speed lookup (used when loading a book)
getBookSpeed: (bookId) => {
  const { bookSpeedMap, globalDefaultRate } = get();
  return bookSpeedMap[bookId] ?? globalDefaultRate;  // Falls back to global
}
```

**Effect:** When a book is loaded, `getBookSpeed()` retrieves the stored rate. The audio service applies this rate to `expo-av` immediately.

### 2. Skip Intervals (Real-Time)

**Location:** `playerStore.ts:2162-2172`, `CDPlayerScreen.tsx`

Skip buttons read directly from store state:
```typescript
const skipForward = useSkipForwardInterval();  // e.g., 30
const skipBack = useSkipBackInterval();        // e.g., 15

// On button press:
seekTo(currentPosition + skipForward);
seekTo(currentPosition - skipBack);
```

**Effect:** Changing the interval immediately updates button behavior - no restart needed.

### 3. Smart Rewind (On Resume)

**Location:** `playerStore.ts:1688-1710`, `smartRewindCalculator.ts`

Smart rewind triggers when playback resumes after a pause:

```typescript
// In play() action:
if (smartRewindEnabled && currentBook?.id && !skipSmartRewind) {
  const pauseData = await getSmartRewindPauseState(currentBook.id);
  if (pauseData) {
    const pauseDuration = now - pauseData.timestamp;
    const rewindSeconds = calculateSmartRewindSeconds(pauseDuration, smartRewindMaxSeconds);

    if (rewindSeconds > 0) {
      const newPosition = Math.max(0, pauseData.position - rewindSeconds);
      await seekTo(newPosition);
    }
  }
}
```

**Rewind Calculation (Ebbinghaus Forgetting Curve):**

| Pause Duration | Rewind Amount |
|---------------|---------------|
| < 3 seconds | 0s (echoic memory intact) |
| 3-10 seconds | 3-5s |
| 10-30 seconds | 5-10s |
| 30s - 2 min | 10-15s |
| 2-5 min | 15-20s |
| 5-15 min | 20-25s |
| 15 min - 1 hr | 25-30s |
| 1-24 hr | 30-45s |
| 24+ hr | `smartRewindMaxSeconds` |

### 4. Shake to Extend (Sleep Timer)

**Location:** `playerStore.ts:2042-2095`

When sleep timer is active and below threshold (60 seconds):
```typescript
// Sleep timer interval checks remaining time
if (remaining <= SLEEP_TIMER_SHAKE_THRESHOLD && !isShakeDetectionActive) {
  shakeDetector.start(() => {
    // On shake detected: add 15 minutes
    extendSleepTimer(15);
  });
}
```

**Effect:** Toggle immediately enables/disables shake detection registration.

### 5. Snap to Chapter (Timeline Scrubbing)

**Location:** `settingsStore.ts:319-339`

When user scrubs the timeline:
```typescript
const { enabled, threshold } = useSnapToChapterSettings();

// During scrub, check proximity to chapter boundaries
if (enabled) {
  const nearestChapter = chapters.find(ch =>
    Math.abs(seekPosition - ch.start) <= threshold
  );
  if (nearestChapter) {
    seekPosition = nearestChapter.start;  // Snap!
  }
}
```

**Effect:** Real-time snapping during timeline drag gestures.

### 6. Joystick Seek (Drag Gesture)

**Location:** `joystickSeekStore.ts:108-127`, `CDPlayerScreen.tsx`

The joystick seek uses a pan gesture from the play button:

```typescript
// On drag update:
const distance = Math.sqrt(tx * tx + ty * ty);
const normalizedDistance = applyDeadzone(distance, MAX_DISPLACEMENT, settings.deadzone);

if (normalizedDistance > 0) {
  const speed = calculateSeekSpeed(normalizedDistance, settings);
  const direction = tx >= 0 ? 'forward' : 'backward';

  // Seek by: speed × elapsed_time (in seconds per second of real time)
  seekTo(currentPosition + direction * speed * deltaTime);
}
```

**Effect:** All settings (curve, speed range, deadzone, haptics) are applied immediately on each gesture frame.

---

## Storage Keys

### settingsStore (player-settings)
```json
{
  "bookSpeedMap": {"book-id-1": 1.5, "book-id-2": 2.0},
  "globalDefaultRate": 1.0,
  "skipForwardInterval": 30,
  "skipBackInterval": 15,
  "smartRewindEnabled": true,
  "smartRewindMaxSeconds": 30,
  "shakeToExtendEnabled": true,
  "snapToChapterEnabled": true,
  "snapToChapterThreshold": 2
}
```

### joystickSeekStore (joystick-seek-settings)
```json
{
  "enabled": true,
  "minSpeed": 1,
  "maxSpeed": 300,
  "curvePreset": "custom",
  "curveExponent": 4.0,
  "deadzone": 12,
  "hapticEnabled": true
}
```

---

## UI Configuration Screens

### PlaybackSettingsScreen

**Location:** `src/features/profile/screens/PlaybackSettingsScreen.tsx`

**Sections:**
1. **Speed** - Default playback speed picker (0.5×–3.0×)
2. **Skip Intervals** - Forward (10/15/30/45/60s) and Back (5/10/15/30/45s) pickers
3. **Sleep Timer** - Shake to Extend toggle
4. **Smart Rewind** - Enable toggle + Max rewind duration picker (15/30/45/60/90s)
5. **Book Completion** - Completion prompt toggle, auto-mark finished toggle

### JoystickSeekSettingsScreen

**Location:** `src/features/profile/screens/JoystickSeekSettingsScreen.tsx`

**Sections:**
1. **Enable Toggle** - Master on/off for joystick seek
2. **Interactive Curve Preview** - Drag to adjust exponent, shows speed mapping
3. **Preset Pills** - Fine / Swift / Even / Rush presets
4. **Speed Range** - Min speed slider (0.1×–30×) and Max speed slider (30×–600×)
5. **Advanced** - Deadzone slider (0–30pt), Curve exponent slider (0.2–4.0), Haptic toggle
6. **Test Area** - Interactive drag pad to test settings live
7. **Reset Button** - Restore defaults with confirmation

---

## Data Flow Diagram

```
User Changes Setting
        │
        ▼
┌───────────────────┐
│   Settings UI     │
│ (PlaybackSettings │
│  or JoystickSeek) │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐       ┌─────────────────────┐
│   Zustand Store   │──────▶│   AsyncStorage      │
│ (useSettingsStore │       │ (player-settings or │
│ useJoystickSeek)  │       │ joystick-seek-...)  │
└────────┬──────────┘       └─────────────────────┘
         │
         ▼
┌───────────────────┐
│   Player/UI       │
│ Reads via hooks   │
│ (real-time)       │
└───────────────────┘
```

---

## Important Implementation Notes

### Per-Book Speed Memory
Each book remembers its playback speed independently via `bookSpeedMap`. When a book is first played, it inherits `globalDefaultRate`. Subsequent speed changes are stored per-book.

### Smart Rewind State Persistence
Smart rewind tracks pause state across app restarts using three AsyncStorage keys:
- `smartRewindPauseTimestamp` - When playback was paused
- `smartRewindPauseBookId` - Which book was paused
- `smartRewindPausePosition` - Position at pause time

### Value Clamping
All settings are clamped to valid ranges before storage:
```typescript
function clampRate(rate: number): number {
  return Math.max(MIN_PLAYBACK_RATE, Math.min(MAX_PLAYBACK_RATE, rate));
}
```

### Joystick Curve Math
The curve formula: `speed = minSpeed + (dragDistance ^ exponent) × (maxSpeed - minSpeed)`

- Higher exponent → slower start, more precision at low drag
- Lower exponent → faster start, reaches max speed quickly
