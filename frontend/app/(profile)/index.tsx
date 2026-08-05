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
  Alert,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import tw from 'twrnc';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Buffer } from 'buffer';
import * as bip39 from 'bip39';
import * as ImagePicker from 'expo-image-picker';
import { callPatientAccess } from '../../lib/patient-api';
import { patientDataCache, useAuth } from '../../constants/auth';
import { supabase } from '../../lib/supabase';

global.Buffer = global.Buffer || Buffer;

const { width } = Dimensions.get('window');

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];
const YEARS = Array.from({ length: 107 }, (_, i) => String(2026 - i));

const getDaysInMonth = (monthName: string, yearStr: string) => {
  const monthIndex = MONTHS.indexOf(monthName);
  const year = parseInt(yearStr) || 2000;
  return new Date(year, monthIndex + 1, 0).getDate();
};

interface FullPatientData {
  id: string;
  name: string;
  gender?: string;
  birth_date?: string;
  blood_type?: string;
  avatar_url?: string;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const [patientData, setPatientData] = useState<FullPatientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileImage, setProfileImage] = useState<string>('https://api.dicebear.com/7.x/initials/png?seed=User&backgroundColor=0b4771,1ba39a');

  // State untuk Modal Edit Informasi Pribadi
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editGender, setEditGender] = useState('L');
  const [editDay, setEditDay] = useState('01');
  const [editMonth, setEditMonth] = useState('Januari');
  const [editYear, setEditYear] = useState('2000');
  const [editBloodType, setEditBloodType] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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

  const uploadAvatarToSupabase = async (uri: string) => {
    try {
      if (!patientData?.id) return;
      setIsSaving(true);

      let blob: Blob;
      let contentType = 'image/jpeg';
      let fileExtension = 'jpg';

      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        blob = await response.blob();
        const mime = uri.split(',')[0].split(':')[1].split(';')[0];
        contentType = mime;
        fileExtension = mime.split('/')[1] || 'jpg';
      } else {
        const response = await fetch(uri);
        blob = await response.blob();
        const ext = uri.split('.').pop() || 'jpg';
        fileExtension = ext;
        contentType = `image/${ext}`;
      }

      const filePath = `${patientData.id}.${fileExtension}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          contentType,
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get Public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Update patients table
      const { error: updateError } = await supabase
        .from('patients')
        .update({ avatar_url: publicUrl })
        .eq('id', patientData.id);

      if (updateError) throw updateError;

      // Update local state and cache
      setProfileImage(publicUrl);
      if (Platform.OS === 'web') {
        localStorage.setItem('user_profile_image', publicUrl);
      } else {
        await SecureStore.setItemAsync('user_profile_image', publicUrl);
      }

      // Update patientData cache so other screens refresh
      const updatedData = { ...patientData, avatar_url: publicUrl };
      setPatientData(updatedData);
      patientDataCache.set(updatedData);

      Alert.alert('Berhasil', 'Foto profil berhasil diperbarui.');
    } catch (err: any) {
      console.error('Error uploading avatar:', err);
      Alert.alert('Error', 'Gagal mengunggah foto profil: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

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
                uploadAvatarToSupabase(result);
              }
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
        return;
      }

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
        await uploadAvatarToSupabase(imageUri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Gagal', 'Terjadi kesalahan saat memilih foto profil.');
    }
  };

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
          if (cached.avatar_url) {
            setProfileImage(cached.avatar_url);
          } else {
            setProfileImage(`https://api.dicebear.com/7.x/initials/png?seed=${cached.name}&backgroundColor=0b4771,1ba39a`);
          }
          setLoading(false);
          return;
        }

        const nik = await SecureStore.getItemAsync('user_nik');
        if (nik) {
          const walletAddress = await SecureStore.getItemAsync('user_wallet_address');
          const data = await callPatientAccess<any>('get_patient', {
            nik,
            wallet_address: walletAddress,
          });

          const fullData: FullPatientData = {
            id: data.id,
            name: data.name,
            gender: data.gender,
            birth_date: data.birth_date,
            blood_type: data.blood_type,
            avatar_url: data.avatar_url,
          };
          setPatientData(fullData);
          patientDataCache.set(fullData);
          if (data.avatar_url) {
            setProfileImage(data.avatar_url);
          } else {
            setProfileImage(`https://api.dicebear.com/7.x/initials/png?seed=${data.name}&backgroundColor=0b4771,1ba39a`);
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

  const handleOpenEditModal = () => {
    if (!patientData) return;
    setEditName(patientData.name || '');
    setEditGender(patientData.gender || 'L');
    setEditBloodType(patientData.blood_type || '');

    if (patientData.birth_date) {
      const parts = patientData.birth_date.split('-');
      if (parts.length === 3) {
        setEditYear(parts[0]);
        const monthIdx = parseInt(parts[1]) - 1;
        setEditMonth(MONTHS[monthIdx] || 'Januari');
        setEditDay(String(parseInt(parts[2])).padStart(2, '0'));
      }
    }
    setIsEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!patientData?.id) return;
    if (!editName.trim()) {
      Alert.alert('Peringatan', 'Nama lengkap tidak boleh kosong.');
      return;
    }

    setIsSaving(true);
    try {
      const monthIndex = MONTHS.indexOf(editMonth) + 1;
      const monthStr = String(monthIndex).padStart(2, '0');
      const formattedBirthDate = `${editYear}-${monthStr}-${editDay}`;

      let cleanBloodType = 'O';
      if (editBloodType.trim()) {
        const upper = editBloodType.trim().toUpperCase();
        if (upper.includes('AB')) cleanBloodType = 'AB';
        else if (upper.includes('A')) cleanBloodType = 'A';
        else if (upper.includes('B')) cleanBloodType = 'B';
        else if (upper.includes('O')) cleanBloodType = 'O';
      }

      const walletAddress = await SecureStore.getItemAsync('user_wallet_address');
      await callPatientAccess('update_patient', {
        patient_id: patientData.id,
        wallet_address: walletAddress,
        name: editName.trim(),
        gender: editGender,
        birth_date: formattedBirthDate,
        blood_type: cleanBloodType,
      });

      const updatedData: FullPatientData = {
        ...patientData,
        name: editName.trim(),
        gender: editGender,
        birth_date: formattedBirthDate,
        blood_type: cleanBloodType,
      };

      setPatientData(updatedData);
      patientDataCache.set(updatedData);
      setIsEditModalVisible(false);
      Alert.alert('Berhasil', 'Informasi pribadi berhasil diperbarui.');
    } catch (err: any) {
      console.error('Error in handleSaveProfile:', err);
      Alert.alert('Error', 'Terjadi kesalahan sistem.');
    } finally {
      setIsSaving(false);
    }
  };

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
    <View style={tw`flex-1 bg-white relative`}>
      <SafeAreaView style={tw`bg-[#2ea89c]`} edges={['top']} />
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
            tw`bg-white rounded-[32px] p-6 border border-gray-100 relative`,
            { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6 }
          ]}>
            {/* Edit Button in Top Right of Card */}
            <TouchableOpacity
              onPress={handleOpenEditModal}
              style={tw`absolute top-5 right-5 bg-[#eafaf8] px-3 py-1.5 rounded-full flex-row items-center border border-[#2ea89c]/20 z-10`}
              activeOpacity={0.7}
            >
              <Ionicons name="pencil-sharp" size={13} color="#2ea89c" style={tw`mr-1`} />
              <Text style={tw`text-[#2ea89c] text-xs font-bold`}>Edit</Text>
            </TouchableOpacity>
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

      {/* Modal Edit Informasi Pribadi */}
      <Modal
        visible={isEditModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={tw`flex-1 bg-black/50 justify-end`}>
          <View style={tw`bg-white rounded-t-[32px] p-6 max-h-[85%]`}>
            <View style={tw`flex-row justify-between items-center mb-5 border-b border-gray-100 pb-4`}>
              <Text style={tw`text-lg font-bold text-gray-800`}>Edit Informasi Pribadi</Text>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)} style={tw`p-1`}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
              {/* Edit Nama */}
              <View style={tw`mb-4`}>
                <Text style={tw`text-xs font-bold text-gray-500 mb-1.5`}>Nama Lengkap</Text>
                <View style={tw`border border-gray-200 rounded-xl px-3.5 py-3 bg-gray-50`}>
                  <TextInput
                    style={tw`text-sm font-medium text-gray-800 p-0`}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Nama Lengkap"
                  />
                </View>
              </View>

              {/* Edit Jenis Kelamin */}
              <View style={tw`mb-4`}>
                <Text style={tw`text-xs font-bold text-gray-500 mb-1.5`}>Jenis Kelamin</Text>
                <View style={tw`flex-row gap-3`}>
                  <TouchableOpacity
                    onPress={() => setEditGender('L')}
                    style={tw`flex-1 py-3 border rounded-xl items-center ${editGender === 'L' ? 'bg-[#eafaf8] border-[#2ea89c]' : 'bg-gray-50 border-gray-200'}`}
                  >
                    <Text style={tw`font-bold text-sm ${editGender === 'L' ? 'text-[#2ea89c]' : 'text-gray-600'}`}>Laki-laki</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setEditGender('P')}
                    style={tw`flex-1 py-3 border rounded-xl items-center ${editGender === 'P' ? 'bg-[#eafaf8] border-[#2ea89c]' : 'bg-gray-50 border-gray-200'}`}
                  >
                    <Text style={tw`font-bold text-sm ${editGender === 'P' ? 'text-[#2ea89c]' : 'text-gray-600'}`}>Perempuan</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Edit Tanggal Lahir */}
              <View style={tw`mb-4`}>
                <Text style={tw`text-xs font-bold text-gray-500 mb-1.5`}>Tanggal Lahir</Text>
                <View style={tw`flex-row gap-2 h-36 border border-gray-200 rounded-xl p-2 bg-gray-50`}>
                  {/* Hari */}
                  <View style={tw`flex-1 items-center`}>
                    <Text style={tw`text-[10px] font-bold text-gray-400 mb-1`}>Hari</Text>
                    <ScrollView nestedScrollEnabled={true} showsVerticalScrollIndicator={false} style={tw`w-full`}>
                      {DAYS.slice(0, getDaysInMonth(editMonth, editYear)).map((d) => (
                        <TouchableOpacity
                          key={d}
                          onPress={() => setEditDay(d)}
                          style={tw`py-1.5 items-center rounded-lg my-0.5 ${editDay === d ? 'bg-[#2ea89c]' : ''}`}
                        >
                          <Text style={tw`text-xs font-bold ${editDay === d ? 'text-white' : 'text-gray-700'}`}>{d}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                  {/* Bulan */}
                  <View style={tw`flex-[1.5] items-center`}>
                    <Text style={tw`text-[10px] font-bold text-gray-400 mb-1`}>Bulan</Text>
                    <ScrollView nestedScrollEnabled={true} showsVerticalScrollIndicator={false} style={tw`w-full`}>
                      {MONTHS.map((m) => (
                        <TouchableOpacity
                          key={m}
                          onPress={() => setEditMonth(m)}
                          style={tw`py-1.5 items-center rounded-lg my-0.5 ${editMonth === m ? 'bg-[#2ea89c]' : ''}`}
                        >
                          <Text style={tw`text-xs font-bold ${editMonth === m ? 'text-white' : 'text-gray-700'}`} numberOfLines={1}>{m}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                  {/* Tahun */}
                  <View style={tw`flex-1 items-center`}>
                    <Text style={tw`text-[10px] font-bold text-gray-400 mb-1`}>Tahun</Text>
                    <ScrollView nestedScrollEnabled={true} showsVerticalScrollIndicator={false} style={tw`w-full`}>
                      {YEARS.map((y) => (
                        <TouchableOpacity
                          key={y}
                          onPress={() => setEditYear(y)}
                          style={tw`py-1.5 items-center rounded-lg my-0.5 ${editYear === y ? 'bg-[#2ea89c]' : ''}`}
                        >
                          <Text style={tw`text-xs font-bold ${editYear === y ? 'text-white' : 'text-gray-700'}`}>{y}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              </View>

              {/* Edit Golongan Darah */}
              <View style={tw`mb-6`}>
                <Text style={tw`text-xs font-bold text-gray-500 mb-1.5`}>Golongan Darah</Text>
                <View style={tw`flex-row gap-2`}>
                  {['A', 'B', 'AB', 'O'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setEditBloodType(type)}
                      style={tw`flex-1 py-3 border rounded-xl items-center ${editBloodType === type ? 'bg-[#eafaf8] border-[#2ea89c]' : 'bg-gray-50 border-gray-200'}`}
                    >
                      <Text style={tw`font-bold text-sm ${editBloodType === type ? 'text-[#2ea89c]' : 'text-gray-600'}`}>{type}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Tombol Simpan & Batal */}
              <View style={tw`flex-row gap-3 mb-4`}>
                <TouchableOpacity
                  onPress={() => setIsEditModalVisible(false)}
                  style={tw`flex-1 py-3.5 border border-gray-300 rounded-xl items-center bg-gray-100`}
                >
                  <Text style={tw`font-bold text-gray-600`}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveProfile}
                  disabled={isSaving}
                  style={tw`flex-1 py-3.5 bg-[#2ea89c] rounded-xl items-center shadow-sm`}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={tw`font-bold text-white`}>Simpan</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

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
    </View>
  );
}
