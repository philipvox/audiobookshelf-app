/**
 * src/features/home/homeDesign.ts
 *
 * Design tokens extracted from Anima/Figma export
 * Base canvas: 402px width
 */

import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Scale a value from 402px base to current screen width
 */
export const scale = (size: number) => (size / 402) * SCREEN_WIDTH;

// =============================================================================
// COLORS
// =============================================================================
export const COLORS = {
  // Backgrounds
  background: '#000000',
  controlButtonBg: '#262626',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textTertiary: 'rgba(255, 255, 255, 0.5)',

  // Accents
  playButton: '#C8FF00', // Lime green
  heart: '#34C759', // Green heart
  sleepTimer: '#F12802', // Red timer

  // Glass effects
  glassWhite: 'rgba(255, 255, 255, 0.5)',
  glassBorder: 'rgba(255, 255, 255, 0.5)',
} as const;

// =============================================================================
// FONTS (Anima export)
// =============================================================================
export const FONTS = {
  // Info tiles - retro pixel font
  pixelOperator: 'PixelOperator',
  pixelOperatorMono: 'PixelOperatorMono',
  
  // Section headers
  golosText: 'GolosText',
  
  // Card titles
  gothicA1: 'GothicA1',
  
  // Fallbacks (if custom fonts not loaded)
  fallbackMono: 'Courier',
  fallbackSans: 'System',
} as const;

// =============================================================================
// DIMENSIONS (from Anima export, scaled)
// =============================================================================
export const DIMENSIONS = {
  // Base canvas
  canvasWidth: 402,
  
  // Info tiles
  leftPillWidth: scale(236),
  leftPillHeight: scale(61),
  rightPillWidth: scale(135),
  rightPillHeight: scale(61),
  pillRadius: scale(5),
  pillPadding: scale(11),
  
  // Cover artwork
  coverWidth: scale(263),
  coverHeight: scale(264),
  coverRadius: scale(8.79),
  
  // Playback controls
  controlsWidth: scale(162),
  controlsTop: scale(260), // From top of cover
  skipButtonWidth: scale(52.4),
  skipButtonHeight: scale(55.84),
  playButtonWidth: scale(52.74),
  playButtonHeight: scale(56.03),
  buttonRadius: scale(5.21),
  buttonGap1: scale(2.1),
  buttonGap2: scale(2.3),
  
  // Book cards
  bookCardWidth: scale(110),
  bookCardHeight: scale(141.5),
  bookCoverSize: scale(106),
  bookCoverRadius: scale(5),
  bookTitleTop: scale(115),
  bookHeartTop: scale(121),
  bookHeartLeft: scale(89),
  
  // Series cards
  seriesCardWidth: scale(110),
  seriesCardHeight: scale(86.5),
  seriesCoverWidth: scale(35),
  seriesCoverHeight: scale(51),
  seriesCoverOffset: scale(17), // Horizontal offset between covers
  seriesTitleTop: scale(60),
  seriesHeartTop: scale(66),
  
  // Playlist cards
  playlistCardWidth: scale(110),
  playlistCardHeight: scale(141.5),
  playlistCoverSize: scale(51),
  playlistCoverGap: scale(4), // Gap between covers (55 - 51)
  playlistTitleTop: scale(115),
  
  // Section headers
  sectionHeaderWidth: scale(349.9),
  sectionHeaderHeight: scale(17),
  sectionPadding: scale(29),
  
  // Carousel
  carouselGap: scale(10),
  
  // Spacing
  topPadding: scale(18),
  sectionGapLarge: scale(43), // After controls to first section
  sectionGapMedium: scale(23), // Between books and series
  sectionGapSmall: scale(16), // Between series and playlists
  
  // Typography
  infoFontSize: scale(20),
  infoLineHeight: scale(20.7),
  titleFontSize: scale(14),
  cardFontSize: scale(12),
  cardLineHeight: scale(12.4),
} as const;

// =============================================================================
// LAYOUT
// =============================================================================
export const LAYOUT = {
  screenPadding: scale(10),
  carouselPaddingHorizontal: scale(29),
  tabBarHeight: scale(83),
  bottomGradientHeight: scale(120),
} as const;

// =============================================================================
// SHADOWS (from Anima)
// =============================================================================
export const SHADOWS = {
  cover: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 12,
  },
  seriesCover: {
    shadowColor: '#000000',
    shadowOffset: { width: 9, height: 4 },
    shadowOpacity: 0.46,
    shadowRadius: 2,
    elevation: 4,
  },
  button: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
} as const;

// =============================================================================
// GLASS MORPHISM LAYERS (for GlassButton)
// =============================================================================
export const GLASS_LAYERS = {
  base: {
    color: COLORS.controlButtonBg,
  },
  border: {
    color: COLORS.glassBorder,
    width: 1,
  },
} as const;
