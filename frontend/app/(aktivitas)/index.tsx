import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
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
import { callPatientAccess } from '../../lib/patient-api';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../lib/language';

interface ActivityItem {
  id: string;
  doctorName: string;
  institution: string;
  specialization: string;
  status: 'approved' | 'pending' | 'rejected' | 'expired';
  date: string;
  time: string;
  type: string;
  expiresAt?: string | null;
}

export default function RiwayatAktivitasScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [stats, setStats] = useState({
    aktif: 0,
    menunggu: 0,
    ditolak: 0
  });

  const fetchActivities = async () => {
    try {
      const nik = await SecureStore.getItemAsync('user_nik');
      const walletAddress = await SecureStore.getItemAsync('user_wallet_address');
      if (!nik) {
        setLoading(false);
        return;
      }

      const { records } = await callPatientAccess<{ records: any[] }>('list_records', {
        nik,
        wallet_address: walletAddress,
      });

      if (records) {
        let activeCount = 0;
        let pendingCount = 0;
        let deniedCount = 0;

        const formatted: ActivityItem[] = records.map((doc: any) => {
          const isExpired = doc.consent_expires_at ? new Date(doc.consent_expires_at) < new Date() : false;
          const status = isExpired ? 'expired' : (doc.consent_status || 'pending');

          if (status === 'approved') activeCount++;
          else if (status === 'pending') pendingCount++;
          else if (status === 'rejected' || status === 'expired') deniedCount++;

          const dateObj = doc.created_at ? new Date(doc.created_at) : new Date();
          const typeMap: Record<string, string> = {
            pemeriksaan: 'Pemeriksaan Umum',
            laboratorium: 'Tes Lab',
            resep: 'Resep Obat'
          };

          return {
            id: doc.id,
            doctorName: doc.staff?.name || 'Dr. Agung Setya',
            institution: doc.staff?.institution || 'RS Semen Gresik',
            specialization: doc.staff?.specialization || 'Dokter Umum',
            status: status as any,
            date: dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
            time: dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            type: typeMap[doc.record_type] || 'Rekam Medis',
            expiresAt: doc.consent_expires_at,
          };
        });

        setActivities(formatted);
        setStats({
          aktif: activeCount,
          menunggu: pendingCount,
          ditolak: deniedCount
        });
      }
    } catch (err: any) {
      console.error('Error fetching activities:', err);
      Alert.alert('Error', 'Gagal mengambil riwayat aktivitas.');
    } finally {
      setLoading(false);
    }
  };

  // Tick state to force re-render for countdowns
  const [tick, setTick] = useState(0);

  useEffect(() => {
    fetchActivities();
    const interval = setInterval(() => {
      setTick(t => t + 1);
      
      // Check if any active approved item has expired, if so, trigger refetch to update UI automatically
      setActivities((prevActivities) => {
        let hasChanges = false;
        const nextActivities = prevActivities.map(item => {
          if (item.status === 'approved' && item.expiresAt) {
            const isNowExpired = new Date(item.expiresAt) < new Date();
            if (isNowExpired) {
              hasChanges = true;
              return { ...item, status: 'expired' as const };
            }
          }
          return item;
        });
        if (hasChanges) {
          // Re-fetch from DB to sync backend state as well
          setTimeout(() => fetchActivities(), 100);
        }
        return nextActivities;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const executeUpdateConsent = async (recordId: string, nextStatus: 'approved' | 'rejected') => {
    try {
      setUpdatingId(recordId);
      const nik = await SecureStore.getItemAsync('user_nik');
      const walletAddress = await SecureStore.getItemAsync('user_wallet_address');
      if (!nik) return;

      await callPatientAccess('update_consent', {
        nik: nik.trim(),
        wallet_address: walletAddress,
        record_id: recordId,
        consent_status: nextStatus,
        consent_duration_type: '60_min' // Set to 60_min (which is 2 mins in test mode) so it generates a countdown timer
      });

      // Refresh list setelah berhasil
      await fetchActivities();
      Alert.alert(
        t('act_alert_success') as string,
        nextStatus === 'approved'
          ? t('act_alert_success_approved') as string
          : t('act_alert_success_rejected') as string
      );
    } catch (err: any) {
      console.error('Failed to update consent:', err);
      Alert.alert('Error', 'Gagal memperbarui status akses: ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUpdateConsent = (recordId: string, nextStatus: 'approved' | 'rejected') => {
    const isApprove = nextStatus === 'approved';
    Alert.alert(
      isApprove ? t('act_alert_title_approve') as string : t('act_alert_title_cancel') as string,
      isApprove 
        ? t('act_alert_body_approve') as string
        : t('act_alert_body_cancel') as string,
      [
        { text: t('act_alert_btn_cancel') as string, style: 'cancel' },
        { 
          text: isApprove ? t('act_alert_btn_approve') as string : t('act_alert_btn_yes_cancel') as string, 
          style: isApprove ? 'default' : 'destructive',
          onPress: () => executeUpdateConsent(recordId, nextStatus)
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
          tw`bg-[#2ea89c] rounded-b-[40px] pb-20 px-6 overflow-hidden relative`,
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
              {t('act_title')}
            </Text>

            {/* Refresh Button */}
            <TouchableOpacity
              onPress={fetchActivities}
              style={tw`w-10 h-10 rounded-full bg-white/20 items-center justify-center`}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Status Counters Card */}
        <View style={tw`px-5 -mt-10 mb-8`}>
          <View style={[
            tw`bg-white rounded-[28px] py-5 px-3 flex-row justify-between items-center`,
            Platform.OS === 'ios' ? tw`shadow-sm` : tw`shadow-md`,
            { elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8 }
          ]}>
            {/* Aktif Counter */}
            <View style={tw`flex-1 items-center border-r border-gray-100`}>
              <Text style={tw`text-[#16a34a] text-xs font-bold mb-1`}>{t('act_status_active')}</Text>
              <Text style={tw`text-[#16a34a] text-2xl font-extrabold`}>{stats.aktif}</Text>
            </View>

            {/* Menunggu Counter */}
            <View style={tw`flex-1 items-center border-r border-gray-100`}>
              <Text style={tw`text-[#ff9f1c] text-xs font-bold mb-1`}>{t('act_status_pending')}</Text>
              <Text style={tw`text-[#ff9f1c] text-2xl font-extrabold`}>{stats.menunggu}</Text>
            </View>

            {/* Ditolak Counter */}
            <View style={tw`flex-1 items-center`}>
              <Text style={tw`text-[#ef4444] text-xs font-bold mb-1`}>{t('act_status_rejected')}</Text>
              <Text style={tw`text-[#ef4444] text-2xl font-extrabold`}>{stats.ditolak}</Text>
            </View>
          </View>
        </View>

        {/* Activity Cards List */}
        <View style={tw`px-5 gap-6`}>
          {loading ? (
            <ActivityIndicator size="large" color="#2ea89c" style={tw`py-10`} />
          ) : activities.length === 0 ? (
            <View style={tw`py-10 items-center justify-center`}>
              <Ionicons name="document-text-outline" size={48} color="#cbd5e1" style={tw`mb-2`} />
              <Text style={tw`text-gray-400 font-semibold`}>{t('act_empty')}</Text>
            </View>
          ) : (
            activities.map((item) => (
              <View key={item.id} style={[
                tw`bg-white rounded-[32px] p-5 border border-gray-100/60`,
                { elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.01, shadowRadius: 3 }
              ]}>
                <View style={tw`flex-row justify-between items-start mb-4`}>
                  <View style={tw`flex-row items-center flex-1 pr-2`}>
                     <View style={tw`w-12 h-12 rounded-full ${item.status === 'approved' ? 'bg-[#dcfce7]' : item.status === 'pending' ? 'bg-[#fff5e6]' : 'bg-[#fef2f2]'} items-center justify-center mr-3.5`}>
                      <MaterialCommunityIcons 
                        name={item.status === 'approved' ? 'briefcase-plus' : item.status === 'pending' ? 'shield-lock-outline' : 'shield-alert-outline'} 
                        size={22} 
                        color={item.status === 'approved' ? '#16a34a' : item.status === 'pending' ? '#ff9f1c' : '#ef4444'} 
                      />
                     </View>
                    <View style={tw`flex-1`}>
                      <Text style={tw`text-gray-800 font-extrabold text-base mb-1`}>{item.doctorName}</Text>
                      <Text style={tw`text-gray-400 text-sm font-semibold`}>{item.institution} • {item.specialization}</Text>
                    </View>
                  </View>
                  <View style={[
                    tw`px-3 py-1 rounded-full border`, 
                    item.status === 'approved' ? tw`border-[#22c55e] bg-[#e8fbf1]` : item.status === 'pending' ? tw`border-[#ff9f1c] bg-[#fffbf0]` : tw`border-[#ef4444] bg-[#fdf2f2]`
                  ]}>
                    <Text style={[
                      tw`text-[10px] font-bold`, 
                      item.status === 'approved' ? tw`text-[#22c55e]` : item.status === 'pending' ? tw`text-[#ff9f1c]` : tw`text-[#ef4444]`
                    ]}>
                      {item.status === 'approved' ? t('act_card_status_approved') : item.status === 'pending' ? t('act_card_status_pending') : item.status === 'expired' ? t('act_card_status_expired') : t('act_card_status_rejected')}
                    </Text>
                  </View>
                </View>

                 {/* Duration/Detail info row */}
                 <View style={tw`bg-[#f8fafc] rounded-2xl py-3 px-4 flex-row justify-between items-center mb-4`}>
                   <View style={tw`flex-row items-center flex-1 pr-2`}>
                     <Ionicons name="time-outline" size={15} color="#64748b" style={tw`mr-1.5`} />
                     <View>
                       <Text style={tw`text-gray-500 text-xs font-semibold`}>{item.date} • {item.time}</Text>
                       {item.status === 'approved' && item.expiresAt && (() => {
                         const diff = new Date(item.expiresAt).getTime() - Date.now();
                         if (diff > 0) {
                           const mins = Math.floor(diff / 60000);
                           const secs = Math.floor((diff % 60000) / 1000);
                           const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                           return (
                             <Text style={tw`text-[#ff9f1c] text-[11px] font-bold mt-0.5`}>
                               {t('act_time_remaining')}: {timeStr}
                             </Text>
                           );
                         }
                         return null;
                       })()}
                     </View>
                   </View>
                   <View style={tw`flex-row items-center`}>
                     <Ionicons name="lock-closed-outline" size={14} color="#64748b" style={tw`mr-1`} />
                     <Text style={tw`text-gray-500 text-xs font-semibold`}>{item.type}</Text>
                   </View>
                 </View>

                {/* Action Buttons */}
                {updatingId === item.id ? (
                  <ActivityIndicator size="small" color="#2ea89c" style={tw`py-2`} />
                ) : (
                  <>
                    {item.status === 'pending' && (
                      <View style={tw`flex-row gap-3`}>
                        <TouchableOpacity
                          style={tw`flex-1 border border-[#ef4444] py-3 rounded-2xl flex-row items-center justify-center`}
                          onPress={() => handleUpdateConsent(item.id, 'rejected')}
                        >
                          <Ionicons name="close-circle-outline" size={18} color="#ef4444" style={tw`mr-2`} />
                          <Text style={tw`text-[#ef4444] font-extrabold text-sm`}>{t('act_btn_reject')}</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={tw`flex-1 bg-[#1ba39a] py-3 rounded-2xl flex-row items-center justify-center`}
                          onPress={() => handleUpdateConsent(item.id, 'approved')}
                        >
                          <Ionicons name="checkmark-circle-outline" size={18} color="white" style={tw`mr-2`} />
                          <Text style={tw`text-white font-extrabold text-sm`}>{t('act_btn_approve')}</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {item.status === 'approved' && (
                      <TouchableOpacity
                        style={tw`bg-[#ef4444] py-3.5 rounded-2xl flex-row items-center justify-center`}
                        onPress={() => handleUpdateConsent(item.id, 'rejected')}
                      >
                        <Ionicons name="close-circle-outline" size={18} color="white" style={tw`mr-2`} />
                        <Text style={tw`text-white font-extrabold text-sm`}>{t('act_btn_cancel')}</Text>
                      </TouchableOpacity>
                    )}

                    {(item.status === 'rejected' || item.status === 'expired') && (
                      <TouchableOpacity
                        style={tw`bg-[#1ba39a] py-3.5 rounded-2xl flex-row items-center justify-center`}
                        onPress={() => handleUpdateConsent(item.id, 'approved')}
                      >
                        <Ionicons name="checkmark-circle-outline" size={18} color="white" style={tw`mr-2`} />
                        <Text style={tw`text-white font-extrabold text-sm`}>{t('act_btn_grant_again')}</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            ))
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
        <TouchableOpacity
          onPress={() => router.navigate('/(rekam_medis)')}
          style={tw`items-center flex-1`}
          activeOpacity={0.7}
        >
          <Ionicons name="document-text-outline" size={24} color="#9ca3af" />
          <Text style={tw`text-gray-400 text-xs font-medium mt-1`}>{t('nav_rme')}</Text>
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
        <TouchableOpacity style={tw`items-center flex-1`} activeOpacity={0.7}>
          <MaterialCommunityIcons name="history" size={26} color="#2ea89c" />
          <Text style={tw`text-[#2ea89c] text-xs font-medium mt-1`}>{t('nav_activity')}</Text>
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
