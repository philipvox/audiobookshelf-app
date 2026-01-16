/**
 * src/features/player/utils/positionResolver.ts
 *
 * Unified timestamp-based position resolution for cross-device sync.
 *
 * FIX 3: Instead of just using Math.max(local, server), we compare timestamps
 * to respect intentional rewinds. The most recently updated position wins.
 *
 * Example failure that this fixes:
 * 1. Listen on Phone to 45:00, sync
 * 2. On Tablet, rewind to 30:00 (intentional - missed something), sync
 * 3. On Phone, open app → OLD behavior: max(45:00, 30:00) = 45:00 ❌
 *    NEW behavior: Tablet's 30:00 wins because it has newer timestamp ✅
 */

import { audioLog } from '@/shared/utils/audioDebug';

const log = (...args: any[]) => audioLog.sync(args.join(' '));

/**
 * A source of playback position with its timestamp
 */
export interface PositionSource {
  position: number; // seconds
  updatedAt: number; // Unix timestamp in milliseconds
  source: 'local' | 'server';
}

/**
 * Options for position resolution
 */
export interface ResolutionOptions {
  /**
   * Positions differing by more than this are considered a "conflict"
   * Default: 120 seconds (2 minutes)
   */
  conflictThreshold?: number;

  /**
   * If timestamps are within this window, assume same session and use max
   * Default: 30000 ms (30 seconds)
   */
  sameSessionWindow?: number;
}

/**
 * Result of position resolution
 */
export interface ResolutionResult {
  /** The resolved position to use */
  position: number;

  /** Which source the position came from */
  source: 'local' | 'server';

  /** True if positions differ by more than conflictThreshold */
  isConflict: boolean;

  /** The local position (for UI to potentially show conflict dialog) */
  localPosition?: number;

  /** The server position (for UI to potentially show conflict dialog) */
  serverPosition?: number;

  /** Human-readable reason for the resolution */
  reason: string;
}

const DEFAULT_CONFLICT_THRESHOLD = 120; // 2 minutes
const DEFAULT_SAME_SESSION_WINDOW = 30000; // 30 seconds

/**
 * Resolve which position to use based on timestamps and positions.
 *
 * Resolution logic:
 * 1. If only one source exists, use it
 * 2. If timestamps are within 30 seconds (same session), use max (forward progress)
 * 3. Otherwise, use the more recent timestamp (intentional rewind preserved)
 *
 * @param local - Local position source (from SQLite), or null if none
 * @param server - Server position source (from session/progress), or null if none
 * @param options - Resolution options
 * @returns Resolution result with position and metadata
 */
export function resolvePosition(
  local: PositionSource | null,
  server: PositionSource | null,
  options: ResolutionOptions = {}
): ResolutionResult {
  const conflictThreshold = options.conflictThreshold ?? DEFAULT_CONFLICT_THRESHOLD;
  const sameSessionWindow = options.sameSessionWindow ?? DEFAULT_SAME_SESSION_WINDOW;

  log('Resolving position:');
  log(`  Local:  ${local && local.position != null ? `${local.position.toFixed(1)}s @ ${new Date(local.updatedAt).toISOString()}` : 'none'}`);
  log(`  Server: ${server && server.position != null ? `${server.position.toFixed(1)}s @ ${new Date(server.updatedAt).toISOString()}` : 'none'}`);

  // Case 1: Only local exists
  if (local && !server) {
    log('  Resolution: Using local (no server data)');
    return {
      position: local.position,
      source: 'local',
      isConflict: false,
      localPosition: local.position,
      reason: 'No server progress available',
    };
  }

  // Case 2: Only server exists
  if (!local && server) {
    log('  Resolution: Using server (no local data)');
    return {
      position: server.position,
      source: 'server',
      isConflict: false,
      serverPosition: server.position,
      reason: 'No local progress available',
    };
  }

  // Case 3: Neither exists
  if (!local && !server) {
    log('  Resolution: Starting from beginning (no data)');
    return {
      position: 0,
      source: 'local',
      isConflict: false,
      reason: 'No progress data available',
    };
  }

  // Case 4: Both exist - need to resolve
  const localPos = local!.position;
  const serverPos = server!.position;
  const localTime = local!.updatedAt;
  const serverTime = server!.updatedAt;

  const positionDiff = Math.abs(localPos - serverPos);
  const timeDiff = Math.abs(localTime - serverTime);
  const isConflict = positionDiff > conflictThreshold;

  log(`  Position diff: ${positionDiff.toFixed(1)}s`);
  log(`  Time diff: ${timeDiff}ms`);
  log(`  Is conflict: ${isConflict} (threshold: ${conflictThreshold}s)`);

  // Case 4a: Same session heuristic
  // If timestamps are very close, positions are from same listening session
  // Use max() for forward progress (normal playback updates)
  if (timeDiff < sameSessionWindow) {
    const maxPos = Math.max(localPos, serverPos);
    const winner = localPos >= serverPos ? 'local' : 'server';
    log(`  Resolution: Same session (${timeDiff}ms apart), using max = ${maxPos.toFixed(1)}s (${winner})`);
    return {
      position: maxPos,
      source: winner,
      isConflict,
      localPosition: localPos,
      serverPosition: serverPos,
      reason: `Same session - using higher position (${winner})`,
    };
  }

  // Case 4b: Different sessions - trust the more recent timestamp
  // This preserves intentional rewinds from another device
  if (serverTime > localTime) {
    log(`  Resolution: Server is newer (${serverTime - localTime}ms ahead), using server = ${serverPos.toFixed(1)}s`);
    return {
      position: serverPos,
      source: 'server',
      isConflict,
      localPosition: localPos,
      serverPosition: serverPos,
      reason: `Server progress is more recent (${formatTimeDiff(serverTime - localTime)} newer)`,
    };
  } else {
    log(`  Resolution: Local is newer (${localTime - serverTime}ms ahead), using local = ${localPos.toFixed(1)}s`);
    return {
      position: localPos,
      source: 'local',
      isConflict,
      localPosition: localPos,
      serverPosition: serverPos,
      reason: `Local progress is more recent (${formatTimeDiff(localTime - serverTime)} newer)`,
    };
  }
}

/**
 * Format a time difference in milliseconds to a human-readable string
 */
function formatTimeDiff(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}min`;
  return `${(ms / 3600000).toFixed(1)}hr`;
}

/**
 * Create a PositionSource from local SQLite data
 */
export function createLocalSource(position: number, updatedAt: number): PositionSource {
  return {
    position,
    updatedAt,
    source: 'local',
  };
}

/**
 * Create a PositionSource from server session/progress data
 */
export function createServerSource(position: number, updatedAt: number): PositionSource {
  return {
    position,
    updatedAt,
    source: 'server',
  };
}
