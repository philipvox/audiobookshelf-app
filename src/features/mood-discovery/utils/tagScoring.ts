/**
 * src/features/mood-discovery/utils/tagScoring.ts
 *
 * Tag-based mood scoring utility.
 * Replaces the old regex-based theme/trope parsing with actual book tags.
 *
 * This provides more reliable mood matching because:
 * 1. Tags are explicit metadata, not parsed from free text
 * 2. AudiobookShelf users can add/edit tags directly
 * 3. No dependency on specific description formats
 */

import { MoodSession, Mood, Pace, Weight, World, LengthPreference } from '../types';
import {
  TAG_MOOD_MAP,
  TAG_PACE_MAP,
  TAG_WEIGHT_MAP,
  TAG_WORLD_MAP,
  TAG_LENGTH_MAP,
  TAG_ROMANCE_TROPES,
} from '../constants/tagMoodMap';

/**
 * Scoring weights for tag matching
 */
const POINTS = {
  MOOD_PRIMARY: 15,      // Tag's first mood matches session mood
  MOOD_SECONDARY: 7,     // Tag's secondary mood matches
  PACE_MATCH: 10,        // Tag matches pace preference
  WEIGHT_MATCH: 10,      // Tag matches weight preference
  WORLD_MATCH: 12,       // Tag matches world preference
  LENGTH_MATCH: 8,       // Tag matches length preference
  TROPE_PRIMARY: 8,      // Romance trope primary match
  TROPE_SECONDARY: 4,    // Romance trope secondary match
} as const;

/**
 * Maximum points from tag scoring (for percentage calculation)
 */
export const MAX_TAG_SCORE = 40;

/**
 * Result of tag-based mood scoring
 */
export interface TagScoreResult {
  /** Total score from tags (capped at MAX_TAG_SCORE) */
  score: number;
  /** Tags that contributed to the score */
  matchedTags: string[];
  /** Whether any tag established a primary mood match */
  isPrimaryMoodMatch: boolean;
  /** Score breakdown by dimension */
  breakdown: {
    mood: number;
    pace: number;
    weight: number;
    world: number;
    length: number;
    tropes: number;
  };
}

/**
 * Calculate mood match score from book tags.
 *
 * @param tags - Array of tags from item.media.tags
 * @param session - Current mood session with user preferences
 * @returns Scoring result with matched tags and breakdown
 */
export function calculateTagMoodScore(
  tags: string[] | undefined,
  session: MoodSession
): TagScoreResult {
  const emptyResult: TagScoreResult = {
    score: 0,
    matchedTags: [],
    isPrimaryMoodMatch: false,
    breakdown: { mood: 0, pace: 0, weight: 0, world: 0, length: 0, tropes: 0 },
  };

  if (!tags || tags.length === 0) {
    return emptyResult;
  }

  const normalizedTags = tags.map(t => t.toLowerCase().trim());
  const matchedTags: string[] = [];

  let moodScore = 0;
  let paceScore = 0;
  let weightScore = 0;
  let worldScore = 0;
  let lengthScore = 0;
  let tropeScore = 0;
  let isPrimaryMoodMatch = false;

  for (const tag of normalizedTags) {
    let matched = false;

    // Check mood mapping
    const moodMatches = findMapMatch(tag, TAG_MOOD_MAP);
    if (moodMatches) {
      const isPrimary = moodMatches[0] === session.mood;
      const isSecondary = moodMatches.slice(1).includes(session.mood);

      if (isPrimary) {
        moodScore += POINTS.MOOD_PRIMARY;
        isPrimaryMoodMatch = true;
        matched = true;
      } else if (isSecondary) {
        moodScore += POINTS.MOOD_SECONDARY;
        matched = true;
      }
    }

    // Check pace mapping (only if session has pace preference)
    if (session.pace && session.pace !== 'any') {
      const paceMatches = findMapMatch(tag, TAG_PACE_MAP);
      if (paceMatches && paceMatches.includes(session.pace)) {
        paceScore += POINTS.PACE_MATCH;
        matched = true;
      }
    }

    // Check weight mapping (only if session has weight preference)
    if (session.weight && session.weight !== 'any') {
      const weightMatches = findMapMatch(tag, TAG_WEIGHT_MAP);
      if (weightMatches && weightMatches.includes(session.weight)) {
        weightScore += POINTS.WEIGHT_MATCH;
        matched = true;
      }
    }

    // Check world mapping (only if session has world preference)
    if (session.world && session.world !== 'any') {
      const worldMatches = findMapMatch(tag, TAG_WORLD_MAP);
      if (worldMatches && worldMatches.includes(session.world)) {
        worldScore += POINTS.WORLD_MATCH;
        matched = true;
      }
    }

    // Check length mapping (only if session has length preference)
    if (session.length && session.length !== 'any') {
      const lengthMatches = findMapMatch(tag, TAG_LENGTH_MAP);
      if (lengthMatches && lengthMatches.includes(session.length)) {
        lengthScore += POINTS.LENGTH_MATCH;
        matched = true;
      }
    }

    // Check romance tropes (bonus)
    const tropeMatches = findMapMatch(tag, TAG_ROMANCE_TROPES);
    if (tropeMatches) {
      const isPrimary = tropeMatches[0] === session.mood;
      const isSecondary = tropeMatches.slice(1).includes(session.mood);

      if (isPrimary) {
        tropeScore += POINTS.TROPE_PRIMARY;
        if (!isPrimaryMoodMatch) {
          isPrimaryMoodMatch = true;
        }
        matched = true;
      } else if (isSecondary) {
        tropeScore += POINTS.TROPE_SECONDARY;
        matched = true;
      }
    }

    if (matched) {
      matchedTags.push(tag);
    }
  }

  // Cap total score
  const rawScore = moodScore + paceScore + weightScore + worldScore + lengthScore + tropeScore;
  const cappedScore = Math.min(rawScore, MAX_TAG_SCORE);

  return {
    score: cappedScore,
    matchedTags,
    isPrimaryMoodMatch,
    breakdown: {
      mood: moodScore,
      pace: paceScore,
      weight: weightScore,
      world: worldScore,
      length: lengthScore,
      tropes: tropeScore,
    },
  };
}

/**
 * Find a tag in a mapping using exact match with hyphen/space normalization.
 * No substring matching — "war" must not match "heartwarming".
 */
function findMapMatch<T>(
  tag: string,
  map: Record<string, T[]>
): T[] | null {
  // Exact match first
  if (map[tag]) {
    return map[tag];
  }

  // Normalize: hyphens ↔ spaces
  const hyphenated = tag.replace(/\s+/g, '-');
  if (map[hyphenated]) return map[hyphenated];
  const spaced = tag.replace(/-/g, ' ');
  if (map[spaced]) return map[spaced];

  return null;
}

/**
 * Convert tag score to percentage contribution (up to 20%).
 * This is used as a bonus on top of genre-based scoring.
 */
export function tagScoreToPercentage(tagScore: number): number {
  return Math.min(20, (tagScore / MAX_TAG_SCORE) * 20);
}

/**
 * Get tags from a library item safely.
 * Tags are stored on item.media.tags (not metadata.tags).
 */
export function getItemTags(item: any): string[] {
  return item?.media?.tags || [];
}
