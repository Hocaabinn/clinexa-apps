import React, { useState, useEffect } from 'react';
import { View, Text, Switch, TouchableOpacity, ScrollView, Platform, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import * as Notifications from 'expo-notifications';
import { scheduleLocalNotification } from '../../lib/notifications';

export default function SettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<'id' | 'en'>('id');
  const [permissionStatus, setPermissionStatus] = useState<string>('undetermined');

  useEffect(() => {
    checkNotificationStatus();
  }, []);

  const checkNotificationStatus = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setPermissionStatus(status);
    setNotificationsEnabled(status === 'granted');
  };

  const handleToggleNotifications = async (value: boolean) => {
    if (value) {
      const { status } = await Notifications.requestPermissionsAsync();
      setPermissionStatus(status);
      setNotificationsEnabled(status === 'granted');
      
      if (status === 'granted') {
        await scheduleLocalNotification(
          '🔔 Notifikasi Diaktifkan',
          'Anda akan menerima pemberitahuan penting tentang rekam medis Anda.',
          1
        );
      } else {
        Alert.alert(
          'Izin Diperlukan',
          'Silakan aktifkan notifikasi di Pengaturan HP Anda.',
          [
            { text: 'Batal', style: 'cancel' },
            { text: 'Buka Pengaturan', onPress: () => Linking.openSettings() }
          ]
        );
        setNotificationsEnabled(false);
      }
    } else {
      Alert.alert(
        'Nonaktifkan Notifikasi',
        'Untuk mematikan notifikasi sepenuhnya, Anda perlu menonaktifkannya di Pengaturan HP.',
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Buka Pengaturan', onPress: () => Linking.openSettings() }
        ]
      );
      await checkNotificationStatus();
    }
  };

  const handleChangeLanguage = () => {
    Alert.alert(
      'Pilih Bahasa / Select Language',
      'Pilih bahasa aplikasi Anda:',
      [
        {
          text: 'Bahasa Indonesia 🇮🇩',
          onPress: () => {
            setCurrentLanguage('id');
            Alert.alert('Sukses', 'Bahasa diubah ke Bahasa Indonesia.');
          }
        },
        {
          text: 'English 🇬🇧',
          onPress: () => {
            setCurrentLanguage('en');
            Alert.alert('Success', 'Language changed to English.');
          }
        },
        { text: 'Batal / Cancel', style: 'cancel' }
      ]
    );
  };

  const handleTestNotification = async () => {
    if (permissionStatus !== 'granted') {
      Alert.alert('Izin Diperlukan', 'Aktifkan izin notifikasi terlebih dahulu.');
      return;
    }
    await scheduleLocalNotification(
      '⚡️ Uji Coba Sukses',
      'Notifikasi Clinexa bekerja dengan baik!',
      2
    );
    Alert.alert('Terkirim', 'Notifikasi uji coba akan muncul dalam 2 detik. Kunci HP Anda jika ingin mencobanya.');
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50`} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={tw`p-5`}>
        
        {/* Section: General */}
        <Text style={tw`text-slate-500 text-xs font-bold uppercase tracking-wider mb-3 px-1`}>
          Umum
        </Text>
        
        <View style={[
          tw`bg-white rounded-2xl overflow-hidden mb-6 border border-slate-100`,
          { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1 }
        ]}>
          {/* Bahasa */}
          <TouchableOpacity 
            onPress={handleChangeLanguage}
            style={tw`flex-row items-center justify-between p-4 border-b border-slate-100`}
            activeOpacity={0.7}
          >
            <View style={tw`flex-row items-center`}>
              <View style={tw`w-8 h-8 rounded-lg bg-[#2ea89c]/10 items-center justify-center mr-3`}>
                <Ionicons name="language-outline" size={18} color="#2ea89c" />
              </View>
              <Text style={tw`text-slate-800 font-bold text-sm`}>Bahasa</Text>
            </View>
            <View style={tw`flex-row items-center`}>
              <Text style={tw`text-slate-500 text-sm mr-1`}>
                {currentLanguage === 'id' ? 'Bahasa Indonesia' : 'English'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Section: Notifications */}
        <Text style={tw`text-slate-500 text-xs font-bold uppercase tracking-wider mb-3 px-1`}>
          Keamanan & Notifikasi
        </Text>

        <View style={[
          tw`bg-white rounded-2xl overflow-hidden mb-6 border border-slate-100`,
          { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1 }
        ]}>
          {/* Toggle Switch Notifikasi */}
          <View style={tw`flex-row items-center justify-between p-4 border-b border-slate-100`}>
            <View style={tw`flex-row items-center`}>
              <View style={tw`w-8 h-8 rounded-lg bg-[#2ea89c]/10 items-center justify-center mr-3`}>
                <Ionicons name="notifications-outline" size={18} color="#2ea89c" />
              </View>
              <View>
                <Text style={tw`text-slate-800 font-bold text-sm`}>Izinkan Notifikasi</Text>
                <Text style={tw`text-slate-400 text-xs mt-0.5`}>Status: {permissionStatus === 'granted' ? 'Aktif' : 'Nonaktif'}</Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: '#e2e8f0', true: '#2ea89c' }}
              thumbColor={notificationsEnabled ? '#ffffff' : '#f1f5f9'}
            />
          </View>

          {/* Test Notification Button */}
          <TouchableOpacity 
            onPress={handleTestNotification}
            style={tw`flex-row items-center justify-between p-4 border-b border-slate-100`}
            activeOpacity={0.7}
          >
            <View style={tw`flex-row items-center`}>
              <View style={tw`w-8 h-8 rounded-lg bg-[#2ea89c]/10 items-center justify-center mr-3`}>
                <Ionicons name="construct-outline" size={18} color="#2ea89c" />
              </View>
              <Text style={tw`text-slate-800 font-bold text-sm`}>Uji Notifikasi Cepat</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
          </TouchableOpacity>

          {/* Open OS Settings */}
          <TouchableOpacity 
            onPress={() => Linking.openSettings()}
            style={tw`flex-row items-center justify-between p-4`}
            activeOpacity={0.7}
          >
            <View style={tw`flex-row items-center`}>
              <View style={tw`w-8 h-8 rounded-lg bg-[#2ea89c]/10 items-center justify-center mr-3`}>
                <Ionicons name="open-outline" size={18} color="#2ea89c" />
              </View>
              <Text style={tw`text-slate-800 font-bold text-sm`}>Buka Pengaturan Sistem HP</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={tw`bg-emerald-50 border border-emerald-100 p-4 rounded-2xl`}>
          <Text style={tw`text-[#2ea89c] text-xs leading-relaxed font-medium`}>
            Aplikasi memerlukan izin notifikasi sistem agar fitur otomatis pencabutan akses rekam medis (consent) dapat memberitahu Anda secara real-time saat HP terkunci.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
