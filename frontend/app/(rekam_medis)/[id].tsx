import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StatusBar, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import tw from 'twrnc';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as SecureStore from 'expo-secure-store';
import { callPatientAccess } from '../../lib/patient-api';
import { patientDataCache } from '../../constants/auth';

interface MedicalRecord {
  id: string;
  title: string;
  date: string;
  relativeDate: string;
  description: string;
  hash: string;
  type: 'Pemeriksaan' | 'Lab' | 'Resep';
  imageUrl: string;
  doctorName?: string;
  hospitalName?: string;
  disease?: string;
  detailTime?: string;
  bloodPressure?: string;
  heartRate?: string;
  temperature?: string;
  oxygenSaturation?: string;
  weight?: string;
  height?: string;
  therapy?: string;
  chiefComplaint?: string;
  notes?: string;
  labType?: string;
  labDate?: string;
  labNotes?: string;
  prescriptions?: any[];
  prescriptionNotes?: string;
}

const mockRecords: Record<string, MedicalRecord> = {
  '1': {
    id: '1',
    title: 'Pemeriksaan Jantung',
    date: '4 Feb 2026',
    relativeDate: '6 Days ago',
    description: 'Routine follow up for blood pressure management, Patient showing steady improvement. Blood pressure recorded at 120/80 mmHg. Heart rate is normal at 72 bpm. Next follow-up is recommended in 3 months. Maintain low-sodium diet and continue daily light exercises.',
    hash: '0x8a2f9cff7s871h1901a89b9101d1c92',
    type: 'Pemeriksaan',
    imageUrl: 'https://images.unsplash.com/photo-1530026405186-ed1ea0ac7a63?w=600&auto=format&fit=crop&q=80',
    doctorName: 'Dr. Agung Setya',
    hospitalName: 'RS Semen Gresik',
    disease: 'Hipertensi Esensial (Darah Tinggi)',
    detailTime: '10:30 WIB',
  },
  '2': {
    id: '2',
    title: 'Tes Laboratorium',
    date: '4 Feb 2026',
    relativeDate: '6 Days ago',
    description: 'Complete blood count (CBC) and lipid panel test. All parameters are within the standard range. Cholesterol levels: Total Cholesterol: 180 mg/dL, HDL: 50 mg/dL, LDL: 110 mg/dL. Blood glucose is stable at 90 mg/dL (fasting). No signs of anemia or infection detected.',
    hash: '0x8a2f9cff7s871h1901a89b9101d1c92',
    type: 'Lab',
    imageUrl: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=600&auto=format&fit=crop&q=80',
    doctorName: 'Dr. Agung Setya',
    hospitalName: 'RS Semen Gresik',
    disease: 'Dislipidemia & Pemantauan Diabetes',
    detailTime: '08:15 WIB',
  },
  '3': {
    id: '3',
    title: 'Resep Obat',
    date: '4 Feb 2026',
    relativeDate: '6 Days ago',
    description: 'Prescription for blood pressure management. 1. Amlodipine 5mg - once daily in the morning. 2. Vitamin B Complex - once daily after meal. Please ensure to consume the medication regularly at the same time every day. Avoid drinking alcohol or grapefruit juice while on this medication.',
    hash: '0x8a2f9cff7s871h1901a89b9101d1c92',
    type: 'Resep',
    imageUrl: 'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=600&auto=format&fit=crop&q=80',
    doctorName: 'Dr. Agung Setya',
    hospitalName: 'RS Semen Gresik',
    disease: 'Hipertensi Esensial (Darah Tinggi)',
    detailTime: '10:45 WIB',
  },
};

export default function RecordDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [record, setRecord] = useState<MedicalRecord | null>(id ? mockRecords[id] ?? null : null);
  const [patientName, setPatientName] = useState<string>('Memuat...');
  const [loadingRecord, setLoadingRecord] = useState(Boolean(id && !mockRecords[id]));
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);

  useEffect(() => {
    const formatRecord = (doc: any): MedicalRecord => {
      const type: MedicalRecord['type'] =
        doc.record_type === 'laboratorium' ? 'Lab' :
        doc.record_type === 'resep' ? 'Resep' : 'Pemeriksaan';

      return {
        id: String(doc.id),
        title: doc.title || doc.diagnosis || (type === 'Lab' ? `Tes ${doc.lab_type || 'Laboratorium'}` : type === 'Resep' ? 'Resep Obat' : 'Pemeriksaan Medis'),
        date: doc.created_at ? new Date(doc.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Terbaru',
        relativeDate: 'Terbaru',
        description: doc.notes || doc.lab_notes || doc.prescription_notes || doc.therapy || doc.chief_complaint || 'Hasil pemeriksaan dan catatan medis pasien.',
        hash: doc.blockchain_hash || doc.hash || doc.tx_hash || '0x0000000000...0000',
        type,
        imageUrl: doc.image_url || 'https://images.unsplash.com/photo-1530026405186-ed1ea0ac7a63?w=600&auto=format&fit=crop&q=80',
        doctorName: doc.staff?.name || doc.doctor_name || doc.doctor || 'Dr. Agung Setya',
        hospitalName: doc.staff?.institution || doc.hospital_name || 'RS Semen Gresik',
        disease: doc.diagnosis || '-',
        detailTime: doc.created_at ? new Date(doc.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : undefined,
        bloodPressure: doc.blood_pressure,
        heartRate: doc.heart_rate,
        temperature: doc.temperature,
        oxygenSaturation: doc.oxygen_saturation,
        weight: doc.weight,
        height: doc.height,
        therapy: doc.therapy,
        chiefComplaint: doc.chief_complaint,
        notes: doc.notes,
        labType: doc.lab_type,
        labDate: doc.lab_date,
        labNotes: doc.lab_notes,
        prescriptions: doc.prescriptions,
        prescriptionNotes: doc.prescription_notes,
      };
    };

    const loadPatientRecord = async () => {
      try {
        const cached = patientDataCache.get();
        if (cached && cached.name) {
          setPatientName(cached.name);
        }

        const nik = await SecureStore.getItemAsync('user_nik');
        if (nik) {
          const walletAddress = await SecureStore.getItemAsync('user_wallet_address');

          if (id && !mockRecords[id]) {
            const data = await callPatientAccess<{ patient: { id: string; name: string }; record: any }>('get_record', {
              nik,
              wallet_address: walletAddress,
              record_id: id,
            });
            setPatientName(data.patient.name);
            patientDataCache.set(data.patient);
            setRecord(formatRecord(data.record));
          } else if (!cached?.name) {
            const data = await callPatientAccess<{ id: string; name: string }>('get_patient', {
              nik,
              wallet_address: walletAddress,
            });
            setPatientName(data.name);
            patientDataCache.set(data);
          }
        } else {
          setPatientName('Pasien Clinexa');
        }
      } catch (err) {
        console.error('Failed to load patient name:', err);
        setPatientName('Pasien Clinexa');
      } finally {
        setLoadingRecord(false);
      }
    };
    loadPatientRecord();
  }, [id]);

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    alert('Hash ID disalin ke clipboard');
  };

  const handleDownloadPDF = async () => {
    if (!record) return;
    try {
      setIsPdfGenerating(true);
      const htmlContent = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body {
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                padding: 40px;
                color: #1e293b;
                background-color: #ffffff;
              }
              .header-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 30px;
                border-bottom: 2px solid #1ba098;
                padding-bottom: 20px;
              }
              .header-logo {
                font-size: 28px;
                font-weight: 800;
                color: #1ba098;
              }
              .header-title {
                font-size: 14px;
                color: #64748b;
                text-align: right;
                font-weight: bold;
                letter-spacing: 0.05em;
              }
              h1 {
                font-size: 24px;
                color: #0f172a;
                margin-bottom: 10px;
                font-weight: 800;
              }
              .meta-row {
                font-size: 14px;
                color: #64748b;
                margin-bottom: 25px;
              }
              .badge {
                padding: 4px 12px;
                border-radius: 12px;
                font-weight: bold;
                display: inline-block;
                font-size: 12px;
                margin-left: 10px;
              }
              .badge-Pemeriksaan { background-color: #eff6ff; color: #1d4ed8; }
              .badge-Lab { background-color: #fef2f2; color: #dc2626; }
              .badge-Resep { background-color: #f0fdf4; color: #16a34a; }
              
              .section-title {
                font-size: 15px;
                font-weight: 800;
                color: #0f172a;
                margin-top: 30px;
                margin-bottom: 12px;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                border-bottom: 1px solid #e2e8f0;
                padding-bottom: 6px;
              }
              
              .info-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 25px;
                font-size: 14px;
              }
              .info-table tr {
                border-bottom: 1px solid #f1f5f9;
              }
              .info-table td {
                padding: 10px 0;
              }
              .info-label {
                color: #64748b;
                width: 35%;
              }
              .info-value {
                font-weight: bold;
                color: #1e293b;
              }

              .hash-box {
                background-color: #f8fafc;
                border: 1px solid #e2e8f0;
                padding: 20px;
                border-radius: 16px;
                margin: 25px 0;
              }
              .hash-title {
                font-size: 11px;
                color: #94a3b8;
                font-weight: 800;
                letter-spacing: 0.05em;
                margin-bottom: 6px;
              }
              .hash-value {
                font-family: monospace;
                font-size: 13px;
                color: #334155;
                word-break: break-all;
              }

              .content-box {
                background-color: #f8fafc;
                border: 1px solid #f1f5f9;
                padding: 20px;
                border-radius: 16px;
                font-size: 14px;
                line-height: 1.6;
                color: #334155;
              }
              .footer {
                margin-top: 60px;
                font-size: 11px;
                color: #94a3b8;
                text-align: center;
                border-top: 1px solid #f1f5f9;
                padding-top: 20px;
                line-height: 1.5;
              }
            </style>
          </head>
          <body>
            <table class="header-table">
               <tr>
                 <td class="header-logo">CLINEXA</td>
                 <td class="header-title">DOKUMEN REKAM MEDIS DIGITAL</td>
               </tr>
            </table>
            
            <h1>${record.title}</h1>
            <div class="meta-row">
              Kategori: <span class="badge badge-${record.type}">${record.type.toUpperCase()}</span>
            </div>
            
            <div class="section-title">Detail Pemeriksaan</div>
            <table class="info-table">
              <tr>
                <td class="info-label">Nama Pasien</td>
                <td class="info-value">${patientName}</td>
              </tr>
              <tr>
                <td class="info-label">Dokter Pemeriksa</td>
                <td class="info-value">${record.doctorName || '-'}</td>
              </tr>
              <tr>
                <td class="info-label">Diagnosis Penyakit</td>
                <td class="info-value">${record.disease || '-'}</td>
              </tr>
              <tr>
                <td class="info-label">Waktu Pemeriksaan</td>
                <td class="info-value">${record.date} ${record.detailTime ? `, pukul ${record.detailTime}` : ''}</td>
              </tr>
            </table>

            <div class="hash-box">
              <div class="hash-title">VERIFIED BLOCKCHAIN HASH ID</div>
              <div class="hash-value">${record.hash}</div>
            </div>

            <div class="section-title">Hasil Medis & Saran Tindakan</div>
            <div class="content-box">
              ${record.description}
            </div>
            
            <div class="footer">
              Dokumen rekam medis ini dilindungi secara kriptografis menggunakan blockchain Clinexa.<br/>
              Validitas dokumen dapat dibuktikan melalui verifikasi tanda tangan digital yang terikat dengan identitas pasien.
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Download PDF ${record.title}`, UTI: 'com.adobe.pdf' });
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Gagal mendownload PDF rekam medis.');
    } finally {
      setIsPdfGenerating(false);
    }
  };

  if (loadingRecord) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white items-center justify-center`}>
        <ActivityIndicator size="large" color="#1ba098" />
        <Text style={tw`text-gray-500 font-bold text-base mt-4`}>Memuat rekam medis...</Text>
      </SafeAreaView>
    );
  }

  if (!record) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white items-center justify-center`}>
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" style={tw`mb-4`} />
        <Text style={tw`text-gray-500 font-bold text-base mb-4`}>Rekam medis tidak ditemukan</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={tw`bg-[#2ea89c] px-6 py-2.5 rounded-full`}
        >
          <Text style={tw`text-white font-bold`}>Kembali</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const badgeColor = 
    record.type === 'Pemeriksaan' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
    record.type === 'Lab' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100';

  const typeIcon = 
    record.type === 'Pemeriksaan' ? 'stethoscope' :
    record.type === 'Lab' ? 'flask-outline' : 'pill';

  return (
    <View style={tw`flex-1 bg-[#f8fafc]`}>
      <StatusBar barStyle="light-content" backgroundColor="#1ba098" />

      {/* Hero Header Area */}
      <View style={[tw`bg-[#1ba098] rounded-b-[40px] pb-28 px-6 relative`, { paddingTop: Platform.OS === 'android' ? 50 : 20 }]}>
        <View style={tw`absolute -top-20 -right-16 w-60 h-60 bg-white/10 rounded-full`} />
        <View style={tw`absolute -bottom-10 -left-10 w-40 h-40 bg-black/5 rounded-full`} />

        <View style={tw`flex-row justify-between items-center relative z-10`}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={tw`w-11 h-11 rounded-full bg-white/15 border border-white/10 items-center justify-center`}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={tw`items-center flex-1 mx-2`}>
            <Text style={tw`text-white font-extrabold text-lg tracking-tight text-center`} numberOfLines={1}>
              {record.title}
            </Text>
            <Text style={tw`text-teal-100 text-[11px] font-semibold mt-0.5`}>
              {record.date}
            </Text>
          </View>
          {/* Spacer to center the title */}
          <View style={tw`w-11 h-11`} />
        </View>
      </View>

      {/* Main Content Card Scroll */}
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        style={tw`-mt-12 px-6 flex-grow`}
        contentContainerStyle={tw`pb-24`}
      >

        {/* Action Callout: Blockchain Verified */}
        <View style={[
          tw`bg-teal-50 border border-teal-100 rounded-3xl p-5 mb-6 flex-row justify-between items-center`,
          {
            elevation: 2,
            shadowColor: '#1ba098',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.02,
            shadowRadius: 8,
          }
        ]}>
          <View style={tw`flex-row items-center flex-1 mr-4`}>
            <View style={tw`w-10 h-10 rounded-full bg-teal-100 items-center justify-center mr-3.5`}>
              <Ionicons name="shield-checkmark" size={20} color="#1ba098" />
            </View>
            <View style={tw`flex-1`}>
              <Text style={tw`text-teal-900 font-extrabold text-sm mb-0.5`}>Blockchain Verified</Text>
              <Text style={tw`text-teal-700/80 font-medium text-[11px]`} numberOfLines={1} ellipsizeMode="middle">{record.hash}</Text>
            </View>
          </View>
          <TouchableOpacity 
            onPress={() => copyToClipboard(record.hash)}
            style={tw`bg-teal-600/10 hover:bg-teal-600/25 px-4 py-2 rounded-xl`}
          >
            <Text style={tw`text-teal-700 font-bold text-xs`}>Salin</Text>
          </TouchableOpacity>
        </View>

        {/* Hospital & Doctor Info */}
        <View style={[
          tw`bg-white rounded-3xl p-6 border border-slate-100 mb-6`,
          {
            elevation: 3,
            shadowColor: '#0f172a',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.02,
            shadowRadius: 8,
          }
        ]}>
          <Text style={tw`text-slate-800 font-extrabold text-base mb-4 tracking-tight`}>Fasilitas Kesehatan & Dokter</Text>
          <View style={tw`flex-row items-center mb-4`}>
            <View style={tw`w-10 h-10 rounded-xl bg-slate-100 items-center justify-center mr-3`}>
              <Ionicons name="business" size={20} color="#1ba098" />
            </View>
            <View>
              <Text style={tw`text-slate-400 text-xs font-semibold`}>TEMPAT PEMERIKSAAN</Text>
              <Text style={tw`text-slate-800 font-bold text-sm`}>{record.hospitalName}</Text>
            </View>
          </View>
          <View style={tw`flex-row items-center`}>
            <View style={tw`w-10 h-10 rounded-xl bg-slate-100 items-center justify-center mr-3`}>
              <Ionicons name="person" size={20} color="#1ba098" />
            </View>
            <View>
              <Text style={tw`text-slate-400 text-xs font-semibold`}>DOKTER PEMERIKSA</Text>
              <Text style={tw`text-slate-800 font-bold text-sm`}>{record.doctorName}</Text>
            </View>
          </View>
        </View>

        {/* Diagnosis / Recommendation Section */}
        <View style={[
          tw`bg-white rounded-3xl p-6 border border-slate-100 mb-6`,
          {
            elevation: 3,
            shadowColor: '#0f172a',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.02,
            shadowRadius: 8,
          }
        ]}>
          <Text style={tw`text-slate-800 font-extrabold text-base mb-4 tracking-tight`}>Detail Rekam Medis</Text>
          
          {record.type === 'Pemeriksaan' && (
            <View style={tw`gap-4`}>
              {record.chiefComplaint ? (
                <View>
                  <Text style={tw`text-[#94a3b8] text-xs font-bold tracking-wider mb-1`}>KELUHAN UTAMA</Text>
                  <Text style={tw`text-[#475569] text-sm`}>{record.chiefComplaint}</Text>
                </View>
              ) : null}
              {record.disease ? (
                <View>
                  <Text style={tw`text-[#94a3b8] text-xs font-bold tracking-wider mb-1`}>DIAGNOSIS</Text>
                  <Text style={tw`text-[#475569] text-sm`}>{record.disease}</Text>
                </View>
              ) : null}
              {record.therapy ? (
                <View>
                  <Text style={tw`text-[#94a3b8] text-xs font-bold tracking-wider mb-1`}>TERAPI / TINDAKAN</Text>
                  <Text style={tw`text-[#475569] text-sm`}>{record.therapy}</Text>
                </View>
              ) : null}
              
              <View style={tw`flex-row flex-wrap border-t border-slate-100 pt-4 mt-2`}>
                {record.bloodPressure ? (
                  <View style={tw`w-1/3 mb-4`}>
                    <Text style={tw`text-[#94a3b8] text-xs font-bold tracking-wider mb-1`}>TENSI</Text>
                    <Text style={tw`text-[#0b4771] font-bold`}>{record.bloodPressure} mmHg</Text>
                  </View>
                ) : null}
                {record.heartRate ? (
                  <View style={tw`w-1/3 mb-4`}>
                    <Text style={tw`text-[#94a3b8] text-xs font-bold tracking-wider mb-1`}>NADI</Text>
                    <Text style={tw`text-[#0b4771] font-bold`}>{record.heartRate} bpm</Text>
                  </View>
                ) : null}
                {record.temperature ? (
                  <View style={tw`w-1/3 mb-4`}>
                    <Text style={tw`text-[#94a3b8] text-xs font-bold tracking-wider mb-1`}>SUHU</Text>
                    <Text style={tw`text-[#0b4771] font-bold`}>{record.temperature} °C</Text>
                  </View>
                ) : null}
                {record.oxygenSaturation ? (
                  <View style={tw`w-1/3 mb-2`}>
                    <Text style={tw`text-[#94a3b8] text-xs font-bold tracking-wider mb-1`}>SATURASI O2</Text>
                    <Text style={tw`text-[#0b4771] font-bold`}>{record.oxygenSaturation} %</Text>
                  </View>
                ) : null}
                {record.weight ? (
                  <View style={tw`w-1/3 mb-2`}>
                    <Text style={tw`text-[#94a3b8] text-xs font-bold tracking-wider mb-1`}>BERAT</Text>
                    <Text style={tw`text-[#0b4771] font-bold`}>{record.weight} kg</Text>
                  </View>
                ) : null}
                {record.height ? (
                  <View style={tw`w-1/3 mb-2`}>
                    <Text style={tw`text-[#94a3b8] text-xs font-bold tracking-wider mb-1`}>TINGGI</Text>
                    <Text style={tw`text-[#0b4771] font-bold`}>{record.height} cm</Text>
                  </View>
                ) : null}
              </View>

              {record.notes ? (
                <View style={tw`border-t border-slate-100 pt-4`}>
                  <Text style={tw`text-[#94a3b8] text-xs font-bold tracking-wider mb-1`}>CATATAN TAMBAHAN</Text>
                  <Text style={tw`text-[#475569] text-sm`}>{record.notes}</Text>
                </View>
              ) : null}
            </View>
          )}

          {record.type === 'Lab' && (
            <View style={tw`gap-4`}>
              <View>
                <Text style={tw`text-[#94a3b8] text-xs font-bold tracking-wider mb-1`}>JENIS LAB</Text>
                <Text style={tw`text-[#0b4771] font-bold text-base`}>{record.labType || '-'}</Text>
              </View>
              {record.labNotes ? (
                <View style={tw`border-t border-slate-100 pt-4`}>
                  <Text style={tw`text-[#94a3b8] text-xs font-bold tracking-wider mb-1`}>CATATAN KLINIS</Text>
                  <Text style={tw`text-[#475569] text-sm`}>{record.labNotes}</Text>
                </View>
              ) : null}
            </View>
          )}

          {record.type === 'Resep' && (
            <View style={tw`gap-4`}>
              <Text style={tw`text-[#94a3b8] text-xs font-bold tracking-wider`}>DAFTAR OBAT</Text>
              {Array.isArray(record.prescriptions) && record.prescriptions.length > 0 ? (
                <View style={tw`gap-3`}>
                  {record.prescriptions.map((p: any, idx: number) => (
                    <View key={idx} style={tw`bg-[#f8fafc] p-4 rounded-xl flex-row items-center`}>
                      <Ionicons name="medkit" size={24} color="#1ba098" style={tw`mr-4`} />
                      <View style={tw`flex-1`}>
                        <Text style={tw`text-[#0b4771] font-bold text-sm`}>{p.name}</Text>
                        <Text style={tw`text-[#64748b] text-xs`}>{p.dose} • {p.freq}</Text>
                      </View>
                      <Text style={tw`text-[#475569] text-xs max-w-[150px] text-right`}>{p.instructions}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={tw`text-[#475569] text-sm`}>Tidak ada data obat terlampir.</Text>
              )}
              {record.prescriptionNotes ? (
                <View style={tw`border-t border-slate-100 pt-4`}>
                  <Text style={tw`text-[#94a3b8] text-xs font-bold tracking-wider mb-1`}>CATATAN APOTEKER</Text>
                  <Text style={tw`text-[#475569] text-sm`}>{record.prescriptionNotes}</Text>
                </View>
              ) : null}
            </View>
          )}

          {!record.type && (
            <View style={tw`bg-slate-50/50 rounded-2xl p-4 border border-slate-100/50`}>
              <Text style={tw`text-slate-600 text-sm leading-relaxed font-medium`}>
                {record.description}
              </Text>
            </View>
          )}
        </View>

        {/* Floating Download PDF Button */}
        <TouchableOpacity
          onPress={handleDownloadPDF}
          disabled={isPdfGenerating}
          style={[
            tw`bg-[#1ba098] rounded-2xl py-4 flex-row justify-center items-center`,
            {
              elevation: 4,
              shadowColor: '#1ba098',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
            }
          ]}
          activeOpacity={0.8}
        >
          {isPdfGenerating ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons name="document-text-outline" size={20} color="white" style={tw`mr-2`} />
              <Text style={tw`text-white font-extrabold text-base`}>Unduh Laporan PDF</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
