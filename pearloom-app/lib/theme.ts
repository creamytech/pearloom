import { useColorScheme } from 'react-native';

export const colors = {
  cream: '#FAF7F2',
  creamDeep: '#F5F1E8',
  olive: '#A3B18A',
  oliveDeep: '#7A9170',
  ink: '#1C1C1C',
  inkSoft: '#3D3530',
  muted: '#9A9488',
  gold: '#C4A96A',
  plum: '#6D597A',
  white: '#FFFFFF',
  danger: '#EF4444',
  success: '#22C55E',
};

export const darkColors: typeof colors = {
  cream: '#1A1A1A',
  creamDeep: '#252525',
  olive: '#A3B18A',
  oliveDeep: '#7A9170',
  ink: '#F0EDE8',
  inkSoft: '#D4CFC8',
  muted: '#8A8780',
  gold: '#C4A96A',
  plum: '#9B7FC4',
  white: '#2A2A2A',
  danger: '#EF4444',
  success: '#22C55E',
};

/**
 * Returns the correct color palette based on the system color scheme.
 */
export function useThemeColors(): typeof colors {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkColors : colors;
}

export const fonts = {
  heading: 'PlayfairDisplay_700Bold_Italic',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemibold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, full: 999 };
