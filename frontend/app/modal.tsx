import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, StatusBar, Platform, Alert, Dimensions, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { callPatientAccess } from '../lib/patient-api';

const { width } = Dimensions.get('window');
const SCAN_BOX_SIZE = 260;

interface DoctorData {
  staff_id: string;
  name: string;
  institution: string;
  specialization: string;
  code: string;
}

export default function QRScannerModal() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scannedDoctor, setScannedDoctor] = useState<DoctorData | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<'60_min' | 'konsultasi' | 'rawat_inap' | 'manual'>('60_min');
  const [submitting, setSubmitting] = useState(false);
  
  const scanTranslateY = useRef(new Animated.Value(0)).current;

  // Run the scanning laser animation
  useEffect(() => {
    if (permission && permission.granted && !scanned) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanTranslateY, {
            toValue: SCAN_BOX_SIZE - 4,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanTranslateY, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [permission, scanned]);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    try {
      const parsed = JSON.parse(data);
      if (parsed && parsed.type === 'clinexa-access') {
        setScanned(true);
        setScannedDoctor(parsed);
        return;
      }
    } catch (e) {
      // Not JSON, check if it is raw string code
    }

    if (data.startsWith('CLNX-STF-')) {
      setScanned(true);
      setScannedDoctor({
        staff_id: 'a98b71d6-d0be-45a7-93ff-1834190c7490', // fallback staff ID
        name: 'Dr. Agung Setya',
        institution: 'RS Semen Gresik',
        specialization: 'Dokter Umum',
        code: data
      });
      return;
    }

    setScanned(true);
    Alert.alert(
      'Format QR Tidak Dikenal',
      'QR Code yang dipindai tidak valid atau bukan merupakan permintaan akses Clinexa.',
      [
        {
          text: 'Ulangi',
          onPress: () => setScanned(false)
        },
        {
          text: 'Batal',
          onPress: () => router.back(),
          style: 'cancel'
        }
      ]
    );
  };

  const handleApprove = async () => {
    if (!scannedDoctor) return;
    setSubmitting(true);
    try {
      const nik = await SecureStore.getItemAsync('user_nik');
      const walletAddress = await SecureStore.getItemAsync('user_wallet_address');
      
      if (!nik) {
        throw new Error('Data pasien NIK tidak ditemukan. Silakan login kembali.');
      }

      await callPatientAccess('approve_staff_access', {
        nik,
        wallet_address: walletAddress,
        staff_id: scannedDoctor.staff_id,
        consent_duration_type: selectedDuration
      });

      Alert.alert(
        'Akses Berhasil',
        `Izin akses rekam medis telah diberikan kepada ${scannedDoctor.name}.`,
        [
          {
            text: 'OK',
            onPress: () => {
              router.back();
            }
          }
        ]
      );
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err.message || 'Gagal menyetujui izin akses.');
      setScanned(false);
      setScannedDoctor(null);
    } finally {
      setSubmitting(false);
    }
  };

  const initials = useMemo(() => {
    if (!scannedDoctor) return '';
    return scannedDoctor.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }, [scannedDoctor]);

  if (!permission) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <Text style={styles.loadingText}>Memuat Izin Kamera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#0F172A" />
          </TouchableOpacity>
        </View>
        <View style={styles.permissionContent}>
          <View style={styles.iconCircle}>
            <Ionicons name="camera" size={48} color="#1BA098" />
          </View>
          <Text style={styles.permissionTitle}>Akses Kamera Diperlukan</Text>
          <Text style={styles.permissionDesc}>
            Clinexa memerlukan akses ke kamera Anda untuk dapat memindai kartu fisik, kode QR rekam medis, atau otorisasi akses staf.
          </Text>
          <TouchableOpacity onPress={requestPermission} style={styles.btn}>
            <Text style={styles.btnText}>Izinkan Akses Kamera</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {!scannedDoctor ? (
        <>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          />

          {/* Semi-transparent Overlay */}
          <View style={styles.overlayContainer}>
            <View style={styles.maskTop} />

            <View style={styles.maskCenterRow}>
              <View style={styles.maskSide} />
              
              <View style={styles.scanBox}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />

                <Animated.View
                  style={[
                    styles.laser,
                    {
                      transform: [{ translateY: scanTranslateY }],
                    },
                  ]}
                />
              </View>
              
              <View style={styles.maskSide} />
            </View>

            <View style={styles.maskBottom}>
              <Text style={styles.instructionText}>
                {scanned ? 'Memproses data...' : 'Arahkan kamera ke QR Code rekam medis'}
              </Text>
            </View>
          </View>

          {/* Floating Close Button */}
          <TouchableOpacity onPress={() => router.back()} style={styles.floatingCloseBtn}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </>
      ) : (
        <SafeAreaView style={styles.confirmContainer}>
          <ScrollView contentContainerStyle={styles.confirmScroll}>
            {/* Title */}
            <View style={styles.confirmHeader}>
              <View style={styles.lockIconCircle}>
                <Ionicons name="shield-checkmark" size={32} color="#1BA098" />
              </View>
              <Text style={styles.confirmTitle}>Permintaan Akses</Text>
              <Text style={styles.confirmSubtitle}>
                Dokter berikut meminta izin untuk melihat rekam medis Anda.
              </Text>
            </View>

            {/* Doctor Profile Card */}
            <View style={styles.doctorCard}>
              <View style={styles.doctorAvatar}>
                <Text style={styles.doctorAvatarText}>{initials}</Text>
              </View>
              <View style={styles.doctorInfo}>
                <Text style={styles.doctorName}>{scannedDoctor.name}</Text>
                <Text style={styles.doctorSpecialization}>{scannedDoctor.specialization}</Text>
                <Text style={styles.doctorInstitution}>{scannedDoctor.institution}</Text>
              </View>
            </View>

            {/* Duration Form Selection */}
            <View style={styles.durationSection}>
              <Text style={styles.sectionTitle}>Pilih Durasi Akses</Text>
              <Text style={styles.sectionSubtitle}>
                Akses akan dicabut otomatis setelah waktu ini berlalu.
              </Text>

              {/* Option 1: 60 Min */}
              <TouchableOpacity 
                style={[styles.optionCard, selectedDuration === '60_min' && styles.optionCardSelected]}
                onPress={() => setSelectedDuration('60_min')}
              >
                <View style={styles.optionRadio}>
                  {selectedDuration === '60_min' && <View style={styles.optionRadioInner} />}
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitleText}>Sekali Akses (60 Menit)</Text>
                  <Text style={styles.optionDescText}>Cocok untuk konsultasi sekali waktu saat ini.</Text>
                </View>
              </TouchableOpacity>

              {/* Option 2: Konsultasi */}
              <TouchableOpacity 
                style={[styles.optionCard, selectedDuration === 'konsultasi' && styles.optionCardSelected]}
                onPress={() => setSelectedDuration('konsultasi')}
              >
                <View style={styles.optionRadio}>
                  {selectedDuration === 'konsultasi' && <View style={styles.optionRadioInner} />}
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitleText}>Selama Konsultasi (24 Jam)</Text>
                  <Text style={styles.optionDescText}>Akses berlaku selama satu hari penuh.</Text>
                </View>
              </TouchableOpacity>

              {/* Option 3: Rawat Inap */}
              <TouchableOpacity 
                style={[styles.optionCard, selectedDuration === 'rawat_inap' && styles.optionCardSelected]}
                onPress={() => setSelectedDuration('rawat_inap')}
              >
                <View style={styles.optionRadio}>
                  {selectedDuration === 'rawat_inap' && <View style={styles.optionRadioInner} />}
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitleText}>Selama Rawat Inap (7 Hari)</Text>
                  <Text style={styles.optionDescText}>Akses otomatis dicabut setelah 7 hari.</Text>
                </View>
              </TouchableOpacity>

              {/* Option 4: Manual */}
              <TouchableOpacity 
                style={[styles.optionCard, selectedDuration === 'manual' && styles.optionCardSelected]}
                onPress={() => setSelectedDuration('manual')}
              >
                <View style={styles.optionRadio}>
                  {selectedDuration === 'manual' && <View style={styles.optionRadioInner} />}
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitleText}>Sampai Dicabut Sendiri</Text>
                  <Text style={styles.optionDescText}>Berlaku terus sampai Anda batalkan dari riwayat.</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionContainer}>
              {submitting ? (
                <ActivityIndicator size="large" color="#1BA098" style={styles.loader} />
              ) : (
                <>
                  <TouchableOpacity style={styles.approveBtn} onPress={handleApprove}>
                    <Text style={styles.approveBtnText}>Berikan Akses</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.cancelBtn} 
                    onPress={() => {
                      setScanned(false);
                      setScannedDoctor(null);
                    }}
                  >
                    <Text style={styles.cancelBtnText}>Batal</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  permissionContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    marginTop: -40,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionDesc: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  btn: {
    backgroundColor: '#1BA098',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    shadowColor: '#1BA098',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Overlay Masking
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  maskTop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  maskCenterRow: {
    height: SCAN_BOX_SIZE,
    flexDirection: 'row',
  },
  maskSide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  maskBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    paddingTop: 36,
  },
  scanBox: {
    width: SCAN_BOX_SIZE,
    height: SCAN_BOX_SIZE,
    backgroundColor: 'transparent',
    position: 'relative',
    overflow: 'hidden',
  },
  // Corner markers
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#2DD4BF', // Neon teal glowing corners
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 12,
  },
  laser: {
    position: 'absolute',
    left: 4,
    right: 4,
    height: 3,
    backgroundColor: '#2DD4BF',
    shadowColor: '#2DD4BF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  instructionText: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  floatingCloseBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 30,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
  },

  // Confirmation screen
  confirmContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  confirmScroll: {
    padding: 24,
    paddingBottom: 48,
  },
  confirmHeader: {
    alignItems: 'center',
    marginVertical: 20,
  },
  lockIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E6F4F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 8,
  },
  confirmSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  doctorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  doctorAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  doctorAvatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  doctorSpecialization: {
    fontSize: 13,
    color: '#1BA098',
    fontWeight: '600',
    marginBottom: 2,
  },
  doctorInstitution: {
    fontSize: 13,
    color: '#64748B',
  },
  durationSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  optionCardSelected: {
    borderColor: '#1BA098',
    backgroundColor: '#F0FDFA',
  },
  optionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  optionRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1BA098',
  },
  optionContent: {
    flex: 1,
  },
  optionTitleText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 2,
  },
  optionDescText: {
    fontSize: 12,
    color: '#64748B',
  },
  actionContainer: {
    gap: 12,
  },
  approveBtn: {
    backgroundColor: '#1BA098',
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  approveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelBtnText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loader: {
    marginVertical: 20,
  }
});
