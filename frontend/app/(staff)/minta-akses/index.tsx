import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import * as Clipboard from 'expo-clipboard';
import { useStaffAuth } from '../../../lib/staff-auth';

export default function RequestAccessScreen() {
    const { staffProfile } = useStaffAuth();
    const [requestCode, setRequestCode] = useState('');
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
    const [copied, setCopied] = useState(false);
    const [showQr, setShowQr] = useState(false);
    const [selectedDuration, setSelectedDuration] = useState('60_min'); // Default to 60 Minutes

    // Generate random request code with stable reference
    const generateNewCode = useCallback(() => {
        const randomNum = Math.floor(100000 + Math.random() * 900000);
        setRequestCode(`CLNX-STF-${randomNum}`);
        setTimeLeft(300);
        setCopied(false);
    }, []);

    // Initialize code on mount
    useEffect(() => {
        generateNewCode();
    }, [generateNewCode]);

    // Timer effect (optimized: registers only once, updates timeleft without resetting interval every second)
    useEffect(() => {
        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    generateNewCode();
                    return 300;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [generateNewCode]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleCopy = async () => {
        await Clipboard.setStringAsync(requestCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Construct the scannable QR payload containing doctor details and duration
    const qrPayload = useMemo(() => {
        if (!requestCode) return '';
        return JSON.stringify({
            type: 'clinexa-access',
            staff_id: staffProfile?.id || 'a98b71d6-d0be-45a7-93ff-1834190c7490',
            name: staffProfile?.name || 'Dr. Agung Setya',
            institution: staffProfile?.institution || 'RS Semen Gresik',
            specialization: staffProfile?.specialization || 'Dokter Umum',
            code: requestCode,
            consent_duration_type: selectedDuration
        });
    }, [requestCode, staffProfile, selectedDuration]);

    const renderedQRCode = useMemo(() => {
        if (!qrPayload) return null;
        return (
            <Image
                source={{ uri: `https://quickchart.io/qr?text=${encodeURIComponent(qrPayload)}&size=180&margin=1` }}
                style={{ width: 180, height: 180 }}
            />
        );
    }, [qrPayload]);

    const initials = useMemo(() => {
        const name = staffProfile?.name || 'Dr. Agung Setya';
        return name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();
    }, [staffProfile]);

    return (
        <ScrollView style={tw`flex-1 bg-[#f4f6f8]`} contentContainerStyle={tw`pb-10`}>
            <View style={tw`p-10 max-w-5xl mx-auto w-full`}>
                {/* Header */}
                <View style={tw`mb-8`}>
                    <Text style={tw`text-[#0b4771] text-3xl font-medium mb-2`}>Minta Akses</Text>
                    <Text style={tw`text-[#6d7f95] text-base font-light`}>
                        Minta izin akses rekam medis pasien dengan membagikan QR Code atau kode unik di bawah.
                    </Text>
                </View>

                {/* Main Content Layout */}
                <View style={[tw`flex-row gap-8`, { flexDirection: Platform.OS === 'web' ? 'row' as const : 'column' as const }]}>
                    {/* Left Column: QR Code Card */}
                    <View style={[tw`bg-white rounded-3xl p-8 items-center border border-[#d8dee8]`, { flex: 1.2 }]}>

                        {/* Show QR Code Action Button */}
                        {!showQr ? (
                            <TouchableOpacity
                                style={tw`bg-[#1ba39a] py-3.5 px-6 rounded-xl flex-row items-center justify-center w-full mb-4`}
                                onPress={() => setShowQr(true)}
                            >
                                <Ionicons name="qr-code-outline" size={20} color="white" />
                                <Text style={tw`text-white font-semibold ml-2`}>Tampilkan QR Code</Text>
                            </TouchableOpacity>
                        ) : (
                            <>
                                {/* QR Code Visual Area */}
                                <View style={tw`items-center justify-center bg-white p-5 border border-[#eef1f5] rounded-2xl mb-6`}>
                                    {renderedQRCode}
                                </View>

                                {/* Code Display Box */}
                                <View style={tw`flex-row items-center justify-between bg-[#f8fafc] border border-[#d8dee8] rounded-xl px-5 py-4 w-full mb-6`}>
                                    <Text style={tw`text-[#0b4771] text-lg font-bold tracking-wider`}>{requestCode}</Text>
                                    <TouchableOpacity onPress={handleCopy} style={tw`p-1`}>
                                        <Ionicons
                                            name={copied ? "checkmark-circle-outline" : "copy-outline"}
                                            size={20}
                                            color={copied ? "#18d876" : "#1ba39a"}
                                        />
                                    </TouchableOpacity>
                                </View>

                                {/* Timer and Refresh Button */}
                                <View style={tw`flex-row items-center justify-between w-full border-t border-[#eef1f5] pt-6`}>
                                    <View style={tw`flex-row items-center`}>
                                        <Ionicons name="time-outline" size={20} color="#ff9f1c" />
                                        <View style={tw`ml-2.5`}>
                                            <Text style={tw`text-[#9aa5b5] text-xs font-light`}>Kadaluarsa dalam</Text>
                                            <Text style={tw`text-[#ff9f1c] font-semibold text-base`}>{formatTime(timeLeft)}</Text>
                                        </View>
                                    </View>

                                    <TouchableOpacity
                                        onPress={generateNewCode}
                                        style={tw`bg-[#1ba39a] flex-row items-center px-4 py-2.5 rounded-xl`}
                                    >
                                        <Ionicons name="refresh-outline" size={16} color="white" />
                                        <Text style={tw`text-white text-sm font-medium ml-2`}>Perbarui</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>

                    {/* Right Column: Staff Info & Instructions */}
                    <View style={[tw`flex-1 gap-6`, { flex: 1 }]}>
                        {/* Requester Information */}
                        <View style={tw`bg-white rounded-3xl p-6 border border-[#d8dee8]`}>
                            <Text style={tw`text-[#0b4771] text-lg font-medium mb-4`}>Peminta Akses</Text>
                            <View style={tw`flex-row items-center bg-[#f8fafc] rounded-xl p-4 mb-4`}>
                                <View style={tw`bg-[#2fc4bf] w-12 h-12 rounded-xl items-center justify-center mr-4`}>
                                    <Text style={tw`text-white font-medium text-lg`}>{initials}</Text>
                                </View>
                                <View>
                                    <Text style={tw`text-[#0b4771] font-semibold text-base`}>{staffProfile?.name || 'Dr. Agung Setya'}</Text>
                                    <Text style={tw`text-[#9aa5b5] text-sm font-light`}>{staffProfile?.specialization || 'Dokter Umum'}</Text>
                                </View>
                            </View>

                            <View style={tw`gap-3`}>
                                <View style={tw`flex-row justify-between py-1.5 border-b border-[#f4f6f8]`}>
                                    <Text style={tw`text-[#9aa5b5] text-sm`}>No. Registrasi / NIP</Text>
                                    <Text style={tw`text-[#0b4771] text-sm font-medium`}>{staffProfile?.registration_number || '19860102010011001'}</Text>
                                </View>
                                <View style={tw`flex-row justify-between py-1.5 border-b border-[#f4f6f8]`}>
                                    <Text style={tw`text-[#9aa5b5] text-sm`}>Institusi</Text>
                                    <Text style={tw`text-[#0b4771] text-sm font-medium`}>{staffProfile?.institution || 'RS Semen Gresik'}</Text>
                                </View>
                                <View style={tw`flex-row justify-between py-1.5`}>
                                    <Text style={tw`text-[#9aa5b5] text-sm`}>Status Pemohon</Text>
                                    <View style={tw`bg-[#e0f6f4] px-2.5 py-0.5 rounded-full flex-row items-center`}>
                                        <View style={tw`w-1.5 h-1.5 rounded-full bg-[#1ba39a] mr-1.5`} />
                                        <Text style={tw`text-[#1ba39a] font-medium text-xs`}>Terverifikasi</Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Instructions Box */}
                        <View style={tw`bg-white rounded-3xl p-6 border border-[#d8dee8]`}>
                            <Text style={tw`text-[#0b4771] text-lg font-medium mb-5`}>Petunjuk Penggunaan</Text>

                            <View style={[tw`gap-4`, { flexDirection: Platform.OS === 'web' ? 'row' as const : 'column' as const, flexWrap: 'wrap' as const }]}>
                                <InstructionStep
                                    number="1"
                                    text="Minta pasien untuk membuka aplikasi Clinexa Pasien pada perangkat mereka."
                                />
                                <InstructionStep
                                    number="2"
                                    text="Arahkan pasien ke menu 'Izin Akses' lalu klik tombol 'Pindai Kode'."
                                />
                                <InstructionStep
                                    number="3"
                                    text="Arahkan kamera pasien untuk memindai QR Code di layar ini."
                                />
                                <InstructionStep
                                    number="4"
                                    text="Setelah dipindai, pasien akan melihat profil Anda dan menyetujui akses rekam medis. Status persetujuan akan langsung muncul di Dashboard Anda."
                                />
                            </View>
                        </View>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}

function InstructionStep({ number, text }: { number: string; text: string }) {
    return (
        <View style={[tw`items-center`, { flex: 1, minWidth: Platform.OS === 'web' ? 120 : undefined }]}>
            <View style={tw`bg-[#e0f6f4] w-10 h-10 rounded-full items-center justify-center mb-3`}>
                <Text style={tw`text-[#1ba39a] text-sm font-bold`}>{number}</Text>
            </View>
            <Text style={tw`text-[#6d7f95] text-sm leading-5 font-light text-center`}>
                {text}
            </Text>
        </View>
    );
}
