/**
 * src/features/player/constants.ts
 */

import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Layout
export const PLAYER_PADDING = 5;
export const BUTTON_GAP = 5;
export const RADIUS = 5;

// Button dimensions (3 buttons with 2 gaps)
export const BUTTON_WIDTH = (SCREEN_WIDTH - PLAYER_PADDING * 2 - BUTTON_GAP * 2) / 3;
export const BUTTON_HEIGHT = 136;

// Display panel - same width as 3 buttons + 2 gaps
export const DISPLAY_WIDTH = SCREEN_WIDTH - PLAYER_PADDING * 2;
export const DISPLAY_PADDING = 16;

// Cover art inside display
export const COVER_SIZE = DISPLAY_WIDTH - DISPLAY_PADDING * 2;

// Waveform
export const WAVEFORM_HEIGHT = 24;

// Legacy exports for compatibility
export const CARD_MARGIN = PLAYER_PADDING;
export const CARD_WIDTH = DISPLAY_WIDTH;
export const BUTTON_SIZE = BUTTON_WIDTH;
export const WAVEFORM_WIDTH = COVER_SIZE;
export const NUM_POINTS = 10;

// Seeking
export const REWIND_STEP = 2; // seconds per tick
export const REWIND_INTERVAL = 80; // ms between ticks
export const FF_STEP = 5; // seconds per tick for fast forward

export { SCREEN_WIDTH, SCREEN_HEIGHT };
