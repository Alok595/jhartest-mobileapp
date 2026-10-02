import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { apiClient } from './api';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  if (Platform.OS === 'web') {
    return null;
  }

  // Set up Android High-Priority Notification Channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'JharTest Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0072FF',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission denied');
      return null;
    }

    try {
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ||
        Constants.easConfig?.projectId ||
        '7d323294-32bb-42af-b914-0dee920aaa37';

      const pushTokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      token = pushTokenData.data;

      // Send token to backend
      if (token) {
        await syncPushTokenWithBackend(token);
      }
    } catch (e: any) {
      console.log('Error getting push token:', e?.message || e);
    }
  } else {
    console.log('Physical device required for Push Notifications');
  }

  return token;
}

export async function syncPushTokenWithBackend(pushToken: string) {
  try {
    await apiClient.post('/notifications/register-token', {
      pushToken,
      platform: Platform.OS,
      deviceModel: Device.modelName || 'Unknown Android Device',
    });
  } catch (err: any) {
    // Non-blocking fail-safe
    console.log('Sync push token skipped:', err?.message || err);
  }
}
