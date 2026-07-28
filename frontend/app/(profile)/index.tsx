import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import tw from 'twrnc';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Buffer } from 'buffer';
import * as bip39 from 'bip39';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { patientDataCache, useAuth } from '../../constants/auth';

global.Buffer = global.Buffer || Buffer;

interface FullPatientData {
  id: string;
  name: string;
  gender?: string;
  birth_date?: string;
  blood_type?: string;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const [patientData, setPatientData] = useState<FullPatientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileImage, setProfileImage] = useState<string>('https://i.pravatar.cc/150?img=11');

  // Load saved custom profile image
  useEffect(() => {
    const loadProfileImage = async () => {
      try {
        let savedImage: string | null = null;
        if (Platform.OS === 'web') {
          if (typeof window !== 'undefined') {
            savedImage = localStorage.getItem('user_profile_image');
          }
        } else {
          savedImage = await SecureStore.getItemAsync('user_profile_image');
        }
        if (savedImage) {
          setProfileImage(savedImage);
        }
      } catch (e) {
        console.error('Error loading saved profile image:', e);
      }
    };
    loadProfileImage();
  }, []);

  const handlePickImage = async () => {
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e: any) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const result = event.target?.result as string;
              if (result) {
                setProfileImage(result);
                if (typeof window !== 'undefined') {
                  localStorage.setItem('user_profile_image', result);
                }
              }
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
        return;
      }

      // Request media library permission on iOS/Android
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Izin Ditolak', 'Izin galeri diperlukan untuk mengganti foto profil.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0].uri) {
        const imageUri = result.assets[0].uri;
        setProfileImage(imageUri);
        await SecureStore.setItemAsync('user_profile_image', imageUri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Gagal', 'Terjadi kesalahan saat memilih foto profil.');
    }
  };

  // Helper to format Indonesian birth date (e.g. 1995-05-12 -> 12 Mei 1995)
  const formatDateIndonesian = (dateStr?: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parts[0];
    const monthIndex = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthName = months[monthIndex] || parts[1];
    return `${day} ${monthName} ${year}`;
  };

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const cached = patientDataCache.get() as FullPatientData | null;
        if (cached && cached.gender && cached.birth_date && cached.blood_type) {
          setPatientData(cached);
          setLoading(false);
          return;
        }

        const nik = await SecureStore.getItemAsync('user_nik');
        if (nik) {
          const { data, error } = await supabase
            .from('patients')
            .select('id, name, gender, birth_date, blood_type')
            .eq('nik', nik)
            .single();

          if (data && !error) {
            const fullData: FullPatientData = {
              id: data.id,
              name: data.name,
              gender: data.gender,
              birth_date: data.birth_date,
              blood_type: data.blood_type,
            };
            setPatientData(fullData);
            patientDataCache.set(fullData);
          }
        }
      } catch (err) {
        console.error('Error loading patient profile data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      'Keluar Akun',
      'Apakah Anda yakin ingin keluar? Anda harus mengimpor ulang recovery phrase Anda untuk masuk kembali.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: async () => {
            try {
              await SecureStore.deleteItemAsync('user_seed_phrase');
              await SecureStore.deleteItemAsync('user_nik');
              await SecureStore.deleteItemAsync('user_wallet_address');
              logout();
            } catch (err) {
              console.error('Error deleting seed phrase:', err);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white relative`}>
      <StatusBar barStyle="light-content" backgroundColor="#2ea89c" />

      {/* Main Scroll Content */}
      <ScrollView showsVerticalScrollIndicator={false} style={tw`flex-1 mb-20`}>
        {/* Header Section */}
        <View style={[
          tw`bg-[#2ea89c] rounded-b-[40px] pb-24 px-6 overflow-hidden relative`,
          { paddingTop: Platform.OS === 'android' ? 50 : 24 }
        ]}>
          {/* Background Decorative Shapes */}
          <View style={tw`absolute -top-16 -right-12 w-64 h-64 bg-white/10 rounded-full`} />
          <View style={tw`absolute -bottom-12 -left-12 w-48 h-48 bg-black/5 rounded-full`} />

          <View style={tw`flex-row justify-between items-center relative z-10`}>
            {/* Back Button */}
            <TouchableOpacity
              onPress={() => router.navigate('/(dashboard)')}
              style={tw`w-10 h-10 rounded-full bg-white/20 items-center justify-center`}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={24} color="white" />
            </TouchableOpacity>

            {/* Screen Title */}
            <Text style={tw`text-white font-extrabold text-2xl tracking-tight text-center`}>
              Profil Saya
            </Text>

            {/* Spacer to balance back button */}
            <View style={tw`w-10 h-10`} />
          </View>
        </View>

        {/* Profile Avatar and Name */}
        <View style={tw`items-center -mt-16 mb-6 px-6`}>
          <TouchableOpacity onPress={handlePickImage} activeOpacity={0.9} style={tw`relative`}>
            <View style={[
              tw`bg-white rounded-full p-1`,
              { elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 }
            ]}>
              <Image
                source={{ uri: profileImage }}
                style={tw`w-28 h-28 rounded-full`}
              />
            </View>
            {/* Camera Overlay Icon */}
            <View
              style={[
                tw`absolute bottom-1 right-1 bg-[#2ea89c] w-8 h-8 rounded-full items-center justify-center border-2 border-white`,
                { elevation: 2 }
              ]}
            >
              <Ionicons name="camera" size={16} color="white" />
            </View>
          </TouchableOpacity>

          {/* Name & Account ID */}
          <Text style={tw`text-gray-800 font-extrabold text-xl mt-4 text-center`}>
            {loading ? 'Memuat...' : (patientData?.name || 'User')}
          </Text>

          {/* Long Account ID text wrapped nicely */}
          <Text style={tw`text-gray-400 text-xs font-semibold mt-2 px-4 text-center leading-relaxed`} numberOfLines={3}>
            {loading ? 'ID: ...' : `ID:${patientData?.id || ''}`}
          </Text>
        </View>

        {/* Informasi Pribadi Section */}
        <View style={tw`px-5 mb-5`}>
          <View style={tw`flex-row justify-between items-center mb-4`}>
            <Text style={tw`text-lg font-bold text-gray-800`}>Informasi Pribadi</Text>
            {/* Blockchain Verified Badge */}
            <View style={tw`bg-[#e8f6ed] border border-[#dcfce7] px-3 py-1 rounded-full`}>
              <Text style={tw`text-[#16a34a] text-[10px] font-bold`}>Blockchain Verified</Text>
            </View>
          </View>

          {/* Personal Info Box */}
          <View style={[
            tw`bg-white rounded-[32px] p-6 border border-gray-100`,
            { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6 }
          ]}>
            {/* Nama Lengkap */}
            <View style={tw`mb-4`}>
              <Text style={tw`text-gray-400 text-[10px] font-bold tracking-wider uppercase mb-1`}>
                Nama Lengkap
              </Text>
              {loading ? (
                <ActivityIndicator size="small" color="#2ea89c" style={tw`self-start`} />
              ) : (
                <Text style={tw`text-gray-800 font-bold text-base`}>
                  {patientData?.name || '-'}
                </Text>
              )}
            </View>

            {/* Jenis Kelamin */}
            <View style={tw`mb-4 border-t border-gray-50 pt-4`}>
              <Text style={tw`text-gray-400 text-[10px] font-bold tracking-wider uppercase mb-1`}>
                Jenis Kelamin
              </Text>
              {loading ? (
                <ActivityIndicator size="small" color="#2ea89c" style={tw`self-start`} />
              ) : (
                <Text style={tw`text-gray-800 font-bold text-base`}>
                  {patientData?.gender === 'L' ? 'Laki-laki' : patientData?.gender === 'P' ? 'Perempuan' : '-'}
                </Text>
              )}
            </View>

            {/* Tanggal Lahir */}
            <View style={tw`mb-4 border-t border-gray-50 pt-4`}>
              <Text style={tw`text-gray-400 text-[10px] font-bold tracking-wider uppercase mb-1`}>
                Tanggal Lahir
              </Text>
              {loading ? (
                <ActivityIndicator size="small" color="#2ea89c" style={tw`self-start`} />
              ) : (
                <Text style={tw`text-gray-800 font-bold text-base`}>
                  {formatDateIndonesian(patientData?.birth_date)}
                </Text>
              )}
            </View>

            {/* Golongan Darah */}
            <View style={tw`border-t border-gray-50 pt-4`}>
              <Text style={tw`text-gray-400 text-[10px] font-bold tracking-wider uppercase mb-1`}>
                Golongan Darah
              </Text>
              {loading ? (
                <ActivityIndicator size="small" color="#2ea89c" style={tw`self-start`} />
              ) : (
                <Text style={tw`text-[#2ea89c] font-bold text-base`}>
                  {patientData?.blood_type || '-'}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Keamanan Akun Section */}
        <View style={tw`px-5 mb-8`}>
          <Text style={tw`text-lg font-bold text-gray-800 mb-4`}>Keamanan Akun</Text>

          {/* Action Row Recovery Password */}
          <TouchableOpacity
            style={[
              tw`bg-white rounded-2xl p-4 border border-gray-100 flex-row justify-between items-center`,
              { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6 }
            ]}
            activeOpacity={0.8}
            onPress={() => Alert.alert('Recovery Password', 'Fitur pemulihan kata sandi melalui phrase pemulihan.')}
          >
            <View style={tw`flex-row items-center`}>
              {/* Circular lock-reset icon */}
              <View style={tw`w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3`}>
                <MaterialCommunityIcons name="lock-reset" size={22} color="#64748b" />
              </View>
              <Text style={tw`text-gray-800 font-bold text-sm`}>Recovery Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
          </TouchableOpacity>
        </View>

        {/* Keluar Akun Button */}
        <View style={tw`px-5 mb-10`}>
          <TouchableOpacity
            onPress={handleLogout}
            style={tw`bg-[#fee2e2] py-4 rounded-[20px] flex-row items-center justify-center`}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={20} color="#ef4444" style={tw`mr-2`} />
            <Text style={tw`text-[#ef4444] font-extrabold text-base`}>Keluar Akun</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View style={[
        tw`absolute bottom-0 w-full bg-white flex-row justify-between items-end px-6 pb-6 pt-3 border-t border-gray-100`,
        { elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 10 }
      ]}>
        {/* Beranda */}
        <TouchableOpacity
          onPress={() => router.navigate('/(dashboard)')}
          style={tw`items-center flex-1`}
          activeOpacity={0.7}
        >
          <Ionicons name="home-outline" size={24} color="#9ca3af" />
          <Text style={tw`text-gray-400 text-xs font-medium mt-1`}>Beranda</Text>
        </TouchableOpacity>

        {/* RME */}
        <TouchableOpacity
          onPress={() => router.navigate('/(rekam_medis)')}
          style={tw`items-center flex-1`}
          activeOpacity={0.7}
        >
          <Ionicons name="document-text-outline" size={24} color="#9ca3af" />
          <Text style={tw`text-gray-400 text-xs font-medium mt-1`}>RME</Text>
        </TouchableOpacity>

        {/* Floating Scan QR */}
        <View style={tw`items-center flex-1 relative h-14`}>
          <View style={[
            tw`absolute -top-8 bg-white rounded-full p-1.5`,
            { elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5 }
          ]}>
            <TouchableOpacity 
              onPress={() => router.push('/modal')}
              style={tw`bg-[#2ea89c] w-14 h-14 rounded-full items-center justify-center`} 
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="qrcode-scan" size={24} color="white" />
            </TouchableOpacity>
          </View>
          <Text style={tw`text-[#2ea89c] text-xs font-medium absolute bottom-0`}>Scan QR</Text>
        </View>

        {/* Aktivitas */}
        <TouchableOpacity
          onPress={() => router.navigate('/(aktivitas)')}
          style={tw`items-center flex-1`}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="history" size={26} color="#9ca3af" />
          <Text style={tw`text-gray-400 text-xs font-medium mt-1`}>Aktivitas</Text>
        </TouchableOpacity>

        {/* Profil */}
        <TouchableOpacity style={tw`items-center flex-1`} activeOpacity={0.7}>
          <Ionicons name="person" size={24} color="#2ea89c" />
          <Text style={tw`text-[#2ea89c] text-xs font-medium mt-1`}>Profil</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
