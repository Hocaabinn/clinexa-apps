import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, Image } from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { authState } from '../../constants/auth';
const navItems = [
    { name: 'Dashboard', path: '/(staff)', icon: 'grid-outline' },
    { name: 'Minta Akses', path: '/(staff)/minta-akses', icon: 'key-outline' },
    { name: 'Rekam Medis', path: '/(staff)/rekam-medis', icon: 'clipboard-outline' },
    { name: 'Log Akses', path: '/(staff)/log-akses', icon: 'time-outline' },
    { name: 'Notifikasi', path: '/(staff)/notifikasi', icon: 'notifications-outline' },
    { name: 'Profil', path: '/(staff)/profil', icon: 'person-outline' },
];
export default function StaffLayout() {
    const router = useRouter();
    const pathname = usePathname();
    const handleLogout = () => {
        authState.logout();
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

    return (
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
                            <Text style={tw`text-white font-medium text-lg`}>AS</Text>
                        </View>
                        <View>
                            <Text style={tw`text-[#0b4771] font-medium text-base`}>Dr. Agung Setya</Text>
                            <Text style={tw`text-[#9aa5b5] text-sm font-light`}>Dokter Umum</Text>
                        </View>
                    </View>
                </View>
                <ScrollView style={tw`flex-1 py-4 px-3`}>
                    {navItems.map((item) => {
                        const isActive = pathname === item.path || (pathname === '/(staff)/index' && item.path === '/(staff)');
                        return (
                            <TouchableOpacity
                                key={item.name}
                                style={[
                                    tw`flex-row items-center px-4 py-3.5 rounded-xl mb-1`,
                                    isActive ? tw`bg-[#eef1f5]` : tw`bg-transparent`
                                ]}
                                onPress={() => router.push(item.path as any)}
                            >
                                <Ionicons
                                    name={item.icon as any}
                                    size={22}
                                    color={isActive ? '#1ba39a' : '#0b4771'}
                                />
                                <Text style={[
                                    tw`ml-3 text-base font-light`,
                                    isActive ? tw`text-[#1ba39a] font-medium` : tw`text-[#0b4771]`
                                ]}>
                                    {item.name}
                                </Text>
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
    );
}