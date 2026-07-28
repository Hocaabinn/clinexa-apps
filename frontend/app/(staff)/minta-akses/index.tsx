import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import * as Clipboard from 'expo-clipboard';



// Helper to generate deterministic QR Code-like matrix
const generateQRCodeMatrix = (text: string) => {
    const size = 21;
    const matrix = Array(size).fill(null).map(() => Array(size).fill(0));

    // Helper to draw finder pattern
    const drawFinder = (rowStart: number, colStart: number) => {
        for (let r = 0; r < 7; r++) {
            for (let c = 0; c < 7; c++) {
                const isOuterBorder = r === 0 || r === 6 || c === 0 || c === 6;
                const isInnerCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
                matrix[rowStart + r][colStart + c] = (isOuterBorder || isInnerCenter) ? 1 : 0;
            }
        }
    };

    // Top-Left Finder
    drawFinder(0, 0);
    // Top-Right Finder
    drawFinder(0, size - 7);
    // Bottom-Left Finder
    drawFinder(size - 7, 0);

    // Seed from text
    let seed = 0;
    for (let i = 0; i < text.length; i++) {
        seed += text.charCodeAt(i) * (i + 1);
    }

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            // Skip finder patterns
            const isTopLeft = r < 8 && c < 8;
            const isTopRight = r < 8 && c >= size - 8;
            const isBottomLeft = r >= size - 8 && c < 8;
            if (isTopLeft || isTopRight || isBottomLeft) continue;

            // Small alignment pattern at (14, 14) to (16, 16)
            if (r >= 14 && r <= 16 && c >= 14 && c <= 16) {
                matrix[r][c] = (r === 15 && c === 15) ? 1 : (r === 14 || r === 16 || c === 14 || c === 16 ? 1 : 0);
                continue;
            }

            // Timing patterns
            if (r === 6 && c > 7 && c < size - 7) {
                matrix[r][c] = c % 2 === 0 ? 1 : 0;
                continue;
            }
            if (c === 6 && r > 7 && r < size - 7) {
                matrix[r][c] = r % 2 === 0 ? 1 : 0;
                continue;
            }

            // Pseudo-random noise
            const val = Math.sin(seed + r * 13 + c * 37) * 10000;
            matrix[r][c] = (val - Math.floor(val)) > 0.55 ? 1 : 0;
        }
    }

    return matrix;
};

export default function RequestAccessScreen() {
    const [requestCode, setRequestCode] = useState('');
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
    const [copied, setCopied] = useState(false);

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



    // Memoize the rendered QR code to prevent recalculating and rerendering 441 views every second
    const renderedQRCode = useMemo(() => {
        if (!requestCode) return null;
        const matrix = generateQRCodeMatrix(requestCode);
        return (
            <View style={tw`p-2 bg-white`}>
                {matrix.map((row, rIdx) => (
                    <View key={rIdx} style={tw`flex-row`}>
                        {row.map((cell, cIdx) => (
                            <View
                                key={cIdx}
                                style={{
                                    width: 9,
                                    height: 9,
                                    backgroundColor: cell === 1 ? '#0b4771' : 'transparent',
                                }}
                            />
                        ))}
                    </View>
                ))}
            </View>
        );
    }, [requestCode]);

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
                        {/* QR Code Label */}
                        <View style={tw`flex-row items-center mb-6`}>
                            <Ionicons name="qr-code-outline" size={20} color="#1ba39a" />
                            <Text style={tw`ml-2 text-base font-medium text-[#0b4771]`}>QR Code Akses</Text>
                        </View>

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
                    </View>

                    {/* Right Column: Staff Info & Instructions */}
                    <View style={[tw`flex-1 gap-6`, { flex: 1 }]}>
                        {/* Requester Information */}
                        <View style={tw`bg-white rounded-3xl p-6 border border-[#d8dee8]`}>
                            <Text style={tw`text-[#0b4771] text-lg font-medium mb-4`}>Peminta Akses</Text>
                            <View style={tw`flex-row items-center bg-[#f8fafc] rounded-xl p-4 mb-4`}>
                                <View style={tw`bg-[#2fc4bf] w-12 h-12 rounded-xl items-center justify-center mr-4`}>
                                    <Text style={tw`text-white font-medium text-lg`}>AS</Text>
                                </View>
                                <View>
                                    <Text style={tw`text-[#0b4771] font-semibold text-base`}>Dr. Agung Setya</Text>
                                    <Text style={tw`text-[#9aa5b5] text-sm font-light`}>Dokter Umum</Text>
                                </View>
                            </View>

                            <View style={tw`gap-3`}>
                                <View style={tw`flex-row justify-between py-1.5 border-b border-[#f4f6f8]`}>
                                    <Text style={tw`text-[#9aa5b5] text-sm`}>No. Registrasi / NIP</Text>
                                    <Text style={tw`text-[#0b4771] text-sm font-medium`}>19860102010011001</Text>
                                </View>
                                <View style={tw`flex-row justify-between py-1.5 border-b border-[#f4f6f8]`}>
                                    <Text style={tw`text-[#9aa5b5] text-sm`}>Institusi</Text>
                                    <Text style={tw`text-[#0b4771] text-sm font-medium`}>RS Harapan Sehat Surabaya</Text>
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
