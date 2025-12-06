/**
 * index.js
 *
 * Entry point for the app
 * Note: expo-audio handles background audio automatically when configured
 * via setAudioModeAsync({ shouldPlayInBackground: true })
 */

import { registerRootComponent } from 'expo';

import App from './App';

// Register the main app component
registerRootComponent(App);
