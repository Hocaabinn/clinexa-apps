import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Platform, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { supabase } from '../../lib/supabase';
import { useStaffAuth } from '../../lib/staff-auth';

interface DashboardStats {
    totalPatients: number;
    pendingConsent: number;
    totalRecords: number;
}

interface RecentActivity {
    id: string;
    patient_name: string;
    consent_status: string;
    record_type: string;
    created_at: string;
}

interface PendingItem {
    id: string;
    patient_name: string;
    record_type: string;
    created_at: string;
}

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
    const { staffProfile } = useStaffAuth();
    const [stats, setStats] = useState<DashboardStats>({ totalPatients: 0, pendingConsent: 0, totalRecords: 0 });
    const [activities, setActivities] = useState<RecentActivity[]>([]);
    const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            const { count: patientCount } = await supabase
                .from('patients')
                .select('*', { count: 'exact', head: true });

            const { count: recordCount } = await supabase
                .from('medical_records')
                .select('*', { count: 'exact', head: true });

            const { count: pendingCount } = await supabase
                .from('medical_records')
                .select('*', { count: 'exact', head: true })
                .eq('consent_status', 'pending');

            setStats({
                totalPatients: patientCount || 0,
                pendingConsent: pendingCount || 0,
                totalRecords: recordCount || 0,
            });

            const { data: recentData } = await supabase
                .from('medical_records')
                .select('id, consent_status, record_type, created_at, patients(name)')
                .order('created_at', { ascending: false })
                .limit(5);

            if (recentData) {
                setActivities(recentData.map((r: any) => ({
                    id: r.id,
                    patient_name: r.patients?.name || 'Unknown',
                    consent_status: r.consent_status,
                    record_type: r.record_type,
                    created_at: r.created_at,
                })));
            }

            const { data: pendingData } = await supabase
                .from('medical_records')
                .select('id, record_type, created_at, patients(name)')
                .eq('consent_status', 'pending')
                .order('created_at', { ascending: false })
                .limit(3);

            if (pendingData) {
                setPendingItems(pendingData.map((r: any) => ({
                    id: r.id,
                    patient_name: r.patients?.name || 'Unknown',
                    record_type: r.record_type,
                    created_at: r.created_at,
                })));
            }
        } catch (err) {
            console.error('Dashboard load error:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatTimeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 60) return `${minutes} menit lalu`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} jam lalu`;
        const days = Math.floor(hours / 24);
        return `${days} hari lalu`;
    };

    const getActivityIcon = (status: string) => {
        switch (status) {
            case 'granted': return { icon: 'checkmark', bg: 'bg-[#ccf9df]', color: '#18d876' };
            case 'denied': return { icon: 'close', bg: 'bg-[#ffdada]', color: '#ff4d4f' };
            default: return { icon: 'document-text', bg: 'bg-[#e5d8ff]', color: '#8b5cf6' };
        }
    };

    const getActivityTitle = (activity: RecentActivity) => {
        const typeMap: Record<string, string> = { pemeriksaan: 'Pemeriksaan', laboratorium: 'Tes Lab', resep: 'Resep Obat' };
        const statusMap: Record<string, string> = {
            granted: 'Akses Diberikan',
            denied: 'Akses Ditolak',
            pending: 'Menunggu Konfirmasi',
        };
        return `${activity.patient_name} — ${typeMap[activity.record_type] || activity.record_type} (${statusMap[activity.consent_status] || activity.consent_status})`;
    };

    const today = new Date();
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const dateStr = `${dayNames[today.getDay()]}, ${today.getDate()} ${monthNames[today.getMonth()]} ${today.getFullYear()}`;

    if (loading) {
        return (
            <View style={tw`flex-1 bg-[#f4f6f8] items-center justify-center`}>
                <ActivityIndicator size="large" color="#1ba39a" />
            </View>
        );
    }

    return (
        <ScrollView style={tw`flex-1 bg-[#f4f6f8]`}>
            <View style={tw`p-10 max-w-7xl mx-auto w-full`}>
                <View style={tw`mb-8`}>
                    <Text style={tw`text-[#0b4771] text-3xl font-medium mb-1`}>Dashboard</Text>
                    <Text style={tw`text-[#0b4771] text-base font-light`}>{dateStr}</Text>
                </View>
                <View style={[tw`flex-row gap-5 mb-8`, { flexWrap: Platform.OS === 'web' ? 'nowrap' as const : 'wrap' as const }]}>
                    <StatCard title="Pasien Aktif" value={String(stats.totalPatients)} delta={`Total terdaftar`} icon="people" color="teal" />
                    <StatCard title="Menunggu Izin" value={String(stats.pendingConsent)} delta="Perlu konfirmasi" icon="person-add" color="amber" />
                    <StatCard title="Rekam Medis" value={String(stats.totalRecords)} delta="Total rekam medis" icon="document-text" color="violet" />
                </View>
                <View style={[tw`flex-row gap-5 mb-8`, { flexDirection: Platform.OS === 'web' ? 'row' as const : 'column' as const }]}>
                    <View style={tw`flex-1 bg-white p-6 rounded-2xl`}>
                        <Text style={tw`text-[#0b4771] text-xl font-medium mb-5`}>Aktivitas Terkini</Text>
                        {activities.length === 0 ? (
                            <Text style={tw`text-[#9aa5b5] text-sm font-light`}>Belum ada aktivitas.</Text>
                        ) : (
                            activities.map((activity) => {
                                const style = getActivityIcon(activity.consent_status);
                                return (
                                    <View key={activity.id} style={tw`flex-row items-center mb-6`}>
                                        <View style={tw`${style.bg} w-10 h-10 rounded-xl items-center justify-center mr-4`}>
                                            <Ionicons name={style.icon as any} size={20} color={style.color} />
                                        </View>
                                        <View style={tw`flex-1`}>
                                            <Text style={tw`text-[#0b4771] font-medium text-base mb-1`}>{getActivityTitle(activity)}</Text>
                                            <View style={tw`flex-row items-center`}>
                                                <Ionicons name="time-outline" size={14} color="#9aa5b5" />
                                                <Text style={tw`text-[#9aa5b5] text-sm font-light ml-1`}>{formatTimeAgo(activity.created_at)}</Text>
                                            </View>
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </View>
                    <View style={tw`flex-1 bg-white p-6 rounded-2xl`}>
                        <Text style={tw`text-[#0b4771] text-xl font-medium mb-5`}>Menunggu Konfirmasi</Text>
                        {pendingItems.length === 0 ? (
                            <Text style={tw`text-[#9aa5b5] text-sm font-light`}>Tidak ada yang menunggu.</Text>
                        ) : (
                            pendingItems.map((item) => (
                                <View key={item.id} style={tw`bg-[#f8fafc] rounded-xl p-4 flex-row items-center mb-3`}>
                                    <View style={tw`bg-[#1ba39a] w-12 h-12 rounded-xl items-center justify-center mr-4`}>
                                        <Text style={tw`text-white font-medium text-lg`}>
                                            {item.patient_name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
                                        </Text>
                                    </View>
                                    <View style={tw`flex-1`}>
                                        <Text style={tw`text-[#0b4771] font-medium text-base mb-1`}>{item.patient_name}</Text>
                                        <Text style={tw`text-[#9aa5b5] text-sm font-light`}>{new Date(item.created_at).toLocaleDateString('id-ID')}</Text>
                                    </View>
                                    <Text style={tw`text-[#9aa5b5] text-sm font-light capitalize`}>{item.record_type}</Text>
                                </View>
                            ))
                        )}
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
            </View>
            <Text style={tw`text-[#0b4771] text-4xl font-medium mb-1`}>{value}</Text>
            <Text style={tw`text-[#0b4771] text-base font-light mb-2`}>{title}</Text>
            <Text style={tw`${colorMap[color].text} text-sm font-medium`}>{delta}</Text>
        </View>
    );
}

const areaChartSvg = `
<svg width="800" height="300" viewBox="0 0 800 300" xmlns="http://www.w3.org/2000/svg">
  <line x1="80" y1="250" x2="720" y2="250" stroke="#f1f5f9" stroke-width="2" />
  <line x1="80" y1="200" x2="720" y2="200" stroke="#f1f5f9" stroke-width="2" stroke-dasharray="6 6" />
  <line x1="80" y1="150" x2="720" y2="150" stroke="#f1f5f9" stroke-width="2" stroke-dasharray="6 6" />
  <line x1="80" y1="100" x2="720" y2="100" stroke="#f1f5f9" stroke-width="2" stroke-dasharray="6 6" />
  <line x1="80" y1="50" x2="720" y2="50" stroke="#f1f5f9" stroke-width="2" stroke-dasharray="6 6" />
  <text x="60" y="255" fill="#94a3b8" font-family="Outfit, sans-serif" font-size="14" font-weight="500" text-anchor="end">0</text>
  <text x="60" y="205" fill="#94a3b8" font-family="Outfit, sans-serif" font-size="14" font-weight="500" text-anchor="end">50</text>
  <text x="60" y="155" fill="#94a3b8" font-family="Outfit, sans-serif" font-size="14" font-weight="500" text-anchor="end">100</text>
  <text x="60" y="105" fill="#94a3b8" font-family="Outfit, sans-serif" font-size="14" font-weight="500" text-anchor="end">150</text>
  <text x="60" y="55" fill="#94a3b8" font-family="Outfit, sans-serif" font-size="14" font-weight="500" text-anchor="end">200</text>
  <text x="100" y="280" fill="#94a3b8" font-family="Outfit, sans-serif" font-size="14" font-weight="500" text-anchor="middle">Jan</text>
  <text x="200" y="280" fill="#94a3b8" font-family="Outfit, sans-serif" font-size="14" font-weight="500" text-anchor="middle">Feb</text>
  <text x="300" y="280" fill="#94a3b8" font-family="Outfit, sans-serif" font-size="14" font-weight="500" text-anchor="middle">Mar</text>
  <text x="400" y="280" fill="#94a3b8" font-family="Outfit, sans-serif" font-size="14" font-weight="500" text-anchor="middle">Apr</text>
  <text x="500" y="280" fill="#94a3b8" font-family="Outfit, sans-serif" font-size="14" font-weight="500" text-anchor="middle">Mei</text>
  <text x="600" y="280" fill="#94a3b8" font-family="Outfit, sans-serif" font-size="14" font-weight="500" text-anchor="middle">Jun</text>
  <text x="700" y="280" fill="#94a3b8" font-family="Outfit, sans-serif" font-size="14" font-weight="500" text-anchor="middle">Jul</text>
  <path d="M 100 170 C 150 170, 150 130, 200 130 C 250 130, 250 160, 300 160 C 350 160, 350 90, 400 90 C 450 90, 450 110, 500 110 C 550 110, 550 60, 600 60 C 650 60, 650 80, 700 80 L 700 250 L 100 250 Z" fill="rgba(27,163,154,0.15)" />
  <path d="M 100 170 C 150 170, 150 130, 200 130 C 250 130, 250 160, 300 160 C 350 160, 350 90, 400 90 C 450 90, 450 110, 500 110 C 550 110, 550 60, 600 60 C 650 60, 650 80, 700 80" fill="none" stroke="#1ba39a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
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