import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import tw from 'twrnc';
import { supabase } from '../../../lib/supabase';

interface RecordItem {
  id: string;
  patient_name: string;
  record_id: string;
  desc: string;
  hash: string;
  status: string;
  record_type: string;
  created_at: string;
}

export default function RekamMedisList() {
  const router = useRouter();
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('Semua');
  const [stats, setStats] = useState({ granted: 0, pending: 0, denied: 0 });

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('medical_records')
        .select(`
          id, 
          record_type, 
          diagnosis, 
          lab_type, 
          chief_complaint, 
          created_at, 
          consent_status, 
          blockchain_hash, 
          patients(name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching records:', error);
        return;
      }

      if (data) {
        let grantedCount = 0;
        let pendingCount = 0;
        let deniedCount = 0;

        const formattedRecords = data.map((item: any) => {
          let desc = '';
          const dateStr = new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
          
          if (item.record_type === 'pemeriksaan') {
            desc = `${item.chief_complaint || 'Pemeriksaan Umum'} • ${dateStr}`;
          } else if (item.record_type === 'laboratorium') {
            desc = `Tes ${item.lab_type || 'Laboratorium'} • ${dateStr}`;
          } else if (item.record_type === 'resep') {
            desc = `Resep Obat • ${dateStr}`;
          }

          if (item.consent_status === 'granted') grantedCount++;
          else if (item.consent_status === 'pending') pendingCount++;
          else if (item.consent_status === 'denied') deniedCount++;

          const statusMap: Record<string, string> = {
            granted: 'Akses Diberikan',
            denied: 'Akses Ditolak',
            pending: 'Menunggu Izin'
          };

          return {
            id: item.id,
            patient_name: item.patients?.name || 'Unknown',
            record_id: item.id.substring(0, 8).toUpperCase(),
            desc,
            hash: item.blockchain_hash || '0x0000000000...0000',
            status: statusMap[item.consent_status] || 'Menunggu Izin',
            record_type: item.record_type,
            created_at: item.created_at
          };
        });

        setRecords(formattedRecords);
        setStats({ granted: grantedCount, pending: pendingCount, denied: deniedCount });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Akses Diberikan': return { bg: 'bg-[#dcfce7]', text: 'text-[#16a34a]', icon: 'checkmark-circle-outline' as any };
      case 'Akses Ditolak': return { bg: 'bg-[#fee2e2]', text: 'text-[#dc2626]', icon: 'close-circle-outline' as any };
      case 'Menunggu Izin': return { bg: 'bg-[#ffedd5]', text: 'text-[#d97706]', icon: 'hourglass-outline' as any };
      default: return { bg: 'bg-gray-100', text: 'text-gray-500', icon: 'ellipse-outline' as any };
    }
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch = record.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          record.record_id.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesType = true;
    if (filterType !== 'Semua') {
      matchesType = record.record_type.toLowerCase() === filterType.toLowerCase();
    }

    return matchesSearch && matchesType;
  });

  return (
    <ScrollView style={tw`flex-1 bg-[#f4f6f8] px-10 py-8`} contentContainerStyle={tw`pb-20`}>
      <View style={tw`flex-row justify-between items-center mb-10`}>
        <Text style={tw`text-[#0b4771] text-3xl font-semibold`}>Rekam Medis</Text>
        
        <TouchableOpacity 
          style={tw`bg-[#1ba39a] px-6 py-3.5 rounded-xl flex-row items-center`}
          onPress={() => router.push('/(staff)/rekam-medis/tambah')}
        >
          <Ionicons name="cloud-upload-outline" size={20} color="white" />
          <Text style={tw`text-white font-medium ml-2 text-base`}>Upload Rekam Medis</Text>
        </TouchableOpacity>
      </View>

      <View style={tw`flex-row gap-6 mb-8`}>
        <View style={tw`flex-1 bg-white rounded-2xl p-6 shadow-sm border border-[#e2e8f0]`}>
          <View style={tw`w-12 h-12 bg-[#eef8f2] rounded-xl items-center justify-center mb-6`}>
            <Ionicons name="shield-checkmark-outline" size={24} color="#16a34a" />
          </View>
          <Text style={tw`text-[#0b4771] text-3xl font-bold mb-1`}>{stats.granted}</Text>
          <Text style={tw`text-[#94a3b8] text-sm font-medium`}>Akses Diberikan</Text>
        </View>

        <View style={tw`flex-1 bg-white rounded-2xl p-6 shadow-sm border border-[#e2e8f0]`}>
          <View style={tw`w-12 h-12 bg-[#fff7ed] rounded-xl items-center justify-center mb-6`}>
            <Ionicons name="hourglass-outline" size={24} color="#d97706" />
          </View>
          <Text style={tw`text-[#0b4771] text-3xl font-bold mb-1`}>{stats.pending}</Text>
          <Text style={tw`text-[#94a3b8] text-sm font-medium`}>Menunggu Izin</Text>
        </View>

        <View style={tw`flex-1 bg-white rounded-2xl p-6 shadow-sm border border-[#e2e8f0]`}>
          <View style={tw`w-12 h-12 bg-[#fef2f2] rounded-xl items-center justify-center mb-6`}>
            <Ionicons name="close-circle-outline" size={24} color="#dc2626" />
          </View>
          <Text style={tw`text-[#0b4771] text-3xl font-bold mb-1`}>{stats.denied}</Text>
          <Text style={tw`text-[#94a3b8] text-sm font-medium`}>Akses Ditolak</Text>
        </View>
      </View>

      <View style={tw`bg-white rounded-2xl p-3 flex-row items-center mb-8 shadow-sm border border-[#e2e8f0]`}>
        <View style={tw`flex-row gap-2`}>
          {['Semua', 'Pemeriksaan', 'Laboratorium', 'Resep'].map(type => (
            <TouchableOpacity 
              key={type}
              style={[tw`px-6 py-3 rounded-xl`, filterType === type ? tw`bg-[#1ba39a]` : tw`bg-transparent`]}
              onPress={() => setFilterType(type)}
            >
              <Text style={[tw`font-medium`, filterType === type ? tw`text-white` : tw`text-[#64748b]`]}>{type}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={tw`flex-1 flex-row items-center border border-[#e2e8f0] rounded-xl px-4 h-12 ml-4`}>
          <Ionicons name="search-outline" size={20} color="#94a3b8" />
          <TextInput 
            style={tw`flex-1 ml-3 text-[#0b4771] h-full outline-none`}
            placeholder="Cari pasien atau rekam medis..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {loading ? (
        <View style={tw`py-10 items-center justify-center`}>
          <ActivityIndicator size="large" color="#1ba39a" />
        </View>
      ) : filteredRecords.length === 0 ? (
        <View style={tw`py-10 items-center justify-center`}>
          <Text style={tw`text-[#64748b]`}>Tidak ada data rekam medis.</Text>
        </View>
      ) : (
        <View style={tw`flex-col gap-4`}>
          {filteredRecords.map((record) => {
            const statusStyle = getStatusColor(record.status);
            const isAllowed = record.status === 'Akses Diberikan';

            return (
              <View key={record.id} style={tw`bg-white rounded-2xl p-5 flex-row items-center shadow-sm border border-[#e2e8f0]`}>
                
                <View style={tw`w-14 h-14 bg-[#e0f2f1] rounded-xl items-center justify-center mr-5`}>
                   <Ionicons name="document-text-outline" size={24} color="#1ba39a" />
                </View>

                <View style={tw`flex-1`}>
                  <View style={tw`flex-row items-center mb-1`}>
                    <Text style={tw`text-[#0b4771] text-lg font-semibold mr-3`}>{record.patient_name}</Text>
                    <Text style={tw`text-[#94a3b8]`}>{record.record_id}</Text>
                  </View>
                  <Text style={tw`text-[#64748b] text-sm mb-2`}>{record.desc}</Text>
                  <View style={tw`flex-row items-center`}>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#16a34a" />
                    <Text style={tw`text-[#16a34a] text-xs ml-1 font-medium`}>{record.hash}</Text>
                  </View>
                </View>

                <View style={tw`flex-row items-center gap-4`}>
                  <View style={[tw`px-4 py-2 rounded-xl flex-row items-center`, tw`${statusStyle.bg}`]}>
                     <Ionicons name={statusStyle.icon} size={16} color={tw.color(statusStyle.text.split('-')[1]) || '#000'} />
                     <Text style={[tw`ml-2 font-medium text-sm`, tw`${statusStyle.text}`]}>{record.status}</Text>
                  </View>

                  {isAllowed && (
                    <TouchableOpacity 
                      style={tw`bg-[#f8fafc] border border-[#e2e8f0] px-6 py-2 rounded-xl flex-row items-center`}
                      onPress={() => router.push(`/(staff)/rekam-medis/${record.id}`)}
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
}
