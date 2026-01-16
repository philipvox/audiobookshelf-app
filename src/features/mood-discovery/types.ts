/**
 * src/features/mood-discovery/types.ts
 *
 * Types for the 4-Step Discovery Quiz.
 * Uses orthogonal dimensions for precise recommendations:
 * 1. Mood - What emotional experience you want (required)
 * 2. Pace - How fast the story moves (optional)
 * 3. Weight - How emotionally demanding (optional)
 * 4. World - Setting and reality type (optional)
 */

// ============================================================================
// STEP 1: MOOD (Required)
// ============================================================================

/**
 * Mood represents the primary emotional experience the user is seeking.
 * This is the core filter - every book must match the mood.
 */
export type Mood =
  | 'comfort'   // Warm and reassuring
  | 'thrills'   // Edge-of-your-seat tension
  | 'escape'    // Transported to another world
  | 'laughs'    // Funny and entertaining
  | 'feels'     // Emotionally powerful
  | 'thinking'; // Makes you reflect

export interface MoodConfig {
  id: Mood;
  label: string;
  icon: string;
  iconSet: 'lucide';
  description: string;
}

export const MOODS: MoodConfig[] = [
  {
    id: 'comfort',
    label: 'Comfort',
    icon: 'Armchair',
    iconSet: 'lucide',
    description: 'Cozy, warm, familiar',
  },
  {
    id: 'thrills',
    label: 'Thrills',
    icon: 'Zap',
    iconSet: 'lucide',
    description: 'Heart racing, page-turner',
  },
  {
    id: 'escape',
    label: 'Escape',
    icon: 'Sparkles',
    iconSet: 'lucide',
    description: 'Another world entirely',
  },
  {
    id: 'laughs',
    label: 'Laughs',
    icon: 'Smile',
    iconSet: 'lucide',
    description: 'Light and funny',
  },
  {
    id: 'feels',
    label: 'Feels',
    icon: 'Heart',
    iconSet: 'lucide',
    description: 'Emotional and moving',
  },
  {
    id: 'thinking',
    label: 'Think',
    icon: 'Lightbulb',
    iconSet: 'lucide',
    description: 'Mind-expanding',
  },
];

// ============================================================================
// STEP 2: PACE (Optional)
// ============================================================================

/**
 * Pace determines how fast the story moves.
 * Affects listening context fit (commuting vs bedtime).
 */
export type Pace = 'slow' | 'steady' | 'fast' | 'any';

export interface PaceConfig {
  id: Pace;
  label: string;
  icon: string;
  iconSet: 'lucide';
  description: string;
  isDefault?: boolean;
}

export const PACES: PaceConfig[] = [
  {
    id: 'slow',
    label: 'Slow burn',
    icon: 'Moon',
    iconSet: 'lucide',
    description: 'Leisurely, atmospheric',
  },
  {
    id: 'steady',
    label: 'Steady',
    icon: 'Activity',
    iconSet: 'lucide',
    description: 'Balanced pace',
  },
  {
    id: 'fast',
    label: 'Fast',
    icon: 'Flame',
    iconSet: 'lucide',
    description: 'Page-turner',
  },
  {
    id: 'any',
    label: 'Any pace',
    icon: 'Shuffle',
    iconSet: 'lucide',
    description: 'No preference',
    isDefault: true,
  },
];

// ============================================================================
// STEP 3: WEIGHT (Optional)
// ============================================================================

/**
 * Weight is about emotional and cognitive demand.
 * How much energy does the book require?
 */
export type Weight = 'light' | 'balanced' | 'heavy' | 'any';

export interface WeightConfig {
  id: Weight;
  label: string;
  icon: string;
  iconSet: 'lucide';
  description: string;
  isDefault?: boolean;
}

export const WEIGHTS: WeightConfig[] = [
  {
    id: 'light',
    label: 'Light',
    icon: 'Sun',
    iconSet: 'lucide',
    description: 'Feel-good, uplifting',
  },
  {
    id: 'balanced',
    label: 'Balanced',
    icon: 'CloudSun',
    iconSet: 'lucide',
    description: 'Mix of light and dark',
  },
  {
    id: 'heavy',
    label: 'Heavy',
    icon: 'CloudRain',
    iconSet: 'lucide',
    description: 'Intense, emotional',
  },
  {
    id: 'any',
    label: 'Any tone',
    icon: 'Shuffle',
    iconSet: 'lucide',
    description: 'No preference',
    isDefault: true,
  },
];

// ============================================================================
// STEP 4: WORLD (Optional)
// ============================================================================

/**
 * World determines the setting/genre family.
 */
export type World = 'contemporary' | 'historical' | 'fantasy' | 'scifi' | 'any';

export interface WorldConfig {
  id: World;
  label: string;
  icon: string;
  iconSet: 'lucide';
  description: string;
  isDefault?: boolean;
}

export const WORLDS: WorldConfig[] = [
  {
    id: 'contemporary',
    label: 'Modern',
    icon: 'Building2',
    iconSet: 'lucide',
    description: 'Present day',
  },
  {
    id: 'historical',
    label: 'Historical',
    icon: 'Castle',
    iconSet: 'lucide',
    description: 'Past eras',
  },
  {
    id: 'fantasy',
    label: 'Fantasy',
    icon: 'Wand2',
    iconSet: 'lucide',
    description: 'Magic and myth',
  },
  {
    id: 'scifi',
    label: 'Sci-Fi',
    icon: 'Rocket',
    iconSet: 'lucide',
    description: 'Future and space',
  },
  {
    id: 'any',
    label: 'Any setting',
    icon: 'Globe',
    iconSet: 'lucide',
    description: 'No preference',
    isDefault: true,
  },
];

// ============================================================================
// STEP 5: LENGTH PREFERENCE (Optional)
// ============================================================================

export type LengthPreference = 'short' | 'medium' | 'long' | 'any';

export interface LengthConfig {
  id: LengthPreference;
  label: string;
  icon: string;
  iconSet: 'lucide';
  description: string;
  minHours?: number;
  maxHours?: number;
  isDefault?: boolean;
}

export const LENGTHS: LengthConfig[] = [
  {
    id: 'short',
    label: 'Short',
    icon: 'Timer',
    iconSet: 'lucide',
    description: 'Under 6 hours',
    maxHours: 6,
  },
  {
    id: 'medium',
    label: 'Medium',
    icon: 'Clock',
    iconSet: 'lucide',
    description: '6-12 hours',
    minHours: 6,
    maxHours: 12,
  },
  {
    id: 'long',
    label: 'Long',
    icon: 'BookOpen',
    iconSet: 'lucide',
    description: '12+ hours',
    minHours: 12,
  },
  {
    id: 'any',
    label: 'Any length',
    icon: 'Infinity',
    iconSet: 'lucide',
    description: 'No preference',
    isDefault: true,
  },
];

// Legacy export for backwards compatibility
export const LENGTH_OPTIONS = LENGTHS;

// ============================================================================
// MOOD SESSION
// ============================================================================

/**
 * A mood session captures the user's current preferences.
 * Sessions expire after 24 hours - ephemeral, not permanent profile data.
 */
export interface MoodSession {
  /** Primary mood (required) */
  mood: Mood;
  /** Pace preference */
  pace: Pace;
  /** Weight preference */
  weight: Weight;
  /** World preference */
  world: World;
  /** Length preference (can be adjusted on results) */
  length: LengthPreference;
  /** When the session was created (timestamp) */
  createdAt: number;
  /** When the session expires (timestamp) - 24 hours after creation */
  expiresAt: number;
}

/**
 * Default session duration in milliseconds (24 hours)
 */
export const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

// ============================================================================
// GENRE MAPPINGS
// ============================================================================

/**
 * Maps moods to genre keywords for filtering/scoring.
 */
export const MOOD_GENRE_MAP: Record<Mood, string[]> = {
  comfort: [
    'cozy',
    'cozy mystery',
    'romance',
    'contemporary romance',
    'women\'s fiction',
    'slice of life',
    'heartwarming',
    'feel-good',
    'comfort read',
    'sweet romance',
    'light romance',
  ],
  thrills: [
    'thriller',
    'mystery',
    'suspense',
    'crime',
    'detective',
    'spy',
    'psychological thriller',
    'police procedural',
    'legal thriller',
    'conspiracy',
    'action',
  ],
  escape: [
    'fantasy',
    'science fiction',
    'adventure',
    'epic fantasy',
    'urban fantasy',
    'space opera',
    'portal fantasy',
    'world-building',
    'immersive',
    'atmospheric',
  ],
  laughs: [
    'humor',
    'comedy',
    'satire',
    'romantic comedy',
    'parody',
    'comedic',
    'witty',
    'lighthearted',
    'funny',
  ],
  feels: [
    'emotional',
    'drama',
    'literary fiction',
    'family saga',
    'love story',
    'grief',
    'coming of age',
    'bittersweet',
    'tearjerker',
    'moving',
  ],
  thinking: [
    'literary',
    'philosophy',
    'thought-provoking',
    'psychological',
    'challenging',
    'intellectual',
    'reflective',
    'social commentary',
    'allegory',
  ],
};

/**
 * Maps pace to indicators in book metadata/description.
 */
export const PACE_INDICATORS: Record<Exclude<Pace, 'any'>, string[]> = {
  slow: [
    'slow burn',
    'literary',
    'character study',
    'atmospheric',
    'meditative',
    'leisurely',
    'introspective',
    'contemplative',
  ],
  steady: [
    'well-paced',
    'balanced',
    'engaging',
  ],
  fast: [
    'page-turner',
    'fast-paced',
    'action-packed',
    'propulsive',
    'gripping',
    'unputdownable',
    'quick read',
    'thriller',
  ],
};

/**
 * Maps weight to indicators in book metadata/description.
 */
export const WEIGHT_INDICATORS: Record<Exclude<Weight, 'any'>, string[]> = {
  light: [
    'light',
    'easy read',
    'beach read',
    'comfort read',
    'feel-good',
    'lighthearted',
    'fun',
    'escapist',
    'cozy',
  ],
  balanced: [
    'engaging',
    'compelling',
    'well-crafted',
  ],
  heavy: [
    'dark',
    'intense',
    'gritty',
    'heavy',
    'challenging',
    'difficult',
    'brutal',
    'devastating',
    'heartbreaking',
    'raw',
    'unflinching',
  ],
};

/**
 * Maps world settings to genre keywords.
 */
export const WORLD_GENRE_MAP: Record<Exclude<World, 'any'>, string[]> = {
  contemporary: [
    'contemporary',
    'modern',
    'realistic',
    'literary fiction',
    'thriller',
    'mystery',
    'romance',
    'drama',
    'urban',
  ],
  historical: [
    'historical',
    'historical fiction',
    'period',
    'regency',
    'victorian',
    'medieval',
    'world war',
    'ancient',
    '19th century',
    '20th century',
  ],
  fantasy: [
    'fantasy',
    'epic fantasy',
    'urban fantasy',
    'paranormal',
    'mythology',
    'fairy tale',
    'magic',
    'magical realism',
    'dragons',
  ],
  scifi: [
    'sci-fi',
    'science fiction',
    'space opera',
    'cyberpunk',
    'dystopian',
    'post-apocalyptic',
    'time travel',
    'aliens',
    'space',
  ],
};

// ============================================================================
// THEMES & TROPES MAPPING
// ============================================================================

/**
 * Maps common book themes to moods for enhanced scoring.
 */
export const THEME_MOOD_MAP: Record<string, Mood[]> = {
  // Comfort themes
  'found family': ['comfort', 'feels'],
  'friendship': ['comfort', 'laughs'],
  'healing': ['comfort', 'feels'],
  'community': ['comfort'],
  'second chances': ['comfort', 'feels'],
  'small town': ['comfort'],
  'love': ['comfort', 'feels'],
  'hope': ['comfort', 'feels'],

  // Thrills themes
  'survival': ['thrills', 'feels'],
  'revenge': ['thrills', 'feels'],
  'conspiracy': ['thrills', 'thinking'],
  'justice': ['thrills', 'thinking'],
  'danger': ['thrills'],
  'secrets': ['thrills', 'thinking'],
  'betrayal': ['thrills', 'feels'],
  'race against time': ['thrills'],

  // Escape themes
  'adventure': ['escape', 'thrills'],
  'quest': ['escape', 'thrills'],
  'exploration': ['escape'],
  'magic': ['escape', 'comfort'],
  'world-building': ['escape'],
  'destiny': ['escape', 'feels'],

  // Laughs themes
  'humor': ['laughs'],
  'absurdity': ['laughs', 'thinking'],
  'whimsy': ['laughs', 'comfort'],
  'satire': ['laughs', 'thinking'],

  // Feels themes
  'grief': ['feels'],
  'loss': ['feels'],
  'sacrifice': ['feels', 'escape'],
  'redemption': ['feels', 'thinking'],
  'family': ['feels', 'comfort'],
  'forgiveness': ['feels'],
  'trauma': ['feels', 'thinking'],
  'coming of age': ['feels', 'thinking'],

  // Thinking themes
  'morality': ['thinking', 'feels'],
  'identity': ['thinking', 'feels'],
  'power': ['thinking', 'escape'],
  'corruption': ['thinking', 'thrills'],
  'society': ['thinking'],
  'free will': ['thinking'],
  'human nature': ['thinking', 'feels'],
  'philosophy': ['thinking'],
};

/**
 * Maps common book tropes to moods for enhanced scoring.
 */
export const TROPE_MOOD_MAP: Record<string, Mood[]> = {
  // Comfort tropes
  'found family': ['comfort', 'feels'],
  'slow burn': ['comfort', 'feels'],
  'friends to lovers': ['comfort', 'feels'],
  'small town romance': ['comfort'],
  'cozy mystery': ['comfort', 'thrills'],
  'fake dating': ['comfort', 'laughs'],

  // Thrills tropes
  'unreliable narrator': ['thrills', 'thinking'],
  'whodunit': ['thrills'],
  'locked room mystery': ['thrills', 'thinking'],
  'cat and mouse': ['thrills'],
  'heist': ['thrills', 'laughs'],
  'political intrigue': ['thrills', 'thinking'],
  'reluctant hero': ['thrills', 'feels'],

  // Escape tropes
  'chosen one': ['escape'],
  'portal fantasy': ['escape'],
  'magic system': ['escape'],
  'dragons': ['escape'],
  'quest': ['escape', 'thrills'],
  'prophecy': ['escape'],

  // Laughs tropes
  'enemies to lovers': ['laughs', 'feels'],
  'fish out of water': ['laughs'],
  'mistaken identity': ['laughs'],
  'romcom': ['laughs', 'comfort'],
  'road trip': ['laughs', 'feels'],

  // Feels tropes
  'star-crossed lovers': ['feels'],
  'forbidden love': ['feels'],
  'second chance romance': ['feels', 'comfort'],
  'redemption arc': ['feels', 'thinking'],
  'tragic backstory': ['feels'],
  'bittersweet ending': ['feels', 'thinking'],

  // Thinking tropes
  'antihero': ['thinking', 'thrills'],
  'morally grey': ['thinking', 'feels'],
  'twist ending': ['thinking', 'thrills'],
  'allegory': ['thinking'],
  'social commentary': ['thinking'],
};

// ============================================================================
// SCORING TYPES
// ============================================================================

/**
 * Score breakdown for a book recommendation
 */
export interface MoodScore {
  /** Total score (higher = better match) */
  total: number;
  /** Score from primary mood matching */
  moodScore: number;
  /** Score from pace matching */
  paceScore: number;
  /** Score from weight matching */
  weightScore: number;
  /** Score from world matching */
  worldScore: number;
  /** Score from length matching */
  lengthScore: number;
  /** Bonus from theme matching */
  themeScore: number;
  /** Bonus from trope matching */
  tropeScore: number;
  /** Whether this is a primary mood match (vs secondary) */
  isPrimaryMoodMatch: boolean;
}

/**
 * A book with its mood match score
 */
export interface ScoredBook {
  /** Library item ID */
  id: string;
  /** Calculated mood score */
  score: MoodScore;
  /** Match percentage (0-100) */
  matchPercent: number;
}

// ============================================================================
// QUIZ STATE
// ============================================================================

/**
 * Current step in the discovery quiz (now 5 steps)
 */
export type QuizStep = 1 | 2 | 3 | 4 | 5;

/**
 * Total number of steps in the quiz
 */
export const TOTAL_QUIZ_STEPS = 5;

/**
 * Draft state while user is going through the quiz
 */
export interface QuizDraft {
  mood: Mood | null;
  pace: Pace;
  weight: Weight;
  world: World;
  length: LengthPreference;
  currentStep: QuizStep;
}

/**
 * Initial draft state with defaults
 */
export const INITIAL_QUIZ_DRAFT: QuizDraft = {
  mood: null,
  pace: 'any',
  weight: 'any',
  world: 'any',
  length: 'any',
  currentStep: 1,
};

// ============================================================================
// LEGACY COMPATIBILITY (for existing code during migration)
// ============================================================================

// These types are kept for backwards compatibility during migration
export type Vibe = Mood;
export type WorldSetting = World;
export const VIBES = MOODS;
export const WORLD_OPTIONS = WORLDS;
export const VIBE_GENRE_MAP = MOOD_GENRE_MAP;
