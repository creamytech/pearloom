import React from 'react';
import { Redirect, Tabs } from 'expo-router';
import { Platform, useWindowDimensions } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { BlurView } from 'expo-blur';

import { useAuth } from '@/lib/auth';
import { colors, fonts } from '@/lib/theme';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -2 }} {...props} />;
}

export default function TabLayout() {
  const { user, loading } = useAuth();
  const { width } = useWindowDimensions();

  // Redirect unauthenticated users to sign-in
  if (!loading && !user) {
    return <Redirect href="/modal" />;
  }

  const isSmallScreen = width < 380;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.olive,
        tabBarInactiveTintColor: colors.muted,
        tabBarShowLabel: !isSmallScreen,
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
        headerStyle: {
          backgroundColor: colors.cream,
        },
        headerTitleStyle: {
          fontFamily: fonts.bodySemibold,
          color: colors.ink,
        },
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
        name="edit"
        options={{
          title: 'Editor',
          tabBarIcon: ({ color }) => <TabBarIcon name="pencil" color={color} />,
        }}
      />
      <Tabs.Screen
        name="guests"
        options={{
          title: 'Guests',
          tabBarIcon: ({ color }) => <TabBarIcon name="users" color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => <TabBarIcon name="bars" color={color} />,
        }}
      />
      {/* Hide the legacy "two" tab so it doesn't show in the navigator */}
      <Tabs.Screen
        name="two"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
