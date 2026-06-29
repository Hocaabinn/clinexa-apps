import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import tw from 'twrnc';
import { useRouter } from 'expo-router';

export default function RiwayatAktivitasScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={tw`flex-1 bg-white relative`}>
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
              Riwayat Aktivitas
            </Text>

            {/* Search Icon */}
            <TouchableOpacity
              style={tw`w-10 h-10 rounded-full bg-white/20 items-center justify-center`}
              activeOpacity={0.8}
            >
              <Ionicons name="search" size={20} color="white" />
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
              <Text style={tw`text-[#16a34a] text-xs font-bold mb-1`}>Aktif</Text>
              <Text style={tw`text-[#16a34a] text-2xl font-extrabold`}>2</Text>
            </View>

            {/* Disetujui Counter */}
            <View style={tw`flex-1 items-center border-r border-gray-100`}>
              <Text style={tw`text-[#3b82f6] text-xs font-bold mb-1`}>Disetujui</Text>
              <Text style={tw`text-[#3b82f6] text-2xl font-extrabold`}>2</Text>
            </View>

            {/* Ditolak Counter */}
            <View style={tw`flex-1 items-center`}>
              <Text style={tw`text-[#ef4444] text-xs font-bold mb-1`}>Ditolak</Text>
              <Text style={tw`text-[#ef4444] text-2xl font-extrabold`}>1</Text>
            </View>
          </View>
        </View>

        {/* Activity Cards List */}
        <View style={tw`px-5 gap-6`}>
          {/* Card 1: Dr. Adrian Wijaya (Aktif) */}
          <View style={[
            tw`bg-white rounded-[32px] p-5 border border-gray-100/60`,
            { elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.01, shadowRadius: 3 }
          ]}>
            <View style={tw`flex-row justify-between items-start mb-4`}>
              <View style={tw`flex-row items-center flex-1 pr-2`}>
                <View style={tw`w-12 h-12 rounded-full bg-[#dcfce7] items-center justify-center mr-3.5`}>
                  <MaterialCommunityIcons name="briefcase-plus" size={22} color="#16a34a" />
                </View>
                <View style={tw`flex-1`}>
                  <Text style={tw`text-gray-800 font-extrabold text-base mb-1`}>Dr. Adrian Wijaya, Sp.JP</Text>
                  <Text style={tw`text-gray-400 text-sm font-semibold`}>RS Jantung Harapan Kita</Text>
                </View>
              </View>
              <View style={tw`border border-[#22c55e] px-3 py-1 rounded-full`}>
                <Text style={tw`text-[#22c55e] text-[10px] font-bold`}>AKTIF</Text>
              </View>
            </View>

            {/* Duration pill row */}
            <View style={tw`bg-[#f8fafc] rounded-2xl py-3 px-4 flex-row justify-between items-center mb-4`}>
              <View style={tw`flex-row items-center`}>
                <Ionicons name="time-outline" size={15} color="#64748b" style={tw`mr-1.5`} />
                <Text style={tw`text-gray-500 text-xs font-semibold`}>Berlaku s/d 14 Mar, 18:00</Text>
              </View>
              <View style={tw`flex-row items-center`}>
                <Ionicons name="lock-closed-outline" size={14} color="#64748b" style={tw`mr-1`} />
                <Text style={tw`text-gray-500 text-xs font-semibold`}>Full Access</Text>
              </View>
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              style={tw`bg-[#ef4444] py-3.5 rounded-2xl flex-row items-center justify-center`}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle-outline" size={18} color="white" style={tw`mr-2`} />
              <Text style={tw`text-white font-extrabold text-sm`}>Batalkan Akses</Text>
            </TouchableOpacity>
          </View>

          {/* Card 2: Dr. Sarah Quinn (Selesai) */}
          <View style={[
            tw`bg-white rounded-[32px] p-5 border border-gray-100/60`,
            { elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.01, shadowRadius: 3 }
          ]}>
            <View style={tw`flex-row justify-between items-start mb-4`}>
              <View style={tw`flex-row items-center flex-1 pr-2`}>
                <View style={tw`w-12 h-12 rounded-full bg-gray-50 items-center justify-center mr-3.5`}>
                  <Ionicons name="person-outline" size={22} color="#64748b" />
                </View>
                <View style={tw`flex-1`}>
                  <Text style={tw`text-gray-800 font-extrabold text-base mb-1`}>Dr. Sarah Quinn, Sp.PD</Text>
                  <Text style={tw`text-gray-400 text-sm font-semibold`}>Klinik Medika Utama</Text>
                </View>
              </View>
              <View style={tw`border border-gray-300 px-3 py-1 rounded-full`}>
                <Text style={tw`text-gray-400 text-[10px] font-bold`}>SELESAI</Text>
              </View>
            </View>

            {/* Detail info row */}
            <View style={tw`flex-row justify-between items-center mt-2`}>
              <View style={tw`flex-row items-center`}>
                <Ionicons name="time-outline" size={15} color="#94a3b8" style={tw`mr-1.5`} />
                <Text style={tw`text-gray-400 text-xs font-semibold`}>10 Mar 2026 • 09:15</Text>
              </View>
              <TouchableOpacity>
                <Text style={tw`text-[#2ea89c] text-xs font-extrabold`}>Lihat Log</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Card 3: Lab Prodia Menteng (Ditolak) */}
          <View style={[
            tw`bg-white rounded-[32px] p-5 border border-gray-100/60`,
            { elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.01, shadowRadius: 3 }
          ]}>
            <View style={tw`flex-row justify-between items-start mb-3`}>
              <View style={tw`flex-row items-center flex-1 pr-2`}>
                <View style={tw`w-12 h-12 rounded-full bg-[#fef2f2] items-center justify-center mr-3.5`}>
                  <MaterialCommunityIcons name="shield-alert-outline" size={22} color="#ef4444" />
                </View>
                <View style={tw`flex-1`}>
                  <Text style={tw`text-gray-800 font-extrabold text-base mb-1`}>Lab Prodia Menteng</Text>
                  <Text style={tw`text-gray-400 text-sm font-semibold`}>Pusat Diagnostik</Text>
                </View>
              </View>
              <View style={tw`border border-[#ef4444] px-3 py-1 rounded-full`}>
                <Text style={tw`text-[#ef4444] text-[10px] font-bold`}>DITOLAK</Text>
              </View>
            </View>

            {/* Error reason and date */}
            <View style={tw`mt-2`}>
              <Text style={tw`text-[#ef4444] text-xs font-bold mb-3`}>
                Permintaan akses ditolak secara otomatis: Token Kedaluwarsa
              </Text>
              <View style={tw`flex-row items-center`}>
                <Ionicons name="calendar-outline" size={15} color="#94a3b8" style={tw`mr-1.5`} />
                <Text style={tw`text-gray-400 text-xs font-semibold`}>08 Mar 2026 • 14:30</Text>
              </View>
            </View>
          </View>
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
          <Text style={tw`text-gray-400 text-xs font-medium mt-1`}>Beranda</Text>
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
        <TouchableOpacity style={tw`items-center flex-1`} activeOpacity={0.7}>
          <MaterialCommunityIcons name="history" size={26} color="#2ea89c" />
          <Text style={tw`text-[#2ea89c] text-xs font-medium mt-1`}>Aktivitas</Text>
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

    </SafeAreaView>
  );
}
