import React, { useState, useEffect } from 'react';
import { View, Text, Switch, TouchableOpacity, ScrollView, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import * as Notifications from 'expo-notifications';
import { scheduleLocalNotification } from '../../lib/notifications';
import { 
  getLanguage, 
  setLanguage, 
  loadLanguageAsync, 
  translate, 
  addLanguageChangeListener,
  LanguageType 
} from '../../lib/language';

export default function SettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<LanguageType>('id');
  const [permissionStatus, setPermissionStatus] = useState<string>('undetermined');

  // React state sync with translation manager
  useEffect(() => {
    const initLanguage = async () => {
      const lang = await loadLanguageAsync();
      setCurrentLanguage(lang);
    };
    initLanguage();

    const unsubscribe = addLanguageChangeListener((lang) => {
      setCurrentLanguage(lang);
    });

    checkNotificationStatus();

    return () => unsubscribe();
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
        const title = translate('notif_welcome_title') as string;
        const body = translate('notif_welcome_body') as string;
        await scheduleLocalNotification(title, body, 1);
      } else {
        Alert.alert(
          currentLanguage === 'id' ? 'Izin Diperlukan' : 'Permission Required',
          currentLanguage === 'id' ? 'Silakan aktifkan notifikasi di Pengaturan HP Anda.' : 'Please enable notifications in your Phone Settings.',
          [
            { text: currentLanguage === 'id' ? 'Batal' : 'Cancel', style: 'cancel' },
            { text: currentLanguage === 'id' ? 'Buka Pengaturan' : 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        setNotificationsEnabled(false);
      }
    } else {
      Alert.alert(
        currentLanguage === 'id' ? 'Nonaktifkan Notifikasi' : 'Disable Notifications',
        currentLanguage === 'id' ? 'Untuk mematikan notifikasi sepenuhnya, Anda perlu menonaktifkannya di Pengaturan HP.' : 'To completely turn off notifications, you need to disable them in Phone Settings.',
        [
          { text: currentLanguage === 'id' ? 'Batal' : 'Cancel', style: 'cancel' },
          { text: currentLanguage === 'id' ? 'Buka Pengaturan' : 'Open Settings', onPress: () => Linking.openSettings() }
        ]
      );
      await checkNotificationStatus();
    }
  };

  const handleChangeLanguage = () => {
    Alert.alert(
      currentLanguage === 'id' ? 'Pilih Bahasa' : 'Select Language',
      currentLanguage === 'id' ? 'Pilih bahasa aplikasi Anda:' : 'Select your application language:',
      [
        {
          text: 'Bahasa Indonesia 🇮🇩',
          onPress: async () => {
            await setLanguage('id');
            Alert.alert('Sukses', 'Bahasa diubah ke Bahasa Indonesia.');
          }
        },
        {
          text: 'English 🇬🇧',
          onPress: async () => {
            await setLanguage('en');
            Alert.alert('Success', 'Language changed to English.');
          }
        },
        { text: currentLanguage === 'id' ? 'Batal' : 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleTestNotification = async () => {
    if (permissionStatus !== 'granted') {
      Alert.alert(
        currentLanguage === 'id' ? 'Izin Diperlukan' : 'Permission Required',
        currentLanguage === 'id' ? 'Aktifkan izin notifikasi terlebih dahulu.' : 'Please enable notification permission first.'
      );
      return;
    }
    const title = translate('notif_test_title') as string;
    const body = translate('notif_test_body') as string;
    await scheduleLocalNotification(title, body, 2);
    
    Alert.alert(
      currentLanguage === 'id' ? 'Terkirim' : 'Sent', 
      currentLanguage === 'id' ? 'Notifikasi uji coba akan muncul dalam 2 detik. Kunci HP Anda jika ingin mencobanya.' : 'Test notification will appear in 2 seconds. Lock your phone if you wish to test.'
    );
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50`} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={tw`p-5`}>
        
        {/* Section: General */}
        <Text style={tw`text-slate-500 text-xs font-bold uppercase tracking-wider mb-3 px-1`}>
          {translate('section_general') as string}
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
              <Text style={tw`text-slate-800 font-bold text-sm`}>{translate('lang_label') as string}</Text>
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
          {translate('section_security') as string}
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
                <Text style={tw`text-slate-800 font-bold text-sm`}>{translate('allow_notif') as string}</Text>
                <Text style={tw`text-slate-400 text-xs mt-0.5`}>
                  Status: {permissionStatus === 'granted' ? (translate('status_active') as string) : (translate('status_inactive') as string)}
                </Text>
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
              <Text style={tw`text-slate-800 font-bold text-sm`}>{translate('test_notif') as string}</Text>
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
              <Text style={tw`text-slate-800 font-bold text-sm`}>{translate('sys_settings') as string}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={tw`bg-emerald-50 border border-emerald-100 p-4 rounded-2xl`}>
          <Text style={tw`text-[#2ea89c] text-xs leading-relaxed font-medium`}>
            {translate('info_text') as string}
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
