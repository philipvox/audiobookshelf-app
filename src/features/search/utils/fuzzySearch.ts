/**
 * src/features/search/utils/fuzzySearch.ts
 *
 * Fuzzy search utilities for typo-tolerant matching.
 * Implements Levenshtein distance for "Did you mean" suggestions.
 */

/**
 * Calculate Levenshtein (edit) distance between two strings.
 * Lower distance = more similar.
 */
export function levenshteinDistance(a: string, b: string): number {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();

  if (aLower === bLower) return 0;
  if (aLower.length === 0) return bLower.length;
  if (bLower.length === 0) return aLower.length;

  const matrix: number[][] = [];

  // Initialize first row and column
  for (let i = 0; i <= bLower.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= aLower.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= bLower.length; i++) {
    for (let j = 1; j <= aLower.length; j++) {
      if (bLower.charAt(i - 1) === aLower.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[bLower.length][aLower.length];
}

/**
 * Calculate similarity score (0-1) between two strings.
 * 1 = identical, 0 = completely different.
 */
export function similarityScore(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(a, b);
  return 1 - distance / maxLen;
}

/**
 * Check if query fuzzy matches target string.
 * Returns true if similarity is above threshold or target contains query.
 */
export function fuzzyMatch(query: string, target: string, threshold = 0.6): boolean {
  const queryLower = query.toLowerCase().trim();
  const targetLower = target.toLowerCase().trim();

  // Exact substring match
  if (targetLower.includes(queryLower)) return true;

  // Check each word in target
  const targetWords = targetLower.split(/\s+/);
  for (const word of targetWords) {
    if (word.startsWith(queryLower)) return true;
    if (similarityScore(queryLower, word) >= threshold) return true;
  }

  // Check full string similarity for short queries
  if (queryLower.length <= 8) {
    return similarityScore(queryLower, targetLower) >= threshold;
  }

  return false;
}

/**
 * Find best spelling correction suggestions for a query.
 * Returns array of { text, score } sorted by score descending.
 */
export function findSuggestions(
  query: string,
  candidates: string[],
  maxSuggestions = 3,
  minScore = 0.5
): Array<{ text: string; score: number }> {
  const queryLower = query.toLowerCase().trim();
  if (!queryLower) return [];

  const scored = candidates
    .map(candidate => ({
      text: candidate,
      score: similarityScore(queryLower, candidate.toLowerCase()),
    }))
    .filter(item => item.score >= minScore && item.score < 1) // Exclude exact matches
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSuggestions);

  return scored;
}

/**
 * Generate phonetic key for name matching (simplified Soundex-like).
 * Helps match "Brandson" to "Brandon", "Kristen" to "Kristen".
 */
export function phoneticKey(str: string): string {
  return str
    .toLowerCase()
    .replace(/[aeiou]/g, 'a') // Normalize vowels
    .replace(/[bp]/g, 'b')    // Normalize bilabials
    .replace(/[cgjkqsxz]/g, 'c') // Normalize gutturals/sibilants
    .replace(/[dt]/g, 'd')    // Normalize dentals
    .replace(/[fv]/g, 'f')    // Normalize labiodentals
    .replace(/[mn]/g, 'm')    // Normalize nasals
    .replace(/[lr]/g, 'l')    // Normalize liquids
    .replace(/(.)\1+/g, '$1') // Remove consecutive duplicates
    .slice(0, 8);             // Limit length
}

/**
 * Check if two strings match phonetically (useful for names).
 */
export function phoneticMatch(a: string, b: string): boolean {
  return phoneticKey(a) === phoneticKey(b);
}

/**
 * Common abbreviations and their expansions for audiobooks.
 */
const ABBREVIATIONS: Record<string, string[]> = {
  'hp': ['harry potter'],
  'lotr': ['lord of the rings'],
  'asoiaf': ['song of ice and fire', 'game of thrones'],
  'got': ['game of thrones'],
  'scifi': ['science fiction', 'sci-fi'],
  'sci-fi': ['science fiction'],
  'hr': ['hour', 'hours'],
  'hrs': ['hours'],
  'min': ['minute', 'minutes'],
  'mins': ['minutes'],
};

/**
 * Expand common abbreviations in query.
 */
export function expandAbbreviations(query: string): string[] {
  const queryLower = query.toLowerCase().trim();
  const results = [query];

  for (const [abbr, expansions] of Object.entries(ABBREVIATIONS)) {
    if (queryLower.includes(abbr)) {
      for (const expansion of expansions) {
        results.push(query.replace(new RegExp(abbr, 'gi'), expansion));
      }
    }
  }

  return results;
}
