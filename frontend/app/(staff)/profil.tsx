import React from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
export default function StaffProfile() {
    return (
        <ScrollView style={tw`flex-1 bg-[#f4f6f8]`}>
            <View style={tw`p-10 max-w-5xl mx-auto w-full`}>
                <View style={tw`flex-row justify-between items-center mb-8`}>
                    <Text style={tw`text-[#0b4771] text-3xl font-medium`}>Profil</Text>
                    <TouchableOpacity style={tw`bg-[#1ba39a] flex-row items-center px-5 py-2.5 rounded-xl`}>
                        <Ionicons name="pencil" size={18} color="white" />
                        <Text style={tw`text-white font-medium ml-2`}>Edit Profil</Text>
                    </TouchableOpacity>
                </View>
                <View style={tw`bg-white rounded-2xl p-6 flex-row items-center mb-6`}>
                    <View style={tw`bg-[#2fc4bf] w-24 h-24 rounded-2xl items-center justify-center mr-6`}>
                        <Text style={tw`text-white text-2xl font-medium`}>AS</Text>
                    </View>

                    <View style={tw`flex-1`}>
                        <Text style={tw`text-[#0b4771] text-2xl font-medium mb-1`}>Dr. Agung Setya</Text>
                        <Text style={tw`text-[#1ba39a] text-base font-medium mb-2`}>Dokter Umum</Text>
                        <View style={tw`flex-row items-center mb-3`}>
                            <Ionicons name="business-outline" size={16} color="#9aa5b5" />
                            <Text style={tw`text-[#9aa5b5] ml-1.5 font-light`}>RS Harapan Sehat Surabaya</Text>
                        </View>
                        <View style={tw`flex-row gap-3`}>
                            <View style={tw`bg-[#e0f6f4] flex-row items-center px-3 py-1.5 rounded-full`}>
                                <Ionicons name="checkmark-circle" size={16} color="#1ba39a" />
                                <Text style={tw`text-[#1ba39a] font-medium text-xs ml-1`}>Terverifikasi</Text>
                            </View>
                            <View style={tw`bg-[#f4f6f8] px-4 py-1.5 rounded-full`}>
                                <Text style={tw`text-[#6d7f95] font-medium text-xs`}>Aktif</Text>
                            </View>
                        </View>
                    </View>
                </View>
                <View style={[tw`flex-row gap-5 mb-8`, { flexWrap: Platform.OS === 'web' ? 'nowrap' as const : 'wrap' as const }]}>
                    <StatCard value="1,284" label="Total Pasien" />
                    <StatCard value="3,901" label="Rekam Medis" />
                    <StatCard value="847" label="Janji Selesai" />
                    <StatCard value="47" label="Akses Diberikan" />
                </View>
                <View style={tw`bg-white rounded-2xl p-8`}>
                    <View style={[tw`flex-row gap-6 mb-6`, { flexDirection: Platform.OS === 'web' ? 'row' as const : 'column' as const }]}>
                        <FormField label="NAMA LENGKAP" value="Dr. Agung Setya, S.Kom" icon="person-outline" flex={1} />
                        <FormField label="GOLONGAN DARAH" value="B+" icon="water-outline" flex={1} />
                    </View>
                    <View style={[tw`flex-row gap-6 mb-6`, { flexDirection: Platform.OS === 'web' ? 'row' as const : 'column' as const }]}>
                        <FormField label="EMAIL" value="yourname@domain" icon="mail-outline" flex={1} />
                        <FormField label="PASSWORD" value="***********" icon="key-outline" flex={1} secure />
                    </View>
                    <View style={[tw`flex-row gap-6 mb-6`, { flexDirection: Platform.OS === 'web' ? 'row' as const : 'column' as const }]}>
                        <FormField label="JABATAN/SPESIALISASI" value="Dokter Umum" icon="briefcase-outline" flex={1} />
                        <FormField label="KEWARGANEGARAAN" value="WNI (Warga Negara Indonesia)" icon="globe-outline" flex={1} />
                    </View>
                    <View style={[tw`flex-row gap-6 mb-6`, { flexDirection: Platform.OS === 'web' ? 'row' as const : 'column' as const }]}>
                        <FormField label="NIP/NO. REGISTRASI" value="19860102010011001" icon="card-outline" flex={1} />
                        <FormField label="INSTITUSI" value="RS Semen Gresik" icon="business-outline" flex={1} />
                    </View>
                    <View style={tw`mb-2`}>
                        <FormField label="ALAMAT LENGKAP" value="Jl Kartini, Kebomas, Gresik, Jawa TImur 61111" icon="location-outline" flex={1} />
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}
function StatCard({ value, label }: { value: string, label: string }) {
    return (
        <View style={tw`flex-1 bg-white p-6 rounded-2xl items-center justify-center min-w-[150px]`}>
            <Text style={tw`text-[#0b4771] text-3xl font-medium mb-2`}>{value}</Text>
            <Text style={tw`text-[#9aa5b5] text-sm font-light`}>{label}</Text>
        </View>
    );
}
function FormField({ label, value, icon, flex, secure }: { label: string, value: string, icon: string, flex?: number, secure?: boolean }) {
    return (
        <View style={tw`flex-${flex || 'none'}`}>
            <Text style={tw`text-[#0b4771] text-sm font-medium mb-2`}>{label}</Text>
            <View style={tw`flex-row items-center border border-[#d8dee8] rounded-xl px-4 h-14 bg-white`}>
                <Ionicons name={icon as any} size={20} color="#9aa5b5" />
                <TextInput
                    style={tw`flex-1 ml-3 text-[#9aa5b5] text-base outline-none`}
                    value={value}
                    editable={false}
                    secureTextEntry={secure}
                />
            </View>
        </View>
    );
}