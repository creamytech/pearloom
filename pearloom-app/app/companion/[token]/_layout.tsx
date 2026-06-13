// ─────────────────────────────────────────────────────────────
// Pearloom / companion/[token]/_layout.tsx
//
// Guest-mode bottom-tab layout. No auth — the token in the URL
// is the capability. Four tabs cover the entire day-of surface.
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { Tabs, useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Platform } from 'react-native';
import { BlurView } from 'expo-blur';

import { colors, fonts } from '@/lib/theme';
import { CompanionProvider } from './_context';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={22} style={{ marginBottom: -2 }} {...props} />;
}

export default function CompanionLayout() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const safeToken = typeof token === 'string' ? token : '';

  return (
    <CompanionProvider token={safeToken}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.olive,
          tabBarInactiveTintColor: colors.muted,
          tabBarLabelStyle: {
            fontFamily: fonts.bodyMedium,
            fontSize: 11,
          },
          tabBarStyle: {
            backgroundColor: Platform.OS === 'ios' ? 'transparent' : colors.cream,
            borderTopColor: colors.creamDeep,
            position: Platform.OS === 'ios' ? 'absolute' : undefined,
            elevation: 0,
          },
          tabBarBackground: () =>
            Platform.OS === 'ios' ? (
              <BlurView
                intensity={80}
                tint="light"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(250, 247, 242, 0.75)',
                }}
              />
            ) : undefined,
          headerStyle: { backgroundColor: colors.cream },
          headerTitleStyle: { fontFamily: fonts.bodySemibold, color: colors.ink },
          headerShadowVisible: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
          }}
        />
        <Tabs.Screen
          name="timeline"
          options={{
            title: 'Timeline',
            tabBarIcon: ({ color }) => <TabBarIcon name="clock-o" color={color} />,
          }}
        />
        <Tabs.Screen
          name="photos"
          options={{
            title: 'Photos',
            tabBarIcon: ({ color }) => <TabBarIcon name="camera" color={color} />,
          }}
        />
        <Tabs.Screen
          name="toast"
          options={{
            title: 'Toast',
            tabBarIcon: ({ color }) => <TabBarIcon name="microphone" color={color} />,
          }}
        />
      </Tabs>
    </CompanionProvider>
  );
}
