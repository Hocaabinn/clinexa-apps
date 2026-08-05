import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import tw from 'twrnc';
import { supabase } from '../../../lib/supabase';

const { width } = Dimensions.get('window');

interface MedicalNotification {
  id: string;
  patient_name: string;
  record_id: string;
  record_type: string;
  consent_status: 'approved' | 'rejected' | 'pending';
  created_at: string;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<MedicalNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const isMobile = width < 640;
  const isTablet = width >= 640 && width < 1024;

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('medical_records')
        .select('id, consent_status, record_type, created_at, patients(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const formatted: MedicalNotification[] = data.map((item: any) => ({
          id: item.id,
          patient_name: item.patients?.name || 'Pasien',
          record_id: item.id.substring(0, 8).toUpperCase(),
          record_type: item.record_type,
          consent_status: item.consent_status,
          created_at: item.created_at
        }));
        setNotifications(formatted);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const channelName = `notifications-realtime-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'medical_records' },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getNotificationDetails = (notif: MedicalNotification) => {
    const typeLabel = notif.record_type === 'pemeriksaan' ? 'Pemeriksaan' : notif.record_type === 'laboratorium' ? 'Tes Lab' : 'Resep Obat';
    switch (notif.consent_status) {
      case 'approved':
        return {
          title: 'Akses Rekam Medis Disetujui',
          message: `Pasien ${notif.patient_name} telah MENYETUJUI permintaan akses data ${typeLabel} (${notif.record_id}).`,
          color: 'text-[#16a34a]',
          bg: 'bg-[#e8fbf1]',
          icon: 'checkmark-circle-outline' as any
        };
      case 'rejected':
        return {
          title: 'Akses Rekam Medis Dibatalkan/Ditolak',
          message: `Pasien ${notif.patient_name} telah MENOLAK/MEMBATALKAN permintaan akses data ${typeLabel} (${notif.record_id}).`,
          color: 'text-[#ef4444]',
          bg: 'bg-[#fdf2f2]',
          icon: 'close-circle-outline' as any
        };
      case 'pending':
      default:
        return {
          title: 'Permintaan Akses Baru Dikirim',
          message: `Permintaan akses baru untuk data ${typeLabel} (${notif.record_id}) milik pasien ${notif.patient_name} sedang MENUNGGU konfirmasi.`,
          color: 'text-[#ff9f1c]',
          bg: 'bg-[#fffbf0]',
          icon: 'paper-plane-outline' as any
        };
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const minutes = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 60000);
    if (minutes < 1) return 'Baru saja';
    if (minutes < 60) return `${minutes} menit lalu`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} jam lalu`;
    const days = Math.floor(hours / 24);
    return `${days} hari lalu`;
  };

  return (
    <ScrollView
      style={[tw`flex-1 bg-[#f4f6f8]`, tw`${isMobile ? 'px-4 py-5' : isTablet ? 'px-6 py-6' : 'px-10 py-8'}`]}
      contentContainerStyle={tw`pb-20`}
    >
      {/* Header */}
      <View style={[tw`mb-10`, isMobile ? tw`items-stretch gap-4` : tw`flex-row justify-between items-center`]}>
        <View>
          <Text style={tw`text-[#0b4771] ${isMobile ? 'text-2xl' : 'text-3xl'} font-semibold mb-2`}>Notifikasi</Text>
          <Text style={tw`text-[#6d7f95] text-sm font-light`}>
            Pemberitahuan aktivitas persetujuan rekam medis secara real-time.
          </Text>
        </View>

        <TouchableOpacity
          style={tw`bg-white border border-[#e2e8f0] px-4 py-3 rounded-xl flex-row items-center justify-center`}
          onPress={fetchNotifications}
        >
          <Ionicons name="refresh-outline" size={20} color="#0b4771" />
          {isMobile && <Text style={tw`text-[#0b4771] font-semibold ml-2`}>Refresh</Text>}
        </TouchableOpacity>
      </View>

      {/* Notifications feed */}
      {loading ? (
        <View style={tw`py-20 items-center justify-center`}>
          <ActivityIndicator size="large" color="#1ba39a" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={tw`bg-white rounded-2xl py-16 items-center justify-center border border-[#e2e8f0] shadow-sm`}>
          <Ionicons name="notifications-off-outline" size={48} color="#cbd5e1" style={tw`mb-4`} />
          <Text style={tw`text-[#64748b] text-base font-semibold`}>Tidak ada notifikasi baru.</Text>
        </View>
      ) : (
        <View style={tw`flex-col gap-4`}>
          {notifications.map((notif) => {
            const details = getNotificationDetails(notif);
            const isApproved = notif.consent_status === 'approved';

            return (
              <View 
                key={notif.id} 
                style={[
                  tw`bg-white rounded-2xl p-5 shadow-sm border border-[#e2e8f0] flex-row items-start`
                ]}
              >
                <View style={[tw`w-10 h-10 rounded-xl items-center justify-center mr-4`, tw`${details.bg}`]}>
                  <Ionicons name={details.icon} size={20} color={notif.consent_status === 'approved' ? '#16a34a' : notif.consent_status === 'rejected' ? '#ef4444' : '#ff9f1c'} />
                </View>

                <View style={tw`flex-1`}>
                  <View style={tw`flex-row justify-between items-start mb-1`}>
                    <Text style={tw`text-[#0b4771] font-bold text-base`}>{details.title}</Text>
                    <Text style={tw`text-[#94a3b8] text-xs font-medium`}>{formatTimeAgo(notif.created_at)}</Text>
                  </View>
                  <Text style={tw`text-[#475569] text-sm mb-3 leading-relaxed`}>{details.message}</Text>

                  {isApproved && (
                    <TouchableOpacity 
                      style={tw`self-start bg-[#f8fafc] border border-[#e2e8f0] px-4 py-2 rounded-xl flex-row items-center`}
                      onPress={() => router.push(`/(staff)/rekam-medis/${notif.id}`)}
                    >
                      <Ionicons name="eye-outline" size={16} color="#0b4771" />
                      <Text style={tw`text-[#0b4771] font-semibold ml-2 text-xs`}>Lihat Rekam Medis</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}
