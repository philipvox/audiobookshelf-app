# Stats Documentation

## Overview

The Stats feature tracks listening activity locally on-device using SQLite, providing insights into listening habits, streaks, and progress over time. All data is stored locally and not synced to the server.

**Key Files:**
- `src/features/stats/screens/StatsScreen.tsx` - Main stats display
- `src/features/stats/hooks/useListeningStats.ts` - React Query hooks for stats data
- `src/features/stats/components/ShareStatsCard.tsx` - Shareable stats card
- `src/features/stats/services/shareService.ts` - Social sharing utilities
- `src/core/services/sqliteCache.ts` - SQLite storage (stats methods)
- `src/features/player/stores/playerStore.ts` - Session recording triggers

---

## Metrics Tracked

### Per-Session Metrics

Each listening session records:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique session ID (`session_{timestamp}_{random}`) |
| `book_id` | string | LibraryItem ID |
| `book_title` | string | Book title at time of session |
| `start_timestamp` | integer | Unix timestamp (ms) when session started |
| `end_timestamp` | integer | Unix timestamp (ms) when session ended |
| `duration_seconds` | integer | Actual listening duration in seconds |
| `start_position` | real | Audio position (seconds) at session start |
| `end_position` | real | Audio position (seconds) at session end |

### Daily Aggregates

**Table:** `daily_stats`

| Field | Type | Description |
|-------|------|-------------|
| `date` | string (PK) | ISO date `YYYY-MM-DD` |
| `total_seconds` | integer | Total listening time for the day |
| `session_count` | integer | Number of sessions that day |
| `books_touched` | JSON | Array of book IDs listened to |

### Derived Metrics

**Today:**
- `totalSeconds` - Total listening time today
- `sessionCount` - Number of sessions today
- `booksTouched` - List of books listened to today

**Weekly (Last 7 Days):**
- `totalSeconds` - Sum of daily totals
- `sessionCount` - Sum of daily sessions
- `uniqueBooks` - Distinct books across the week
- `dailyBreakdown` - Array of daily stats for chart

**All-Time:**
- `totalSeconds` - Lifetime listening time
- `totalSessions` - Lifetime session count
- `uniqueBooks` - Unique books ever listened to
- `averageSessionLength` - `totalSeconds / totalSessions`
- `firstListenDate` - Earliest recorded date

**Streak:**
- `currentStreak` - Consecutive days with listening activity
- `longestStreak` - Best streak ever achieved
- `lastListenDate` - Most recent listening date

**Top Books:**
- `bookId`, `bookTitle`, `totalSeconds` - Ranked by listening time

**By Hour:**
- 24-element array showing total seconds listened per hour of day (0-23)

---

## Calculation Methods

### Session Recording

**Location:** `src/features/player/stores/playerStore.ts:488-531`

Sessions are recorded automatically when playback stops:

```typescript
const MIN_SESSION_DURATION = 10; // Minimum 10 seconds to record

// Session tracking object
let activeSession: {
  bookId: string;
  bookTitle: string;
  startTimestamp: number;
  startPosition: number;
} | null = null;

// Start tracking when playback begins
function startListeningSession(book: LibraryItem, position: number) {
  activeSession = {
    bookId: book.id,
    bookTitle: metadata.title,
    startTimestamp: Date.now(),
    startPosition: position,
  };
}

// End and record when playback stops
async function endListeningSession(endPosition: number) {
  if (!activeSession) return;

  const durationSeconds = Math.round((Date.now() - activeSession.startTimestamp) / 1000);

  // Filter out micro-sessions
  if (durationSeconds < MIN_SESSION_DURATION) {
    activeSession = null;
    return;
  }

  await sqliteCache.recordListeningSession({...});
  activeSession = null;
}
```

**Session Triggers:**
- `play()` → starts session
- `pause()` → ends session
- `unload()` → ends session
- Switching books → ends previous session, starts new one

### Streak Calculation

**Location:** `src/core/services/sqliteCache.ts:2259-2314`

```typescript
async getListeningStreak(): Promise<ListeningStreak> {
  // Get all dates with activity (total_seconds > 0)
  const dates = /* SELECT date FROM daily_stats WHERE total_seconds > 0 ORDER BY date DESC */

  // Current streak: count consecutive days from today/yesterday
  let currentStreak = 0;
  const today = new Date().toISOString().split('T')[0];
  const yesterday = /* today - 1 day */

  // Streak only counts if last listen was today or yesterday
  if (lastListenDate === today || lastListenDate === yesterday) {
    currentStreak = 1;

    // Count consecutive previous days
    for (let i = 1; i < dates.length; i++) {
      const diffDays = /* dates[i-1] - dates[i] in days */
      if (diffDays === 1) {
        currentStreak++;
      } else {
        break; // Gap found, streak ends
      }
    }
  }

  // Longest streak: scan all dates for best consecutive run
  let longestStreak = 0;
  let runLength = 1;
  for (let i = 1; i < dates.length; i++) {
    const diffDays = /* dates[i-1] - dates[i] */
    if (diffDays === 1) {
      runLength++;
    } else {
      longestStreak = Math.max(longestStreak, runLength);
      runLength = 1;
    }
  }
  longestStreak = Math.max(longestStreak, runLength, currentStreak);

  return { currentStreak, longestStreak, lastListenDate };
}
```

### Average Session Length

```typescript
averageSessionLength = totalSeconds / totalSessions;
// Returns 0 if no sessions
```

### By-Hour Heatmap

**Location:** `src/core/services/sqliteCache.ts:2406-2437`

```sql
SELECT CAST(strftime('%H', start_timestamp / 1000, 'unixepoch', 'localtime') AS INTEGER) as hour,
       SUM(duration_seconds) as total
FROM listening_sessions
GROUP BY hour
ORDER BY hour
```

The query extracts the hour (0-23) from each session's start timestamp using SQLite's date functions, then sums the duration for each hour.

### Weekly Chart

**Location:** `src/features/stats/screens/StatsScreen.tsx:82-137`

```typescript
// Create array for last 7 days (most recent on right)
const last7Days = useMemo(() => {
  const days = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split('T')[0];
    const found = dailyBreakdown.find((db) => db.date === dateStr);
    days.push({
      date: dateStr,
      totalSeconds: found?.totalSeconds || 0,
      weekday: getWeekdayName(dateStr),
    });
  }

  return days;
}, [dailyBreakdown]);

// Bar height proportional to max
const height = Math.max((day.totalSeconds / maxSeconds) * 80, 4);
```

---

## Data Retention

### Storage Location

All stats are stored locally in SQLite (via expo-sqlite):

```
{appDocuments}/SQLite/audiobookshelf.db
```

**Tables:**
- `listening_sessions` - Individual session records (unlimited)
- `daily_stats` - Daily aggregates (unlimited)

### Retention Policy

**There is no automatic data retention/cleanup.** All listening sessions and daily stats are kept indefinitely.

**Implications:**
- Database size grows over time with listening activity
- Historical data available for all-time stats
- No server sync means data is lost if app is uninstalled

### Manual Clearing

**Location:** `src/core/services/sqliteCache.ts:2443-2454`

```typescript
async clearListeningStats(): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM listening_sessions');
    await db.runAsync('DELETE FROM daily_stats');
  });
}
```

This function exists but is not currently exposed in the UI. It would clear all listening history.

---

## Query Cache Configuration

**Location:** `src/features/stats/hooks/useListeningStats.ts`

| Query | Stale Time | Notes |
|-------|------------|-------|
| Today stats | 30 seconds | Refreshes frequently for live updates |
| Weekly stats | 1 minute | Moderate refresh rate |
| Monthly stats | 5 minutes | Less frequent updates |
| Streak | 1 minute | Moderate refresh rate |
| All-time stats | 5 minutes | Historical, changes slowly |
| Top books | 5 minutes | Historical, changes slowly |
| By hour | 5 minutes | Historical pattern |
| Recent sessions | 30 seconds | Recent activity updates |

### Query Invalidation

```typescript
export function useInvalidateStats() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['listeningStats'] });
  }, [queryClient]);
}
```

Called after recording a new session to refresh all stats queries.

---

## StatsScreen Display

**Location:** `src/features/stats/screens/StatsScreen.tsx`

### Sections

| Section | Data Source | Display |
|---------|-------------|---------|
| **Today** | `useTodayStats()` | Large time display + session/book counts |
| **Streak** | `useListeningStreak()` | Current streak with flame icon, longest streak with trophy |
| **This Week** | `useWeeklyStats()` | Total time, bar chart for last 7 days |
| **All Time** | `useAllTimeStats()` | 2x2 grid: Total Time, Books, Avg Session, Since |
| **Most Listened** | `useTopBooks(5)` | Ranked list with proportional bars |
| **When You Listen** | `useListeningByHour()` | 24-cell heatmap by hour |

### Visualizations

**Weekly Bar Chart:**
- 7 bars for Sun-Sat (most recent on right)
- Height proportional to max day
- Today highlighted in accent color
- Time label below each bar

**Hour Heatmap:**
- 24 cells representing 00:00-23:00
- Intensity based on listening time per hour
- Gold gradient from light (low) to solid (high)
- Labels at 12a, 6a, 12p, 6p

**Top Books List:**
- Rank number (1-5)
- Book title (truncated)
- Progress bar proportional to top book
- Duration label

---

## Sharing Feature

**Location:** `src/features/stats/components/ShareStatsCard.tsx`, `src/features/stats/services/shareService.ts`

### Shareable Stats

| Type | Trigger | Content |
|------|---------|---------|
| **Weekly** | Share button on "This Week" card | Time, sessions, books, streak |
| **Streak** | Share button on "Streak" card | Current streak with flame emoji |
| **All-Time** | Share button on "All Time" card | Total hours, sessions, books |

### Share Text Templates

```typescript
// Weekly
"My audiobook week:
{time} listened
{sessions} listening sessions
{books} books
{streak} day streak!

#audiobook #readinggoals #audiobookshelf"

// Streak
"{days} day listening streak!
// Special milestones:
// 365+ → "One year of daily listening!"
// 100+ → "100+ days of listening streak!"
// 30+ → "30+ days of listening streak!"
// 7+ → "One week of listening streak!"

#audiobook #readingstreak #audiobookshelf"

// Milestone (hours)
"I've listened to {hours} of audiobooks!
// Special milestones: 1000h, 500h, 100h, 50h, 24h ("one full day!"), 10h

#audiobook #milestone #audiobookshelf"
```

### Share Card UI

The `ShareStatsCard` component renders a visual card in a modal:
- Dark gradient background (#16213E → #0F3460)
- Large stat number
- Sub-stats row with divider
- "AudiobookShelf" branding at bottom
- Share button (uses native Share API)
- Cancel button to dismiss

---

## Database Schema

**Location:** `src/core/services/sqliteCache.ts:389-482`

```sql
-- Individual listening sessions
CREATE TABLE IF NOT EXISTS listening_sessions (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL,
  book_title TEXT NOT NULL,
  start_timestamp INTEGER NOT NULL,
  end_timestamp INTEGER NOT NULL,
  duration_seconds INTEGER NOT NULL,
  start_position REAL NOT NULL,
  end_position REAL NOT NULL
);

-- Daily listening stats (aggregated per day)
CREATE TABLE IF NOT EXISTS daily_stats (
  date TEXT PRIMARY KEY,
  total_seconds INTEGER NOT NULL DEFAULT 0,
  session_count INTEGER NOT NULL DEFAULT 0,
  books_touched TEXT NOT NULL DEFAULT '[]'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_book_id ON listening_sessions(book_id);
CREATE INDEX IF NOT EXISTS idx_sessions_start ON listening_sessions(start_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date DESC);
```

---

## Data Flow Diagram

```
User starts playback
        │
        ▼
┌───────────────────────────┐
│  playerStore.play()       │
│  startListeningSession()  │
└───────────┬───────────────┘
            │
            │ (user listens)
            ▼
┌───────────────────────────┐
│  playerStore.pause()      │
│  endListeningSession()    │
└───────────┬───────────────┘
            │
            │ duration >= 10s?
            ▼
┌───────────────────────────┐
│  sqliteCache.record...    │
│  ├─ INSERT session        │
│  └─ UPDATE daily_stats    │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│  invalidateStats()        │
│  React Query refetch      │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│  StatsScreen updates      │
│  via useStatsScreen()     │
└───────────────────────────┘
```

---

## Important Notes

### Local-Only Storage

> "Stats are recorded locally on your device"
> — Footer text on StatsScreen

Stats are **not synced** to the AudiobookShelf server. This means:
- Data is private to the device
- Uninstalling the app loses all stats
- Different devices have separate stats

### Minimum Session Duration

Sessions shorter than 10 seconds are discarded:

```typescript
const MIN_SESSION_DURATION = 10;

if (durationSeconds < MIN_SESSION_DURATION) {
  log(`Session too short (${durationSeconds}s), not recording`);
  return;
}
```

This filters out accidental plays, quick previews, and other micro-interactions.

### Book Title Snapshot

The book title is captured at session time:

```typescript
book_title TEXT NOT NULL
```

This means if a book's title is later changed on the server, old sessions retain the original title. This is intentional for historical accuracy.
