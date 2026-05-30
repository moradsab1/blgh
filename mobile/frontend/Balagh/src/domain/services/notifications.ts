import { Platform, PermissionsAndroid } from 'react-native';

// POST_NOTIFICATIONS is required on Android 13+ (API 33+).
// We use the string literal directly instead of PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
// because that constant was added in later RN typings but the underlying string is stable.
const POST_NOTIFICATIONS = 'android.permission.POST_NOTIFICATIONS' as const;

export interface INotificationService {
  requestPermission(): Promise<boolean>;
  hasPermission(): Promise<boolean>;
}

export class NotificationService implements INotificationService {
  async requestPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      // iOS: system permission handled by push transport library added in Phase 6.
      return true;
    }
    if ((Platform.Version as number) < 33) {
      // Android < 13: POST_NOTIFICATIONS not required; automatically granted.
      return true;
    }
    const result = await PermissionsAndroid.request(POST_NOTIFICATIONS);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  async hasPermission(): Promise<boolean> {
    if (Platform.OS !== 'android' || (Platform.Version as number) < 33) {
      return true;
    }
    return PermissionsAndroid.check(POST_NOTIFICATIONS);
  }
}

export const notificationService = new NotificationService();
