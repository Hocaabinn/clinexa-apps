import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import tw from 'twrnc';
import { supabase } from '../../../lib/supabase';

const { width } = Dimensions.get('window');

interface AccessLog {
  id: string;
  patient_name: string;
  record_id: string;
  record_type: string;
  consent_status: 'approved' | 'rejected' | 'pending';
  created_at: string;
}

export default function AccessLogsScreen() {
  const router = useRouter();
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Semua' | 'approved' | 'rejected' | 'pending'>('Semua');

  const isMobile = width < 640;
  const isTablet = width >= 640 && width < 1024;

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('medical_records')
        .select('id, consent_status, record_type, created_at, patients(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const formatted: AccessLog[] = data.map((item: any) => ({
          id: item.id,
          patient_name: item.patients?.name || 'Pasien Anonim',
          record_id: item.id.substring(0, 8).toUpperCase(),
          record_type: item.record_type,
          consent_status: item.consent_status,
          created_at: item.created_at
        }));
        setLogs(formatted);
      }
    } catch (err) {
      console.error('Error fetching access logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    // Setup realtime subscription to listen for updates on medical_records consent_status
    const channelName = `access-logs-realtime-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'medical_records' },
        () => {
          fetchLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getStatusBadge = (status: 'approved' | 'rejected' | 'pending') => {
    switch (status) {
      case 'approved':
        return {
          label: 'Akses Diberikan',
          bg: 'bg-[#e8fbf1] border-[#22c55e]/20',
          text: 'text-[#16a34a]',
          icon: 'checkmark-circle-outline' as any
        };
      case 'rejected':
        return {
          label: 'Akses Ditolak',
          bg: 'bg-[#fdf2f2] border-[#ef4444]/20',
          text: 'text-[#ef4444]',
          icon: 'close-circle-outline' as any
        };
      case 'pending':
      default:
        return {
          label: 'Menunggu Izin',
          bg: 'bg-[#fffbf0] border-[#ff9f1c]/20',
          text: 'text-[#ff9f1c]',
          icon: 'hourglass-outline' as any
        };
    }
  };

  const getRecordTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      pemeriksaan: 'Pemeriksaan',
      laboratorium: 'Tes Lab',
      resep: 'Resep Obat'
    };
    return typeMap[type] || type;
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          log.record_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'Semua' || log.consent_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <ScrollView
      style={[tw`flex-1 bg-[#f4f6f8]`, tw`${isMobile ? 'px-4 py-5' : isTablet ? 'px-6 py-6' : 'px-10 py-8'}`]}
      contentContainerStyle={tw`pb-20`}
    >
      {/* Header */}
      <View style={[tw`mb-10`, isMobile ? tw`items-stretch gap-4` : tw`flex-row justify-between items-center`]}>
        <View>
          <Text style={tw`text-[#0b4771] ${isMobile ? 'text-2xl' : 'text-3xl'} font-semibold mb-2`}>Log Akses</Text>
          <Text style={tw`text-[#6d7f95] text-sm font-light`}>
            Daftar riwayat persetujuan dan aktivitas akses rekam medis oleh pasien.
          </Text>
        </View>

        <TouchableOpacity
          style={tw`bg-white border border-[#e2e8f0] px-4 py-3 rounded-xl flex-row items-center justify-center`}
          onPress={fetchLogs}
        >
          <Ionicons name="refresh-outline" size={20} color="#0b4771" />
          {isMobile && <Text style={tw`text-[#0b4771] font-semibold ml-2`}>Refresh</Text>}
        </TouchableOpacity>
      </View>

      {/* Filter and Search controls */}
      <View style={[tw`bg-white rounded-2xl p-4 mb-8 shadow-sm border border-[#e2e8f0]`, isMobile ? tw`gap-3` : tw`flex-row items-center`]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={isMobile ? tw`w-full` : undefined}
          contentContainerStyle={tw`flex-row gap-2`}
        >
          {([
            { label: 'Semua', value: 'Semua' },
            { label: 'Diberikan', value: 'approved' },
            { label: 'Ditolak', value: 'rejected' },
            { label: 'Menunggu', value: 'pending' }
          ] as const).map(tab => (
            <TouchableOpacity 
              key={tab.value}
              style={[tw`px-6 py-3 rounded-xl border`, statusFilter === tab.value ? tw`bg-[#1ba39a] border-[#1ba39a]` : tw`bg-transparent border-transparent`]}
              onPress={() => setStatusFilter(tab.value)}
            >
              <Text style={[tw`font-medium text-sm`, statusFilter === tab.value ? tw`text-white` : tw`text-[#64748b]`]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={[tw`flex-row items-center border border-[#e2e8f0] rounded-xl px-4 h-12`, isMobile ? tw`w-full` : tw`flex-1 ml-4`]}>
          <Ionicons name="search-outline" size={20} color="#94a3b8" />
          <TextInput 
            style={tw`flex-1 ml-3 text-[#0b4771] h-full outline-none`}
            placeholder="Cari pasien atau ID rekam medis..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Logs List */}
      {loading ? (
        <View style={tw`py-20 items-center justify-center`}>
          <ActivityIndicator size="large" color="#1ba39a" />
        </View>
      ) : filteredLogs.length === 0 ? (
        <View style={tw`bg-white rounded-2xl py-16 items-center justify-center border border-[#e2e8f0] shadow-sm`}>
          <Ionicons name="time-outline" size={48} color="#cbd5e1" style={tw`mb-4`} />
          <Text style={tw`text-[#64748b] text-base font-semibold`}>Tidak ada riwayat log akses yang cocok.</Text>
        </View>
      ) : (
        <View style={tw`flex-col gap-4`}>
          {filteredLogs.map((log) => {
            const badge = getStatusFilterColor(log.consent_status);
            const isApproved = log.consent_status === 'approved';

            return (
              <View 
                key={log.id} 
                style={[
                  tw`bg-white rounded-2xl p-5 shadow-sm border border-[#e2e8f0]`,
                  isTablet || isMobile ? tw`gap-4` : tw`flex-row items-center justify-between`
                ]}
              >
                <View style={tw`flex-row items-center flex-1 pr-4`}>
                  <View style={tw`w-12 h-12 bg-[#e0f2f1] rounded-xl items-center justify-center mr-4`}>
                    <Ionicons name="key-outline" size={22} color="#1ba39a" />
                  </View>
                  <View style={tw`flex-1`}>
                    <View style={tw`flex-row items-center mb-1 flex-wrap`}>
                      <Text style={tw`text-[#0b4771] text-lg font-bold mr-3`}>{log.patient_name}</Text>
                      <Text style={tw`text-[#94a3b8] text-xs font-mono bg-[#f1f5f9] px-2 py-0.5 rounded`}>ID: {log.record_id}</Text>
                    </View>
                    <Text style={tw`text-[#64748b] text-sm`}>
                      Meminta akses untuk dokumen <Text style={tw`font-semibold text-[#0b4771]`}>{getRecordTypeLabel(log.record_type)}</Text> • {formatDate(log.created_at)}
                    </Text>
                  </View>
                </View>

                <View style={[tw`gap-4`, isMobile ? tw`items-stretch` : tw`flex-row items-center`]}>
                  <View style={[tw`px-4 py-2.5 rounded-xl border flex-row items-center`, tw`${badge.bg}`]}>
                    <Ionicons name={badge.icon} size={16} color={log.consent_status === 'approved' ? '#16a34a' : log.consent_status === 'rejected' ? '#ef4444' : '#ff9f1c'} />
                    <Text style={[tw`ml-2 font-bold text-sm`, tw`${badge.text}`]}>{badge.label}</Text>
                  </View>

                  {isApproved && (
                    <TouchableOpacity 
                      style={[tw`bg-[#f8fafc] border border-[#e2e8f0] px-6 py-2.5 rounded-xl flex-row items-center justify-center`]}
                      onPress={() => router.push(`/(staff)/rekam-medis/${log.id}`)}
                    >
                      <Ionicons name="eye-outline" size={18} color="#0b4771" />
                      <Text style={tw`text-[#0b4771] font-semibold ml-2`}>Lihat</Text>
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

  // Helper to resolve badge configs cleanly
  function getStatusFilterColor(status: 'approved' | 'rejected' | 'pending') {
    return getStatusBadge(status);
  }
}
