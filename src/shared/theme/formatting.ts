/**
 * Formatting utilities
 * Standardized text patterns for duration and progress display
 */

// =============================================================================
// DURATION FORMATTING
// =============================================================================

export const formatDuration = {
  /**
   * Short format: "1h 24m" or "45m"
   * Use for: card metadata, list rows
   */
  short: (seconds: number): string => {
    if (!seconds || seconds < 0) return '0m';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  },

  /**
   * Long format: "1 hour 24 minutes"
   * Use for: accessibility, verbose descriptions
   */
  long: (seconds: number): string => {
    if (!seconds || seconds < 0) return '0 minutes';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    const hourStr = hours === 1 ? '1 hour' : `${hours} hours`;
    const minStr = minutes === 1 ? '1 minute' : `${minutes} minutes`;

    if (hours === 0) return minStr;
    if (minutes === 0) return hourStr;
    return `${hourStr} ${minStr}`;
  },

  /**
   * Timestamp format: "01:24:35" or "24:35"
   * Use for: player time display
   */
  timestamp: (seconds: number): string => {
    if (!seconds || seconds < 0) return '00:00';

    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h === 0) {
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  },

  /**
   * Approximate format: "~2h left" or "~45m left"
   * Use for: remaining time estimates
   */
  approximate: (seconds: number): string => {
    if (!seconds || seconds < 0) return '~0m left';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours === 0) return `~${minutes}m left`;
    if (minutes === 0) return `~${hours}h left`;
    return `~${hours}h ${minutes}m left`;
  },

  /**
   * Compact format: "1:24" (no leading zeros)
   * Use for: inline timestamps, chapter duration
   */
  compact: (seconds: number): string => {
    if (!seconds || seconds < 0) return '0:00';

    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h === 0) {
      return `${m}:${s.toString().padStart(2, '0')}`;
    }
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  },
};

// =============================================================================
// PROGRESS FORMATTING
// =============================================================================

export const formatProgress = {
  /**
   * Percentage format: "45%"
   * Use for: progress indicators, completion status
   */
  percent: (progress: number): string => {
    if (!progress || progress < 0) return '0%';
    if (progress > 1) return '100%';
    return `${Math.round(progress * 100)}%`;
  },

  /**
   * Count format: "4 of 7 complete"
   * Use for: series progress, collection status
   */
  count: (current: number, total: number): string => {
    return `${current} of ${total} complete`;
  },

  /**
   * Short count format: "4/7"
   * Use for: compact displays, badges
   */
  shortCount: (current: number, total: number): string => {
    return `${current}/${total}`;
  },

  /**
   * Fraction format: "Book 4 of 7"
   * Use for: series position
   */
  position: (current: number, total: number): string => {
    return `Book ${current} of ${total}`;
  },
};

// =============================================================================
// METADATA SEPARATORS
// =============================================================================

/** Standard separators for metadata strings */
export const separators = {
  /** Middle dot: "Author · 45h 30m" */
  dot: ' · ',
  /** Pipe: "Fantasy | Adventure" */
  pipe: ' | ',
  /** Comma: "Author One, Author Two" */
  comma: ', ',
  /** Bullet: "• Item" */
  bullet: '• ',
} as const;
