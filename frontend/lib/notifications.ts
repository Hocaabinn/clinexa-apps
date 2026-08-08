import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Konfigurasi bagaimana notifikasi ditampilkan saat aplikasi aktif (foreground)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Meminta izin notifikasi dan mengembalikan Expo Push Token
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
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
      console.warn('Gagal mendapatkan izin notifikasi!');
      return null;
    }

    try {
      // Mendapatkan Project ID dari app.json/Constants
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;
        
      if (!projectId) {
        console.warn('Peringatan: EAS Project ID tidak ditemukan di app.json. Untuk remote push notification, jalankan "eas project:init" atau tambahkan projectId.');
      } else {
        token = (
          await Notifications.getExpoPushTokenAsync({
            projectId,
          })
        ).data;
        console.log('Expo Push Token berhasil didapatkan:', token);
      }
    } catch (error) {
      console.error('Error saat mengambil Expo Push Token:', error);
    }
  } else {
    console.log('Harus menggunakan perangkat fisik untuk Push Notifications');
  }

  return token;
}

/**
 * Menjadwalkan notifikasi lokal dengan delay (penundaan waktu dalam detik)
 * Berguna untuk simulasi notifikasi saat HP mati / terkunci.
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  delaySeconds: number
) {
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        // badge dapat ditambahkan jika diperlukan
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: delaySeconds,
      },
    });
    console.log(`Notifikasi lokal dijadwalkan dengan ID: ${id} dalam ${delaySeconds} detik`);
    return id;
  } catch (error) {
    console.error('Gagal menjadwalkan notifikasi lokal:', error);
    return null;
  }
}
