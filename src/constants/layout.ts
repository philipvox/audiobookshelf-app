/**
 * src/constants/layout.ts
 *
 * Layout constants for consistent spacing across the app.
 */

import { Platform } from 'react-native';

// Top navigation bar height (content only, safe area added separately)
export const TOP_NAV_HEIGHT = 52;

// Bottom navigation bar height
export const BOTTOM_NAV_HEIGHT = 86;

// Combined header offset for screens (nav height + some buffer)
// This is used as padding-top for scroll content
export const SCREEN_TOP_OFFSET = TOP_NAV_HEIGHT + 8;
