import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, Image, ActivityIndicator } from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { supabase } from '../../lib/supabase';
import { StaffAuthContext, fetchStaffProfile } from '../../lib/staff-auth';
import type { StaffProfile } from '../../lib/staff-auth';

const navItems = [
    { name: 'Dashboard', path: '/(staff)', matchPath: '/', icon: 'grid-outline' },
    { name: 'Minta Akses', path: '/(staff)/minta-akses', matchPath: '/minta-akses', icon: 'key-outline' },
    { name: 'Rekam Medis', path: '/(staff)/rekam-medis', matchPath: '/rekam-medis', icon: 'clipboard-outline' },
    { name: 'Log Akses', path: '/(staff)/log-akses', matchPath: '/log-akses', icon: 'time-outline' },
    { name: 'Notifikasi', path: '/(staff)/notifikasi', matchPath: '/notifikasi', icon: 'notifications-outline' },
    { name: 'Profil', path: '/(staff)/profil', matchPath: '/profil', icon: 'person-outline' },
];

export default function StaffLayout() {
    const router = useRouter();
    const pathname = usePathname();
    const [staffProfile, setStaffProfile] = useState<StaffProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [pendingCount, setPendingCount] = useState(0);

    const loadProfile = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
            const profile = await fetchStaffProfile(session.user.email);
            setStaffProfile(profile);
        }
        setIsLoading(false);
    };

    const fetchPendingCount = async () => {
        const { count, error } = await supabase
            .from('medical_records')
            .select('*', { count: 'exact', head: true })
            .eq('consent_status', 'pending');
        if (!error && count !== null) {
            setPendingCount(count);
        }
    };

    useEffect(() => {
        loadProfile();
        fetchPendingCount();

        const channelName = `sidebar-realtime-${Date.now()}`;
        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'medical_records' },
                () => {
                    fetchPendingCount();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.replace('/(staff-auth)/login');
    };

    useEffect(() => {
        if (Platform.OS === 'web' && typeof document !== 'undefined' && !document.getElementById('outfit-font')) {
            const style = document.createElement('style');
            style.id = 'outfit-font';
            style.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        *:not([style*="Ionicons"]):not([style*="ionicons"]):not(i) { font-family: 'Outfit', sans-serif !important; }
      `;
            document.head.appendChild(style);
        }
    }, []);

    const initials = staffProfile?.name
        ? staffProfile.name.split(' ').filter(w => w.length > 0).map(w => w[0]).join('').substring(0, 2).toUpperCase()
        : '..';

    return (
        <StaffAuthContext.Provider value={{
            staffProfile,
            isAuthenticated: !!staffProfile,
            isLoading,
            refreshProfile: loadProfile,
        }}>
            <View style={[tw`flex-1 bg-[#f4f6f8]`, { flexDirection: Platform.OS === 'web' ? 'row' as const : 'column' as const }]}>
                <View style={[
                    tw`bg-white border-r border-[#d8dee8]`,
                    Platform.OS === 'web' ? tw`w-[300px] h-full` : tw`w-full`
                ]}>
                    <View style={tw`p-7 border-b border-[#d8dee8]`}>
                        <View style={tw`mb-7 items-center`}>
                            <Image
                                source={require('../../assets/images/logo_hijau.png')}
                                style={[{ width: 140, height: 40, marginLeft: -16, objectPosition: 'center' } as any]}
                                resizeMode="contain"
                            />
                        </View>

                        <View style={tw`bg-[#eef1f5] rounded-xl p-3 flex-row items-center`}>
                            <View style={tw`bg-[#2fc4bf] w-12 h-12 rounded-xl items-center justify-center mr-3`}>
                                <Text style={tw`text-white font-medium text-lg`}>{initials}</Text>
                            </View>
                            <View>
                                <Text style={tw`text-[#0b4771] font-medium text-base`}>
                                    {staffProfile?.name || 'Memuat...'}
                                </Text>
                                <Text style={tw`text-[#9aa5b5] text-sm font-light`}>
                                    {staffProfile?.specialization || ''}
                                </Text>
                            </View>
                        </View>
                    </View>
                    <ScrollView style={tw`flex-1 py-4 px-3`}>
                        {navItems.map((item) => {
                            const isActive = item.matchPath === '/'
                                ? (pathname === '/' || pathname === '' || pathname === '/(staff)' || pathname === '/(staff)/' || pathname === '/(staff)/index')
                                : (pathname.startsWith(item.matchPath) || pathname.startsWith(item.path));
                            const showBadge = (item.name === 'Rekam Medis' || item.name === 'Log Akses' || item.name === 'Notifikasi') && pendingCount > 0;
                            
                            return (
                                <TouchableOpacity
                                    key={item.name}
                                    style={[
                                        tw`flex-row items-center rounded-xl mb-1 overflow-hidden`,
                                        isActive ? tw`bg-[#e6f7f6]` : tw`bg-transparent`
                                    ]}
                                    onPress={() => router.push(item.path as any)}
                                >
                                    {/* Accent bar indicator */}
                                    <View style={[
                                        tw`w-1 self-stretch rounded-r-full`,
                                        isActive ? tw`bg-[#1ba39a]` : tw`bg-transparent`
                                    ]} />
                                    <View style={tw`flex-row items-center flex-1 px-3.5 py-3.5`}>
                                        <Ionicons
                                            name={(isActive ? item.icon.replace('-outline', '') : item.icon) as any}
                                            size={22}
                                            color={isActive ? '#1ba39a' : '#6b7b8d'}
                                        />
                                        <Text style={[
                                            tw`ml-3 text-base flex-1`,
                                            isActive ? tw`text-[#1ba39a] font-semibold` : tw`text-[#0b4771] font-light`
                                        ]}>
                                            {item.name}
                                        </Text>
                                        {showBadge && (
                                            <View style={tw`bg-[#ff4d4f] px-2 py-0.5 rounded-full items-center justify-center`}>
                                                <Text style={tw`text-white text-xs font-bold`}>{pendingCount}</Text>
                                            </View>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                    <View style={tw`p-4`}>
                        <TouchableOpacity
                            style={tw`bg-[#ff4d4f] rounded-xl py-3.5 flex-row items-center justify-center`}
                            onPress={handleLogout}
                        >
                            <Text style={tw`text-white font-medium text-base`}>Log Out</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={tw`flex-1`}>
                    <Slot />
                </View>
            </View>
        </StaffAuthContext.Provider>
    );
}