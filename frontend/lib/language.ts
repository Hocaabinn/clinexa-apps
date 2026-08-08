import * as SecureStore from 'expo-secure-store';
import { useState, useEffect } from 'react';

export type LanguageType = 'id' | 'en';

let currentLanguage: LanguageType = 'id';
const listeners = new Set<(lang: LanguageType) => void>();

/**
 * Mendapatkan bahasa yang saat ini digunakan
 */
export function getLanguage(): LanguageType {
  return currentLanguage;
}

/**
 * Menyimpan bahasa terpilih ke penyimpanan lokal
 */
export async function setLanguage(lang: LanguageType) {
  currentLanguage = lang;
  try {
    await SecureStore.setItemAsync('user_language', lang);
  } catch (error) {
    console.error('Gagal menyimpan pengaturan bahasa:', error);
  }
  listeners.forEach(listener => listener(lang));
}

/**
 * Memuat bahasa dari penyimpanan lokal saat aplikasi dibuka
 */
export async function loadLanguageAsync(): Promise<LanguageType> {
  try {
    const savedLanguage = await SecureStore.getItemAsync('user_language');
    if (savedLanguage === 'id' || savedLanguage === 'en') {
      currentLanguage = savedLanguage;
    }
  } catch (error) {
    console.warn('Gagal memuat bahasa, menggunakan default ID:', error);
  }
  return currentLanguage;
}

/**
 * Listener untuk memantau perubahan bahasa secara real-time di UI
 */
export function addLanguageChangeListener(listener: (lang: LanguageType) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Kamus terjemahan untuk seluruh aplikasi
const translations = {
  id: {
    // Notifikasi QR Scan
    notif_granted_title: '🔑 Akses Rekam Medis Diberikan',
    notif_granted_body: (doctor: string) => `dr. ${doctor} berhasil diberikan izin untuk membuka rekam medis Anda.`,
    notif_revoked_title: '🔒 Akses Rekam Medis Dicabut',
    notif_revoked_body: (doctor: string) => `Waktu 2 menit telah habis. Izin akses rekam medis oleh dr. ${doctor} otomatis kedaluwarsa & dicabut.`,
    
    // Welcome Notif
    notif_welcome_title: '🔔 Notifikasi Diaktifkan',
    notif_welcome_body: 'Anda akan menerima pemberitahuan penting tentang rekam medis Anda.',
    notif_test_title: '⚡️ Uji Coba Sukses',
    notif_test_body: 'Notifikasi Clinexa bekerja dengan baik!',
    
    // UI Settings
    settings_title: 'Pengaturan',
    section_general: 'Umum',
    lang_label: 'Bahasa',
    section_security: 'Keamanan & Notifikasi',
    allow_notif: 'Izinkan Notifikasi',
    test_notif: 'Uji Notifikasi Cepat',
    sys_settings: 'Buka Pengaturan Sistem HP',
    info_text: 'Aplikasi memerlukan izin notifikasi sistem agar fitur otomatis pencabutan akses rekam medis (consent) dapat memberitahu Anda secara real-time saat HP terkunci.',
    status_active: 'Aktif',
    status_inactive: 'Nonaktif',

    // Dashboard & Navigation
    nav_home: 'Beranda',
    nav_rme: 'RME',
    nav_scan: 'Scan QR',
    nav_activity: 'Aktivitas',
    nav_profile: 'Profil',
    
    dash_greeting_morning: 'Selamat Pagi',
    dash_greeting_afternoon: 'Selamat Siang',
    dash_greeting_evening: 'Selamat Sore',
    dash_greeting_night: 'Selamat Malam',
    dash_greeting_general: 'Halo apa kabar',
    dash_quick_service: 'Layanan Cepat',
    dash_latest_rme: 'Hasil Rekam Medis Terkini',
    dash_prescriptions: 'Resep Obat',
    dash_lab_results: 'Hasil Lab',
    
    // Profile
    prof_security: 'Keamanan Akun',
    prof_recovery_pass: 'Recovery Password',
    prof_logout: 'Keluar Akun',
    prof_logout_confirm: 'Apakah Anda yakin ingin keluar? Anda harus mengimpor ulang recovery phrase Anda untuk masuk kembali.',
    prof_logout_yes: 'Keluar',
    prof_logout_no: 'Batal',
    prof_card_verified: 'Terverifikasi',
  },
  en: {
    // Notifikasi QR Scan
    notif_granted_title: '🔑 Medical Record Access Granted',
    notif_granted_body: (doctor: string) => `dr. ${doctor} has been granted access to view your medical records.`,
    notif_revoked_title: '🔒 Medical Record Access Revoked',
    notif_revoked_body: (doctor: string) => `2 minutes has passed. Access to your medical records by dr. ${doctor} has expired and is automatically revoked.`,
    
    // Welcome Notif
    notif_welcome_title: '🔔 Notifications Enabled',
    notif_welcome_body: 'You will receive important notifications regarding your medical records.',
    notif_test_title: '⚡️ Test Successful',
    notif_test_body: 'Clinexa notifications are working perfectly!',
    
    // UI Settings
    settings_title: 'Settings',
    section_general: 'General',
    lang_label: 'Language',
    section_security: 'Security & Notifications',
    allow_notif: 'Allow Notifications',
    test_notif: 'Quick Test Notification',
    sys_settings: 'Open Phone System Settings',
    info_text: 'The application requires system notification permissions so that the automatic medical record access revocation feature (consent) can notify you in real-time when the phone is locked.',
    status_active: 'Active',
    status_inactive: 'Inactive',

    // Dashboard & Navigation
    nav_home: 'Home',
    nav_rme: 'EMR',
    nav_scan: 'Scan QR',
    nav_activity: 'Activity',
    nav_profile: 'Profile',
    
    dash_greeting_morning: 'Good Morning',
    dash_greeting_afternoon: 'Good Afternoon',
    dash_greeting_evening: 'Good Evening',
    dash_greeting_night: 'Good Night',
    dash_greeting_general: 'Hello, how are you',
    dash_quick_service: 'Quick Services',
    dash_latest_rme: 'Latest Medical Records',
    dash_prescriptions: 'Prescription Drugs',
    dash_lab_results: 'Lab Results',
    
    // Profile
    prof_security: 'Account Security',
    prof_recovery_pass: 'Recovery Password',
    prof_logout: 'Log Out',
    prof_logout_confirm: 'Are you sure you want to log out? You will need to re-import your recovery phrase to log back in.',
    prof_logout_yes: 'Log Out',
    prof_logout_no: 'Cancel',
    prof_card_verified: 'Verified',
  }
};

export function translate(key: keyof typeof translations['id']): any {
  return translations[currentLanguage][key];
}

/**
 * Custom React Hook untuk reaktivitas bahasa global di seluruh aplikasi.
 */
export function useTranslation() {
  const [lang, setLang] = useState<LanguageType>(getLanguage());

  useEffect(() => {
    // Muat bahasa saat pertama kali dipasang
    loadLanguageAsync().then((loadedLang) => {
      setLang(loadedLang);
    });

    const unsubscribe = addLanguageChangeListener((newLang) => {
      setLang(newLang);
    });
    return () => unsubscribe();
  }, []);

  const t = (key: keyof typeof translations['id']): any => {
    return translations[lang][key];
  };

  return { lang, t };
}
