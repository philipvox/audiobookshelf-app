/**
 * src/features/home/fonts.ts
 *
 * Font loading configuration for Home screen
 * 
 * Required fonts (from Anima export):
 * 1. Pixel Operator - Retro pixel font for info tiles
 * 2. Pixel Operator Mono - Monospace version for time/speed
 * 3. Golos Text - Section headers
 * 4. Gothic A1 - Card titles
 */

import * as Font from 'expo-font';

// =============================================================================
// FONT FILES
// Download and place in: assets/fonts/
// =============================================================================

/**
 * Font file locations:
 * 
 * Pixel Operator (free):
 * - Download: https://www.dafont.com/pixel-operator.font
 * - Files needed:
 *   - assets/fonts/PixelOperator.ttf
 *   - assets/fonts/PixelOperator-Mono.ttf (if available) or use regular
 * 
 * Golos Text (Google Fonts):
 * - Download: https://fonts.google.com/specimen/Golos+Text
 * - Files needed:
 *   - assets/fonts/GolosText-Regular.ttf
 *   - assets/fonts/GolosText-Bold.ttf
 * 
 * Gothic A1 (Google Fonts):
 * - Download: https://fonts.google.com/specimen/Gothic+A1
 * - Files needed:
 *   - assets/fonts/GothicA1-Regular.ttf
 */

// =============================================================================
// FONT MAP
// =============================================================================

export const homeFonts = {
  'PixelOperator': require('@/assets/fonts/PixelOperator.ttf'),
  'PixelOperatorMono': require('@/assets/fonts/PixelOperator.ttf'), // Use same if mono not available
  'GolosText': require('@/assets/fonts/GolosText-Regular.ttf'),
  'GolosText-Bold': require('@/assets/fonts/GolosText-Bold.ttf'),
  'GothicA1': require('@/assets/fonts/GothicA1-Regular.ttf'),
};

// =============================================================================
// LOAD FONTS
// =============================================================================

export async function loadHomeFonts(): Promise<void> {
  try {
    await Font.loadAsync(homeFonts);
  } catch (error) {
    console.warn('Failed to load home fonts, using fallbacks:', error);
  }
}

// =============================================================================
// FONT FAMILY NAMES (with fallbacks)
// =============================================================================

export const fontFamily = {
  pixel: 'PixelOperator',
  pixelMono: 'PixelOperatorMono', 
  golos: 'GolosText',
  golosBold: 'GolosText-Bold',
  gothic: 'GothicA1',
  
  // System fallbacks
  fallbackMono: 'Courier',
  fallbackSans: 'System',
};

// =============================================================================
// USAGE IN APP.TSX
// =============================================================================

/**
 * Add to your App.tsx or root component:
 * 
 * ```tsx
 * import { loadHomeFonts } from '@/features/home/fonts';
 * import { useFonts } from 'expo-font';
 * 
 * export default function App() {
 *   const [fontsLoaded] = useFonts({
 *     'PixelOperator': require('./assets/fonts/PixelOperator.ttf'),
 *     'GolosText': require('./assets/fonts/GolosText-Regular.ttf'),
 *     'GolosText-Bold': require('./assets/fonts/GolosText-Bold.ttf'),
 *     'GothicA1': require('./assets/fonts/GothicA1-Regular.ttf'),
 *   });
 * 
 *   if (!fontsLoaded) {
 *     return <SplashScreen />;
 *   }
 * 
 *   return <AppNavigator />;
 * }
 * ```
 * 
 * Or use with expo-splash-screen:
 * 
 * ```tsx
 * import * as SplashScreen from 'expo-splash-screen';
 * 
 * SplashScreen.preventAutoHideAsync();
 * 
 * export default function App() {
 *   const [appIsReady, setAppIsReady] = useState(false);
 * 
 *   useEffect(() => {
 *     async function prepare() {
 *       await loadHomeFonts();
 *       setAppIsReady(true);
 *     }
 *     prepare();
 *   }, []);
 * 
 *   const onLayoutRootView = useCallback(async () => {
 *     if (appIsReady) {
 *       await SplashScreen.hideAsync();
 *     }
 *   }, [appIsReady]);
 * 
 *   if (!appIsReady) return null;
 * 
 *   return (
 *     <View onLayout={onLayoutRootView}>
 *       <AppNavigator />
 *     </View>
 *   );
 * }
 * ```
 */

// =============================================================================
// TEMPORARY: USE SYSTEM FONTS
// =============================================================================

/**
 * If you haven't downloaded the fonts yet, update the components to use:
 * 
 * InfoTiles.tsx:
 *   fontFamily: 'Courier' (instead of 'PixelOperator')
 * 
 * SectionHeader.tsx:
 *   fontFamily: 'System' (instead of 'GolosText')
 * 
 * BookCard/SeriesCard/PlaylistCard.tsx:
 *   fontFamily: 'System' (instead of 'GothicA1')
 */
