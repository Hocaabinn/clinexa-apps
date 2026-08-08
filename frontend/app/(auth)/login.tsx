import { Ionicons } from '@expo/vector-icons';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import { Buffer } from 'buffer';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authState } from '../../constants/auth';
import { callPatientAccess } from '../../lib/patient-api';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'recovery' | 'qr'>('recovery');

  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scanAnim = useRef(new Animated.Value(0)).current;

  // Focus tracking state
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isNikFocused, setIsNikFocused] = useState(false);
  const [isOtpFocused, setIsOtpFocused] = useState(false);
  const [showSeedPhraseInput, setShowSeedPhraseInput] = useState(false);

  // Recovery Phrase / OTP Input State
  const [nik, setNik] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [recoveryPhrase, setRecoveryPhrase] = useState('');
  const [useNikDirect, setUseNikDirect] = useState(true);
  const [nikDirectInput, setNikDirectInput] = useState('');
  const [isNikDirectFocused, setIsNikDirectFocused] = useState(false);

  // Countdown timer for resending OTP
  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Camera Permission and Scan State
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  // Loop QR scan line animation
  useEffect(() => {
    if (activeTab === 'qr') {
      setScanned(false); // Reset scanned state when opening QR tab
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scanAnim.setValue(0);
    }
  }, [activeTab, scanAnim]);

  const switchTab = (tab: 'recovery' | 'qr') => {
    if (tab === activeTab) return;

    // Smooth fade transition
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setActiveTab(tab);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleSendOtp = async () => {
    if (nik.trim() === '') {
      alert('Silakan masukkan nomor WA terlebih dahulu!');
      return;
    }
    if (nik.trim().length < 9 || nik.trim().length > 15) {
      alert('Silakan masukkan nomor WA yang valid (9-15 digit).');
      return;
    }
    setIsSendingOtp(true);
    try {
      const patient = await callPatientAccess<{ exists: boolean }>('check_nik', { nik: nik.trim() });

      if (!patient.exists) {
        alert('Nomor WA tidak ditemukan atau tidak terdaftar sebagai pasien.');
        return;
      }

      // 2. Generate random 6-digit OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(code);
      setOtpSent(true);
      setCountdown(60);

      // Salin OTP ke clipboard agar mudah dipaste/diingat saat kembali dari WA
      await Clipboard.setStringAsync(code);

      // 3. Simulasikan pengiriman OTP dengan membuka WhatsApp
      Alert.alert(
        'Kode OTP Terkirim',
        `Kode OTP (${code}) telah terkirim ke WhatsApp Anda (dan disalin ke clipboard). Silakan buka WhatsApp untuk mengambil kode.`,
        [
          {
            text: 'Buka WhatsApp',
            onPress: async () => {
              try {
                await Linking.openURL('whatsapp://app');
              } catch (err) {
                // Fallback jika tidak ada aplikasi WA
                await Linking.openURL('https://wa.me');
              }
            }
          }
        ]
      );
    } catch (err) {
      console.error('Error sending OTP:', err);
      alert('Gagal mengirimkan OTP. Silakan coba lagi.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleContinue = async () => {
    if (nik.trim().length < 9 || nik.trim().length > 15) {
      alert('Silakan masukkan nomor WA yang valid (9-15 digit).');
      return;
    }
    if (!otpSent || !generatedOtp) {
      alert('Silakan kirim OTP terlebih dahulu.');
      return;
    }
    if (otp.trim() !== generatedOtp) {
      alert('Kode OTP yang Anda masukkan salah.');
      return;
    }

    try {
      const walletAddressFromPhrase = recoveryPhrase.trim() !== ''
        ? '0x' + bytesToHex(sha256(Buffer.from(recoveryPhrase.trim(), 'utf-8'))).substring(0, 40)
        : undefined;

      // Use Edge Function 'get_patient' to bypass RLS policies
      const patient = await callPatientAccess<{ id: string; name: string; wallet_address?: string }>('get_patient', {
        nik: nik.trim(),
        wallet_address: walletAddressFromPhrase,
      });

      if (!patient) {
        alert('Nomor WA tidak ditemukan atau tidak terdaftar sebagai pasien.');
        return;
      }

      // 2. Simpan NIK ke SecureStore
      await SecureStore.setItemAsync('user_nik', nik.trim());

      // 3. Simpan seed phrase jika diisi (opsional)
      if (recoveryPhrase.trim() !== '') {
        await SecureStore.setItemAsync('user_seed_phrase', recoveryPhrase.trim());
        await SecureStore.setItemAsync('user_wallet_address', walletAddressFromPhrase!);
      } else {
        // Jika tidak diisi, gunakan wallet_address dari database
        if (patient.wallet_address) {
          await SecureStore.setItemAsync('user_wallet_address', patient.wallet_address);
        }
      }

      alert(`Selamat datang kembali, ${patient.name}!`);
      authState.login();
      router.replace('/(dashboard)');
    } catch (err) {
      console.error('Error logging in:', err);
      alert('Gagal memuat akun. Pastikan data benar.');
    }
  };

  const handleSeedPhraseLogin = async () => {
    if (recoveryPhrase.trim() === '') {
      alert('Silakan masukkan seed phrase Anda.');
      return;
    }

    setIsSendingOtp(true);
    try {
      const walletAddressFromPhrase = '0x' + bytesToHex(sha256(Buffer.from(recoveryPhrase.trim(), 'utf-8'))).substring(0, 40);

      // Query database directly to bypass outdated Edge Function
      const { data: patient, error: dbError } = await supabase
        .from('patients')
        .select('id, nik, name, wallet_address')
        .eq('wallet_address', walletAddressFromPhrase)
        .maybeSingle();

      if (dbError) throw dbError;
      if (!patient) {
        alert('Seedphrase tidak cocok dengan data pasien manapun.');
        return;
      }

      // Simpan NIK (nomor WA) dari server ke SecureStore
      await SecureStore.setItemAsync('user_nik', patient.nik);

      // Simpan seed phrase ke SecureStore
      await SecureStore.setItemAsync('user_seed_phrase', recoveryPhrase.trim());
      await SecureStore.setItemAsync('user_wallet_address', walletAddressFromPhrase);

      alert(`Selamat datang kembali, ${patient.name}!`);
      authState.login();
      router.replace('/(dashboard)');
    } catch (err: any) {
      console.error('Error logging in with seed phrase:', err);
      alert(err.message || 'Gagal masuk. Pastikan Seedphrase benar.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleNikDirectLogin = async () => {
    if (nikDirectInput.trim() === '') {
      alert('Silakan masukkan NIK Anda.');
      return;
    }
    if (nikDirectInput.trim().length !== 16) {
      alert('NIK harus terdiri dari 16 digit angka.');
      return;
    }

    setIsSendingOtp(true);
    try {
      // Use check_nik to verify patient exists (no wallet check needed for NIK-only login)
      const result = await callPatientAccess<{ exists: boolean }>('check_nik', {
        nik: nikDirectInput.trim(),
      });

      if (!result.exists) {
        alert('NIK tidak ditemukan atau tidak terdaftar sebagai pasien.');
        return;
      }

      // Simpan NIK ke SecureStore
      await SecureStore.setItemAsync('user_nik', nikDirectInput.trim());

      alert('Login berhasil!');
      authState.login();
      router.replace('/(dashboard)');
    } catch (err: any) {
      console.error('Error logging in with NIK:', err);
      alert('NIK tidak ditemukan atau tidak terdaftar sebagai pasien.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    setScanned(true);
    console.log('Barcode scanned:', data);
    alert(`Kode QR berhasil dipindai: ${data}`);
    authState.login();
    router.replace('/(dashboard)');
  };

  // Interpolate translateY for the scanning laser line
  const scanTranslateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 190], // Scanner box is 200px tall
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <SafeAreaView style={{ backgroundColor: '#1BA098' }} edges={['top']} />
      <StatusBar barStyle="light-content" translucent backgroundColor="#1BA098" />

      {/* Top Navbar */}
      <View style={styles.navbarContainer}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.6}>
          <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={[styles.navbarTitle, { color: '#FFFFFF' }]}>Memuat Akun</Text>
        <View style={styles.spacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          <View>
            {/* Tab Selector - Line Indicator Style matches user request screenshot */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'recovery' && styles.tabButtonActive]}
                onPress={() => switchTab('recovery')}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, activeTab === 'recovery' && styles.tabTextActive]}>
                  Masukkan NIK
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'qr' && styles.tabButtonActive]}
                onPress={() => switchTab('qr')}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, activeTab === 'qr' && styles.tabTextActive]}>
                  Pindai Kode QR
                </Text>
              </TouchableOpacity>
            </View>

            {/* Animated Tab Content */}
            <Animated.View style={[styles.contentWrapper, { opacity: fadeAnim }]}>
              {activeTab === 'recovery' ? (
                /* --- KATA SANDI PEMULIHAN FORM --- */
                <View style={styles.tabContent}>
                  {/* Header Title with Card Icon */}
                  <View style={styles.contentHeader}>
                    <Text style={styles.contentTitle}>Masukkan NIK anda</Text>
                    <Ionicons name="card-outline" size={22} color="#0F172A" style={styles.titleIcon} />
                  </View>

                  {/* Description */}
                  <Text style={styles.description}>
                    Masukkan 16 digit NIK Anda untuk masuk ke aplikasi.
                  </Text>

                  {/* NIK Input Field */}
                  <View style={[
                    styles.inputWrapper,
                    isNikDirectFocused && styles.inputWrapperFocused
                  ]}>
                    <Ionicons name="card-outline" size={20} color={isNikDirectFocused ? "#1BA098" : "#94A3B8"} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Tulis NIK Anda"
                      placeholderTextColor="#94A3B8"
                      value={nikDirectInput}
                      onChangeText={(text) => setNikDirectInput(text.replace(/[^0-9]/g, ''))}
                      keyboardType="numeric"
                      maxLength={16}
                      onFocus={() => setIsNikDirectFocused(true)}
                      onBlur={() => setIsNikDirectFocused(false)}
                    />
                  </View>

                  {/* Masuk Button */}
                  <TouchableOpacity
                    style={[styles.continueButton, { marginTop: 12, borderRadius: 12 }]}
                    onPress={handleNikDirectLogin}
                    disabled={isSendingOtp || nikDirectInput.length !== 16}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.continueButtonText}>
                      {isSendingOtp ? "Memproses..." : "Masuk ke App"}
                    </Text>
                  </TouchableOpacity>

                  {/* Register Link */}
                  <View style={{ alignItems: 'center', marginTop: 24 }}>
                    <Text style={{ fontSize: 14, color: '#64748B', fontWeight: '500' }}>
                      Belum Punya Akun?{' '}
                      <Text
                        style={{ color: '#1BA098', fontWeight: 'bold', textDecorationLine: 'underline' }}
                        onPress={() => router.push('/register')}
                      >
                        Daftar
                      </Text>
                    </Text>
                  </View>
                </View>
              ) : (
                /* --- PINDAI KODE QR VIEW --- */
                <View style={styles.tabContent}>

                  {/* Header Title with QR Icon */}
                  <View style={styles.contentHeader}>
                    <Text style={styles.contentTitle}>Pindai Kode QR</Text>
                    <Ionicons name="qr-code-outline" size={22} color="#0F172A" style={styles.titleIcon} />
                  </View>

                  {/* Description */}
                  <Text style={styles.description}>
                    Pindai kode QR dari perangkat Anda yang lain untuk masuk secara instan, atau masukkan seed phrase di bawah ini.
                  </Text>

                  {/* Reminder Box */}
                  <View style={[
                    styles.noteBox,
                    {
                      marginTop: -12,
                      marginBottom: 20,
                      backgroundColor: '#FFF7ED',
                      borderColor: '#FFEDD5',
                      borderWidth: 1.5
                    }
                  ]}>
                    <View style={styles.noteHeader}>
                      <Ionicons name="information-circle" size={18} color="#EA580C" />
                      <Text style={[styles.noteTitle, { color: '#C2410C' }]}>Petunjuk Masuk</Text>
                    </View>
                    <Text style={[styles.noteText, { color: '#9A3412' }]}>
                      Scan kode QR di atas atau gunakan Seedphrase di bawah ini.
                    </Text>
                  </View>

                  {/* Modern QR Scan Area using expo-camera */}
                  <View style={styles.qrScanBoxContainer}>
                    {!permission ? (
                      <View style={styles.qrScanBox}>
                        <Text style={styles.qrScanInstructions}>Memuat Kamera...</Text>
                      </View>
                    ) : !permission.granted ? (
                      <View style={styles.qrScanBoxPermission}>
                        <Ionicons name="camera-outline" size={48} color="#94A3B8" style={{ marginBottom: 12 }} />
                        <Text style={styles.permissionText}>
                          Akses kamera diperlukan untuk memindai kode QR
                        </Text>
                        <TouchableOpacity
                          style={styles.permissionButton}
                          onPress={requestPermission}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.permissionButtonText}>Berikan Izin Kamera</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.qrScanBox}>
                        {/* Live camera stream */}
                        <CameraView
                          style={StyleSheet.absoluteFillObject}
                          facing="back"
                          barcodeScannerSettings={{
                            barcodeTypes: ['qr'],
                          }}
                          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                        />

                        {/* Glowing corners for scanner overlay */}
                        <View style={[styles.scannerCorner, styles.topLeftCorner]} />
                        <View style={[styles.scannerCorner, styles.topRightCorner]} />
                        <View style={[styles.scannerCorner, styles.bottomLeftCorner]} />
                        <View style={[styles.scannerCorner, styles.bottomRightCorner]} />

                        {/* Animated Scanning Line */}
                        <Animated.View style={[
                          styles.scanningLaserLine,
                          { transform: [{ translateY: scanTranslateY }] }
                        ]} />
                      </View>
                    )}
                    {permission && permission.granted && (
                      <Text style={styles.qrScanInstructions}>
                        {scanned ? 'Sedang memproses kode QR...' : 'Posisikan kode QR di dalam bingkai'}
                      </Text>
                    )}
                  </View>

                  {/* Separator */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 24, overflow: 'hidden' }}>
                    <Text style={{ flex: 1, color: '#CBD5E1', fontSize: 10 }} numberOfLines={1} ellipsizeMode="clip">
                      --------------------------------------------------
                    </Text>
                    <Text style={{ marginHorizontal: 12, color: '#64748B', fontSize: 13, fontWeight: '600' }}>ATAU MASUK DENGAN SEEDPHRASE</Text>
                    <Text style={{ flex: 1, color: '#CBD5E1', fontSize: 10 }} numberOfLines={1} ellipsizeMode="clip">
                      --------------------------------------------------
                    </Text>
                  </View>

                  {/* Seed Phrase Input Field */}
                  <View style={{ width: '100%', marginBottom: 16 }}>
                    <TextInput
                      style={[
                        styles.textAreaInput,
                        isInputFocused && styles.textAreaInputFocused,
                        { height: 90 }
                      ]}
                      placeholder="Masukkan 12 kata kunci pemulihan Anda (Seedphrase)"
                      placeholderTextColor="#94A3B8"
                      multiline={true}
                      numberOfLines={3}
                      value={recoveryPhrase}
                      onChangeText={setRecoveryPhrase}
                      onFocus={() => setIsInputFocused(true)}
                      onBlur={() => setIsInputFocused(false)}
                      textAlignVertical="top"
                    />
                  </View>

                  {/* Masuk Sekarang Button */}
                  <TouchableOpacity
                    style={[styles.continueButton, { backgroundColor: '#0D9488', marginBottom: 20, borderRadius: 12 }]}
                    onPress={handleSeedPhraseLogin}
                    disabled={isSendingOtp || recoveryPhrase.trim() === ''}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.continueButtonText}>Masuk Sekarang</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  navbarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 0,
    backgroundColor: '#1BA098',
    paddingTop: Platform.OS === 'android' ? 10 : 0,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  navbarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A', // Slate 900
    textAlign: 'center',
  },
  spacer: {
    width: 42, // Match size of back button for perfect centering
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 36,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0', // Slate 200
    marginBottom: 36,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    marginBottom: -1, // Overlap parent border
  },
  tabButtonActive: {
    borderBottomColor: '#1BA098', // Green indicator line
  },
  tabText: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#1BA098', // Green text for active tab
    fontWeight: '700',
  },
  contentWrapper: {
    // flex: 1 removed to allow normal scrolling expansion
  },
  tabContent: {
    // flex: 1 removed to allow normal scrolling expansion
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  contentTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0F172A', // Slate 900
  },
  titleIcon: {
    marginLeft: 8,
  },
  description: {
    fontSize: 15,
    color: '#475569', // Slate 600
    lineHeight: 24,
    marginBottom: 32,
  },
  textAreaInput: {
    backgroundColor: '#F8FAFC', // Slate 50
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0', // Slate 200
    padding: 16,
    height: 140,
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '500',
    lineHeight: 22,
  },
  textAreaInputFocused: {
    borderColor: '#1BA098', // Green border when active
    backgroundColor: '#FFFFFF',
    shadowColor: '#1BA098',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  // QR Scan Layout
  qrScanBoxContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  qrScanBox: {
    width: 240,
    height: 240,
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  qrScanBoxPermission: {
    width: 240,
    height: 240,
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  permissionText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  permissionButton: {
    backgroundColor: '#1BA098',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scannerCorner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#1BA098', // Green corners
    zIndex: 20,
  },
  topLeftCorner: {
    top: 16,
    left: 16,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  topRightCorner: {
    top: 16,
    right: 16,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  bottomLeftCorner: {
    bottom: 16,
    left: 16,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  bottomRightCorner: {
    bottom: 16,
    right: 16,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
  scanningLaserLine: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 3,
    backgroundColor: '#1BA098',
    shadowColor: '#1BA098',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  qrScanInstructions: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 20,
    fontWeight: '500',
    textAlign: 'center',
  },
  bottomButtonContainer: {
    marginTop: 36,
    width: '100%',
  },
  continueButton: {
    backgroundColor: '#1BA098', // Green button
    borderRadius: 28, // Pill shape like "Lanjutkan" in screenshot
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1BA098',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputWrapperFocused: {
    borderColor: '#1BA098',
    backgroundColor: '#FFFFFF',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '500',
  },
  noteBox: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0D9488',
    marginLeft: 6,
  },
  noteText: {
    fontSize: 13,
    color: '#0F766E',
    lineHeight: 18,
    fontWeight: '500',
  },
  resendText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  resendLink: {
    fontSize: 13,
    color: '#1BA098',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  optionalToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 16,
    width: '100%',
  },
  optionalToggleText: {
    fontSize: 15,
    color: '#0F172A',
    fontWeight: 'bold',
  },
});
