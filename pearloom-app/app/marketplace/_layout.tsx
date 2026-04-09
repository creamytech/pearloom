import { Stack } from 'expo-router';
import { colors, fonts } from '@/lib/theme';

export default function MarketplaceLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.cream },
        headerTitleStyle: {
          fontFamily: fonts.bodySemibold,
          color: colors.ink,
        },
        headerShadowVisible: false,
        headerTintColor: colors.olive,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Marketplace',
          headerLargeTitle: true,
        }}
      />
      <Stack.Screen
        name="template-detail"
        options={{
          title: '',
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="asset-packs"
        options={{
          title: 'Asset Packs',
        }}
      />
    </Stack>
  );
}
