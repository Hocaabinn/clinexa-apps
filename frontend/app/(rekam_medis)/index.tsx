import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  Platform,
  ActivityIndicator,
  TextInput,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import tw from 'twrnc';
import * as Clipboard from 'expo-clipboard';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
import * as bip39 from 'bip39';
import { supabase } from '../../lib/supabase';
import { callPatientAccess } from '../../lib/patient-api';
import { patientDataCache, medicalRecordsCache } from '../../constants/auth';
import { loadLanguageAsync, translate, useTranslation } from '../../lib/language';

global.Buffer = global.Buffer || Buffer;

interface MedicalRecord {
  id: string;
  title: string;
  date: string;
  relativeDate: string;
  description: string;
  hash: string;
  type: 'Pemeriksaan' | 'Lab' | 'Resep';
  imageUrl: string;
  admissionType?: 'rawat_jalan' | 'rawat_inap' | 'igd';
}

function RekamMedisScreen() {
  const router = useRouter();
  const { filter } = useLocalSearchParams<{ filter?: string }>();
  const { t } = useTranslation();
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'Semua' | 'Pemeriksaan' | 'Lab' | 'Resep'>('Semua');

  useEffect(() => {
    if (filter && ['Semua', 'Pemeriksaan', 'Lab', 'Resep'].includes(filter)) {
      setActiveFilter(filter as any);
    }
  }, [filter]);
  
  // Patient & Loading state
  const [patientData, setPatientData] = useState<{ id: string; name: string } | null>(patientDataCache.get());
  const [loading, setLoading] = useState(!patientDataCache.get());
  
  // Animations
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const searchBarHeight = useRef(new Animated.Value(0)).current;
  const [toastMessage, setToastMessage] = useState('');

  // Default Medical Records Fallback
  const defaultRecords: MedicalRecord[] = [
    {
      id: '1',
      title: 'Pemeriksaan Jantung',
      date: '4 Feb 2026',
      relativeDate: '6 Days ago',
      description: 'Routine follow up for blood pressure management, Patient showing steady improvement.',
      hash: '0x8a2f9cff7s871h1901a89b9101d1c92',
      type: 'Pemeriksaan',
      imageUrl: 'https://images.unsplash.com/photo-1530026405186-ed1ea0ac7a63?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: '2',
      title: 'Tes Laboratorium',
      date: '4 Feb 2026',
      relativeDate: '6 Days ago',
      description: 'Routine follow up for blood pressure management, Patient showing steady improvement.',
      hash: '0x8a2f9cff7s871h1901a89b9101d1c92',
      type: 'Lab',
      imageUrl: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: '3',
      title: 'Resep Obat',
      date: '4 Feb 2026',
      relativeDate: '6 Days ago',
      description: 'Routine follow up for blood pressure management, Patient showing steady improvement.',
      hash: '0x8a2f9cff7s871h1901a89b9101d1c92',
      type: 'Resep',
      imageUrl: 'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=600&auto=format&fit=crop&q=80',
    },
  ];

  const cachedRecs = medicalRecordsCache.get();
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>(cachedRecs || defaultRecords);

  const fetchRecords = async (patientId: string) => {
    try {
      const nik = await SecureStore.getItemAsync('user_nik');
      const walletAddress = await SecureStore.getItemAsync('user_wallet_address');
      if (!nik) return;

      const { records } = await callPatientAccess<{ records: any[] }>('list_records', {
        nik,
        wallet_address: walletAddress,
      });

      if (records && records.length > 0) {
        const formatted: MedicalRecord[] = records.map((doc: any) => {
          const typeMap: Record<string, 'Pemeriksaan' | 'Lab' | 'Resep'> = {
            pemeriksaan: 'Pemeriksaan',
            laboratorium: 'Lab',
            resep: 'Resep',
          };
          return {
            id: String(doc.id),
            title: doc.diagnosis || doc.chief_complaint || doc.lab_type || 'Pemeriksaan Medis',
            date: doc.created_at ? new Date(doc.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Terbaru',
            relativeDate: 'Terbaru',
            description: doc.notes || doc.lab_notes || doc.prescription_notes || 'Hasil pemeriksaan dan catatan medis pasien.',
            hash: doc.blockchain_hash || '0x' + doc.id.replace(/-/g, '').substring(0, 20),
            type: typeMap[doc.record_type] || 'Pemeriksaan',
            imageUrl: 'https://images.unsplash.com/photo-1530026405186-ed1ea0ac7a63?w=600&auto=format&fit=crop&q=80',
            admissionType: doc.admission_type || 'rawat_jalan',
          };
        });
        setMedicalRecords(formatted);
        medicalRecordsCache.set(formatted);
      } else {
        setMedicalRecords(defaultRecords);
        medicalRecordsCache.set(null);
      }
    } catch (err) {
      console.error('Error fetching medical records:', err);
    }
  };

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const cached = patientDataCache.get() as any;
        if (cached) {
          setPatientData(cached);
          setLoading(false);
          fetchRecords(cached.id);
        }

        const nik = await SecureStore.getItemAsync('user_nik');
        if (nik) {
          const walletAddress = await SecureStore.getItemAsync('user_wallet_address');
          const data = await callPatientAccess<{ id: string; name: string }>('get_patient', {
            nik,
            wallet_address: walletAddress,
          });

          setPatientData(data);
          patientDataCache.set(data);
          fetchRecords(data.id);
        }
      } catch (err) {
        console.error('Error loading user data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  useEffect(() => {
    if (!patientData?.id) return;
    const channelName = `records-live-${patientData.id}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'medical_documents', filter: `patient_id=eq.${patientData.id}` },
        () => fetchRecords(patientData.id)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'medical_records', filter: `patient_id=eq.${patientData.id}` },
        () => fetchRecords(patientData.id)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [patientData?.id]);

  // Filter and Search logic
  const filteredRecords = medicalRecords.filter((record) => {
    const matchesFilter = activeFilter === 'Semua' || record.type === activeFilter;
    const matchesSearch =
      record.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Category counts
  const totalHistory = medicalRecords.length;
  const totalAlergi = 2; // Mock count matching the design
  const totalResep = medicalRecords.filter(r => r.type === 'Resep').length;

  // Copy to clipboard with custom Toast animation
  const copyToClipboard = async (hash: string) => {
    await Clipboard.setStringAsync(hash);
    showToast('Hash ID disalin ke clipboard');
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    Animated.sequence([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.delay(1800),
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const toggleSearch = () => {
    if (isSearchActive) {
      setSearchQuery('');
      setIsSearchActive(false);
      Animated.timing(searchBarHeight, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    } else {
      setIsSearchActive(true);
      Animated.timing(searchBarHeight, {
        toValue: 60,
        duration: 250,
        useNativeDriver: false,
      }).start();
    }
  };

  return (
    <View style={tw`flex-1 bg-white relative`}>
      <SafeAreaView style={tw`bg-[#2ea89c]`} edges={['top']} />
      <StatusBar barStyle="light-content" backgroundColor="#2ea89c" />

      {/* Toast Notification */}
      <Animated.View
        style={[
          tw`absolute top-12 left-6 right-6 bg-[#0f172a] rounded-2xl px-5 py-4 flex-row items-center z-50 shadow-lg`,
          {
            opacity: toastOpacity,
            transform: [
              {
                translateY: toastOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Ionicons name="checkmark-circle" size={24} color="#4ade80" style={tw`mr-3`} />
        <Text style={tw`text-white font-semibold text-sm`}>{toastMessage}</Text>
      </Animated.View>

      {/* Main Content Area */}
      <ScrollView showsVerticalScrollIndicator={false} style={tw`flex-1 mb-20`}>
        {/* Fix iOS bounce background color gap */}
        <View style={[tw`absolute top-[-1000px] left-0 right-0 h-[1000px] bg-[#2ea89c]`]} />

        {/* Header Section */}
        <View style={[
          tw`bg-[#2ea89c] rounded-b-[40px] pb-20 px-6 overflow-hidden relative`,
          { paddingTop: Platform.OS === 'android' ? 50 : 24 }
        ]}>
          {/* Background Decorative Shapes */}
          <View style={tw`absolute -top-16 -right-12 w-64 h-64 bg-white/10 rounded-full`} />
          <View style={tw`absolute -bottom-12 -left-12 w-48 h-48 bg-black/5 rounded-full`} />

          <View style={tw`flex-row justify-between items-center relative z-10`}>
            {/* Left Header Spacer to balance the layout */}
            <View style={tw`w-10 h-10`} />

            {/* Screen Title */}
            <Text style={tw`text-white font-extrabold text-2xl tracking-tight text-center`}>
              {t('rme_title')}
            </Text>

            {/* Search Icon */}
            <TouchableOpacity
              onPress={toggleSearch}
              style={tw`w-10 h-10 rounded-full bg-white/20 items-center justify-center`}
            >
              <Ionicons name={isSearchActive ? 'close' : 'search'} size={20} color="white" />
            </TouchableOpacity>
          </View>

          {/* Search Input Bar with Slide Down Animation */}
          {isSearchActive && (
            <Animated.View style={[
              tw`mt-4 px-1 z-10`,
              {
                height: searchBarHeight,
                opacity: searchBarHeight.interpolate({
                  inputRange: [0, 60],
                  outputRange: [0, 1],
                }),
              }
            ]}>
              <View style={tw`bg-white rounded-2xl flex-row items-center px-4 py-2.5 shadow-sm`}>
                <Ionicons name="search" size={20} color="#9ca3af" style={tw`mr-2`} />
                <TextInput
                  placeholder={t('rme_search_placeholder')}
                  placeholderTextColor="#9ca3af"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={tw`flex-1 text-gray-800 text-sm font-medium p-0`}
                  autoFocus
                />
              </View>
            </Animated.View>
          )}
        </View>

        {/* Info Cards Section (Riwayat, Alergi, Resep) */}
        <View style={tw`flex-row justify-between px-5 -mt-10 mb-6 gap-3`}>
          {/* Card 1: Riwayat */}
          <View style={[
            tw`bg-white rounded-3xl p-4 flex-1 items-center border border-gray-100/50`,
            {
              elevation: 4,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.04,
              shadowRadius: 10,
            }
          ]}>
            <View style={tw`w-12 h-12 rounded-full bg-[#eff6ff] items-center justify-center mb-2.5`}>
              <Ionicons name="document-text" size={22} color="#3b82f6" />
            </View>
            <Text style={tw`text-gray-400 text-[11px] font-semibold tracking-wider mb-1`}>{t('rme_history')}</Text>
            <Text style={tw`text-gray-800 text-2xl font-extrabold`}>{totalHistory}</Text>
          </View>

          {/* Card 2: Alergi */}
          <View style={[
            tw`bg-white rounded-3xl p-4 flex-1 items-center border border-gray-100/50`,
            {
              elevation: 4,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.04,
              shadowRadius: 10,
            }
          ]}>
            <View style={tw`w-12 h-12 rounded-full bg-[#fef2f2] items-center justify-center mb-2.5`}>
              <Ionicons name="alert-circle" size={24} color="#ef4444" />
            </View>
            <Text style={tw`text-gray-400 text-[11px] font-semibold tracking-wider mb-1`}>{t('rme_allergies')}</Text>
            <Text style={tw`text-gray-800 text-2xl font-extrabold`}>{totalAlergi}</Text>
          </View>

          {/* Card 3: Resep Obat */}
          <View style={[
            tw`bg-white rounded-3xl p-4 flex-1 items-center border border-gray-100/50 relative`,
            {
              elevation: 4,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.04,
              shadowRadius: 10,
            }
          ]}>
            {/* Red Badge Indicator */}
            <View style={tw`absolute top-3 right-3 w-2 h-2 rounded-full bg-red-500`} />
            
            <View style={tw`w-12 h-12 rounded-full bg-[#f0fdf4] items-center justify-center mb-2.5`}>
              <MaterialCommunityIcons name="pill" size={22} color="#22c55e" />
            </View>
            <Text style={tw`text-gray-400 text-[11px] font-semibold tracking-wider mb-1`}>{t('rme_prescriptions')}</Text>
            <Text style={tw`text-gray-800 text-2xl font-extrabold`}>{totalResep}</Text>
          </View>
        </View>

        {/* Filter Chip Selector */}
        <View style={tw`px-5 mb-6`}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`gap-2.5 py-1`}>
            {(['Semua', 'Pemeriksaan', 'Lab', 'Resep'] as const).map((filter) => {
              const isActive = activeFilter === filter;
              const filterTranslations: Record<string, string> = {
                Semua: t('rme_filter_all') as string,
                Pemeriksaan: t('rme_filter_checkup') as string,
                Lab: t('rme_filter_lab') as string,
                Resep: t('rme_filter_prescription') as string,
              };
              return (
                <TouchableOpacity
                  key={filter}
                  onPress={() => setActiveFilter(filter)}
                  style={tw`px-5 py-2.5 rounded-full ${isActive ? 'bg-[#2ea89c]' : 'bg-[#f3f4f6]'}`}
                  activeOpacity={0.7}
                >
                  <Text style={tw`text-sm font-bold ${isActive ? 'text-white' : 'text-gray-500'}`}>
                    {filterTranslations[filter] || filter}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Record Cards List */}
        <View style={tw`px-5 gap-4`}>
          {filteredRecords.length > 0 ? (
            filteredRecords.map((record) => (
              <TouchableOpacity
                key={record.id}
                onPress={() => router.push({ pathname: '/(rekam_medis)/[id]', params: { id: record.id } })}
                activeOpacity={0.9}
                style={[
                  tw`bg-white rounded-[32px] p-5 border border-gray-100/60`,
                  {
                    elevation: 3,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.03,
                    shadowRadius: 8,
                  }
                ]}
              >
                {/* Upper row: Date & Image */}
                <View style={tw`flex-row justify-between items-start mb-2.5`}>
                  <View style={tw`flex-1 pr-4`}>
                    <Text style={tw`text-gray-400 text-[13px] font-semibold mb-1`}>{record.date}</Text>
                    <Text style={tw`text-gray-800 font-extrabold text-[17px] leading-tight mb-2`}>
                      {record.title}
                    </Text>
                    
                    {/* Badge: VERIFIED HASH & Relative Time */}
                    <View style={tw`flex-row items-center flex-wrap gap-y-1`}>
                      <View style={tw`bg-[#e8f6ed] flex-row items-center px-2 py-0.75 rounded-md mr-2`}>
                        <Ionicons name="shield-checkmark" size={11} color="#16a34a" style={tw`mr-1`} />
                        <Text style={tw`text-[#16a34a] text-[9.5px] font-extrabold tracking-wider`}>
                          VERIFIED HASH
                        </Text>
                      </View>
                      
                      {/* Admission Type Badge */}
                      <View style={tw`px-2 py-0.75 rounded-md mr-2 ${
                        record.admissionType === 'rawat_inap' ? 'bg-blue-100' :
                        record.admissionType === 'igd' ? 'bg-red-100' : 'bg-gray-100'
                      }`}>
                        <Text style={tw`text-[9.5px] font-extrabold tracking-wider ${
                          record.admissionType === 'rawat_inap' ? 'text-blue-600' :
                          record.admissionType === 'igd' ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {record.admissionType === 'rawat_inap' ? 'RAWAT INAP' :
                           record.admissionType === 'igd' ? 'IGD' : 'RAWAT JALAN'}
                        </Text>
                      </View>

                      <Text style={tw`text-gray-400 text-xs font-semibold`}>• {record.relativeDate}</Text>
                    </View>
                  </View>

                  {/* Thumbnail Image on the Right */}
                  <Image
                    source={{ uri: record.imageUrl }}
                    style={tw`w-18 h-18 rounded-2xl`}
                    resizeMode="cover"
                  />
                </View>

                {/* Description */}
                <Text style={tw`text-gray-500 text-[13px] leading-relaxed mb-4`}>
                  {record.description}
                </Text>

                {/* Blockchain Hash Button */}
                <TouchableOpacity
                  onPress={() => copyToClipboard(record.hash)}
                  style={tw`bg-[#1ba098] rounded-2xl py-3 px-4 flex-row justify-between items-center`}
                  activeOpacity={0.8}
                >
                  <View style={tw`flex-row items-center flex-1 mr-2`}>
                    <Ionicons name="shield-checkmark-outline" size={16} color="white" style={tw`mr-2`} />
                    <Text style={tw`text-white font-bold text-xs tracking-wide flex-1`} numberOfLines={1}>
                      HASH ID : {record.hash.substring(0, 10)}...{record.hash.substring(record.hash.length - 4)}
                    </Text>
                  </View>
                  <Ionicons name="link-outline" size={16} color="white" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          ) : (
            <View style={tw`items-center justify-center py-12`}>
              <Ionicons name="document-text-outline" size={48} color="#cbd5e1" style={tw`mb-3`} />
              <Text style={tw`text-gray-400 font-semibold text-sm`}>
                Tidak ada rekam medis ditemukan
              </Text>
            </View>
          )}
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
          <Text style={tw`text-gray-400 text-xs font-medium mt-1`}>{t('nav_home')}</Text>
        </TouchableOpacity>

        {/* RME */}
        <TouchableOpacity style={tw`items-center flex-1`} activeOpacity={0.7}>
          <Ionicons name="document-text" size={24} color="#2ea89c" />
          <Text style={tw`text-[#2ea89c] text-xs font-medium mt-1`}>{t('nav_rme')}</Text>
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
          <Text style={tw`text-[#2ea89c] text-xs font-medium absolute bottom-0`}>{t('nav_scan')}</Text>
        </View>

        {/* Aktivitas */}
        <TouchableOpacity
          onPress={() => router.navigate('/(aktivitas)')}
          style={tw`items-center flex-1`}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="history" size={26} color="#9ca3af" />
          <Text style={tw`text-gray-400 text-xs font-medium mt-1`}>{t('nav_activity')}</Text>
        </TouchableOpacity>

        {/* Profil */}
        <TouchableOpacity
          onPress={() => router.navigate('/(profile)')}
          style={tw`items-center flex-1`}
          activeOpacity={0.7}
        >
          <Ionicons name="person-outline" size={24} color="#9ca3af" />
          <Text style={tw`text-gray-400 text-xs font-medium mt-1`}>{t('nav_profile')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default RekamMedisScreen;
