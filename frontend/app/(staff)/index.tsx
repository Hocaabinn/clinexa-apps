import React from 'react';
import { View, Text, ScrollView, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';

function LegendItem({ color, label, value }: { color: string, label: string, value: string }) {
    return (
        <View style={tw`flex-row items-center justify-between mb-4 w-full`}>
            <View style={tw`flex-row items-center`}>
                <View style={[tw`w-3 h-3 rounded-full mr-3`, { backgroundColor: color }]} />
                <Text style={tw`text-[#64748b] text-sm font-medium`}>{label}</Text>
            </View>
            <Text style={tw`text-[#0b4771] font-semibold text-sm ml-6`}>{value}</Text>
        </View>
    );
}

export default function StaffDashboard() {
    return (
        <ScrollView style={tw`flex-1 bg-[#f4f6f8]`}>
            <View style={tw`p-10 max-w-7xl mx-auto w-full`}>
                <View style={tw`mb-8`}>
                    <Text style={tw`text-[#0b4771] text-3xl font-medium mb-1`}>Dashboard</Text>
                    <Text style={tw`text-[#0b4771] text-base font-light`}>Sabtu, 14 Maret 2026</Text>
                </View>
                <View style={[tw`flex-row gap-5 mb-8`, { flexWrap: Platform.OS === 'web' ? 'nowrap' as const : 'wrap' as const }]}>
                    <StatCard title="Pasien Aktif" value="10" delta="+12 bulan ini" icon="people" color="teal" />
                    <StatCard title="Menunggu Izin" value="1" delta="+12 bulan ini" icon="person-add" color="amber" />
                    <StatCard title="Pasien Berkunjung" value="1,284" delta="+12 bulan ini" icon="people-circle" color="green" />
                    <StatCard title="Rekam Medis" value="1,284" delta="+12 bulan ini" icon="document-text" color="violet" />
                </View>
                <View style={[tw`flex-row gap-5 mb-8`, { flexDirection: Platform.OS === 'web' ? 'row' as const : 'column' as const }]}>

                    <View style={tw`flex-1 bg-white p-6 rounded-2xl`}>
                        <Text style={tw`text-[#0b4771] text-xl font-medium mb-5`}>Aktivitas Terkini</Text>

                        <ActivityItem
                            icon="checkmark" iconColor="bg-[#ccf9df] text-[#18d876]"
                            title="Budi Santoso Menyetujui Akses Rekam Medis" time="5 menit lalu"
                        />
                        <ActivityItem
                            icon="checkmark" iconColor="bg-[#ccf9df] text-[#18d876]"
                            title="Ramos Menyetujui Akses Rekam Medis" time="1 jam lalu"
                        />
                        <ActivityItem
                            icon="close" iconColor="bg-[#ffdada] text-[#ff4d4f]"
                            title="Ahmad Fauzi Menolak Permintaan Akses" time="1 jam lalu"
                        />
                        <ActivityItem
                            icon="document-text" iconColor="bg-[#e5d8ff] text-[#8b5cf6]"
                            title="Rekam Medis Baru Diunggah - Tes Laboratorium" time="2 jam lalu"
                        />
                    </View>
                    <View style={tw`flex-1 bg-white p-6 rounded-2xl`}>
                        <Text style={tw`text-[#0b4771] text-xl font-medium mb-5`}>Menunggu Konfirmasi</Text>

                        {[1, 2, 3].map((_, idx) => (
                            <View key={idx} style={tw`bg-[#f8fafc] rounded-xl p-4 flex-row items-center mb-3`}>
                                <View style={tw`bg-[#1ba39a] w-12 h-12 rounded-xl items-center justify-center mr-4`}>
                                    <Text style={tw`text-white font-medium text-lg`}>HW</Text>
                                </View>
                                <View style={tw`flex-1`}>
                                    <Text style={tw`text-[#0b4771] font-medium text-base mb-1`}>Hendra Wijaya</Text>
                                    <Text style={tw`text-[#9aa5b5] text-sm font-light`}>15 Mar 2026 · 10.00 WIB</Text>
                                </View>
                                <Text style={tw`text-[#9aa5b5] text-sm font-light`}>Konsultasi Umum</Text>
                            </View>
                        ))}
                    </View>
                </View>
                <View style={[tw`flex-row gap-5`, { flexDirection: Platform.OS === 'web' ? 'row' as const : 'column' as const }]}>
                    <View style={[tw`bg-white p-7 rounded-3xl min-h-[350px]`, { flex: 1.8 }]}>
                        <Text style={tw`text-[#0b4771] text-xl font-semibold`}>Kunjungan Pasien</Text>
                        <Text style={tw`text-[#9aa5b5] text-sm mb-8 font-medium`}>Tren 6 Bulan Terakhir</Text>
                        <View style={tw`flex-1 items-center justify-center`}>
                            <Image
                                source={{ uri: `data:image/svg+xml;base64,${typeof window !== 'undefined' ? window.btoa(areaChartSvg) : ''}` }}
                                style={{ width: '100%', height: 280 }}
                                resizeMode="contain"
                            />
                        </View>
                    </View>
                    <View style={[tw`bg-white p-7 rounded-3xl min-h-[350px]`, { flex: 1.2 }]}>
                        <Text style={tw`text-[#0b4771] text-xl font-semibold`}>Jenis Rekam Medis</Text>
                        <Text style={tw`text-[#9aa5b5] text-sm mb-6 font-medium`}>Distribusi Bulan Ini</Text>
                        <View style={tw`flex-1 flex-row items-center justify-center`}>
                            <Image
                                source={{ uri: `data:image/svg+xml;base64,${typeof window !== 'undefined' ? window.btoa(donutChartSvg) : ''}` }}
                                style={{ width: 160, height: 160 }}
                                resizeMode="contain"
                            />
                            <View style={tw`ml-8 flex-1`}>
                                <LegendItem color="#1ba39a" label="Rawat Jalan" value="45%" />
                                <LegendItem color="#8b5cf6" label="Rawat Inap" value="25%" />
                                <LegendItem color="#18d876" label="IGD" value="20%" />
                                <LegendItem color="#ff9f1c" label="Lainnya" value="10%" />
                            </View>
                        </View>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}
function StatCard({ title, value, delta, icon, color }: { title: string, value: string, delta: string, icon: string, color: 'teal' | 'amber' | 'green' | 'violet' }) {
    const colorMap = {
        teal: { bg: 'bg-[#e0f6f4]', text: 'text-[#1ba39a]' },
        amber: { bg: 'bg-[#fff5e6]', text: 'text-[#ff9f1c]' },
        green: { bg: 'bg-[#e8fbf1]', text: 'text-[#18d876]' },
        violet: { bg: 'bg-[#f4f0ff]', text: 'text-[#8b5cf6]' },
    };
    return (
        <View style={tw`flex-1 bg-white p-6 rounded-2xl min-w-[200px]`}>
            <View style={tw`flex-row justify-between items-start mb-6`}>
                <View style={tw`${colorMap[color].bg} w-12 h-12 rounded-xl items-center justify-center`}>
                    <Ionicons name={icon as any} size={24} color={colorMap[color].text.replace('text-[', '').replace(']', '')} />
                </View>
                <Ionicons name="trending-up" size={20} color={colorMap[color].text.replace('text-[', '').replace(']', '')} />
            </View>
            <Text style={tw`text-[#0b4771] text-4xl font-medium mb-1`}>{value}</Text>
            <Text style={tw`text-[#0b4771] text-base font-light mb-2`}>{title}</Text>
            <Text style={tw`${colorMap[color].text} text-sm font-medium`}>{delta}</Text>
        </View>
    );
}
function ActivityItem({ icon, iconColor, title, time }: { icon: string, iconColor: string, title: string, time: string }) {
    const [bgClass, textClass] = iconColor.split(' ');
    const colorHex = textClass.replace('text-[', '').replace(']', '');

    return (
        <View style={tw`flex-row items-center mb-6`}>
            <View style={tw`${bgClass} w-10 h-10 rounded-xl items-center justify-center mr-4`}>
                <Ionicons name={icon as any} size={20} color={colorHex} />
            </View>
            <View style={tw`flex-1`}>
                <Text style={tw`text-[#0b4771] font-medium text-base mb-1`}>{title}</Text>
                <View style={tw`flex-row items-center`}>
                    <Ionicons name="time-outline" size={14} color="#9aa5b5" />
                    <Text style={tw`text-[#9aa5b5] text-sm font-light ml-1`}>{time}</Text>
                </View>
            </View>
        </View>
    );
}

const areaChartSvg = `
<svg width="800" height="300" viewBox="0 0 800 300" xmlns="http://www.w3.org/2000/svg">
  <!-- Background Grid -->
  <line x1="80" y1="250" x2="720" y2="250" stroke="#f1f5f9" stroke-width="2" />
  <line x1="80" y1="200" x2="720" y2="200" stroke="#f1f5f9" stroke-width="2" stroke-dasharray="6 6" />
  <line x1="80" y1="150" x2="720" y2="150" stroke="#f1f5f9" stroke-width="2" stroke-dasharray="6 6" />
  <line x1="80" y1="100" x2="720" y2="100" stroke="#f1f5f9" stroke-width="2" stroke-dasharray="6 6" />
  <line x1="80" y1="50" x2="720" y2="50" stroke="#f1f5f9" stroke-width="2" stroke-dasharray="6 6" />
  <!-- Y Axis Labels -->
  <text x="60" y="255" fill="#94a3b8" font-family="Outfit, sans-serif" font-size="14" font-weight="500" text-anchor="end">0</text>
  <text x="60" y="205" fill="#94a3b8" font-family="Outfit, sans-serif" font-size="14" font-weight="500" text-anchor="end">50</text>
  <text x="60" y="155" fill="#94a3b8" font-family="Outfit, sans-serif" font-size="14" font-weight="500" text-anchor="end">100</text>
  <text x="60" y="105" fill="#94a3b8" font-family="Outfit, sans-serif" font-size="14" font-weight="500" text-anchor="end">150</text>
  <text x="60" y="55" fill="#94a3b8" font-family="Outfit, sans-serif" font-size="14" font-weight="500" text-anchor="end">200</text>
  <!-- X Axis Labels -->
  <text x="100" y="280" fill="#94a3b8" font-family="Outfit, sans-serif" font-size="14" font-weight="500" text-anchor="middle">Jan</text>
  <text x="200" y="280" fill="#94a3b8" font-family="Outfit, sans-serif" font-size="14" font-weight="500" text-anchor="middle">Feb</text>
  <text x="300" y="280" fill="#94a3b8" font-family="Outfit, sans-serif" font-size="14" font-weight="500" text-anchor="middle">Mar</text>
  <text x="400" y="280" fill="#94a3b8" font-family="Outfit, sans-serif" font-size="14" font-weight="500" text-anchor="middle">Apr</text>
  <text x="500" y="280" fill="#94a3b8" font-family="Outfit, sans-serif" font-size="14" font-weight="500" text-anchor="middle">Mei</text>
  <text x="600" y="280" fill="#94a3b8" font-family="Outfit, sans-serif" font-size="14" font-weight="500" text-anchor="middle">Jun</text>
  <text x="700" y="280" fill="#94a3b8" font-family="Outfit, sans-serif" font-size="14" font-weight="500" text-anchor="middle">Jul</text>
  <!-- Area Fill (Solid with Opacity) -->
  <path d="M 100 170 C 150 170, 150 130, 200 130 C 250 130, 250 160, 300 160 C 350 160, 350 90, 400 90 C 450 90, 450 110, 500 110 C 550 110, 550 60, 600 60 C 650 60, 650 80, 700 80 L 700 250 L 100 250 Z" fill="rgba(27,163,154,0.15)" />
  
  <!-- Line Stroke -->
  <path d="M 100 170 C 150 170, 150 130, 200 130 C 250 130, 250 160, 300 160 C 350 160, 350 90, 400 90 C 450 90, 450 110, 500 110 C 550 110, 550 60, 600 60 C 650 60, 650 80, 700 80" fill="none" stroke="#1ba39a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
  <!-- Tooltip Highlight on June -->
  <line x1="600" y1="50" x2="600" y2="250" stroke="#1ba39a" stroke-width="2" stroke-dasharray="6 6" opacity="0.6" />
  <circle cx="600" cy="60" r="14" fill="rgba(27,163,154,0.2)" />
  <circle cx="600" cy="60" r="6" fill="#fff" stroke="#1ba39a" stroke-width="3" />
  
  <rect x="535" y="10" width="130" height="32" rx="16" fill="#0b4771" />
  <text x="600" y="31" fill="#fff" font-family="Outfit, sans-serif" font-size="13" font-weight="600" text-anchor="middle">Jun: 190 Pasien</text>
</svg>
`;

const donutChartSvg = `
<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <circle cx="100" cy="100" r="75" fill="none" stroke="#f1f5f9" stroke-width="22" />
  <circle cx="100" cy="100" r="75" fill="none" stroke="#1ba39a" stroke-width="22" stroke-dasharray="208 472" stroke-dashoffset="0" transform="rotate(-90 100 100)" />
  <circle cx="100" cy="100" r="75" fill="none" stroke="#8b5cf6" stroke-width="22" stroke-dasharray="114 472" stroke-dashoffset="-212" transform="rotate(-90 100 100)" />
  <circle cx="100" cy="100" r="75" fill="none" stroke="#18d876" stroke-width="22" stroke-dasharray="90 472" stroke-dashoffset="-330" transform="rotate(-90 100 100)" />
  <circle cx="100" cy="100" r="75" fill="none" stroke="#ff9f1c" stroke-width="22" stroke-dasharray="43 472" stroke-dashoffset="-424" transform="rotate(-90 100 100)" />
  <text x="100" y="92" font-family="Outfit, sans-serif" font-size="14" font-weight="500" fill="#94a3b8" text-anchor="middle">Total</text>
  <text x="100" y="125" font-family="Outfit, sans-serif" font-size="36" font-weight="700" fill="#0b4771" text-anchor="middle">100</text>
</svg>
`;