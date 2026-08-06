import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StatusBar, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import tw from 'twrnc';
import { useRouter, useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
import * as bip39 from 'bip39';
import { supabase } from '../../lib/supabase';
import { callPatientAccess } from '../../lib/patient-api';
import { patientDataCache, medicalRecordsCache } from '../../constants/auth';

global.Buffer = global.Buffer || Buffer;

export default function DashboardIndex() {
  const router = useRouter();
  const [patientData, setPatientData] = useState<{ id: string, name: string } | null>(patientDataCache.get());
  const [loading, setLoading] = useState(!patientDataCache.get());

  const greeting = React.useMemo(() => {
    const hour = new Date().getHours();
    const isNight = hour >= 18 || hour < 5;
    const isAfternoon = hour >= 12 && hour < 18;

    let greetingsList = [];
    if (isNight) {
      greetingsList = [
        "Selamat Malam",
        "Halo apa kabar",
        "Salam Sehat",
        "Selamat Beristirahat",
        "Mimpi indah ya",
        "Sehat Selalu",
        "Semoga Sehat Selalu"
      ];
    } else if (isAfternoon) {
      greetingsList = [
        "Selamat Siang",
        "Selamat Sore",
        "Halo gimana kabarnya",
        "Salam Sehat",
        "Selamat Beraktivitas",
        "Hai",
        "Sehat Selalu"
      ];
    } else {
      greetingsList = [
        "Selamat Pagi",
        "Semangat Pagi",
        "Halo",
        "Salam Sehat",
        "Selamat Beraktivitas",
        "Hai",
        "Sehat Selalu"
      ];
    }

    const day = new Date().getDate();
    return greetingsList[day % greetingsList.length];
  }, []);

  // Medical visits state
  const defaultVisits = [
    { id: '1', rs: 'RS Pondok Indah', doctor: 'dr. Sarah Wijaya, Sp.PD', title: 'Pemeriksaan Rutin' },
    { id: '2', rs: 'RS Janadra', doctor: 'dr. Luna Jaya, Sp.PD', title: 'Konsultasi Spesialis' },
    { id: '3', rs: 'Klinik Hamil Sehat', doctor: 'dr. Soetomo, Sp.PD', title: 'Cek Kesehatan' },
    { id: '4', rs: 'RS Pondok Indah', doctor: 'dr. Sarah Wijaya, Sp.PD', title: 'Pemeriksaan Jantung' },
  ];
  const [visits, setVisits] = useState<Array<{ id: string; rs: string; doctor: string; title?: string; date?: string }>>(defaultVisits);
  const [loadingVisits, setLoadingVisits] = useState(true);

  const fetchMedicalVisits = async (patientId: string) => {
    try {
      // 1. Check cache first to display instantly
      const cached = medicalRecordsCache.get();
      if (cached && cached.length > 0) {
        const formattedVisits = cached.map((doc: any) => ({
          id: String(doc.id),
          rs: doc.rs || doc.staff?.institution || 'Fasilitas Kesehatan',
          doctor: doc.doctor || doc.staff?.name || 'Dokter',
          title: doc.title || doc.diagnosis || doc.chief_complaint || doc.lab_type || 'Pemeriksaan Medis',
          date: doc.date || (doc.created_at ? new Date(doc.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : ''),
        }));
        setVisits(formattedVisits);
        setLoadingVisits(false);
      } else {
        setLoadingVisits(true);
      }

      const nik = await SecureStore.getItemAsync('user_nik');
      const walletAddress = await SecureStore.getItemAsync('user_wallet_address');
      if (!nik) return;

      const { records } = await callPatientAccess<{ records: any[] }>('list_records', {
        nik,
        wallet_address: walletAddress,
      });

      if (records && records.length > 0) {
        const formattedVisits = records.map((doc: any) => ({
          id: String(doc.id),
          rs: doc.staff?.institution || 'Fasilitas Kesehatan',
          doctor: doc.staff?.name || 'Dokter',
          title: doc.diagnosis || doc.chief_complaint || doc.lab_type || 'Pemeriksaan Medis',
          date: doc.created_at ? new Date(doc.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : (doc.date || ''),
        }));
        setVisits(formattedVisits);

        // Update global cache so the RME screen also gets it instantly
        const formattedRecords = records.map((doc: any) => {
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
          };
        });
        medicalRecordsCache.set(formattedRecords);
      } else {
        setVisits(defaultVisits);
      }
    } catch (err) {
      console.error("Error fetching medical visits:", err);
      if (!medicalRecordsCache.get()) {
        setVisits(defaultVisits);
      }
    } finally {
      setLoadingVisits(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const loadUserData = async () => {
        try {
          const cached = patientDataCache.get() as any;
          if (cached) {
            setPatientData(cached);
            if (cached.avatar_url) {
              setProfileImage(cached.avatar_url);
            } else {
              setProfileImage(`https://api.dicebear.com/7.x/initials/png?seed=${cached.name}&backgroundColor=0b4771,1ba39a`);
            }
          }

          const nik = await SecureStore.getItemAsync('user_nik');
          if (nik) {
            const walletAddress = await SecureStore.getItemAsync('user_wallet_address');
            const data = await callPatientAccess<any>('get_patient', {
              nik,
              wallet_address: walletAddress,
            });

            setPatientData(data);
            patientDataCache.set(data);
            if (data.avatar_url) {
              setProfileImage(data.avatar_url);
              if (Platform.OS === 'web') {
                localStorage.setItem('user_profile_image', data.avatar_url);
              } else {
                await SecureStore.setItemAsync('user_profile_image', data.avatar_url);
              }
            } else {
              setProfileImage(`https://api.dicebear.com/7.x/initials/png?seed=${data.name}&backgroundColor=0b4771,1ba39a`);
            }
            fetchMedicalVisits(data.id);
          }
        } catch (err) {
          console.error("Error loading user data:", err);
        } finally {
          setLoading(false);
        }
      };

      loadUserData();
    }, [])
  );

  // Setup Realtime Subscription for instant medical record updates when doctor inputs data
  useEffect(() => {
    if (!patientData?.id) return;

    const channelName = `patient-records-${patientData.id}`;
    
    // Safety check to remove any channel with the same name if it exists in Supabase client cache
    const existing = supabase.getChannels().find(c => c.topic === `realtime:${channelName}`);
    if (existing) {
      supabase.removeChannel(existing);
    }

    const channel = supabase.channel(channelName);

    channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'medical_documents', filter: `patient_id=eq.${patientData.id}` },
        () => {
          fetchMedicalVisits(patientData.id);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'medical_records', filter: `patient_id=eq.${patientData.id}` },
        () => {
          fetchMedicalVisits(patientData.id);
        }
      );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [patientData?.id]);

  const [profileImage, setProfileImage] = useState<string>('https://api.dicebear.com/7.x/initials/png?seed=User&backgroundColor=0b4771,1ba39a');



  return (
    <View style={tw`flex-1 bg-white relative`}>
      <SafeAreaView style={tw`bg-[#2ea89c]`} edges={['top']} />
      <StatusBar barStyle="light-content" backgroundColor="#2ea89c" />

      {/* Konten Utama */}
      <ScrollView showsVerticalScrollIndicator={false} style={tw`flex-1 mb-20`}>
        {/* Fix iOS bounce background color gap */}
        <View style={[tw`absolute top-[-1000px] left-0 right-0 h-[1000px] bg-[#2ea89c]`]} />

        {/* Header Section */}
        <View style={[tw`bg-[#2ea89c] rounded-b-[40px] pb-20 px-6 overflow-hidden relative`, { paddingTop: Platform.OS === 'android' ? 50 : 24 }]}>
          {/* Decorative Background Shapes */}
          <View style={tw`absolute -top-16 -right-12 w-64 h-64 bg-white/10 rounded-full`} />
          <View style={tw`absolute -bottom-12 -left-12 w-48 h-48 bg-black/5 rounded-full`} />

          <View style={tw`flex-row justify-between items-center relative z-10`}>
            <View style={tw`flex-row items-center`}>
              <TouchableOpacity onPress={() => router.navigate('/(profile)')} style={tw`shadow-sm rounded-full bg-white/20 p-1 mr-4`}>
                <Image
                  source={{ uri: profileImage }}
                  style={tw`w-14 h-14 rounded-full border-2 border-white`}
                />
              </TouchableOpacity>
              <View>
                <Text style={tw`text-white/90 text-sm font-medium mb-1 tracking-wide`}>{greeting}</Text>
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" style={tw`self-start mt-1`} />
                ) : (
                  <Text style={tw`text-white font-extrabold text-2xl tracking-tight`}>{patientData?.name || 'User'}</Text>
                )}
              </View>
            </View>
            <TouchableOpacity style={tw`bg-white w-11 h-11 rounded-full items-center justify-center shadow-sm`}>
              <Ionicons name="notifications-outline" size={22} color="#2ea89c" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Account ID Card */}
        <View style={tw`px-5 -mt-10 mb-8`}>
          <View style={[
            tw`bg-[#2ea89c] rounded-3xl p-6 flex-row justify-between items-start`,
            Platform.OS === 'ios' ? tw`shadow-sm` : tw`shadow-md`,
            { elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 10 }
          ]}>
            <View style={tw`flex-1 pr-2`}>
              <Text style={tw`text-white/70 text-xs font-bold tracking-wider mb-2`}>ACCOUNT ID</Text>
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" style={tw`self-start mt-1`} />
              ) : (
                <>
                  <Text style={tw`text-white text-sm font-medium tracking-wide`} numberOfLines={1} ellipsizeMode="middle">{patientData?.id || '...'}</Text>
                </>
              )}
            </View>
            <View style={tw`bg-white/20 px-3 py-1.5 rounded-full flex-row items-center ml-2 mt-1`}>
              <View style={tw`w-2 h-2 rounded-full bg-[#4ade80] mr-1.5`} />
              <Text style={tw`text-white text-xs font-bold`}>Terverifikasi</Text>
            </View>
          </View>
        </View>
        {/* White content area below header */}
        <View style={tw`bg-white rounded-t-[30px] -mt-2 pt-6 pb-4`}>
          {/* Layanan Cepat */}
          <View style={tw`px-6 mb-8`}>
            <Text style={tw`text-xl font-bold text-gray-800 mb-5`}>Layanan Cepat</Text>
            <View style={tw`flex-row gap-4`}>
              {/* Left Large Card */}
              <TouchableOpacity
                onPress={() => router.navigate({ pathname: '/(rekam_medis)', params: { filter: 'Semua' } })}
                style={[
                  tw`bg-[#f0fafa] rounded-3xl p-5 flex-1 justify-between min-h-[160px]`,
                  Platform.OS === 'ios' ? tw`shadow-sm` : tw`shadow-md`,
                  { elevation: 3, shadowColor: '#1e615e', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8 }
                ]}
                activeOpacity={0.8}
              >
                <View style={tw`w-12 h-12 rounded-full bg-[#1e615e] items-center justify-center mb-6 mt-1 ml-1`}>
                  <MaterialCommunityIcons name="medical-bag" size={24} color="white" />
                </View>
                <Text style={tw`text-[#1e615e] font-bold text-base leading-tight pr-2`}>
                  Hasil Rekam Medis Terkini
                </Text>
              </TouchableOpacity>

              {/* Right Smaller Cards */}
              <View style={tw`flex-1 gap-4`}>
                <TouchableOpacity
                  onPress={() => router.navigate({ pathname: '/(rekam_medis)', params: { filter: 'Resep' } })}
                  style={[
                    tw`bg-[#f5fbf6] rounded-3xl p-4 flex-row items-center flex-1`,
                    Platform.OS === 'ios' ? tw`shadow-sm` : tw`shadow-md`,
                    { elevation: 2, shadowColor: '#348b48', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 6 }
                  ]}
                  activeOpacity={0.8}
                >
                  <View style={tw`w-10 h-10 rounded-full bg-[#e4f5e9] items-center justify-center mr-3`}>
                    <MaterialCommunityIcons name="pill" size={20} color="#348b48" />
                  </View>
                  <Text style={tw`text-[#348b48] font-bold text-sm flex-1`}>Resep Obat</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.navigate({ pathname: '/(rekam_medis)', params: { filter: 'Lab' } })}
                  style={[
                    tw`bg-[#fff7f5] rounded-3xl p-4 flex-row items-center flex-1`,
                    Platform.OS === 'ios' ? tw`shadow-sm` : tw`shadow-md`,
                    { elevation: 2, shadowColor: '#b14e4e', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 6 }
                  ]}
                  activeOpacity={0.8}
                >
                  <View style={tw`w-10 h-10 rounded-full bg-[#ffecec] items-center justify-center mr-3`}>
                    <MaterialCommunityIcons name="flask-outline" size={20} color="#b14e4e" />
                  </View>
                  <Text style={tw`text-[#b14e4e] font-bold text-sm flex-1`}>Hasil Lab</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Kunjungan Terakhir */}
          <View style={tw`px-6 mb-8`}>
            <View style={tw`flex-row justify-between items-center mb-5`}>
              <Text style={tw`text-xl font-bold text-gray-800`}>Kunjungan Terakhir</Text>
              <TouchableOpacity onPress={() => router.navigate('/(rekam_medis)')}>
                <Text style={tw`text-[#2ea89c] font-bold text-sm`}>Lihat semua</Text>
              </TouchableOpacity>
            </View>

            {/* List Kunjungan */}
            {loadingVisits ? (
              <ActivityIndicator size="small" color="#2ea89c" style={tw`py-6`} />
            ) : (
              visits.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => router.navigate({ pathname: '/(rekam_medis)', params: { id: item.id } })}
                  style={tw`bg-white border border-gray-100 rounded-3xl p-4 mb-3 flex-row items-center shadow-sm`}
                  activeOpacity={0.7}
                >
                  <View style={tw`w-14 h-14 rounded-2xl bg-[#eafaf8] items-center justify-center mr-4`}>
                    <MaterialCommunityIcons name="stethoscope" size={26} color="#2ea89c" />
                  </View>
                  <View style={tw`flex-1`}>
                    <Text style={tw`font-bold text-gray-800 text-base mb-1`}>{item.rs}</Text>
                    <Text style={tw`text-gray-500 text-sm`}>{item.doctor}</Text>
                    {item.date ? (
                      <Text style={tw`text-[#2ea89c] text-xs font-medium mt-1`}>{item.date}</Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View style={[
        tw`absolute bottom-0 w-full bg-white flex-row justify-between items-end px-6 pb-6 pt-3 border-t border-gray-100`,
        { elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 10 }
      ]}>
        {/* Beranda */}
        <TouchableOpacity style={tw`items-center flex-1`}>
          <Ionicons name="home" size={24} color="#2ea89c" />
          <Text style={tw`text-[#2ea89c] text-xs font-medium mt-1`}>Beranda</Text>
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
        <TouchableOpacity
          onPress={() => router.navigate('/(profile)')}
          style={tw`items-center flex-1`}
          activeOpacity={0.7}
        >
          <Ionicons name="person-outline" size={24} color="#9ca3af" />
          <Text style={tw`text-gray-400 text-xs font-medium mt-1`}>Profil</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}
