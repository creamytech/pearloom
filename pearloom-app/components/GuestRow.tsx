import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { colors, spacing, radius } from '@/lib/theme';
import type { Guest } from '@/lib/types';

interface GuestRowProps {
  guest: Guest;
  onMarkAttending?: (guest: Guest) => void;
  onMarkDeclined?: (guest: Guest) => void;
  onDelete?: (guest: Guest) => void;
  onPress?: (guest: Guest) => void;
}

const STATUS_COLORS: Record<Guest['rsvp_status'], string> = {
  attending: colors.olive,
  declined: colors.danger,
  pending: colors.gold,
};

const STATUS_LABELS: Record<Guest['rsvp_status'], string> = {
  attending: 'Attending',
  declined: 'Declined',
  pending: 'Pending',
};

const MEAL_ICONS: Record<string, string> = {
  standard: '\u{1F37D}',   // plate with cutlery
  vegetarian: '\u{1F966}', // broccoli
  vegan: '\u{1F331}',      // seedling
  kosher: '\u{2721}',      // star of david
  halal: '\u{2B50}',       // star
  'gluten-free': '\u{1F33E}', // rice
};

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

function getMealIcon(preference?: string): string | null {
  if (!preference) return null;
  return MEAL_ICONS[preference.toLowerCase()] ?? '\u{1F37D}';
}

export default function GuestRow({
  guest,
  onMarkAttending,
  onMarkDeclined,
  onDelete,
  onPress,
}: GuestRowProps) {
  const swipeableRef = useRef<any>(null);

  const renderLeftActions = () => (
    <View style={styles.leftActions}>
      <Pressable
        style={[styles.actionBtn, { backgroundColor: colors.olive }]}
        onPress={() => {
          onMarkAttending?.(guest);
          swipeableRef.current?.close();
        }}
      >
        <Text style={styles.actionIcon}>{'\u2713'}</Text>
        <Text style={styles.actionLabel}>Attend</Text>
      </Pressable>
    </View>
  );

  const renderRightActions = () => (
    <View style={styles.rightActions}>
      <Pressable
        style={[styles.actionBtn, { backgroundColor: colors.gold }]}
        onPress={() => {
          onMarkDeclined?.(guest);
          swipeableRef.current?.close();
        }}
      >
        <Text style={styles.actionIcon}>{'\u2717'}</Text>
        <Text style={styles.actionLabel}>Decline</Text>
      </Pressable>
      <Pressable
        style={[styles.actionBtn, { backgroundColor: colors.danger }]}
        onPress={() => {
          onDelete?.(guest);
          swipeableRef.current?.close();
        }}
      >
        <Text style={styles.actionIcon}>{'\u{1F5D1}'}</Text>
        <Text style={styles.actionLabel}>Delete</Text>
      </Pressable>
    </View>
  );

  const statusColor = STATUS_COLORS[guest.rsvp_status];
  const mealIcon = getMealIcon(guest.meal_preference);

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      overshootLeft={false}
      overshootRight={false}
    >
      <Pressable
        style={styles.container}
        onPress={() => onPress?.(guest)}
      >
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: statusColor + '22' }]}>
          <Text style={[styles.avatarText, { color: statusColor }]}>
            {getInitial(guest.name)}
          </Text>
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {guest.name}
          </Text>
          {guest.email ? (
            <Text style={styles.email} numberOfLines={1}>
              {guest.email}
            </Text>
          ) : null}
        </View>

        {/* Right side details */}
        <View style={styles.details}>
          {/* Status badge */}
          <View style={[styles.badge, { backgroundColor: statusColor + '1A' }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>
              {STATUS_LABELS[guest.rsvp_status]}
            </Text>
          </View>

          <View style={styles.metaRow}>
            {/* +1 count */}
            {guest.plus_ones > 0 && (
              <View style={styles.plusOnes}>
                <Text style={styles.plusOnesText}>
                  +{guest.plus_ones}
                </Text>
              </View>
            )}

            {/* Meal preference */}
            {mealIcon && (
              <Text style={styles.mealIcon}>{mealIcon}</Text>
            )}
          </View>
        </View>
      </Pressable>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  email: {
    fontSize: 13,
    color: colors.muted,
  },
  details: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  plusOnes: {
    backgroundColor: colors.creamDeep,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  plusOnesText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.inkSoft,
  },
  mealIcon: {
    fontSize: 16,
  },
  leftActions: {
    flexDirection: 'row',
  },
  rightActions: {
    flexDirection: 'row',
  },
  actionBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 76,
    paddingVertical: spacing.md,
  },
  actionIcon: {
    fontSize: 18,
    color: colors.white,
  },
  actionLabel: {
    fontSize: 11,
    color: colors.white,
    fontWeight: '600',
    marginTop: 2,
  },
});
