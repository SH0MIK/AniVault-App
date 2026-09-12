// Requests notification permission, grabs an Expo push token, and registers
// it with the backend. Called once after login (see AuthContext) and again
// on app launch if already logged in, so a token refresh (which does
// happen occasionally) doesn't leave the backend holding a stale one.
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { apiFetch, getToken as getAuthToken } from './client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: true,
    shouldShowBanner: true, shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<void> {
  if (!Device.isDevice) return; // push tokens don't work on simulators

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return;

  const authToken = await getAuthToken();
  if (!authToken) return; // not logged in yet — AuthContext calls this again after login

  try {
    const { data: expoToken } = await Notifications.getExpoPushTokenAsync();
    await apiFetch('/api/mobile/push-token', {
      method: 'POST',
      body: { token: expoToken, platform: Device.osName ?? 'unknown' },
    });
  } catch {
    // Non-fatal — the rest of the app works fine without push registered;
    // it'll retry next launch.
  }
}
