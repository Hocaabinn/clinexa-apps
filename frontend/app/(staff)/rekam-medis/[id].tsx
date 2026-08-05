import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import tw from 'twrnc';
import { supabase } from '../../../lib/supabase';

export default function RekamMedisDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchRecord();
  }, [id]);

  const fetchRecord = async () => {
    try {
      const { data, error } = await supabase
        .from('medical_records')
        .select(`*, patients(*), staff(name)`)
        .eq('id', id)
        .single();

      if (error) throw error;
      setRecord(data);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', 'Gagal memuat rekam medis.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={tw`flex-1 bg-[#f4f6f8] items-center justify-center`}>
        <ActivityIndicator size="large" color="#1ba39a" />
      </View>
    );
  }

  if (!record) {
    return (
      <View style={tw`flex-1 bg-[#f4f6f8] items-center justify-center`}>
        <Text style={tw`text-[#64748b]`}>Rekam medis tidak ditemukan.</Text>
      </View>
    );
  }

  const patient = record.patients || {};
  const isGranted = record.consent_status === 'approved';

  return (
    <View style={tw`flex-1 bg-[#f4f6f8]`}>
      <ScrollView style={tw`flex-1 px-10 py-8`} contentContainerStyle={tw`pb-32`}>
        <View style={tw`mb-8`}>
          <Text style={tw`text-[#0b4771] text-3xl font-semibold mb-2`}>Rekam Medis</Text>
          <View style={tw`flex-row items-center`}>
            <Text style={tw`text-black text-4xl font-bold mr-4`}>{patient.name || 'Unknown'}</Text>
            {isGranted ? (
              <View style={tw`bg-[#a3e635] px-4 py-2 rounded-xl flex-row items-center`}>
                <Ionicons name="checkmark-circle" size={16} color="#166534" />
                <Text style={tw`text-[#166534] font-bold text-sm ml-2`}>Akses Aktif</Text>
              </View>
            ) : (
              <View style={tw`bg-[#ffedd5] px-4 py-2 rounded-xl flex-row items-center`}>
                <Ionicons name="hourglass" size={16} color="#d97706" />
                <Text style={tw`text-[#d97706] font-bold text-sm ml-2`}>Status: {record.consent_status}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={tw`flex-row gap-8`}>

          <View style={tw`flex-[1] flex-col gap-6`}>
            <View style={tw`bg-white rounded-2xl p-8 shadow-sm border border-[#e2e8f0] items-center`}>
              <View style={tw`w-28 h-28 bg-[#fca5a5] rounded-full items-center justify-center mb-6 overflow-hidden border-4 border-white shadow-sm`}>
                <Ionicons name="person" size={60} color="white" style={tw`mt-4`} />
              </View>

              <Text style={tw`text-[#0b4771] text-2xl font-bold mb-1`}>{patient.name || 'Unknown'}</Text>
              <Text style={tw`text-[#64748b] text-base mb-10`}>Pasien</Text>

              <View style={tw`w-full`}>
                <View style={tw`mb-6`}>
                  <Text style={tw`text-[#94a3b8] text-xs font-bold tracking-wider mb-1`}>JENIS KELAMIN</Text>
                  <Text style={tw`text-[#0b4771] font-medium text-base`}>
                    {patient.gender === 'L' ? 'Laki-laki' : patient.gender === 'P' ? 'Perempuan' : '-'}
                  </Text>
                </View>

                <View style={tw`mb-6`}>
                  <Text style={tw`text-[#94a3b8] text-xs font-bold tracking-wider mb-1`}>TANGGAL LAHIR</Text>
                  <Text style={tw`text-[#0b4771] font-medium text-base`}>
                    {patient.birth_date ? new Date(patient.birth_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                  </Text>
                </View>

                <View style={tw`mb-4`}>
                  <Text style={tw`text-[#94a3b8] text-xs font-bold tracking-wider mb-1`}>GOLONGAN DARAH</Text>
                  <Text style={tw`text-[#0b4771] font-medium text-base`}>{patient.blood_type || '-'}</Text>
                </View>
              </View>
            </View>


            <View style={tw`bg-[#00796b] rounded-2xl p-6 shadow-md`}>
              <View style={tw`flex-row justify-between items-center mb-6`}>
                <View style={tw`flex-row items-center`}>
                  <Ionicons name="shield-checkmark" size={24} color="#a3e635" />
                  <Text style={tw`text-white font-bold ml-2 text-base`}>Blockchain Identity</Text>
                </View>
                <View style={tw`bg-white/20 px-3 py-1 rounded-xl`}>
                  <Text style={tw`text-white text-[10px] font-bold`}>VERIFIED</Text>
                </View>
              </View>
              
              <Text style={tw`text-white/80 font-mono text-xs mb-6`}>
                {patient.wallet_address || 'Tidak ada wallet terhubung'}
              </Text>

              <View style={tw`flex-row items-center`}>
                <View style={tw`w-2 h-2 bg-[#a3e635] rounded-full mr-2`} />
                <Text style={tw`text-white font-medium text-sm`}>Immutable Record Ledger</Text>
              </View>
            </View>
          </View>

          <View style={tw`flex-[2.5]`}>
            {record.record_type === 'pemeriksaan' && (
              <View style={tw`mb-10 relative pl-8`}>
                <View style={tw`absolute -left-[14px] top-6 w-4 h-4 bg-white border-4 border-[#1ba39a] rounded-full shadow-sm z-10`} />
                <View style={tw`bg-white rounded-2xl p-8 shadow-sm border border-[#e2e8f0]`}>
                  <View style={tw`flex-row justify-between items-center mb-2`}>
                    <Text style={tw`text-[#1ba39a] font-bold tracking-wide text-sm`}>
                      {new Date(record.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}
                    </Text>
                    <View style={tw`bg-[#f1f5f9] px-4 py-1.5 rounded-xl`}>
                      <Text style={tw`text-[#475569] text-xs font-bold tracking-wider uppercase`}>{record.staff?.name || 'Dokter'}</Text>
                    </View>
                  </View>
                  <Text style={tw`text-[#0f172a] text-xl font-bold mb-6`}>{record.chief_complaint || 'Pemeriksaan Umum'}</Text>
                  
                  <View style={tw`flex-row mb-4`}>
                    <View style={tw`flex-1 pr-6`}>
                      <Text style={tw`text-[#94a3b8] text-xs font-bold tracking-wider mb-2`}>DIAGNOSA</Text>
                      <Text style={tw`text-[#475569] leading-relaxed`}>{record.diagnosis || '-'}</Text>
                    </View>
                    <View style={tw`flex-1`}>
                      <Text style={tw`text-[#94a3b8] text-xs font-bold tracking-wider mb-2`}>TERAPI / TINDAKAN</Text>
                      <Text style={tw`text-[#475569] leading-relaxed`}>{record.therapy || '-'}</Text>
                    </View>
                  </View>

                  <View style={tw`flex-row flex-wrap border-t border-[#e2e8f0] pt-4 mt-2`}>
                    <View style={tw`w-1/3 mb-4`}>
                      <Text style={tw`text-[#94a3b8] text-xs font-bold tracking-wider mb-1`}>TENSI</Text>
                      <Text style={tw`text-[#0b4771] font-medium`}>{record.blood_pressure || '-'}</Text>
                    </View>
                    <View style={tw`w-1/3 mb-4`}>
                      <Text style={tw`text-[#94a3b8] text-xs font-bold tracking-wider mb-1`}>NADI</Text>
                      <Text style={tw`text-[#0b4771] font-medium`}>{record.heart_rate || '-'}</Text>
                    </View>
                    <View style={tw`w-1/3 mb-4`}>
                      <Text style={tw`text-[#94a3b8] text-xs font-bold tracking-wider mb-1`}>SUHU</Text>
                      <Text style={tw`text-[#0b4771] font-medium`}>{record.temperature || '-'}</Text>
                    </View>
                  </View>

                  {record.notes && (
                    <View style={tw`border-t border-[#e2e8f0] pt-4 mt-2`}>
                      <Text style={tw`text-[#94a3b8] text-xs font-bold tracking-wider mb-2`}>CATATAN</Text>
                      <Text style={tw`text-[#475569] leading-relaxed`}>{record.notes}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {record.record_type === 'laboratorium' && (
              <View style={tw`mb-10 relative pl-8`}>
                <View style={tw`absolute -left-[14px] top-6 w-4 h-4 bg-white border-4 border-[#1ba39a] rounded-full shadow-sm z-10`} />
                <View style={tw`bg-white rounded-2xl p-8 shadow-sm border border-[#e2e8f0]`}>
                  <View style={tw`flex-row justify-between items-center mb-2`}>
                    <Text style={tw`text-[#1ba39a] font-bold tracking-wide text-sm`}>
                      {new Date(record.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={tw`text-[#0f172a] text-xl font-bold mb-6`}>Hasil Lab: {record.lab_type || '-'}</Text>
                  
                  <View style={tw`flex-col mb-4`}>
                    <Text style={tw`text-[#94a3b8] text-xs font-bold tracking-wider mb-2`}>CATATAN KLINIS</Text>
                    <Text style={tw`text-[#475569] leading-relaxed`}>{record.lab_notes || '-'}</Text>
                  </View>
                </View>
              </View>
            )}

            {record.record_type === 'resep' && (
              <View style={tw`mb-10 relative pl-8`}>
                <View style={tw`absolute -left-[14px] top-6 w-4 h-4 bg-white border-4 border-[#1ba39a] rounded-full shadow-sm z-10`} />
                <View style={tw`bg-white rounded-2xl p-8 shadow-sm border border-[#e2e8f0]`}>
                  <View style={tw`flex-row justify-between items-center mb-2`}>
                    <Text style={tw`text-[#1ba39a] font-bold tracking-wide text-sm`}>
                      {new Date(record.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={tw`text-[#0f172a] text-xl font-bold mb-6`}>Resep Obat</Text>
                  
                  {Array.isArray(record.prescriptions) && record.prescriptions.length > 0 ? (
                    <View style={tw`flex-col gap-3 mb-6`}>
                      {record.prescriptions.map((p: any, idx: number) => (
                        <View key={idx} style={tw`bg-[#f8fafc] p-4 rounded-xl flex-row items-center`}>
                          <Ionicons name="medkit" size={24} color="#1ba39a" style={tw`mr-4`} />
                          <View style={tw`flex-1`}>
                            <Text style={tw`text-[#0b4771] font-bold text-base`}>{p.name}</Text>
                            <Text style={tw`text-[#64748b]`}>{p.dose} • {p.freq}</Text>
                          </View>
                          <Text style={tw`text-[#475569] max-w-[200px]`}>{p.instructions}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={tw`text-[#475569] mb-6`}>Tidak ada data obat terlampir.</Text>
                  )}

                  {record.prescription_notes && (
                    <View style={tw`border-t border-[#e2e8f0] pt-4 mt-2`}>
                      <Text style={tw`text-[#94a3b8] text-xs font-bold tracking-wider mb-2`}>CATATAN APOTEKER</Text>
                      <Text style={tw`text-[#475569] leading-relaxed`}>{record.prescription_notes}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

          </View>
        </View>
      </ScrollView>
    </View>
  );
}
