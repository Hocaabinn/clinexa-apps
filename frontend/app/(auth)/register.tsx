import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Modal,
    Dimensions,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import { Buffer } from 'buffer';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const MONTHS = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];
const YEARS = Array.from({ length: 107 }, (_, i) => String(2026 - i)); // 2026 down to 1920

const getDaysInMonth = (monthName: string, yearStr: string) => {
    const monthIndex = MONTHS.indexOf(monthName);
    const year = parseInt(yearStr) || 2000;
    return new Date(year, monthIndex + 1, 0).getDate();
};

export default function RegisterScreen() {
    const router = useRouter();
    const [nik, setNik] = useState('');
    const [name, setName] = useState('');
    const [gender, setGender] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [bloodType, setBloodType] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // State untuk custom dropdown (jenis kelamin)
    const [showGenderModal, setShowGenderModal] = useState(false);

    // State untuk custom date picker (tanggal lahir)
    const [showDatePickerModal, setShowDatePickerModal] = useState(false);
    const [selectedDay, setSelectedDay] = useState('01');
    const [selectedMonth, setSelectedMonth] = useState('Januari');
    const [selectedYear, setSelectedYear] = useState('2000');

    const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
    const dayOptions = DAYS.slice(0, daysInMonth);

    const isFormValid = nik.trim().length === 16 && name.trim() !== '' && gender !== '' && birthDate !== '' && !isSubmitting;

    const selectMonth = (month: string) => {
        setSelectedMonth(month);
        const days = getDaysInMonth(month, selectedYear);
        if (parseInt(selectedDay) > days) {
            setSelectedDay(String(days).padStart(2, '0'));
        }
    };

    const selectYear = (year: string) => {
        setSelectedYear(year);
        const days = getDaysInMonth(selectedMonth, year);
        if (parseInt(selectedDay) > days) {
            setSelectedDay(String(days).padStart(2, '0'));
        }
    };

    const handleRegister = async () => {
        if (!nik.trim() || !name.trim() || !gender || !birthDate) {
            alert('Silakan lengkapi semua data pendaftaran.');
            return;
        }
        if (nik.trim().length !== 16) {
            alert('NIK harus terdiri dari 16 digit angka.');
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Cek apakah NIK sudah terdaftar di Supabase
            const { data: existingPatient, error: fetchError } = await supabase
                .from('patients')
                .select('id')
                .eq('nik', nik.trim())
                .single();

            if (existingPatient) {
                alert('Pendaftaran Gagal: NIK ini sudah terdaftar sebelumnya.');
                setIsSubmitting(false);
                return;
            }
            if (fetchError && fetchError.code !== 'PGRST116') {
                // PGRST116 is "No rows found", which is good. Anything else is an actual error.
                console.error('Error mengecek NIK:', fetchError);
            }

            // 2. Map gender: Laki-laki -> L, Perempuan -> P
            const mappedGender = gender === 'Laki-laki' ? 'L' : 'P';

            // 3. Format tanggal: 01 Januari 2000 -> 2000-01-01
            const monthIndex = MONTHS.indexOf(selectedMonth) + 1;
            const monthStr = String(monthIndex).padStart(2, '0');
            const formattedBirthDate = `${selectedYear}-${monthStr}-${selectedDay}`;

            // 4. Simpan data pasien ke SecureStore sementara
            const formattedBloodType = bloodType.trim() ? bloodType.trim().toUpperCase() : null;

            const pendingPatientData = {
                nik: nik.trim(),
                name: name.trim(),
                gender: mappedGender,
                birth_date: formattedBirthDate,
                blood_type: formattedBloodType,
            };

            await SecureStore.setItemAsync('pending_patient_data', JSON.stringify(pendingPatientData));

            // Arahkan ke halaman seedphrase setelah data berhasil disimpan
            router.push('/(auth)/seedphrase');
        } catch (error) {
            console.error('Gagal menyimpan data registrasi:', error);
            alert('Terjadi kesalahan saat memproses data registrasi.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectGender = (selectedGender: string) => {
        setGender(selectedGender);
        setShowGenderModal(false);
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
            <SafeAreaView style={{ backgroundColor: '#1BA098' }} edges={['top']} />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.container}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>

                    {/* Header Section */}
                    <View style={styles.headerSection}>
                        {/* Decorative Background Shapes */}
                        <View style={styles.bgShape1} />
                        <View style={styles.bgShape2} />
                        <View style={styles.bgShape3} />

                        <View style={styles.headerTop}>
                            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>Registrasi Pasien</Text>
                            <View style={{ width: 24 }} />
                        </View>

                        <View style={styles.headerDivider} />

                        <View style={styles.welcomeContainer}>
                            <Text style={styles.welcomeTitle}>Halo, Sobat Clinexa!</Text>
                            <Text style={styles.welcomeSubtitle}>
                                Ayo daftar untuk mengakses rekam medis yang aman dan terkontrol penuh oleh Anda.
                            </Text>
                        </View>
                    </View>

                    {/* Form Section */}
                    <View style={styles.formContainer}>

                        {/* Input NIK */}
                        <View style={[
                            styles.inputWrapper,
                            nik.length > 0 && nik.length < 16 && { borderColor: '#E53E3E', marginBottom: 4 }
                        ]}>
                            <Ionicons
                                name="card-outline"
                                size={20}
                                color={nik.length > 0 && nik.length < 16 ? '#E53E3E' : '#999'}
                                style={styles.inputIcon}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="NIK (Contoh: 3171013213900000)"
                                placeholderTextColor="#999"
                                value={nik}
                                onChangeText={(text) => setNik(text.replace(/[^0-9]/g, ''))}
                                keyboardType="numeric"
                                maxLength={16}
                            />
                        </View>
                        {nik.length > 0 && nik.length < 16 && (
                            <Text style={styles.errorText}>NIK harus terdiri dari 16 digit angka</Text>
                        )}

                        {/* Input Nama Lengkap */}
                        <View style={styles.inputWrapper}>
                            <Ionicons name="person-outline" size={20} color="#999" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Nama Lengkap (Sesuai KTP)"
                                placeholderTextColor="#999"
                                value={name}
                                onChangeText={setName}
                            />
                        </View>

                        {/* Input Jenis Kelamin (Custom Dropdown) */}
                        <TouchableOpacity
                            style={styles.inputWrapper}
                            activeOpacity={0.7}
                            onPress={() => setShowGenderModal(true)}
                        >
                            <Ionicons name="male-female-outline" size={20} color="#999" style={styles.inputIcon} />
                            <Text style={[styles.inputText, !gender && styles.placeholderText]}>
                                {gender || 'Pilih Jenis Kelamin'}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color="#999" style={styles.rightIcon} />
                        </TouchableOpacity>

                        {/* Input Tanggal Lahir */}
                        <TouchableOpacity
                            style={styles.inputWrapper}
                            activeOpacity={0.7}
                            onPress={() => setShowDatePickerModal(true)}
                        >
                            <Ionicons name="calendar-outline" size={20} color="#999" style={styles.inputIcon} />
                            <Text style={[styles.inputText, !birthDate && styles.placeholderText]}>
                                {birthDate || 'Pilih Tanggal Lahir'}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color="#999" style={styles.rightIcon} />
                        </TouchableOpacity>

                        {/* Input Golongan Darah */}
                        <View style={styles.inputWrapper}>
                            <Ionicons name="water-outline" size={20} color="#999" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Isi Golongan Darah (Opsional)"
                                placeholderTextColor="#999"
                                value={bloodType}
                                onChangeText={setBloodType}
                            />
                        </View>

                        {/* Info Keamanan & Privasi */}
                        <View style={styles.infoBox}>
                            <View style={styles.infoHeader}>
                                <Ionicons name="information-circle-outline" size={20} color="#E65100" />
                                <Text style={styles.infoTitle}>Keamanan & Privasi</Text>
                            </View>
                            <Text style={styles.infoText}>
                                Sistem akan otomatis membuat Account ID unik dan 12 Recovery Phrase untuk pasien ini. Pastikan Anda menyimpan frasa pemulihan dengan aman. Tidak ada data pribadi yang disimpan di server sentral.
                            </Text>
                        </View>

                        {/* Tombol Daftar */}
                        <TouchableOpacity
                            style={[
                                styles.registerButton,
                                {
                                    backgroundColor: isFormValid ? '#1BA098' : '#CBECE8',
                                    shadowColor: isFormValid ? '#1BA098' : 'transparent',
                                    elevation: isFormValid ? 6 : 0,
                                }
                            ]}
                            onPress={handleRegister}
                            disabled={!isFormValid || isSubmitting}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.registerButtonText}>
                                {isSubmitting ? 'Memproses...' : 'Daftar'}
                            </Text>
                        </TouchableOpacity>

                        {/* Login Link */}
                        <View style={styles.footerContainer}>
                            <Text style={styles.footerText}>Sudah punya akun? </Text>
                            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                                <Text style={styles.loginText}>Masuk</Text>
                            </TouchableOpacity>
                        </View>

                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Modal Jenis Kelamin */}
            <Modal
                visible={showGenderModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowGenderModal(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowGenderModal(false)}
                >
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Pilih Jenis Kelamin</Text>

                        <TouchableOpacity style={styles.modalOption} onPress={() => selectGender('Laki-laki')}>
                            <Text style={styles.modalOptionText}>Laki-laki</Text>
                        </TouchableOpacity>

                        <View style={styles.modalDivider} />

                        <TouchableOpacity style={styles.modalOption} onPress={() => selectGender('Perempuan')}>
                            <Text style={styles.modalOptionText}>Perempuan</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Modal Tanggal Lahir */}
            <Modal
                visible={showDatePickerModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowDatePickerModal(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowDatePickerModal(false)}
                >
                    <View style={[styles.modalContent, { width: width * 0.9 }]}>
                        <Text style={styles.modalTitle}>Pilih Tanggal Lahir</Text>

                        <View style={styles.pickerColumnsContainer}>
                            {/* Column Hari */}
                            <View style={styles.pickerColumn}>
                                <Text style={styles.columnHeader}>Hari</Text>
                                <ScrollView
                                    style={styles.columnScrollView}
                                    showsVerticalScrollIndicator={false}
                                    nestedScrollEnabled={true}
                                >
                                    {dayOptions.map((d) => {
                                        const isSelected = d === selectedDay;
                                        return (
                                            <TouchableOpacity
                                                key={d}
                                                style={[styles.columnItem, isSelected && styles.columnItemActive]}
                                                onPress={() => setSelectedDay(d)}
                                            >
                                                <Text style={[styles.columnItemText, isSelected && styles.columnItemTextActive]}>
                                                    {d}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>

                            {/* Column Bulan */}
                            <View style={[styles.pickerColumn, { flex: 1.5 }]}>
                                <Text style={styles.columnHeader}>Bulan</Text>
                                <ScrollView
                                    style={styles.columnScrollView}
                                    showsVerticalScrollIndicator={false}
                                    nestedScrollEnabled={true}
                                >
                                    {MONTHS.map((m) => {
                                        const isSelected = m === selectedMonth;
                                        return (
                                            <TouchableOpacity
                                                key={m}
                                                style={[styles.columnItem, isSelected && styles.columnItemActive]}
                                                onPress={() => selectMonth(m)}
                                            >
                                                <Text
                                                    style={[styles.columnItemText, isSelected && styles.columnItemTextActive]}
                                                    numberOfLines={1}
                                                >
                                                    {m}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>

                            {/* Column Tahun */}
                            <View style={styles.pickerColumn}>
                                <Text style={styles.columnHeader}>Tahun</Text>
                                <ScrollView
                                    style={styles.columnScrollView}
                                    showsVerticalScrollIndicator={false}
                                    nestedScrollEnabled={true}
                                >
                                    {YEARS.map((y) => {
                                        const isSelected = y === selectedYear;
                                        return (
                                            <TouchableOpacity
                                                key={y}
                                                style={[styles.columnItem, isSelected && styles.columnItemActive]}
                                                onPress={() => selectYear(y)}
                                            >
                                                <Text style={[styles.columnItemText, isSelected && styles.columnItemTextActive]}>
                                                    {y}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        </View>

                        <View style={styles.modalButtonsRow}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonCancel]}
                                onPress={() => setShowDatePickerModal(false)}
                            >
                                <Text style={styles.modalButtonTextCancel}>Batal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonConfirm]}
                                onPress={() => {
                                    setBirthDate(`${selectedDay} ${selectedMonth} ${selectedYear}`);
                                    setShowDatePickerModal(false);
                                }}
                            >
                                <Text style={styles.modalButtonTextConfirm}>Pilih</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>

        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#1BA098',
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        backgroundColor: '#1BA098',
    },
    headerSection: {
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ? StatusBar.currentHeight + 15 : 40) : 15,
        paddingBottom: 45,
        backgroundColor: '#1BA098',
        overflow: 'hidden',
        position: 'relative',
    },
    bgShape1: {
        position: 'absolute',
        top: -40,
        right: -40,
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
    },
    bgShape2: {
        position: 'absolute',
        bottom: -20,
        left: -30,
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    bgShape3: {
        position: 'absolute',
        top: 60,
        left: '50%',
        width: 45,
        height: 45,
        borderRadius: 22.5,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    headerDivider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.22)',
        marginBottom: 24,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    welcomeContainer: {
        marginTop: 10,
    },
    welcomeTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    welcomeSubtitle: {
        fontSize: 14,
        color: '#E0F2F1',
        lineHeight: 20,
    },
    formContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingHorizontal: 24,
        paddingTop: 40,
        paddingBottom: 24,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        marginBottom: 16,
        paddingHorizontal: 16,
        height: 56,
    },
    inputIcon: {
        marginRight: 12,
    },
    rightIcon: {
        marginLeft: 'auto',
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: '#333333',
    },
    inputText: {
        flex: 1,
        fontSize: 15,
        color: '#333333',
    },
    placeholderText: {
        color: '#999999',
    },
    errorText: {
        color: '#E53E3E',
        fontSize: 12,
        marginLeft: 16,
        marginBottom: 16,
        marginTop: -2,
    },
    infoBox: {
        backgroundColor: '#FFF3E0',
        borderRadius: 12,
        padding: 16,
        marginTop: 8,
        marginBottom: 32,
    },
    infoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    infoTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#E65100',
        marginLeft: 8,
    },
    infoText: {
        fontSize: 12,
        color: '#E65100',
        lineHeight: 18,
    },
    registerButton: {
        backgroundColor: '#6EC5B8',
        borderRadius: 12,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#6EC5B8',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
        marginBottom: 32,
    },
    registerButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    footerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 'auto',
    },
    footerText: {
        fontSize: 14,
        color: '#999999',
    },
    loginText: {
        fontSize: 14,
        color: '#1BA098',
        fontWeight: 'bold',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: width * 0.8,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333333',
        marginBottom: 20,
    },
    modalOption: {
        paddingVertical: 12,
        width: '100%',
        alignItems: 'center',
    },
    modalOptionText: {
        fontSize: 16,
        color: '#333333',
    },
    modalDivider: {
        width: '100%',
        height: 1,
        backgroundColor: '#E0E0E0',
        marginVertical: 4,
    },
    // Date Picker Styles
    pickerColumnsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        height: 200,
        marginBottom: 20,
        width: '100%',
    },
    pickerColumn: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 4,
    },
    columnHeader: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#999999',
        marginBottom: 8,
    },
    columnScrollView: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        backgroundColor: '#F9F9F9',
    },
    columnItem: {
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    columnItemActive: {
        backgroundColor: '#1BA098',
    },
    columnItemText: {
        fontSize: 14,
        color: '#333333',
    },
    columnItemTextActive: {
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    modalButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        height: 48,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalButtonCancel: {
        backgroundColor: '#F5F5F5',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    modalButtonConfirm: {
        backgroundColor: '#1BA098',
    },
    modalButtonTextCancel: {
        color: '#666666',
        fontSize: 15,
        fontWeight: '600',
    },
    modalButtonTextConfirm: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
});
