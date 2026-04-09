import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  Platform,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Constants from 'expo-constants';
import { colors, spacing, radius } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import {
  registerForPushNotifications,
  cancelAllNotifications,
} from '@/lib/notifications';

// ── Types ──────────────────────────────────────────────────────────────

interface SettingsItem {
  key: string;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  label: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
}

interface SettingsSection {
  title: string;
  items: SettingsItem[];
}

// ── Animated settings row ──────────────────────────────────────────────

function AnimatedSettingsRow({
  item,
}: {
  item: SettingsItem;
}) {
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.timing(opacityAnim, {
      toValue: 0.6,
      duration: 80,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePressOut = useCallback(() => {
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePress = useCallback(() => {
    if (item.danger) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    item.onPress?.();
  }, [item]);

  return (
    <Animated.View style={{ opacity: opacityAnim }}>
      <Pressable
        style={styles.settingsRow}
        onPress={handlePress}
        onPressIn={item.onPress ? handlePressIn : undefined}
        onPressOut={item.onPress ? handlePressOut : undefined}
        disabled={!item.onPress && !item.rightElement}
      >
        <View
          style={[
            styles.iconContainer,
            item.danger && styles.iconContainerDanger,
          ]}
        >
          <FontAwesome
            name={item.icon}
            size={16}
            color={item.danger ? colors.danger : colors.olive}
          />
        </View>

        <View style={styles.settingsContent}>
          <Text
            style={[
              styles.settingsLabel,
              item.danger && styles.settingsLabelDanger,
            ]}
          >
            {item.label}
          </Text>
          {item.subtitle && !item.rightElement && (
            <Text style={styles.settingsSubtitle}>
              {item.subtitle}
            </Text>
          )}
        </View>

        {item.rightElement ? (
          item.rightElement
        ) : item.onPress ? (
          <FontAwesome
            name="chevron-right"
            size={12}
            color={colors.muted}
          />
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

// ── Component ──────────────────────────────────────────────────────────

export default function MoreScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [referralCode] = useState(
    'PEARL-' + (user?.id?.slice(0, 6)?.toUpperCase() ?? 'XXXXXX'),
  );

  // ── Notification toggle ──────────────────────────────────────────────

  const handleToggleNotifications = async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNotificationsEnabled(value);
    if (value) {
      const token = await registerForPushNotifications();
      if (!token) {
        setNotificationsEnabled(false);
        Alert.alert(
          'Notifications Disabled',
          'Please enable notifications in your device settings.',
        );
      }
    } else {
      await cancelAllNotifications();
    }
  };

  // ── Sign out ─────────────────────────────────────────────────────────

  const handleSignOut = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
          },
        },
      ],
      { cancelable: true },
    );
  };

  // ── Share referral code ──────────────────────────────────────────────

  const handleShareReferral = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Referral Code',
      `Share your code: ${referralCode}\n\nFriends get 10% off their first plan!`,
    );
  };

  // ── Determine plan badge ─────────────────────────────────────────────

  // Plan badge styling — driven by user's plan level in production
  const planLabel = 'FREE';
  const planBadgeBg = colors.gold + '22';
  const planBadgeColor = colors.gold;
  // For pro: colors.olive + '22' / colors.olive, label 'PRO'
  // For premium: colors.gold + '22' / colors.gold, label 'PREMIUM'

  // ── Build sections ───────────────────────────────────────────────────

  const appVersion =
    Constants.expoConfig?.version ??
    Constants.manifest2?.extra?.expoClient?.version ??
    '1.0.0';

  const sections: SettingsSection[] = [
    {
      title: 'Discover',
      items: [
        {
          key: 'marketplace',
          icon: 'shopping-bag',
          label: 'Marketplace',
          subtitle: 'Templates, themes & asset packs',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/marketplace');
          },
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          key: 'notifications',
          icon: 'bell',
          label: 'Notifications',
          subtitle: notificationsEnabled ? 'On' : 'Off',
          rightElement: (
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: colors.creamDeep, true: colors.olive }}
              thumbColor={colors.white}
            />
          ),
        },
      ],
    },
    {
      title: 'Account',
      items: [
        {
          key: 'referral',
          icon: 'gift',
          label: 'Referral Program',
          subtitle: referralCode,
          onPress: handleShareReferral,
        },
        {
          key: 'billing',
          icon: 'credit-card',
          label: 'Billing & Plan',
          subtitle: 'Free Plan',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            Alert.alert('Billing', 'Plan management coming soon.');
          },
        },
        {
          key: 'export',
          icon: 'download',
          label: 'Export Data',
          subtitle: 'CSV, PDF',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            Alert.alert('Export', 'Data export coming soon.');
          },
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          key: 'help',
          icon: 'question-circle',
          label: 'Help & Support',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            Alert.alert('Help', 'Contact us at support@pearloom.com');
          },
        },
        {
          key: 'signout',
          icon: 'sign-out',
          label: 'Sign Out',
          onPress: handleSignOut,
          danger: true,
        },
      ],
    },
  ];

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile card with gradient background */}
      <LinearGradient
        colors={[colors.olive + '18', colors.cream]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.profileCardGradient}
      >
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.name ?? 'U').charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {user?.name ?? 'Guest User'}
            </Text>
            <Text style={styles.profileEmail}>
              {user?.email ?? 'Not signed in'}
            </Text>
          </View>

          <View style={[styles.planBadge, { backgroundColor: planBadgeBg }]}>
            <Text style={[styles.planBadgeText, { color: planBadgeColor }]}>
              {planLabel}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Settings sections */}
      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionCard}>
            {section.items.map((item, index) => (
              <React.Fragment key={item.key}>
                {index > 0 && <View style={styles.divider} />}
                <AnimatedSettingsRow item={item} />
              </React.Fragment>
            ))}
          </View>
        </View>
      ))}

      {/* Version footer */}
      <Text style={styles.version}>Pearloom v{appVersion}</Text>
    </ScrollView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  content: {
    paddingBottom: 40,
  },

  // Profile card
  profileCardGradient: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    ...Platform.select({
      ios: {
        shadowColor: colors.ink,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.lg,
    gap: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.olive + '22',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.olive,
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink,
  },
  profileEmail: {
    fontSize: 13,
    color: colors.muted,
  },
  planBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  planBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Sections
  section: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.ink,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.creamDeep,
    marginLeft: spacing.lg + 36 + spacing.md,
  },

  // Settings row
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    gap: spacing.md,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.olive + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerDanger: {
    backgroundColor: colors.danger + '12',
  },
  settingsContent: {
    flex: 1,
    gap: 2,
  },
  settingsLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.ink,
  },
  settingsLabelDanger: {
    color: colors.danger,
  },
  settingsSubtitle: {
    fontSize: 13,
    color: colors.muted,
  },

  // Version
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.muted,
    marginTop: spacing.xxl,
  },
});
