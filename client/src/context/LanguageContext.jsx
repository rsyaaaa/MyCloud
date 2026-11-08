import React, { createContext, useContext, useState } from 'react';

const LanguageContext = createContext(null);

export const translations = {
  id: {
    // Greetings & Headers
    welcome: 'Selamat Datang',
    welcomeSub: 'Pusat navigasi cloud & media pribadi Anda di jaringan lokal.',
    hello: 'Halo',
    storageSubtitle: 'MyCloud Local NAS Storage',

    // Theme & Lang
    lightMode: 'Mode Terang',
    darkMode: 'Mode Gelap',
    language: 'Bahasa',
    langName: 'Indonesia',

    // Nav
    home: 'Home',
    gallery: 'Galeri',
    search: 'Search',
    allFiles: 'All Files',
    trash: 'Tempat Sampah',
    admin: 'Admin Dashboard',
    vault: 'Brankas Terkunci',
    menu: 'Menu',
    closeMenu: 'Tutup Menu',

    // Categories & Cards
    photos: 'Foto',
    videos: 'Video',
    documents: 'Dokumen',
    all: 'Semua',
    fileCount: 'file',
    videoCount: 'video',
    totalCount: 'total',
    fileTotalCount: 'file total',
    documentList: 'Daftar Dokumen',
    noDocsText: 'Belum ada file dokumen. Gunakan tombol Upload untuk mengunggah PDF, DOCX, TXT, dll.',
    noDocsMobile: 'Belum ada dokumen. Gunakan tombol Upload untuk mengunggah file.',

    // Actions
    upload: 'Upload',
    uploadMedia: 'Upload Media (Foto / Video)',
    startUpload: 'Mulai Upload',
    cancelUpload: 'Batalkan Upload',
    cancel: 'Batal',
    close: 'Tutup',
    delete: 'Hapus',
    save: 'Simpan',
    logout: 'Keluar (Logout)',
    changeAvatar: 'Ganti Foto Profil',
    addStorage: 'Add Storage',
    requestQuota: 'Ajukan Tambah Kuota',
    dragDrop: 'Tarik & Lepas File ke Sini',
    orChoose: 'atau pilih file dari perangkat',
    uploadSupport: 'Mendukung Foto (JPG, PNG, HEIC), Video (MP4, MKV), Dokumen (PDF, DOCX, TXT, XLS, ZIP)',
    filesSelected: 'file dipilih',
    minimize: 'Minimize',
    show: 'Tampilkan',
    clearHistory: 'Hapus Riwayat',

    // Sections
    recent: 'Recent',
    recentFiles: 'File Terbaru',
    favorite: 'Favorite',
    favorites: 'Favorite',
    itemCount: 'item',
    noRecent: 'Belum ada aktivitas',
    noRecentDesc: 'Buka foto, video, atau dokumen untuk melihat riwayat aktivitas di sini.',
    noFavorite: 'Belum ada media favorit',
    noFavoriteDesc: 'Klik ikon hati pada foto atau video untuk menyimpannya di sini.',

    // Storage & Server
    storage: 'Penyimpanan',
    storageCapacity: 'Kapasitas Penyimpanan',
    used: 'Terpakai',
    limit: 'Batas',
    hostServer: 'Host Server',

    // Search
    searchPlaceholder: 'Cari foto, video, atau judul berkas...',
    searchEmpty: 'Tidak ditemukan berkas yang cocok',

    // Public User
    publicShared: 'Public Shared (50 GB)',
    publicLoginBtn: 'Masuk sebagai User Public (50 GB Shared)',
    publicDesc: 'Tanpa password • Akses bersama untuk berbagi & unduh berkas',
    publicUser: 'Public User',

    // Relative Time
    justNow: 'Baru saja',
    minsAgo: 'mnt lalu',
    hoursAgo: 'jam lalu',
    daysAgo: 'hari lalu',

    // Badges & Labels
    unlockedBadge: 'Terbuka',
    trashLabel: 'Tempat Sampah (Trash)',
    processing: 'Memproses...',
  },
  en: {
    // Greetings & Headers
    welcome: 'Welcome',
    welcomeSub: 'Your personal local cloud & media navigation hub.',
    hello: 'Hello',
    storageSubtitle: 'MyCloud Local NAS Storage',

    // Theme & Lang
    lightMode: 'Light Mode',
    darkMode: 'Dark Mode',
    language: 'Language',
    langName: 'English',

    // Nav
    home: 'Home',
    gallery: 'Gallery',
    search: 'Search',
    allFiles: 'All Files',
    trash: 'Trash',
    admin: 'Admin Dashboard',
    vault: 'Safe Vault',
    menu: 'Menu',
    closeMenu: 'Close Menu',

    // Categories & Cards
    photos: 'Photos',
    videos: 'Videos',
    documents: 'Documents',
    all: 'All',
    fileCount: 'files',
    videoCount: 'videos',
    totalCount: 'total',
    fileTotalCount: 'total files',
    documentList: 'Document List',
    noDocsText: 'No documents yet. Use the Upload button to upload PDF, DOCX, TXT, etc.',
    noDocsMobile: 'No documents yet. Use the Upload button to upload files.',

    // Actions
    upload: 'Upload',
    uploadMedia: 'Upload Media (Photos / Videos)',
    startUpload: 'Start Upload',
    cancelUpload: 'Cancel Upload',
    cancel: 'Cancel',
    close: 'Close',
    delete: 'Delete',
    save: 'Save',
    logout: 'Log Out',
    changeAvatar: 'Change Profile Picture',
    addStorage: 'Add Storage',
    requestQuota: 'Request Storage Increase',
    dragDrop: 'Drag & Drop Files Here',
    orChoose: 'or choose files from device',
    uploadSupport: 'Supports Photos (JPG, PNG, HEIC), Videos (MP4, MKV), Documents (PDF, DOCX, TXT, XLS, ZIP)',
    filesSelected: 'files selected',
    minimize: 'Minimize',
    show: 'Show',
    clearHistory: 'Clear History',

    // Sections
    recent: 'Recent',
    recentFiles: 'Recent Files',
    favorite: 'Favorites',
    favorites: 'Favorites',
    itemCount: 'items',
    noRecent: 'No recent activity',
    noRecentDesc: 'Open photos, videos, or documents to view your recent activity here.',
    noFavorite: 'No favorite media yet',
    noFavoriteDesc: 'Click the heart icon on photos or videos to save them here.',

    // Storage & Server
    storage: 'Storage',
    storageCapacity: 'Storage Capacity',
    used: 'Used',
    limit: 'Limit',
    hostServer: 'Host Server',

    // Search
    searchPlaceholder: 'Search photos, videos, or documents...',
    searchEmpty: 'No matching files found',

    // Public User
    publicShared: 'Public Shared (50 GB)',
    publicLoginBtn: 'Log In as Public User (50 GB Shared)',
    publicDesc: 'No password needed • Shared space to upload & download files',
    publicUser: 'Public User',

    // Relative Time
    justNow: 'Just now',
    minsAgo: 'm ago',
    hoursAgo: 'h ago',
    daysAgo: 'd ago',

    // Badges & Labels
    unlockedBadge: 'Unlocked',
    trashLabel: 'Trash Bin',
    processing: 'Processing...',
  }
};

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      const saved = localStorage.getItem('mycloud_lang');
      if (saved === 'id' || saved === 'en') return saved;
      return 'id'; // default Bahasa Indonesia
    } catch (e) {
      return 'id';
    }
  });

  const setLang = (newLang) => {
    if (newLang !== 'id' && newLang !== 'en') return;
    setLangState(newLang);
    try {
      localStorage.setItem('mycloud_lang', newLang);
    } catch (e) {}
  };

  const t = (key, defaultText) => {
    if (translations[lang] && translations[lang][key] !== undefined) {
      return translations[lang][key];
    }
    return defaultText !== undefined ? defaultText : key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
