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
import { supabase } from '../../lib/supabase';
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
  disease?: string;
  detailTime?: string;
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
    doctorName: 'dr. Sarah Wijaya, Sp.PD',
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
    doctorName: 'dr. Sarah Wijaya, Sp.PD',
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
    doctorName: 'dr. Sarah Wijaya, Sp.PD',
    disease: 'Hipertensi Esensial (Darah Tinggi)',
    detailTime: '10:45 WIB',
  },
};

export default function RecordDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const record = id ? mockRecords[id] : null;
  const [patientName, setPatientName] = useState<string>('Memuat...');
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);

  useEffect(() => {
    const loadPatientName = async () => {
      try {
        const cached = patientDataCache.get();
        if (cached && cached.name) {
          setPatientName(cached.name);
          return;
        }

        const nik = await SecureStore.getItemAsync('user_nik');
        if (nik) {
          const { data, error } = await supabase
            .from('patients')
            .select('name')
            .eq('nik', nik)
            .single();

          if (data && !error) {
            setPatientName(data.name);
            patientDataCache.set({ id: cached?.id || '', name: data.name });
          } else {
            setPatientName('Pasien Clinexa');
          }
        } else {
          setPatientName('Pasien Clinexa');
        }
      } catch (err) {
        console.error('Failed to load patient name:', err);
        setPatientName('Pasien Clinexa');
      }
    };
    loadPatientName();
  }, []);

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
          <Text style={tw`text-slate-800 font-extrabold text-base mb-4 tracking-tight`}>Hasil & Rekomendasi Medis</Text>
          <View style={tw`bg-slate-50/50 rounded-2xl p-4 border border-slate-100/50`}>
            <Text style={tw`text-slate-600 text-sm leading-relaxed font-medium`}>
              {record.description}
            </Text>
          </View>
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
