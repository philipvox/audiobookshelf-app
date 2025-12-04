/**
 * index.web.js
 *
 * Web entry point for design inspection.
 * Skips react-native-track-player registration (uses shaka-player which has import.meta issues).
 */

import { registerRootComponent } from 'expo';

import App from './App';

// Skip TrackPlayer registration on web - not needed for design inspection
console.log('[Web] Running in web mode - audio playback disabled');

// Register the main app component
registerRootComponent(App);
