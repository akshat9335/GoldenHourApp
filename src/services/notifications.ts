import { Platform } from 'react-native';
import { router } from 'expo-router';
import { api, getAuthToken } from './api';

let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
  if (Notifications && typeof Notifications.setNotificationHandler === 'function') {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }
} catch (_err) {
  // Gracefully handles environments where native expo-notifications is not yet loaded
}

export const notificationService = {
  /**
   * Requests push notification permissions and registers device token with backend.
   */
  async registerForPushNotificationsAsync(): Promise<string | null> {
    if (Platform.OS === 'web' || !Notifications) {
      return null;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return null;
      }

      let token: string | null = null;

      // Real Android / iOS FCM device push token
      try {
        const deviceTokenRes = await Notifications.getDevicePushTokenAsync();
        token = deviceTokenRes?.data || null;
      } catch (_devErr) {
        // Fallback to Expo push token if device token fails in managed environment
        try {
          const expoTokenRes = await Notifications.getExpoPushTokenAsync();
          token = expoTokenRes?.data || null;
        } catch (_expoErr) {
          // Token retrieval skipped
        }
      }

      if (token) {
        // Sync token to backend if user is authenticated
        if (getAuthToken()) {
          try {
            await api.notifications.registerToken(token, Platform.OS);
          } catch (syncErr) {
            console.warn('[notifications] Failed to sync push token with backend:', syncErr);
          }
        }
      }

      return token;
    } catch (err) {
      console.warn('[notifications] Failed to get push token:', err);
      return null;
    }
  },

  /**
   * Sets up notification tap listeners to deep link directly into tracking / response screens.
   */
  setupNotificationListeners(): (() => void) | undefined {
    if (!Notifications || typeof Notifications.addNotificationResponseReceivedListener !== 'function') {
      return undefined;
    }

    try {
      const subscription = Notifications.addNotificationResponseReceivedListener(
        (response: any) => {
          const data = response?.notification?.request?.content?.data;
          if (!data) return;

          const emergencyId = data.emergencyId;
          const type = data.type;

          if (type === 'EMERGENCY_LIVE_TRACKING' && emergencyId) {
            router.push(`/(patient)/live-map?emergencyId=${emergencyId}` as any);
          } else if (type === 'NEARBY_EMERGENCY' && emergencyId) {
            router.push(`/nearby-incident?emergencyId=${emergencyId}` as any);
          } else if (data.destination) {
            router.push(data.destination as any);
          }
        }
      );

      return () => {
        try {
          subscription.remove();
        } catch (_removeErr) {
          // clean up
        }
      };
    } catch (_err) {
      return undefined;
    }
  },
};
