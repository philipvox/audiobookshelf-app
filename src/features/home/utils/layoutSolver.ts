/**
 * src/features/home/utils/layoutSolver.ts
 *
 * Unified text layout solver using constraint satisfaction.
 * Replaces hardcoded rules with a systematic optimization approach.
 *
 * Core Principles:
 * 1. Constraint satisfaction over rule matching
 * 2. Continuous parameter space exploration
 * 3. Scored split point generation
 * 4. Font size as derived variable
 * 5. Unified scoring function
 * 6. Cascading fallbacks
 */

// MIGRATED: Now using new spine system via adapter
import { FONT_CHAR_RATIOS } from './spine/adapter';

// =============================================================================
// TYPES
// =============================================================================

export interface BoundingBox {
  width: number;
  height: number;
}

export interface LayoutConstraints {
  // Hard constraints (must satisfy)
  minFontSize: number;
  maxFontSize: number;
  maxOverflow: number; // 0 = no overflow

  // Soft constraints (optimize for)
  preferredFontRange: [number, number]; // e.g., [10, 14]
  preferredLineCount: [number, number]; // e.g., [1, 2]
  minBalanceRatio: number; // e.g., 0.5
}

export interface LineConfig {
  text: string;
  fontSize: number;
  x: number;
  y: number;
}

// Bounds for box rendering (horizontal layouts only)
export interface LayoutBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutSolution {
  lines: LineConfig[];
  orientation: 'horizontal' | 'vertical';
  rotation?: number;
  satisfiesHard: boolean;
  score: number;
  wasAbbreviated?: boolean;
  abbreviatedFrom?: string;
  bounds?: LayoutBounds;  // Computed bounds for box rendering (horizontal only)
}

interface SplitCandidate {
  lines: string[];
  score: number;
}

interface LayoutContext {
  text: string;
  box: BoundingBox;
  aspectRatio: number;
  spineWidth: number;
  textType: 'title' | 'author';
  preferHorizontal?: boolean; // Bias toward horizontal for author boxes
  letterSpacing?: number; // Em units (0.05 = 5% of font size between chars)
}

type MeasureFunction = (text: string, fontSize: number) => number;

// =============================================================================
// DEFAULT CONSTRAINTS
// =============================================================================

export const DEFAULT_TITLE_CONSTRAINTS: LayoutConstraints = {
  minFontSize: 9,       // Readable minimum - allows fitting long titles
  maxFontSize: 48,
  maxOverflow: 0,
  preferredFontRange: [12, 22],  // Target larger fonts when possible
  preferredLineCount: [1, 2],
  minBalanceRatio: 0.4,
};

export const DEFAULT_AUTHOR_CONSTRAINTS: LayoutConstraints = {
  minFontSize: 8,       // Readable minimum for author names
  maxFontSize: 18,
  maxOverflow: 0,
  preferredFontRange: [10, 15],
  preferredLineCount: [1, 2],
  minBalanceRatio: 0.5,
};

// =============================================================================
// TEXT MEASUREMENT
// =============================================================================

/**
 * Creates a text measurement function that accounts for letter spacing.
 *
 * @param fontFamily - Font family to use for character width ratio lookup
 * @param letterSpacing - Letter spacing in em units (e.g., 0.05 = 5% of font size between chars)
 *
 * Text width calculation:
 * - Base width: each character = charWidthRatio * fontSize
 * - Letter spacing: adds (letterSpacing * fontSize) between each pair of characters
 *
 * Example: "HELLO" at 12px with 0.05 letter spacing:
 * - Base width: 5 chars * 0.55 * 12 = 33px
 * - Spacing: 4 gaps * 0.05 * 12 = 2.4px
 * - Total: 35.4px
 */
function createMeasureFunction(fontFamily: string, letterSpacing: number = 0): MeasureFunction {
  const ratioEntry = FONT_CHAR_RATIOS[fontFamily] || FONT_CHAR_RATIOS['default'];
  // FONT_CHAR_RATIOS values are { uppercase, lowercase, tight } objects — extract scalar
  const ratio = typeof ratioEntry === 'number' ? ratioEntry : (ratioEntry?.lowercase ?? 0.5);
  return (text: string, fontSize: number): number => {
    if (!text) return 0;
    const baseWidth = text.length * ratio * fontSize;
    // Letter spacing applies between characters (n-1 gaps for n characters)
    const spacingWidth = letterSpacing * fontSize * Math.max(0, text.length - 1);
    return baseWidth + spacingWidth;
  };
}

// =============================================================================
// SPLIT SCORING - The Heart of Smart Splitting
// =============================================================================

const ORPHAN_WORDS = ['a', 'an', 'the', 'of', 'and', 'or', 'to', 'in', 'on', 'at', 'for', 'by', 'with'];
const NATURAL_BREAKS = [': ', ' - ', ' — ', ' | ', ', '];
const SERIES_PATTERNS = [
  /Vol\.\s*\d+/i,
  /Volume\s*\d+/i,
  /Book\s*\d+/i,
  /Part\s*\d+/i,
  /#\d+/,
];

// Known title patterns that should split at specific points
const TITLE_SPLIT_PATTERNS = [
  { pattern: /^(Harry Potter)\s+(and the|&)\s+(.+)$/i, groups: [1, 3] },
  { pattern: /^(The Lord of the Rings)\s*[:\-]?\s*(.+)$/i, groups: [1, 2] },
  { pattern: /^(A Song of Ice and Fire)\s*[:\-]?\s*(.+)$/i, groups: [1, 2] },
  { pattern: /^(The Chronicles of Narnia)\s*[:\-]?\s*(.+)$/i, groups: [1, 2] },
  { pattern: /^(.+?)\s+(and the|and|of the)\s+(.+)$/i, handler: 'andThe' },
];

function scoreSplit(lines: string[], original: string): number {
  let score = 100;

  // ═══════════════════════════════════════════════════════════════════════════
  // BALANCE: Lines should be similar length (0-30 points)
  // ═══════════════════════════════════════════════════════════════════════════
  const lengths = lines.map((l) => l.length);
  const maxLen = Math.max(...lengths);
  const minLen = Math.min(...lengths);
  const balanceRatio = maxLen > 0 ? minLen / maxLen : 1;

  score += balanceRatio * 30;

  // ═══════════════════════════════════════════════════════════════════════════
  // ORPHANS: Heavy penalty for ending lines with small words (-25 each)
  // ═══════════════════════════════════════════════════════════════════════════
  for (let i = 0; i < lines.length - 1; i++) {
    const words = lines[i].trim().split(' ');
    const lastWord = words[words.length - 1]?.toLowerCase();
    if (lastWord && ORPHAN_WORDS.includes(lastWord)) {
      score -= 25;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WIDOWS: Penalize very short final lines (-20)
  // ═══════════════════════════════════════════════════════════════════════════
  const lastLine = lines[lines.length - 1];
  if (lastLine.length < 4 && lines.length > 1) {
    score -= 20;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SEMANTIC BREAKS: Bonus for breaking at punctuation (+20)
  // ═══════════════════════════════════════════════════════════════════════════
  for (const brk of NATURAL_BREAKS) {
    const idx = original.indexOf(brk);
    if (idx > 0 && idx < original.length - 3) {
      const line1Len = lines[0].length;
      if (Math.abs(line1Len - idx) <= 2) {
        score += 20;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SERIES PATTERNS: Don't split series indicators (-30)
  // ═══════════════════════════════════════════════════════════════════════════
  for (const pattern of SERIES_PATTERNS) {
    const match = original.match(pattern);
    if (match) {
      const indicator = match[0];
      // Check if indicator is split across lines
      for (const line of lines) {
        const partialMatch = line.match(pattern);
        if (
          line.includes(indicator.substring(0, Math.min(3, indicator.length))) &&
          !partialMatch
        ) {
          score -= 30;
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TITLE PATTERNS: Bonus for known good split points (+15)
  // ═══════════════════════════════════════════════════════════════════════════
  for (const { pattern, groups, handler } of TITLE_SPLIT_PATTERNS) {
    const match = original.match(pattern);
    if (match) {
      if (handler === 'andThe' && lines.length === 2) {
        // "X and the Y" → prefer "X" / "Y" over "X and" / "the Y"
        const prefix = match[1];
        if (Math.abs(lines[0].length - prefix.length) <= 2) {
          score += 15;
        }
      } else if (groups && lines.length === 2) {
        const expectedLine1 = match[groups[0]];
        if (Math.abs(lines[0].length - expectedLine1.length) <= 2) {
          score += 15;
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WORD BOUNDARY: Slight penalty if split mid-hyphenated-word (-10)
  // ═══════════════════════════════════════════════════════════════════════════
  for (let i = 0; i < lines.length - 1; i++) {
    const endChar = lines[i].slice(-1);
    const startChar = lines[i + 1].charAt(0);
    if (endChar === '-' || startChar === '-') {
      // Check if it's a hyphenated word split badly
      const combined = lines[i] + lines[i + 1];
      if (combined.match(/\w-\w/)) {
        score -= 10;
      }
    }
  }

  return score;
}

// =============================================================================
// SPLIT GENERATION
// =============================================================================

function tokenize(text: string): string[] {
  return text.split(/\s+/).filter((w) => w.length > 0);
}

function generateTwoLineSplits(text: string): SplitCandidate[] {
  const words = tokenize(text);
  if (words.length < 2) return [];

  const candidates: SplitCandidate[] = [];

  for (let i = 1; i < words.length; i++) {
    const line1 = words.slice(0, i).join(' ');
    const line2 = words.slice(i).join(' ');
    const lines = [line1, line2];

    candidates.push({
      lines,
      score: scoreSplit(lines, text),
    });
  }

  return candidates.sort((a, b) => b.score - a.score);
}

function generateThreeLineSplits(text: string): SplitCandidate[] {
  const words = tokenize(text);
  if (words.length < 3) return [];

  const candidates: SplitCandidate[] = [];

  for (let i = 1; i < words.length - 1; i++) {
    for (let j = i + 1; j < words.length; j++) {
      const lines = [
        words.slice(0, i).join(' '),
        words.slice(i, j).join(' '),
        words.slice(j).join(' '),
      ];

      candidates.push({
        lines,
        score: scoreSplit(lines, text),
      });
    }
  }

  return candidates.sort((a, b) => b.score - a.score);
}

// =============================================================================
// FONT SIZE CALCULATION (Binary Search)
// =============================================================================

function calculateOptimalFontSize(
  text: string,
  availableLength: number,
  availableThickness: number,
  measure: MeasureFunction,
  constraints: LayoutConstraints
): number {
  let lo = constraints.minFontSize;
  let hi = constraints.maxFontSize;

  while (hi - lo > 0.5) {
    const mid = (lo + hi) / 2;
    const textLength = measure(text, mid);

    if (textLength <= availableLength && mid <= availableThickness) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return Math.floor(lo * 2) / 2; // Round to 0.5px
}

function calculateFontSizesForLines(
  lines: string[],
  box: BoundingBox,
  orientation: 'horizontal' | 'vertical',
  measure: MeasureFunction,
  constraints: LayoutConstraints
): { fontSizes: number[]; feasible: boolean } {
  const results: number[] = [];

  const lineGap = 4;

  // Detect if constraints are scaled (maxFontSize > 60 means scaled up for drama)
  const isScaledUp = constraints.maxFontSize > 60;

  // For VERTICAL text, use PUBLISHER-GRADE aggressive sizing
  // Real book spines (Penguin, FSG, indie presses) use 96-99% of spine width for titles
  // The width is the PRIMARY visual constraint - we want BOLD, READABLE titles that fill the spine
  const availableLength =
    orientation === 'horizontal'
      ? box.width * (isScaledUp ? 0.85 : 0.75) // Horizontal: moderate
      : box.height * 0.97; // Vertical: very aggressive - use 97% of height

  const availableThickness =
    orientation === 'horizontal'
      ? (box.height - (lines.length - 1) * lineGap) / lines.length * (isScaledUp ? 0.95 : 0.85)
      : (box.width - (lines.length - 1) * lineGap) / lines.length * 0.99; // VERTICAL: Use 99% of spine width - maximum boldness!

  let feasible = true;

  for (const line of lines) {
    const fontSize = calculateOptimalFontSize(
      line,
      availableLength,
      availableThickness,
      measure,
      constraints
    );
    results.push(fontSize);

    // CRITICAL: Verify text actually fits at this font size
    // The solver may return minFontSize even when text doesn't fit
    const textLength = measure(line, fontSize);
    if (textLength > availableLength * 1.02) { // Allow 2% tolerance
      feasible = false;
    }
    if (fontSize > availableThickness) {
      feasible = false;
    }
  }

  // Also check minimum font size
  const minFont = Math.min(...results);
  if (minFont < constraints.minFontSize) {
    feasible = false;
  }

  return { fontSizes: results, feasible };
}

// =============================================================================
// SCORING FUNCTIONS
// =============================================================================

function scoreReadability(fontSizes: number[], constraints: LayoutConstraints): number {
  const minFont = Math.min(...fontSizes);
  const avgFont = fontSizes.reduce((a, b) => a + b, 0) / fontSizes.length;
  const [prefMin, prefMax] = constraints.preferredFontRange;

  // Hard fail below minimum
  if (minFont < constraints.minFontSize) return 0;

  // Very small fonts (barely above minimum) - penalty but not too severe
  // Small fonts are acceptable on narrow spines for long text
  if (minFont < constraints.minFontSize + 1) return 30;
  if (minFont < constraints.minFontSize + 2) return 45;

  // Ideal range - full score
  if (minFont >= prefMin && minFont <= prefMax) return 100;

  // Above ideal is great
  if (minFont > prefMax) return 95;

  // Below preferred range - gradual drop
  const range = prefMin - constraints.minFontSize - 2;
  const position = minFont - constraints.minFontSize - 2;
  const ratio = range > 0 ? position / range : 0;

  return 50 + ratio * 45; // 50-95 range for below-preferred fonts
}

function scoreBalance(lines: string[], fontSizes: number[]): number {
  if (lines.length === 1) {
    // Single line gets base score, but not automatically perfect
    // Tiny fonts on single line means it's not really "balanced"
    const fontSize = fontSizes[0];
    if (fontSize < 9) return 70;  // Cramped single line
    if (fontSize < 10) return 85;
    return 100;
  }

  // Text length balance
  const lengths = lines.map((l) => l.length);
  const maxLen = Math.max(...lengths);
  const minLen = Math.min(...lengths);
  const lengthRatio = maxLen > 0 ? minLen / maxLen : 1;

  // Font size consistency
  const maxFont = Math.max(...fontSizes);
  const minFont = Math.min(...fontSizes);
  const fontRatio = maxFont > 0 ? minFont / maxFont : 1;

  return lengthRatio * 60 + fontRatio * 40;
}

function scoreEfficiency(
  lines: string[],
  fontSizes: number[],
  box: BoundingBox,
  measure: MeasureFunction,
  textLength?: number
): number {
  let totalTextArea = 0;

  for (let i = 0; i < lines.length; i++) {
    const width = measure(lines[i], fontSizes[i]);
    const height = fontSizes[i];
    totalTextArea += width * height;
  }

  const boxArea = box.width * box.height;
  const fillRatio = totalTextArea / boxArea;

  // For short text (under 20 chars), we WANT large, space-filling text
  // Don't penalize high fill ratios - that's exactly what we want!
  const isShortText = (textLength || lines.join(' ').length) < 20;

  if (isShortText) {
    // Short text: reward higher fill ratios (bigger fonts = better)
    if (fillRatio < 0.10) return 20;  // Very underfilled - bad
    if (fillRatio < 0.20) return 40;
    if (fillRatio < 0.35) return 60;
    if (fillRatio < 0.50) return 80;
    return 100; // High fill is great for short text!
  }

  // For longer text, use more balanced scoring
  if (fillRatio < 0.12) return 30;
  if (fillRatio < 0.25) return 60;
  if (fillRatio <= 0.55) return 100;
  if (fillRatio <= 0.70) return 85;  // Don't penalize as heavily
  return 70; // Even high fill is acceptable
}

function scoreAesthetics(
  lines: string[],
  fontSizes: number[],
  orientation: 'horizontal' | 'vertical',
  context: LayoutContext
): number {
  let score = 100;
  const { aspectRatio, spineWidth, textType } = context;
  const textLength = context.text.length;
  const minFont = Math.min(...fontSizes);

  // ═══════════════════════════════════════════════════════════════════════════
  // CRITICAL: Horizontal orientation on narrow spines is problematic
  // Text gets clipped when it can't fit horizontally
  // ═══════════════════════════════════════════════════════════════════════════
  if (orientation === 'horizontal') {
    // Very narrow spines (< 50px) should almost never use horizontal for long text
    if (spineWidth < 50 && textLength > 15) {
      score -= 40; // Heavy penalty
    }
    if (spineWidth < 45 && textLength > 10) {
      score -= 30;
    }
    // Even with wider spines, long text is risky horizontally
    if (spineWidth < 60 && textLength > 25) {
      score -= 35;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CRITICAL: Long text on single line is almost always wrong
  // This is the main fix for "The True Story of the Three Little Pigs"
  // ═══════════════════════════════════════════════════════════════════════════
  if (lines.length === 1) {
    // Moderate-length text (20-30 chars) - slight penalty
    if (textLength > 20) score -= 10;
    // Long text (30-40 chars) - significant penalty
    if (textLength > 30) score -= 25;
    // Very long text (40+ chars) - heavy penalty, should almost never be single line
    if (textLength > 40) score -= 40;

    // If font is tiny on single line, that's a red flag
    if (minFont < 9 && textLength > 15) score -= 20;
    if (minFont < 8 && textLength > 10) score -= 30;
  }

  // Bonus for multi-line with long text (what we want!)
  if (lines.length >= 2 && textLength > 25) score += 15;
  if (lines.length >= 3 && textLength > 35) score += 10;

  // ═══════════════════════════════════════════════════════════════════════════
  // Orientation appropriateness based on aspect ratio
  // ═══════════════════════════════════════════════════════════════════════════
  if (orientation === 'vertical') {
    if (aspectRatio > 6) score += 15;  // Tall spines prefer vertical
    if (aspectRatio > 8) score += 10;  // Extra bonus for very tall spines
    if (aspectRatio < 4) score -= 20;
  } else {
    if (aspectRatio < 5) score += 10;
    if (aspectRatio > 7) score -= 25;  // Horizontal is bad on tall spines
    if (aspectRatio > 9) score -= 20;  // Even worse on very tall spines
  }

  // Short text shouldn't be split
  if (textLength < 8 && lines.length > 1) score -= 15;

  // ═══════════════════════════════════════════════════════════════════════════
  // Font size consistency for multi-line
  // ═══════════════════════════════════════════════════════════════════════════
  if (lines.length >= 2) {
    const maxDiff = Math.max(...fontSizes) - Math.min(...fontSizes);
    if (maxDiff <= 2) score += 5;
    if (maxDiff > 4) score -= 10;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Width-based preferences (bonus for appropriate orientations)
  // ═══════════════════════════════════════════════════════════════════════════
  if (orientation === 'horizontal' && spineWidth >= 60) {
    score += 15; // Wide spines can handle horizontal
  }
  if (orientation === 'vertical' && spineWidth < 50) {
    score += 20; // Narrow spines strongly prefer vertical
  }

  return Math.max(0, Math.min(100, score));
}

function scoreFontSizeMaximization(
  fontSizes: number[],
  constraints: LayoutConstraints,
  textLength: number
): number {
  // Reward larger font sizes - especially important for short titles
  // This ensures we prefer layouts that FILL the space with big, bold text
  const minFont = Math.min(...fontSizes);
  const avgFont = fontSizes.reduce((a, b) => a + b, 0) / fontSizes.length;

  // For short text, heavily reward large fonts
  if (textLength < 15) {
    if (avgFont >= 28) return 100;
    if (avgFont >= 22) return 85;
    if (avgFont >= 16) return 65;
    if (avgFont >= 12) return 45;
    return 25;
  }

  // For medium text, still reward larger fonts but less aggressively
  if (textLength < 25) {
    if (avgFont >= 20) return 100;
    if (avgFont >= 16) return 85;
    if (avgFont >= 12) return 70;
    if (avgFont >= 10) return 55;
    return 35;
  }

  // For longer text, reasonable fonts are fine
  if (avgFont >= 14) return 100;
  if (avgFont >= 11) return 85;
  if (avgFont >= 9) return 70;
  return 50;
}

function calculateTotalScore(
  lines: string[],
  fontSizes: number[],
  orientation: 'horizontal' | 'vertical',
  splitScore: number,
  context: LayoutContext,
  constraints: LayoutConstraints,
  measure: MeasureFunction
): number {
  const textLength = context.text.length;

  const readability = scoreReadability(fontSizes, constraints);
  const balance = scoreBalance(lines, fontSizes);
  const efficiency = scoreEfficiency(lines, fontSizes, context.box, measure, textLength);
  const aesthetics = scoreAesthetics(lines, fontSizes, orientation, context);
  const fontMaximization = scoreFontSizeMaximization(fontSizes, constraints, textLength);

  // Include split quality in scoring
  const normalizedSplitScore = Math.max(0, Math.min(100, splitScore));

  // Base weighted combination - font maximization is important for visual impact
  let score = (
    readability * 0.25 +
    balance * 0.15 +
    efficiency * 0.15 +
    aesthetics * 0.10 +
    fontMaximization * 0.20 +
    normalizedSplitScore * 0.15
  );

  // Apply horizontal preference bonus for author boxes
  // When preferHorizontal is true, add significant bonus to horizontal layouts
  // This ensures thriller/crime authors get boxed horizontal text
  if (context.preferHorizontal && orientation === 'horizontal') {
    // Add 45 points bonus - vertical layouts score 25-35 points higher on narrow spines
    // due to much larger fonts, so we need a substantial bonus to overcome this
    if (__DEV__ && context.textType === 'author') {
      console.log(`[ScoreBonus] Adding +45 for horizontal author, base=${score.toFixed(1)}, new=${(score + 45).toFixed(1)}`);
    }
    score += 45;
  }

  return score;
}

// =============================================================================
// LAYOUT POSITION CALCULATION
// =============================================================================

interface LayoutPositionResult {
  lines: LineConfig[];
  bounds?: LayoutBounds;
}

function calculateLinePositions(
  lineTexts: string[],
  fontSizes: number[],
  box: BoundingBox,
  orientation: 'horizontal' | 'vertical',
  measure?: MeasureFunction
): LayoutPositionResult {
  const lineGap = 4;
  const result: LineConfig[] = [];
  let bounds: LayoutBounds | undefined = undefined;

  if (orientation === 'horizontal') {
    // Horizontal layout: stack lines vertically, center horizontally
    const totalHeight =
      fontSizes.reduce((sum, fs) => sum + fs, 0) + (lineTexts.length - 1) * lineGap;
    let currentY = (box.height - totalHeight) / 2;

    // Track bounds for box rendering
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (let i = 0; i < lineTexts.length; i++) {
      const fontSize = fontSizes[i];
      const y = currentY + fontSize / 2; // Center of this line
      const x = box.width / 2;

      result.push({
        text: lineTexts[i],
        fontSize,
        x,
        y,
      });

      // Calculate bounds (need measure function for text width)
      if (measure) {
        const textWidth = measure(lineTexts[i], fontSize);
        minX = Math.min(minX, x - textWidth / 2);
        maxX = Math.max(maxX, x + textWidth / 2);
      } else {
        // Estimate without measure function
        const estimatedWidth = lineTexts[i].length * fontSize * 0.55;
        minX = Math.min(minX, x - estimatedWidth / 2);
        maxX = Math.max(maxX, x + estimatedWidth / 2);
      }
      minY = Math.min(minY, y - fontSize / 2);
      maxY = Math.max(maxY, y + fontSize / 2);

      currentY += fontSize + lineGap;
    }

    // Set bounds for horizontal layouts (used for box rendering)
    if (lineTexts.length > 0) {
      bounds = {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      };
    }
  } else {
    // Vertical layout: lines become columns (each rotated -90)
    // No bounds for vertical (boxes only for horizontal)
    const totalWidth =
      fontSizes.reduce((sum, fs) => sum + fs, 0) + (lineTexts.length - 1) * lineGap;
    let currentX = (box.width - totalWidth) / 2;

    for (let i = 0; i < lineTexts.length; i++) {
      const fontSize = fontSizes[i];
      const x = currentX + fontSize / 2;

      result.push({
        text: lineTexts[i],
        fontSize,
        x,
        y: box.height / 2,
      });

      currentX += fontSize + lineGap;
    }
  }

  return { lines: result, bounds };
}

// =============================================================================
// ABBREVIATION STRATEGIES
// =============================================================================

function generateTitleAbbreviations(text: string): string[] {
  const results: string[] = [];

  // Remove leading articles
  const noArticle = text.replace(/^(The|A|An)\s+/i, '');
  if (noArticle !== text) results.push(noArticle);

  // Subtitle removal (priority - often significantly shortens)
  if (text.includes(':')) {
    results.push(text.split(':')[0].trim());
  }
  if (text.includes(' - ')) {
    results.push(text.split(' - ')[0].trim());
  }

  // Common word shortenings
  const shortened = text
    .replace(/\band\b/gi, '&')
    .replace(/\bthe\b/gi, '')  // Remove interior "the"
    .replace(/\bversus\b/gi, 'vs')
    .replace(/\bVolume\b/gi, 'Vol')
    .replace(/\bNumber\b/gi, 'No')
    .replace(/\s+/g, ' ')  // Clean up extra spaces
    .trim();
  if (shortened !== text) results.push(shortened);

  // For very long titles (40+ chars), try more aggressive abbreviations
  if (text.length > 40) {
    // Remove "of the", "with the", etc.
    const veryShort = text
      .replace(/\bof the\b/gi, 'of')
      .replace(/\bwith the\b/gi, 'w/')
      .replace(/\band the\b/gi, '&')
      .replace(/\bto the\b/gi, 'to')
      .replace(/\s+/g, ' ')
      .trim();
    if (veryShort !== text && veryShort.length < text.length * 0.85) {
      results.push(veryShort);
    }

    // Keep only first N words for very long titles
    const words = text.split(' ');
    if (words.length > 6) {
      results.push(words.slice(0, 5).join(' ') + '...');
      results.push(words.slice(0, 4).join(' ') + '...');
    }
  }

  // Combined: no article + subtitle removal
  if (noArticle !== text && noArticle.includes(':')) {
    results.push(noArticle.split(':')[0].trim());
  }

  return [...new Set(results)].filter((r) => r !== text && r.length > 0);
}

function generateAuthorAbbreviations(text: string): string[] {
  const results: string[] = [];
  const parts = text.split(' ');

  if (parts.length >= 2) {
    // Extract last name (handle compound surnames)
    const lastName = extractLastName(parts);
    const lastNameParts = lastName.split(' ').length;
    const firstParts = parts.slice(0, parts.length - lastNameParts);

    // "Ursula K. Le Guin" → "U.K. Le Guin"
    if (firstParts.length > 0) {
      const initials = firstParts.map((p) => p[0] + '.').join('');
      results.push(initials + ' ' + lastName);
    }

    // Just last name
    if (lastName !== text) {
      results.push(lastName);
    }

    // First initial + last name
    if (parts.length > 1) {
      results.push(parts[0][0] + '. ' + lastName);
    }
  }

  return [...new Set(results)].filter((r) => r !== text && r.length > 0);
}

const SURNAME_PARTICLES = [
  'van', 'von', 'de', 'du', 'del', 'della', 'di', 'da',
  'le', 'la', 'les', 'lo', 'mc', 'mac', "o'", 'st', 'saint',
  'bin', 'ibn', 'ben', 'al', 'el',
];

function extractLastName(parts: string[]): string {
  let lastNameStart = parts.length - 1;

  for (let i = parts.length - 2; i >= 0; i--) {
    const part = parts[i].toLowerCase().replace(/[.,]/g, '');
    if (SURNAME_PARTICLES.includes(part)) {
      lastNameStart = i;
    } else {
      break;
    }
  }

  return parts.slice(lastNameStart).join(' ');
}

// =============================================================================
// MAIN SOLVER
// =============================================================================

interface SolverCandidate {
  lines: string[];
  orientation: 'horizontal' | 'vertical';
  fontSizes: number[];
  splitScore: number;
  totalScore: number;
  feasible: boolean;
}

export function solveLayout(
  text: string,
  box: BoundingBox,
  constraints: LayoutConstraints,
  fontFamily: string,
  context: Omit<LayoutContext, 'text' | 'box'>
): LayoutSolution {
  if (!text || text.trim() === '') {
    return {
      lines: [],
      orientation: 'vertical',
      satisfiesHard: true,
      score: 0,
    };
  }

  // Create measure function with letter spacing for accurate width calculations
  const letterSpacing = context.letterSpacing || 0;
  const measure = createMeasureFunction(fontFamily, letterSpacing);
  const fullContext: LayoutContext = { ...context, text, box };

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 1: Generate all candidates for full text
  // ═══════════════════════════════════════════════════════════════════════════
  const candidates = generateAllCandidates(text, box, constraints, measure, fullContext);

  // Filter to feasible solutions
  const feasible = candidates.filter((c) => c.feasible);

  if (feasible.length > 0) {
    // Pick highest scoring
    feasible.sort((a, b) => b.totalScore - a.totalScore);
    const best = feasible[0];
    const layoutResult = calculateLinePositions(best.lines, best.fontSizes, box, best.orientation, measure);

    // Debug: Log layout selection for authors with preferHorizontal
    if (__DEV__ && context.textType === 'author' && context.preferHorizontal) {
      const horizontalBest = feasible.find(c => c.orientation === 'horizontal');
      const verticalBest = feasible.find(c => c.orientation === 'vertical');
      console.log(`[LayoutSolver] "${text.slice(0, 15)}":`, {
        chosen: best.orientation,
        chosenScore: best.totalScore.toFixed(1),
        hScore: horizontalBest?.totalScore.toFixed(1) || 'none',
        vScore: verticalBest?.totalScore.toFixed(1) || 'none',
        hFeasible: !!horizontalBest,
        preferH: context.preferHorizontal,
        hasBounds: !!layoutResult.bounds,
      });
    }

    return {
      lines: layoutResult.lines,
      orientation: best.orientation,
      rotation: best.orientation === 'vertical' ? -90 : 0,
      satisfiesHard: true,
      score: best.totalScore,
      bounds: layoutResult.bounds,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 2: Try abbreviations
  // ═══════════════════════════════════════════════════════════════════════════
  const abbreviations =
    context.textType === 'title'
      ? generateTitleAbbreviations(text)
      : generateAuthorAbbreviations(text);

  for (const abbrev of abbreviations) {
    const abbrevContext: LayoutContext = { ...fullContext, text: abbrev };
    const abbrevCandidates = generateAllCandidates(
      abbrev,
      box,
      constraints,
      measure,
      abbrevContext
    );

    const abbrevFeasible = abbrevCandidates.filter((c) => c.feasible);
    if (abbrevFeasible.length > 0) {
      abbrevFeasible.sort((a, b) => b.totalScore - a.totalScore);
      const best = abbrevFeasible[0];
      const layoutResult = calculateLinePositions(best.lines, best.fontSizes, box, best.orientation, measure);

      return {
        lines: layoutResult.lines,
        orientation: best.orientation,
        rotation: best.orientation === 'vertical' ? -90 : 0,
        satisfiesHard: true,
        score: best.totalScore,
        wasAbbreviated: true,
        abbreviatedFrom: text,
        bounds: layoutResult.bounds,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 3: Relaxed constraints
  // ═══════════════════════════════════════════════════════════════════════════
  const relaxedConstraints: LayoutConstraints = {
    ...constraints,
    minFontSize: Math.max(6, constraints.minFontSize - 1),
  };

  const relaxedCandidates = generateAllCandidates(
    text,
    box,
    relaxedConstraints,
    measure,
    fullContext
  );

  const relaxedFeasible = relaxedCandidates.filter((c) => c.feasible);
  if (relaxedFeasible.length > 0) {
    relaxedFeasible.sort((a, b) => b.totalScore - a.totalScore);
    const best = relaxedFeasible[0];
    const layoutResult = calculateLinePositions(best.lines, best.fontSizes, box, best.orientation, measure);

    return {
      lines: layoutResult.lines,
      orientation: best.orientation,
      rotation: best.orientation === 'vertical' ? -90 : 0,
      satisfiesHard: true,
      score: best.totalScore,
      bounds: layoutResult.bounds,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 4: Last resort - just fit it somehow
  // ═══════════════════════════════════════════════════════════════════════════
  return createFallbackLayout(text, box, measure, constraints);
}

function generateAllCandidates(
  text: string,
  box: BoundingBox,
  constraints: LayoutConstraints,
  measure: MeasureFunction,
  context: LayoutContext
): SolverCandidate[] {
  const candidates: SolverCandidate[] = [];
  const orientations: ('horizontal' | 'vertical')[] = ['horizontal', 'vertical'];

  for (const orientation of orientations) {
    // 1-line
    const oneLine = [text];
    const oneLineResult = evaluateCandidate(
      oneLine,
      100, // Perfect split score for single line
      orientation,
      box,
      constraints,
      measure,
      context
    );
    candidates.push(oneLineResult);

    // 2-line splits
    const twoLineSplits = generateTwoLineSplits(text);
    for (const split of twoLineSplits.slice(0, 5)) {
      // Top 5 splits
      const result = evaluateCandidate(
        split.lines,
        split.score,
        orientation,
        box,
        constraints,
        measure,
        context
      );
      candidates.push(result);
    }

    // 3-line splits (for longer text)
    if (text.length > 20) {
      const threeLineSplits = generateThreeLineSplits(text);
      for (const split of threeLineSplits.slice(0, 3)) {
        // Top 3 splits
        const result = evaluateCandidate(
          split.lines,
          split.score,
          orientation,
          box,
          constraints,
          measure,
          context
        );
        candidates.push(result);
      }
    }
  }

  return candidates;
}

function evaluateCandidate(
  lines: string[],
  splitScore: number,
  orientation: 'horizontal' | 'vertical',
  box: BoundingBox,
  constraints: LayoutConstraints,
  measure: MeasureFunction,
  context: LayoutContext
): SolverCandidate {
  const { fontSizes, feasible } = calculateFontSizesForLines(
    lines,
    box,
    orientation,
    measure,
    constraints
  );

  const totalScore = feasible
    ? calculateTotalScore(lines, fontSizes, orientation, splitScore, context, constraints, measure)
    : 0;

  return {
    lines,
    orientation,
    fontSizes,
    splitScore,
    totalScore,
    feasible,
  };
}

function createFallbackLayout(
  text: string,
  box: BoundingBox,
  measure: MeasureFunction,
  constraints: LayoutConstraints
): LayoutSolution {
  // Just use minimum font size and hope for the best
  const fontSize = constraints.minFontSize;

  return {
    lines: [
      {
        text,
        fontSize,
        x: box.width / 2,
        y: box.height / 2,
      },
    ],
    orientation: 'vertical',
    rotation: -90,
    satisfiesHard: false,
    score: 0,
  };
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

export function solveTitleLayout(
  title: string,
  box: BoundingBox,
  fontFamily: string,
  aspectRatio: number,
  spineWidth: number,
  constraints: LayoutConstraints = DEFAULT_TITLE_CONSTRAINTS,
  letterSpacing: number = 0
): LayoutSolution {
  return solveLayout(title, box, constraints, fontFamily, {
    aspectRatio,
    spineWidth,
    textType: 'title',
    letterSpacing,
  });
}

export function solveAuthorLayout(
  author: string,
  box: BoundingBox,
  fontFamily: string,
  aspectRatio: number,
  spineWidth: number,
  constraints: LayoutConstraints = DEFAULT_AUTHOR_CONSTRAINTS,
  preferHorizontal: boolean = false,
  letterSpacing: number = 0
): LayoutSolution {
  return solveLayout(author, box, constraints, fontFamily, {
    aspectRatio,
    spineWidth,
    textType: 'author',
    preferHorizontal,
    letterSpacing,
  });
}
