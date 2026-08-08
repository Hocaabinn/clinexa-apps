import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, Clipboard, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import {
  registerForPushNotificationsAsync,
  scheduleLocalNotification,
} from '../../lib/notifications';
import * as Notifications from 'expo-notifications';

export default function TestNotificationScreen() {
  const [permissionStatus, setPermissionStatus] = useState<string>('unknown');
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [isScheduling, setIsScheduling] = useState(false);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setPermissionStatus(status);
  };

  const handleRequestPermission = async () => {
    const token = await registerForPushNotificationsAsync();
    setPushToken(token);
    
    const { status } = await Notifications.getPermissionsAsync();
    setPermissionStatus(status);
    
    if (status === 'granted') {
      // Kirim notifikasi selamat datang instan (1 detik delay agar mulus)
      await scheduleLocalNotification(
        '🎉 Izin Notifikasi Aktif!',
        'Terima kasih! Notifikasi dari Clinexa sekarang akan muncul di HP Anda.',
        1
      );
    } else {
      Alert.alert('Izin Ditolak', 'Aplikasi membutuhkan izin notifikasi agar fitur ini bekerja.');
    }
  };

  const handleCopyToken = () => {
    if (pushToken) {
      Clipboard.setString(pushToken);
      Alert.alert('Disalin', 'Expo Push Token disalin ke clipboard.');
    }
  };

  const handleTestNotification = async (delaySeconds: number) => {
    setIsScheduling(true);
    const title = '🔔 Uji Coba Notifikasi Clinexa';
    const body =
      delaySeconds === 0
        ? 'Halo! Ini adalah notifikasi instan saat aplikasi terbuka.'
        : `Hebat! Ini notifikasi yang muncul setelah penundaan ${delaySeconds} detik saat HP Anda terkunci.`;

    const id = await scheduleLocalNotification(title, body, delaySeconds || 1); // min 1 sec
    setIsScheduling(false);

    if (id) {
      if (delaySeconds > 0) {
        Alert.alert(
          'Notifikasi Dijadwalkan',
          `Notifikasi akan muncul dalam ${delaySeconds} detik. Segera matikan layar HP Anda untuk menguji!`,
          [{ text: 'OK' }]
        );
      }
    } else {
      Alert.alert('Gagal', 'Gagal menjadwalkan notifikasi. Pastikan izin sudah diberikan.');
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-900`} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={tw`p-6`}>
        <View style={tw`items-center my-6`}>
          <View style={tw`bg-emerald-500/20 p-4 rounded-full mb-4`}>
            <Ionicons name="notifications-outline" size={60} color="#10b981" />
          </View>
          <Text style={tw`text-white text-2xl font-bold text-center`}>Uji Coba Notifikasi Real</Text>
          <Text style={tw`text-slate-400 text-sm text-center mt-2`}>
            Simulasi dan pengujian notifikasi di layar kunci (Lock Screen) saat HP mati.
          </Text>
        </View>

        {/* Status Izin */}
        <View style={tw`bg-slate-800 p-4 rounded-2xl mb-6`}>
          <Text style={tw`text-slate-400 text-xs font-semibold uppercase tracking-wider`}>
            Status Izin Notifikasi
          </Text>
          <View style={tw`flex-row items-center justify-between mt-2`}>
            <View style={tw`flex-row items-center`}>
              <View
                style={tw`w-3 h-3 rounded-full mr-2 ${
                  permissionStatus === 'granted' ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
              <Text style={tw`text-white font-medium capitalize`}>
                {permissionStatus === 'granted' ? 'Diizinkan (Granted)' : 'Belum Diizinkan'}
              </Text>
            </View>
            {permissionStatus !== 'granted' && (
              <TouchableOpacity
                onPress={handleRequestPermission}
                style={tw`bg-emerald-600 px-3 py-1.5 rounded-lg`}
              >
                <Text style={tw`text-white text-xs font-bold`}>Izinkan</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Petunjuk Pengujian */}
        <View style={tw`bg-indigo-950/40 border border-indigo-500/20 p-5 rounded-2xl mb-6`}>
          <Text style={tw`text-indigo-400 font-bold mb-2 flex-row items-center`}>
            📢 Cara Menguji Saat HP Terkunci:
          </Text>
          <Text style={tw`text-slate-300 text-sm mb-1.5`}>
            1. Tekan tombol <Text style={tw`font-bold text-white`}>"Uji (Delay 5 Detik)"</Text> di bawah.
          </Text>
          <Text style={tw`text-slate-300 text-sm mb-1.5`}>
            2. <Text style={tw`font-bold text-amber-400`}>Segera matikan layar HP Anda</Text> (tekan tombol lock / power).
          </Text>
          <Text style={tw`text-slate-300 text-sm`}>
            3. Diamkan HP Anda, setelah 5 detik notifikasi akan berbunyi dan tampil di Lock Screen.
          </Text>
        </View>

        {/* Tombol-Tombol Aksi */}
        <View style={tw`gap-4 mb-6`}>
          <TouchableOpacity
            onPress={() => handleTestNotification(0)}
            disabled={isScheduling}
            style={tw`bg-slate-800 p-4 rounded-xl flex-row items-center justify-between`}
          >
            <View>
              <Text style={tw`text-white font-semibold`}>Uji Coba Instan (Sekarang)</Text>
              <Text style={tw`text-slate-400 text-xs`}>Muncul saat aplikasi sedang terbuka</Text>
            </View>
            <Ionicons name="flash-outline" size={24} color="#10b981" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleTestNotification(5)}
            disabled={isScheduling}
            style={tw`bg-emerald-600 p-4 rounded-xl flex-row items-center justify-between`}
          >
            <View>
              <Text style={tw`text-white font-bold`}>Uji Coba (Delay 5 Detik) ⭐️</Text>
              <Text style={tw`text-emerald-100 text-xs`}>Klik, lalu segera kunci layar HP Anda</Text>
            </View>
            <Ionicons name="time-outline" size={24} color="#ffffff" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleTestNotification(15)}
            disabled={isScheduling}
            style={tw`bg-slate-800 p-4 rounded-xl flex-row items-center justify-between`}
          >
            <View>
              <Text style={tw`text-white font-semibold`}>Uji Coba (Delay 15 Detik)</Text>
              <Text style={tw`text-slate-400 text-xs`}>Lebih banyak waktu untuk mengunci layar</Text>
            </View>
            <Ionicons name="time-outline" size={24} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Push Token Section */}
        {permissionStatus === 'granted' && (
          <View style={tw`bg-slate-800 p-4 rounded-2xl`}>
            <Text style={tw`text-slate-400 text-xs font-semibold uppercase tracking-wider`}>
              Expo Push Token (Untuk Server/Remote Push)
            </Text>
            {pushToken ? (
              <View style={tw`mt-2`}>
                <Text style={tw`text-slate-300 text-xs font-mono bg-slate-950 p-2 rounded mb-2 select-all`} numberOfLines={1}>
                  {pushToken}
                </Text>
                <TouchableOpacity
                  onPress={handleCopyToken}
                  style={tw`bg-indigo-600 py-2 rounded-xl items-center`}
                >
                  <Text style={tw`text-white text-xs font-bold`}>Salin Token</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleRequestPermission}
                style={tw`bg-indigo-600 py-2 rounded-xl items-center mt-2`}
              >
                <Text style={tw`text-white text-xs font-bold`}>Dapatkan Token</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
