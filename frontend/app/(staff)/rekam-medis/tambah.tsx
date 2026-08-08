import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import tw from 'twrnc';
import { supabase } from '../../../lib/supabase';
import { useStaffAuth } from '../../../lib/staff-auth';

interface Patient {
  id: string;
  name: string;
}

export default function TambahRekamMedis() {
  const router = useRouter();
  const { staffProfile } = useStaffAuth();
  const [activeTab, setActiveTab] = useState('Pemeriksaan');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states - Pemeriksaan
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [temperature, setTemperature] = useState('');
  const [oxygenSaturation, setOxygenSaturation] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [therapy, setTherapy] = useState('');
  const [notes, setNotes] = useState('');

  // Form states - Laboratorium
  const [labType, setLabType] = useState('');
  const [labDate, setLabDate] = useState('');
  const [labNotes, setLabNotes] = useState('');

  // Form states - Resep
  const [prescriptionNotes, setPrescriptionNotes] = useState('');
  // Simplify prescriptions for UI demo purposes, using a simple string or single object structure if needed, 
  // but for now we'll just insert a dummy JSON or empty array based on inputs.
  const [prescriptionItem, setPrescriptionItem] = useState({ name: '', dose: '', freq: '', instructions: '' });
  const [prescriptions, setPrescriptions] = useState<any[]>([]);

  // Admission Type State ('rawat_jalan', 'rawat_inap', 'igd')
  const [admissionType, setAdmissionType] = useState<'rawat_jalan' | 'rawat_inap' | 'igd'>('rawat_jalan');

  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    const { data } = await supabase.from('patients').select('id, name');
    if (data) {
      setPatients(data);
      if (data.length > 0) {
        setSelectedPatientId(data[0].id);
        setSearchQuery(data[0].name);
      }
    }
  };

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatientId(patient.id);
    setSearchQuery(patient.name);
    setIsDropdownOpen(false);
  };

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!selectedPatientId) {
      alert('Pilih pasien terlebih dahulu.');
      return;
    }

    setSubmitting(true);
    try {
      let payload: any = {
        patient_id: selectedPatientId,
        staff_id: staffProfile?.id,
        record_type: activeTab.toLowerCase(),
        admission_type: admissionType,
        consent_status: 'pending' // As per requirement, new records need consent
      };

      if (activeTab === 'Pemeriksaan') {
        payload = {
          ...payload,
          chief_complaint: chiefComplaint,
          blood_pressure: bloodPressure,
          heart_rate: heartRate,
          temperature: temperature,
          oxygen_saturation: oxygenSaturation,
          weight: weight,
          height: height,
          diagnosis: diagnosis,
          therapy: therapy,
          notes: notes
        };
      } else if (activeTab === 'Laboratorium') {
        payload = {
          ...payload,
          lab_type: labType,
          lab_date: labDate || null,
          lab_notes: labNotes
        };
      } else if (activeTab === 'Resep') {
        payload = {
          ...payload,
          prescriptions: prescriptions,
          prescription_notes: prescriptionNotes
        };
      }

      const { error } = await supabase.from('medical_records').insert(payload);
      if (error) throw error;
      
      alert('Berhasil menyimpan rekam medis.');
      router.back();
    } catch (err: any) {
      alert('Gagal menyimpan: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderPemeriksaan = () => (
    <View>
      <View style={tw`mb-6`}>
        <Text style={tw`text-[#64748b] text-sm mb-2 font-medium`}>Keluhan Utama</Text>
        <TextInput 
          style={tw`bg-[#eef1f5] rounded-xl p-5 text-[#0b4771] min-h-[120px] outline-none`}
          placeholder="Deskripsikan keluhan pasien secara mendalam..."
          placeholderTextColor="#94a3b8"
          multiline
          value={chiefComplaint}
          onChangeText={setChiefComplaint}
        />
      </View>

      <View style={tw`flex-row gap-6 mb-6`}>
        <View style={tw`flex-1`}>
          <Text style={tw`text-[#64748b] text-sm mb-2 font-medium`}>Tekanan Darah (mmHg)</Text>
          <TextInput style={tw`bg-[#eef1f5] rounded-xl px-5 py-4 text-[#0b4771] outline-none`} placeholder="Contoh: 120/80" placeholderTextColor="#94a3b8" value={bloodPressure} onChangeText={setBloodPressure} />
        </View>
        <View style={tw`flex-1`}>
          <Text style={tw`text-[#64748b] text-sm mb-2 font-medium`}>Nadi (bpm)</Text>
          <TextInput style={tw`bg-[#eef1f5] rounded-xl px-5 py-4 text-[#0b4771] outline-none`} placeholder="80" placeholderTextColor="#94a3b8" value={heartRate} onChangeText={setHeartRate} />
        </View>
      </View>

      <View style={tw`flex-row gap-6 mb-6`}>
        <View style={tw`flex-1`}>
          <Text style={tw`text-[#64748b] text-sm mb-2 font-medium`}>Suhu Tubuh (°C)</Text>
          <TextInput style={tw`bg-[#eef1f5] rounded-xl px-5 py-4 text-[#0b4771] outline-none`} placeholder="36.5" placeholderTextColor="#94a3b8" value={temperature} onChangeText={setTemperature} />
        </View>
        <View style={tw`flex-1`}>
          <Text style={tw`text-[#64748b] text-sm mb-2 font-medium`}>Saturasi O2 (%)</Text>
          <TextInput style={tw`bg-[#eef1f5] rounded-xl px-5 py-4 text-[#0b4771] outline-none`} placeholder="98" placeholderTextColor="#94a3b8" value={oxygenSaturation} onChangeText={setOxygenSaturation} />
        </View>
      </View>

      <View style={tw`flex-row gap-6 mb-6`}>
        <View style={tw`flex-1`}>
          <Text style={tw`text-[#64748b] text-sm mb-2 font-medium`}>Berat Badan (kg)</Text>
          <TextInput style={tw`bg-[#eef1f5] rounded-xl px-5 py-4 text-[#0b4771] outline-none`} placeholder="60" placeholderTextColor="#94a3b8" value={weight} onChangeText={setWeight} />
        </View>
        <View style={tw`flex-1`}>
          <Text style={tw`text-[#64748b] text-sm mb-2 font-medium`}>Diagnosa Utama</Text>
          <TextInput style={tw`bg-[#eef1f5] rounded-xl px-5 py-4 text-[#0b4771] outline-none`} placeholder="Masukkan diagnosa medis..." placeholderTextColor="#94a3b8" value={diagnosis} onChangeText={setDiagnosis} />
        </View>
      </View>

      <View style={tw`flex-row gap-6 mb-8`}>
        <View style={tw`flex-1`}>
          <Text style={tw`text-[#64748b] text-sm mb-2 font-medium`}>Tinggi Badan (cm)</Text>
          <TextInput style={tw`bg-[#eef1f5] rounded-xl px-5 py-4 text-[#0b4771] outline-none`} placeholder="165" placeholderTextColor="#94a3b8" value={height} onChangeText={setHeight} />
        </View>
        <View style={tw`flex-1`}>
          <Text style={tw`text-[#64748b] text-sm mb-2 font-medium`}>Terapi / Tindakan</Text>
          <TextInput style={tw`bg-[#eef1f5] rounded-xl px-5 py-4 text-[#0b4771] outline-none`} placeholder="Rencana terapi..." placeholderTextColor="#94a3b8" value={therapy} onChangeText={setTherapy} />
        </View>
      </View>

      <View style={tw`mb-12`}>
        <Text style={tw`text-[#64748b] text-sm mb-2 font-medium`}>Catatan Tambahan</Text>
        <TextInput 
          style={tw`bg-[#eef1f5] rounded-xl p-5 text-[#0b4771] min-h-[120px] outline-none`}
          placeholder="Informasi medis relevan lainnya..."
          placeholderTextColor="#94a3b8"
          multiline
          value={notes}
          onChangeText={setNotes}
        />
      </View>

      <View style={tw`border-t border-[#e2e8f0] pt-6 flex-row justify-end gap-4`}>
        <TouchableOpacity style={tw`border border-[#cbd5e1] bg-white px-8 py-3.5 rounded-xl`} onPress={() => router.back()}>
          <Text style={tw`text-[#64748b] font-medium`}>Batal</Text>
        </TouchableOpacity>
        <TouchableOpacity style={tw`bg-[#1ba39a] px-8 py-3.5 rounded-xl`} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="white" /> : <Text style={tw`text-white font-medium`}>Submit & Verifikasi</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderLaboratorium = () => (
    <View>
      <View style={tw`flex-row items-center mb-6`}>
        <Text style={tw`text-[#0b4771] text-lg font-bold`}>Informasi Permintaan Lab</Text>
      </View>

      <View style={tw`flex-row gap-8 mb-10`}>
        <View style={tw`flex-1`}>
          <View style={tw`mb-6`}>
            <Text style={tw`text-[#0b4771] text-sm mb-2 font-bold`}>Jenis Pemeriksaan Lab</Text>
            <TextInput style={tw`bg-[#eef1f5] rounded-xl px-5 py-4 flex-row justify-between items-center outline-none text-[#0b4771]`} placeholder="Contoh: Darah Lengkap" placeholderTextColor="#94a3b8" value={labType} onChangeText={setLabType} />
          </View>
          <View>
            <Text style={tw`text-[#0b4771] text-sm mb-2 font-bold`}>Tanggal Pemeriksaan</Text>
            <View style={tw`bg-[#eef1f5] rounded-xl px-5 py-4 flex-row justify-between items-center`}>
              <TextInput style={tw`text-[#0b4771] flex-1 outline-none`} placeholder="YYYY-MM-DD" placeholderTextColor="#94a3b8" value={labDate} onChangeText={setLabDate} />
              <Ionicons name="calendar-outline" size={18} color="#94a3b8" />
            </View>
          </View>
        </View>

        <View style={tw`flex-1`}>
          <Text style={tw`text-[#0b4771] text-sm mb-2 font-bold`}>Catatan Klinis Lab</Text>
          <TextInput 
            style={tw`bg-[#eef1f5] rounded-xl p-5 text-[#0b4771] flex-1 min-h-[120px] outline-none`}
            placeholder="Tuliskan catatan atau instruksi khusus untuk laboratorium..."
            placeholderTextColor="#94a3b8"
            multiline
            value={labNotes}
            onChangeText={setLabNotes}
          />
        </View>
      </View>

      <View style={tw`flex-row items-center mb-4`}>
        <Text style={tw`text-[#0b4771] text-lg font-bold mr-3`}>Lampiran / Hasil</Text>
        <View style={tw`bg-[#eef1f5] px-3 py-1 rounded-xl`}>
          <Text style={tw`text-[#94a3b8] text-[10px] font-bold`}> (Jika ada)</Text>
        </View>
      </View>

      <View style={tw`border-2 border-dashed border-[#cbd5e1] rounded-2xl p-12 items-center justify-center mb-10`}>
        <View style={tw`w-16 h-16 bg-[#e0f2f1] rounded-xl items-center justify-center mb-4`}>
          <Ionicons name="cloud-upload-outline" size={32} color="#1ba39a" />
        </View>
        <Text style={tw`text-[#0b4771] text-base font-bold mb-2`}>Upload Hasil Lab</Text>
        <Text style={tw`text-[#64748b] text-sm mb-4`}>Fitur upload ditangguhkan sementara</Text>
      </View>

      <View style={tw`border-t border-[#e2e8f0] pt-6 flex-row justify-end gap-4`}>
        <TouchableOpacity style={tw`border border-[#cbd5e1] bg-white px-8 py-3.5 rounded-xl`} onPress={() => router.back()}>
          <Text style={tw`text-[#64748b] font-medium`}>Batal</Text>
        </TouchableOpacity>
        <TouchableOpacity style={tw`bg-[#1ba39a] px-8 py-3.5 rounded-xl flex-row items-center`} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="white" /> : (
            <>
              <Text style={tw`text-white font-medium mr-2`}>Simpan & Submit</Text>
              <Ionicons name="send" size={16} color="white" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderResep = () => (
    <View>
      <View style={tw`flex-row justify-between items-center mb-6`}>
        <View style={tw`flex-row items-center`}>
          <Text style={tw`text-[#0b4771] text-lg font-bold`}>Daftar Obat</Text>
        </View>
      </View>

      <View style={tw`mb-4`}>
        <View style={tw`flex-row gap-4 mb-2`}>
          <View style={tw`flex-[2]`}><Text style={tw`text-[#94a3b8] text-xs font-bold tracking-wider`}>NAMA OBAT</Text></View>
          <View style={tw`flex-[1]`}><Text style={tw`text-[#94a3b8] text-xs font-bold tracking-wider`}>DOSIS</Text></View>
          <View style={tw`flex-[1]`}><Text style={tw`text-[#94a3b8] text-xs font-bold tracking-wider`}>FREKUENSI</Text></View>
          <View style={tw`flex-[2]`}><Text style={tw`text-[#94a3b8] text-xs font-bold tracking-wider`}>KETERANGAN</Text></View>
          <View style={tw`w-8`} />
        </View>

        {prescriptions.map((p, idx) => (
          <View key={idx} style={tw`flex-row gap-4 items-center mb-4`}>
            <TextInput style={tw`flex-[2] bg-[#eef1f5] rounded-xl px-5 py-4 text-[#0b4771] outline-none`} value={p.name} editable={false} />
            <TextInput style={tw`flex-[1] bg-[#eef1f5] rounded-xl px-5 py-4 text-[#0b4771] outline-none`} value={p.dose} editable={false} />
            <TextInput style={tw`flex-[1] bg-[#eef1f5] rounded-xl px-5 py-4 text-[#0b4771] outline-none`} value={p.freq} editable={false} />
            <TextInput style={tw`flex-[2] bg-[#eef1f5] rounded-xl px-5 py-4 text-[#0b4771] outline-none`} value={p.instructions} editable={false} />
            <TouchableOpacity style={tw`w-8 items-center justify-center`} onPress={() => setPrescriptions(prescriptions.filter((_, i) => i !== idx))}>
              <Ionicons name="trash-outline" size={20} color="#dc2626" />
            </TouchableOpacity>
          </View>
        ))}

        <View style={tw`flex-row gap-4 items-center mb-6`}>
          <TextInput style={tw`flex-[2] bg-[#eef1f5] rounded-xl px-5 py-4 text-[#0b4771] outline-none`} placeholder="Ketik nama obat..." placeholderTextColor="#94a3b8" value={prescriptionItem.name} onChangeText={t => setPrescriptionItem(prev => ({...prev, name: t}))} />
          <TextInput style={tw`flex-[1] bg-[#eef1f5] rounded-xl px-5 py-4 text-[#0b4771] outline-none`} placeholder="Contoh: 1 Kaplet" placeholderTextColor="#94a3b8" value={prescriptionItem.dose} onChangeText={t => setPrescriptionItem(prev => ({...prev, dose: t}))} />
          <TextInput style={tw`flex-[1] bg-[#eef1f5] rounded-xl px-5 py-4 text-[#0b4771] outline-none`} placeholder="Contoh: 2x Sehari" placeholderTextColor="#94a3b8" value={prescriptionItem.freq} onChangeText={t => setPrescriptionItem(prev => ({...prev, freq: t}))} />
          <TextInput style={tw`flex-[2] bg-[#eef1f5] rounded-xl px-5 py-4 text-[#0b4771] outline-none`} placeholder="Instruksi tambahan..." placeholderTextColor="#94a3b8" value={prescriptionItem.instructions} onChangeText={t => setPrescriptionItem(prev => ({...prev, instructions: t}))} />
          <TouchableOpacity 
            style={tw`w-8 items-center justify-center`}
            onPress={() => {
              if (prescriptionItem.name) {
                setPrescriptions([...prescriptions, prescriptionItem]);
                setPrescriptionItem({ name: '', dose: '', freq: '', instructions: '' });
              }
            }}
          >
            <Ionicons name="add-circle-outline" size={24} color="#64748b" />
          </TouchableOpacity>
        </View>

      </View>

      <View style={tw`flex-row items-center mb-6`}>
        <Text style={tw`text-[#0b4771] text-lg font-bold`}>Instruksi Khusus</Text>
      </View>

      <View style={tw`mb-12`}>
        <Text style={tw`text-[#94a3b8] text-xs font-bold tracking-wider mb-2 ml-2`}>INSTRUKSI PENGGUNAAN / CATATAN APOTEKER</Text>
        <TextInput 
          style={tw`bg-[#eef1f5] rounded-xl p-5 text-[#0b4771] min-h-[120px] outline-none`}
          placeholder="Tuliskan catatan khusus untuk apoteker atau instruksi penggunaan obat yang lebih detail..."
          placeholderTextColor="#94a3b8"
          multiline
          value={prescriptionNotes}
          onChangeText={setPrescriptionNotes}
        />
      </View>

      <View style={tw`border-t border-[#e2e8f0] pt-6 flex-row justify-between items-center`}>
        <View style={tw`flex-row items-center flex-1 pr-10`}>
          <Ionicons name="information-circle-outline" size={20} color="#94a3b8" />
          <Text style={tw`text-[#94a3b8] text-sm ml-2`}>Data resep akan disimpan di database.</Text>
        </View>
        
        <View style={tw`flex-row gap-4`}>
          <TouchableOpacity style={tw`border border-[#cbd5e1] bg-white px-8 py-3.5 rounded-xl`} onPress={() => router.back()}>
            <Text style={tw`text-[#64748b] font-medium`}>Batal</Text>
          </TouchableOpacity>
          <TouchableOpacity style={tw`bg-[#1ba39a] px-8 py-3.5 rounded-xl flex-row items-center`} onPress={handleSubmit} disabled={submitting}>
            {submitting ? <ActivityIndicator color="white" /> : (
              <>
                <Ionicons name="cloud-upload-outline" size={20} color="white" />
                <Text style={tw`text-white font-medium ml-2`}>Simpan & Submit</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView style={tw`flex-1 bg-[#f4f6f8] px-10 py-8`} contentContainerStyle={tw`pb-20`}>
      <Text style={tw`text-[#0b4771] text-3xl font-semibold mb-2`}>Tambah Rekam Medis Baru</Text>
      
      <View style={tw`flex-row gap-6 mb-8 z-20`}>
        {/* Patient Selector */}
        <View style={tw`flex-1 bg-white p-4 rounded-xl shadow-sm border border-[#e2e8f0] max-w-sm z-20`}>
          <Text style={tw`text-[#64748b] text-base mb-2 font-medium`}>Pilih Pasien: </Text>
          <View style={tw`relative z-20`}>
            <View style={tw`flex-row items-center bg-[#eef1f5] rounded-xl px-4 py-3`}>
              <Ionicons name="search-outline" size={18} color="#94a3b8" style={tw`mr-2`} />
              <TextInput
                style={tw`flex-1 text-[#0b4771] outline-none font-medium text-sm`}
                placeholder="Cari & pilih pasien..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => { setSearchQuery(''); setSelectedPatientId(null); setIsDropdownOpen(true); }}>
                  <Ionicons name="close-circle" size={18} color="#94a3b8" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => setIsDropdownOpen(!isDropdownOpen)}>
                  <Ionicons name={isDropdownOpen ? "chevron-up" : "chevron-down"} size={18} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            {isDropdownOpen && (
              <View style={tw`absolute top-13 left-0 right-0 bg-white border border-[#e2e8f0] rounded-xl shadow-lg max-h-60 overflow-hidden z-30`}>
                <ScrollView nestedScrollEnabled={true}>
                  {filteredPatients.length > 0 ? (
                    filteredPatients.map((p) => (
                      <TouchableOpacity
                        key={p.id}
                        style={tw`px-4 py-3 border-b border-[#f1f5f9] flex-row justify-between items-center ${selectedPatientId === p.id ? 'bg-[#e0f2f1]' : 'hover:bg-gray-50'}`}
                        onPress={() => handleSelectPatient(p)}
                      >
                        <Text style={tw`${selectedPatientId === p.id ? 'text-[#1ba39a] font-semibold' : 'text-gray-700'} text-sm`}>
                          {p.name}
                        </Text>
                        {selectedPatientId === p.id && (
                          <Ionicons name="checkmark" size={16} color="#1ba39a" />
                        )}
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={tw`px-4 py-3`}>
                      <Text style={tw`text-gray-400 text-sm text-center`}>Pasien tidak ditemukan</Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            )}
          </View>
        </View>

        {/* Admission Type Selector */}
        <View style={tw`flex-1 bg-white p-4 rounded-xl shadow-sm border border-[#e2e8f0] max-w-md`}>
          <Text style={tw`text-[#64748b] text-base mb-2 font-medium`}>Tipe Layanan: </Text>
          <View style={tw`flex-row gap-2`}>
            {[
              { id: 'rawat_jalan', label: 'Rawat Jalan' },
              { id: 'rawat_inap', label: 'Rawat Inap' },
              { id: 'igd', label: 'IGD' }
            ].map((adm) => (
              <TouchableOpacity 
                key={adm.id} 
                style={tw`px-4 py-1.5 rounded-lg ${admissionType === adm.id ? 'bg-[#1ba39a]' : 'bg-gray-100'}`}
                onPress={() => setAdmissionType(adm.id as any)}
              >
                <Text style={tw`${admissionType === adm.id ? 'text-white' : 'text-gray-600'} text-sm font-medium`}>{adm.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={tw`bg-white rounded-2xl p-8 shadow-sm border border-[#e2e8f0]`}>
        
        <View style={tw`bg-[#f8fafc] rounded-xl p-1.5 flex-row mb-10 w-full max-w-2xl`}>
          <TouchableOpacity 
            style={[tw`flex-1 py-3 rounded-xl flex-row items-center justify-center`, activeTab === 'Pemeriksaan' ? tw`bg-[#1ba39a]` : tw`bg-transparent`]}
            onPress={() => setActiveTab('Pemeriksaan')}
          >
            {activeTab === 'Pemeriksaan' && <Ionicons name="medical-outline" size={16} color="white" style={tw`mr-2`} />}
            <Text style={[tw`font-medium`, activeTab === 'Pemeriksaan' ? tw`text-white` : tw`text-[#64748b]`]}>Pemeriksaan</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[tw`flex-1 py-3 rounded-xl flex-row items-center justify-center`, activeTab === 'Laboratorium' ? tw`bg-[#1ba39a]` : tw`bg-transparent`]}
            onPress={() => setActiveTab('Laboratorium')}
          >
            {activeTab === 'Laboratorium' && <Ionicons name="flask-outline" size={16} color="white" style={tw`mr-2`} />}
            <Text style={[tw`font-medium`, activeTab === 'Laboratorium' ? tw`text-white` : tw`text-[#64748b]`]}>Laboratorium</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[tw`flex-1 py-3 rounded-xl flex-row items-center justify-center`, activeTab === 'Resep' ? tw`bg-[#1ba39a]` : tw`bg-transparent`]}
            onPress={() => setActiveTab('Resep')}
          >
            {activeTab === 'Resep' && <Ionicons name="medkit-outline" size={16} color="white" style={tw`mr-2`} />}
            <Text style={[tw`font-medium`, activeTab === 'Resep' ? tw`text-white` : tw`text-[#64748b]`]}>Resep</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'Pemeriksaan' && renderPemeriksaan()}
        {activeTab === 'Laboratorium' && renderLaboratorium()}
        {activeTab === 'Resep' && renderResep()}

      </View>
    </ScrollView>
  );
}
