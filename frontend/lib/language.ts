import * as SecureStore from 'expo-secure-store';

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

// Kamus terjemahan sederhana untuk notifikasi & pengaturan
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
  }
};

export function translate(key: keyof typeof translations['id']) {
  return translations[currentLanguage][key];
}
