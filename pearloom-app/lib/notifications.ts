import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { apiFetch } from './api';

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

// ── Register push token with backend ──────────────────────────────────

/**
 * Registers the push token with the Pearloom backend.
 * Should be called on app launch after getting the token.
 */
export async function registerPushTokenWithBackend(token: string): Promise<void> {
  try {
    await apiFetch('/api/notifications/register', {
      method: 'POST',
      body: JSON.stringify({
        token,
        platform: Platform.OS,
        deviceName: Constants.deviceName ?? 'Unknown',
      }),
    });
  } catch (err) {
    console.warn('Failed to register push token with backend:', err);
  }
}

/**
 * Registers for push notifications, gets the token, and sends it to the backend.
 * Returns the token or null.
 */
export async function setupPushNotifications(): Promise<string | null> {
  const token = await registerForPushNotifications();
  if (token) {
    await registerPushTokenWithBackend(token);
  }
  return token;
}

// ── Schedule event reminders ──────────────────────────────────────────

/**
 * Schedules local reminder notifications for an upcoming event.
 */
export async function scheduleEventReminders(
  eventName: string,
  eventDate: Date,
  siteId: string,
): Promise<void> {
  const now = Date.now();

  // Reminder 3 days before
  const threeDaysBefore = new Date(eventDate.getTime() - 3 * 24 * 60 * 60 * 1000);
  if (threeDaysBefore.getTime() > now) {
    await scheduleLocalNotification(
      'Event Reminder',
      `${eventName} is in 3 days!`,
      threeDaysBefore,
    );
  }

  // Reminder 1 day before
  const oneDayBefore = new Date(eventDate.getTime() - 24 * 60 * 60 * 1000);
  if (oneDayBefore.getTime() > now) {
    await scheduleLocalNotification(
      'Event Tomorrow!',
      `${eventName} is tomorrow! Make sure everything is ready.`,
      oneDayBefore,
    );
  }

  // Day-of reminder
  const dayOf = new Date(eventDate);
  dayOf.setHours(8, 0, 0, 0); // 8 AM on event day
  if (dayOf.getTime() > now) {
    await scheduleLocalNotification(
      'Today is the Day!',
      `${eventName} is today! Have an amazing celebration.`,
      dayOf,
    );
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
 * - rsvp_new: navigates to guests screen
 * - guestbook_new: navigates to editor for the site
 * - deadline_reminder: navigates to guests screen
 * - event_reminder: navigates to dashboard
 */
export function useNotificationHandler(): void {
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const router = useRouter();

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
            router.push('/(tabs)/guests');
            break;
          case 'guestbook_new':
            if (data.siteId) {
              router.push(`/editor/${data.siteId}`);
            }
            break;
          case 'deadline_reminder':
            router.push('/(tabs)/guests');
            break;
          case 'event_reminder':
            router.push('/(tabs)/');
            break;
        }
      });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [router]);
}
