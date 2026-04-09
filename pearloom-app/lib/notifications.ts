import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

// ── Configure default notification behavior ────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ── Notification types we handle ───────────────────────────────────────

export type PearloomNotificationType =
  | 'rsvp_new'            // "Sarah just RSVPed attending!"
  | 'guestbook_new'       // "New guestbook message from Tom"
  | 'deadline_reminder'   // "RSVP deadline in 3 days"
  | 'event_reminder';     // "Your wedding is tomorrow!"

export interface PearloomNotificationData {
  type: PearloomNotificationType;
  siteId?: string;
  guestId?: string;
  [key: string]: unknown;
}

// ── Register for push notifications ────────────────────────────────────

/**
 * Registers for push notifications and returns the Expo push token.
 * Handles permission requests and Android channel setup.
 * Returns null if permissions are denied or registration fails.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permissions if not already granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Push notification permissions not granted');
    return null;
  }

  // Set up Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#A3B18A', // olive
    });
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.warn('No projectId found for push token registration');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    return tokenData.data;
  } catch (error) {
    console.error('Failed to get push token:', error);
    return null;
  }
}

// ── Schedule a local notification ──────────────────────────────────────

/**
 * Schedules a local notification at a specific date/time.
 * Returns the notification identifier for later cancellation.
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  trigger: Date,
): Promise<string> {
  const secondsUntilTrigger = Math.max(
    1,
    Math.floor((trigger.getTime() - Date.now()) / 1000),
  );

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: secondsUntilTrigger,
    },
  });

  return id;
}

// ── Cancel a scheduled notification ────────────────────────────────────

/**
 * Cancels a previously scheduled notification by its identifier.
 */
export async function cancelNotification(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id);
}

// ── Cancel all scheduled notifications ─────────────────────────────────

/**
 * Cancels all scheduled notifications.
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ── Notification handler hook ──────────────────────────────────────────

/**
 * React hook that sets up notification event listeners for:
 * - Received notifications (foreground)
 * - User interactions (taps) on notifications
 *
 * Handles routing based on notification type:
 * - rsvp_new: could navigate to guests screen
 * - guestbook_new: could navigate to guestbook
 * - deadline_reminder: could navigate to RSVP settings
 * - event_reminder: could navigate to dashboard
 */
export function useNotificationHandler(): void {
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    // Handle notifications received while app is in foreground
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        const data = notification.request.content.data as
          | PearloomNotificationData
          | undefined;

        if (__DEV__) {
          console.log('[Pearloom] Notification received:', {
            title: notification.request.content.title,
            type: data?.type,
          });
        }
      });

    // Handle user tapping on a notification
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as
          | PearloomNotificationData
          | undefined;

        if (!data?.type) return;

        // Route based on notification type
        switch (data.type) {
          case 'rsvp_new':
            // Navigate to guests screen
            // router.push('/(tabs)/guests');
            break;
          case 'guestbook_new':
            // Navigate to guestbook
            // router.push('/guestbook');
            break;
          case 'deadline_reminder':
            // Navigate to RSVP settings
            // router.push('/rsvp-settings');
            break;
          case 'event_reminder':
            // Navigate to dashboard
            // router.push('/(tabs)/');
            break;
        }
      });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(
          notificationListener.current,
        );
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(
          responseListener.current,
        );
      }
    };
  }, []);
}
