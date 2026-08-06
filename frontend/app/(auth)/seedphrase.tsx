import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Dimensions, Platform, ActivityIndicator, Image, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import Animated, {
    FadeIn, FadeInDown, ZoomIn,
    useSharedValue, useAnimatedStyle, withTiming, withSpring, withDelay, withSequence,
    Easing,
} from 'react-native-reanimated';

// Polyfill for bip39
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
import * as bip39 from 'bip39';

import { callPatientAccess } from '../../lib/patient-api';
import { authState } from '../../constants/auth';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';

global.Buffer = global.Buffer || Buffer;

const { width } = Dimensions.get('window');

export default function SeedPhraseScreen() {
    const router = useRouter();
    const [mnemonic, setMnemonic] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(true);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [hasCopied, setHasCopied] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showQrModal, setShowQrModal] = useState(false);

    // Shared values for smooth modal animation
    const backdropOpacity = useSharedValue(0);
    const cardScale = useSharedValue(0);
    const cardOpacity = useSharedValue(0);
    const iconScale = useSharedValue(0);
    const iconRotate = useSharedValue(0);
    const textOpacity = useSharedValue(0);
    const progressWidth = useSharedValue(0);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const backdropAnimStyle = useAnimatedStyle(() => ({
        opacity: backdropOpacity.value,
    }));
    const cardAnimStyle = useAnimatedStyle(() => ({
        transform: [{ scale: cardScale.value }],
        opacity: cardOpacity.value,
    }));
    const iconAnimStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: iconScale.value },
            { rotate: `${iconRotate.value}deg` },
        ],
    }));
    const textAnimStyle = useAnimatedStyle(() => ({
        opacity: textOpacity.value,
    }));
    const progressAnimStyle = useAnimatedStyle(() => ({
        width: `${progressWidth.value}%`,
    }));

    useEffect(() => {
        generateAndSaveSeedPhrase();
    }, []);

    const generateAndSaveSeedPhrase = async () => {
        try {
            setIsGenerating(true);
            // Generate 12-word mnemonic (128 bits of entropy)
            const generatedMnemonic = bip39.generateMnemonic(128);
            const words = generatedMnemonic.split(' ');
            setMnemonic(words);

            // Save to secure store
            await SecureStore.setItemAsync('user_seed_phrase', generatedMnemonic);

            // Generate deterministic wallet address from mnemonic
            const walletAddress = '0x' + bytesToHex(sha256(Buffer.from(generatedMnemonic, 'utf-8'))).substring(0, 40);
            await SecureStore.setItemAsync('user_wallet_address', walletAddress);
        } catch (error) {
            console.error('Failed to generate seed phrase:', error);
            Alert.alert('Error', 'Gagal membuat recovery phrase.');
        } finally {
            setIsGenerating(false);
        }
    };

    const copyToClipboard = async () => {
        const phrase = mnemonic.join(' ');
        await Clipboard.setStringAsync(phrase);
        setHasCopied(true);
        Alert.alert('Tersalin!', 'Recovery phrase telah disalin ke clipboard.');
    };

    const doNavigate = useCallback(() => {
        setShowSuccessModal(false);
        authState.login();
        router.replace('/(dashboard)');
    }, [router]);

    const handleNext = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            // 1. Get pending patient data
            const pendingDataStr = await SecureStore.getItemAsync('pending_patient_data');
            if (!pendingDataStr) {
                Alert.alert('Error', 'Data registrasi tidak ditemukan. Silakan isi form registrasi kembali.', [
                    { text: 'OK', onPress: () => router.replace('/(auth)/register') }
                ]);
                return;
            }

            const pendingData = JSON.parse(pendingDataStr);

            const walletAddress = await SecureStore.getItemAsync('user_wallet_address');

            // Clean/sanitize blood_type to ensure it passes database check constraint (must be NOT NULL: A, B, AB, or O)
            let cleanBloodType = 'O';
            if (pendingData.blood_type) {
                const upper = String(pendingData.blood_type).trim().toUpperCase();
                if (upper.includes('AB')) cleanBloodType = 'AB';
                else if (upper.includes('A')) cleanBloodType = 'A';
                else if (upper.includes('B')) cleanBloodType = 'B';
                else if (upper.includes('O')) cleanBloodType = 'O';
            }

            await callPatientAccess('register_patient', {
                nik: pendingData.nik,
                name: pendingData.name,
                gender: pendingData.gender,
                birth_date: pendingData.birth_date,
                blood_type: cleanBloodType,
                wallet_address: walletAddress,
            });

            // 4. Save nik to SecureStore
            await SecureStore.setItemAsync('user_nik', pendingData.nik);

            // 5. Clean up pending data
            await SecureStore.deleteItemAsync('pending_patient_data');

            // 5. Proceed with animations and navigation
            // Show modal
            setShowSuccessModal(true);

            // 1. Backdrop fades in
            backdropOpacity.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) });

            // 2. Card scales up with spring bounce
            cardOpacity.value = withTiming(1, { duration: 250 });
            cardScale.value = withSpring(1, { damping: 12, stiffness: 140, mass: 0.8 });

            // 3. Icon appears with a playful bounce + subtle rotation
            iconScale.value = withDelay(250, withSequence(
                withSpring(1.15, { damping: 8, stiffness: 180 }),
                withSpring(1, { damping: 10, stiffness: 120 }),
            ));
            iconRotate.value = withDelay(250, withSequence(
                withTiming(-8, { duration: 120 }),
                withTiming(8, { duration: 120 }),
                withTiming(0, { duration: 150, easing: Easing.out(Easing.cubic) }),
            ));

            // 4. Text fades in
            textOpacity.value = withDelay(400, withTiming(1, { duration: 350 }));

            // 5. Progress bar fills over ~2 seconds
            progressWidth.value = withDelay(500, withTiming(100, { duration: 1800, easing: Easing.inOut(Easing.cubic) }));

            // 6. Auto-navigate after progress completes
            timerRef.current = setTimeout(() => {
                // Collapse card before navigating
                cardScale.value = withTiming(0.85, { duration: 200 });
                cardOpacity.value = withTiming(0, { duration: 200 });
                backdropOpacity.value = withTiming(0, { duration: 300 });
                setTimeout(() => {
                    doNavigate();
                }, 320);
            }, 2500);

        } catch (err: any) {
            console.error('Registration processing error:', err);
            Alert.alert('Error', 'Terjadi kesalahan saat memproses pendaftaran: ' + (err.message || err));
        } finally {
            setIsSubmitting(false);
        }
    };

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Registrasi Pasien</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Success Icon Animated */}
                <Animated.View entering={ZoomIn.duration(600).springify()} style={styles.iconContainer}>
                    <View style={styles.iconGlow}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="lock-closed" size={36} color="#FFFFFF" />
                        </View>
                    </View>
                </Animated.View>

                {/* Text Section */}
                <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.textCenter}>
                    <Text style={styles.title}>Amankan Kunci Pemulihan</Text>
                    <Text style={styles.subtitle}>
                        Simpan Recovery Phrase Anda sekarang. Ambil screenshot atau salin ke tempat yang aman.
                    </Text>
                </Animated.View>

                {/* Recovery Phrase Section */}
                <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.phraseSection}>
                    <Text style={styles.phraseLabel}>Recovery Phrase</Text>

                    <View style={styles.phraseBox}>
                        {isGenerating ? (
                            <Text style={styles.loadingText}>Membuat phrase...</Text>
                        ) : (
                            <View style={styles.gridContainer}>
                                {mnemonic.map((word, index) => (
                                    <View key={index} style={styles.wordItem}>
                                        <Text style={styles.wordNumber}>{index + 1}</Text>
                                        <Text style={styles.wordText}>{word}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Actions */}
                    <View style={styles.actionsContainer}>
                        <TouchableOpacity style={styles.actionButton} onPress={copyToClipboard}>
                            <Ionicons name="copy-outline" size={20} color="#0D9488" />
                            <Text style={styles.actionText}>Salin</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionButton} onPress={() => setShowQrModal(true)}>
                            <Ionicons name="qr-code-outline" size={20} color="#0D9488" />
                            <Text style={styles.actionText}>Lihat QR</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>

                {/* Warning Box */}
                <Animated.View entering={FadeInDown.delay(600).duration(500)} style={styles.warningBox}>
                    <View style={styles.warningHeader}>
                        <Ionicons name="warning-outline" size={20} color="#EA580C" />
                        <Text style={styles.warningTitle}>Penting!</Text>
                    </View>
                    <Text style={styles.warningText}>
                        Simpan Recovery Phrase dan QR Code Anda di tempat yang aman. Keduanya merupakan satu-satunya cara untuk memulihkan akun Anda.
                    </Text>
                </Animated.View>
            </ScrollView>

            {/* Footer Button */}
            <Animated.View entering={FadeIn.delay(800).duration(500)} style={styles.footer}>
                {!hasCopied && (
                    <Text style={styles.copyHint}>Salin recovery phrase terlebih dahulu untuk melanjutkan</Text>
                )}
                <TouchableOpacity
                    style={[styles.nextButton, (!hasCopied || isSubmitting) && styles.nextButtonDisabled]}
                    onPress={handleNext}
                    disabled={!hasCopied || isSubmitting}
                    activeOpacity={hasCopied && !isSubmitting ? 0.7 : 1}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                        <Text style={[styles.nextButtonText, !hasCopied && styles.nextButtonTextDisabled]}>Lanjut</Text>
                    )}
                </TouchableOpacity>
            </Animated.View>

            {/* QR Code Modal */}
            <Modal
                visible={showQrModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowQrModal(false)}
            >
                <View style={styles.modalOverlayWrapper}>
                    <TouchableOpacity 
                        style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.5)' }]} 
                        activeOpacity={1} 
                        onPress={() => setShowQrModal(false)}
                    />
                    <View style={[styles.modalContentCard, { padding: 24 }]}>
                        <Text style={[styles.modalSuccessTitle, { fontSize: 18, marginBottom: 4 }]}>QR Code Recovery</Text>
                        <Text style={[styles.modalSuccessText, { fontSize: 12, marginBottom: 16 }]}>
                            Scan untuk menyimpan recovery phrase akun Anda secara instan.
                        </Text>
                        
                        <View style={{ backgroundColor: '#F9FAFB', padding: 12, borderRadius: 16, borderStyle: 'dashed', borderWidth: 1.5, borderColor: '#E5E7EB', marginBottom: 16 }}>
                            <Image
                                source={{ uri: `https://quickchart.io/qr?text=${encodeURIComponent(mnemonic.join(' '))}&size=200&margin=1` }}
                                style={{ width: 200, height: 200 }}
                            />
                        </View>

                        <TouchableOpacity 
                            style={[styles.nextButton, { width: '100%', height: 48, marginTop: 0 }]}
                            onPress={() => setShowQrModal(false)}
                        >
                            <Text style={styles.nextButtonText}>Tutup</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Success Modal Overlay (SweetAlert Custom) */}
            {showSuccessModal && (
                <View style={styles.modalOverlayWrapper}>
                    <Animated.View style={[styles.modalBackdrop, backdropAnimStyle]} />
                    <Animated.View style={[styles.modalContentCard, cardAnimStyle]}>
                        <Animated.View style={[styles.modalIconContainer, iconAnimStyle]}>
                            <View style={styles.iconCheckBg}>
                                <Ionicons name="checkmark-circle" size={72} color="#0D9488" />
                            </View>
                        </Animated.View>
                        <Animated.Text style={[styles.modalSuccessTitle, textAnimStyle]}>Pendaftaran Berhasil!</Animated.Text>
                        <Animated.Text style={[styles.modalSuccessText, textAnimStyle]}>
                            Akun Anda telah berhasil dibuat. Selamat datang di Clinexa!
                        </Animated.Text>
                        <View style={styles.progressBarBg}>
                            <Animated.View style={[styles.progressBarFill, progressAnimStyle]} />
                        </View>
                    </Animated.View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 16,
        backgroundColor: '#FAFAFA',
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    iconContainer: {
        alignItems: 'center',
        marginTop: 32,
        marginBottom: 24,
    },
    iconGlow: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(13, 148, 136, 0.2)', // Light green glow
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#0D9488',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#0D9488',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 8,
    },
    textCenter: {
        alignItems: 'center',
        marginBottom: 32,
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        color: '#1F2937',
        marginBottom: 16,
        letterSpacing: 0.5,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 16,
    },
    phraseSection: {
        marginBottom: 24,
    },
    phraseLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6B7280',
        marginBottom: 12,
    },
    phraseBox: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        minHeight: 200,
    },
    loadingText: {
        textAlign: 'center',
        color: '#9CA3AF',
        marginTop: 40,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 10,
    },
    wordItem: {
        width: '31%',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 6,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    wordNumber: {
        fontSize: 11,
        fontWeight: '600',
        color: '#94A3B8',
        marginBottom: 6,
    },
    wordText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#334155',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    actionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 20,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    actionText: {
        color: '#0D9488',
        fontWeight: '600',
        fontSize: 15,
        marginLeft: 8,
    },
    warningBox: {
        backgroundColor: '#FFF7ED',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#FFEDD5',
    },
    warningHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    warningTitle: {
        color: '#EA580C',
        fontWeight: '700',
        fontSize: 15,
        marginLeft: 8,
    },
    warningText: {
        color: '#EA580C',
        fontSize: 13,
        lineHeight: 20,
    },
    footer: {
        paddingHorizontal: 24,
        paddingBottom: Platform.OS === 'ios' ? 34 : 24,
        paddingTop: 16,
        backgroundColor: '#FAFAFA',
    },
    nextButton: {
        backgroundColor: '#2DD4BF',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        shadowColor: '#2DD4BF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    nextButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    nextButtonDisabled: {
        backgroundColor: '#D1D5DB',
        shadowOpacity: 0,
        elevation: 0,
    },
    nextButtonTextDisabled: {
        color: '#9CA3AF',
    },
    copyHint: {
        fontSize: 12,
        color: '#EF4444',
        textAlign: 'center',
        marginBottom: 10,
        fontWeight: '500',
    },
    modalOverlayWrapper: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        elevation: 1000,
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContentCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 32,
        width: width * 0.85,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    modalIconContainer: {
        marginBottom: 20,
    },
    iconCheckBg: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: 'rgba(13, 148, 136, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalSuccessTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 8,
        textAlign: 'center',
    },
    modalSuccessText: {
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    progressBarBg: {
        width: '100%',
        height: 4,
        backgroundColor: '#E5E7EB',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#0D9488',
        borderRadius: 2,
    },
});

//Peringatan: Kehilangan frasa ini berarti Anda akan kehilangan akses ke rekam medis Anda.
