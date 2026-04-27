/**
 * Pearloom Splash Screen Configuration
 *
 * Visual design:
 *  - Background: Cream (#FAF7F2)
 *  - Center: Olive sparkle symbol (✦) inside a 96x96 olive (#A3B18A) circle
 *  - Below the mark: "Pearloom" in Playfair Display Bold Italic, #1C1C1C
 *  - The symbol and wordmark are vertically centered as a group
 *
 * Implementation notes:
 *  - The splash screen image asset lives at ./images/splash-icon.png
 *  - app.json is configured with:
 *      "splash": {
 *        "image": "./assets/images/splash-icon.png",
 *        "resizeMode": "contain",
 *        "backgroundColor": "#FAF7F2"
 *      }
 *  - For a fully custom animated splash, use expo-splash-screen's
 *    preventAutoHideAsync / hideAsync in _layout.tsx to hold the
 *    native splash while fonts load, then show a React Native
 *    animated version before transitioning to the app.
 *
 * Asset generation guide:
 *  - Create a 1284x2778 PNG (iPhone 14 Pro Max size) with:
 *    - Fill: #FAF7F2
 *    - Centered vertically:
 *      - Olive circle (radius 48px at 3x) with white "✦" at 28px
 *      - 16px spacing
 *      - "Pearloom" text in Playfair Display Bold Italic, 32px, #1C1C1C
 *  - Export at 3x for Retina
 *  - Also export 750x1334 (2x) for older devices
 */

export const splashConfig = {
  backgroundColor: '#FAF7F2',
  logoMark: {
    symbol: '\u2726', // ✦
    symbolColor: '#FFFFFF',
    circleColor: '#A3B18A',
    circleSize: 96,
    symbolSize: 40,
  },
  wordmark: {
    text: 'Pearloom',
    fontFamily: 'Playfair Display Bold Italic',
    fontSize: 36,
    color: '#1C1C1C',
    letterSpacing: -0.5,
  },
  spacing: {
    markToWordmark: 16,
  },
};
