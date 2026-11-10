import React, { useState, useRef } from 'react';
import { X, Upload, Trash2, Camera, User, Check, RefreshCw } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function AvatarModal({ isOpen, onClose, onUpdated }) {
  const { user, refreshUser } = useAuth();
  const { t } = useLanguage();
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  if (!isOpen || user?.role === 'admin') return null;

  const currentAvatarUrl = api.getAvatarUrl(user);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError(t('fileMustBeImage', 'File harus berupa gambar (JPG, PNG, WebP).'));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError(t('imageMaxSize', 'Ukuran gambar maksimal 10 MB.'));
      return;
    }

    setError(null);
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('avatar', selectedFile);

      await api.uploadAvatar(formData);
      await refreshUser();
      setSuccess(t('avatarUpdated', 'Foto profil berhasil diperbarui!'));
      setTimeout(() => {
        if (onUpdated) onUpdated();
        onClose();
      }, 1000);
    } catch (err) {
      setError(err.message || t('avatarUploadFailed', 'Gagal mengunggah avatar.'));
    } finally {
      setUploading(false);
    }
  };

  const handleResetToDefault = async () => {
    if (!window.confirm(t('resetAvatarConfirm', 'Kembalikan foto profil ke default?'))) return;

    setUploading(true);
    setError(null);
    try {
      await api.resetAvatar();
      await refreshUser();
      setPreviewUrl(null);
      setSelectedFile(null);
      setSuccess(t('avatarResetDone', 'Foto profil dikembalikan ke default.'));
      setTimeout(() => {
        if (onUpdated) onUpdated();
        onClose();
      }, 1000);
    } catch (err) {
      setError(err.message || t('avatarResetFailed', 'Gagal mereset avatar.'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px] p-5 shadow-modal text-[#0A0A0A] dark:text-[#FAFAFA] animate-enter"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#E8E8EC] dark:border-[#1F1F27] mb-4">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#C2410C]" />
            <h3 className="font-serif font-bold text-lg">{t('changeAvatar', 'Ganti Foto Profil')}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#6B6B6B] hover:text-[#0A0A0A] dark:text-[#9C9C9C] dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-3 p-2.5 bg-[#FEF2F2] dark:bg-[#2A0808] border border-[#EF4444]/40 rounded-[6px] text-[12px] text-[#EF4444] dark:text-[#FCA5A5]">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-3 p-2.5 bg-[#ECFDF5] dark:bg-[#062817] border border-[#10B981]/40 rounded-[6px] text-[12px] text-[#059669] dark:text-[#34D399] flex items-center gap-1.5">
            <Check className="w-4 h-4" />
            <span>{success}</span>
          </div>
        )}

        {/* Avatar Preview */}
        <div className="flex flex-col items-center justify-center py-4">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <img
              src={previewUrl || currentAvatarUrl}
              alt={user?.username}
              className="w-28 h-28 rounded-full object-cover border-4 border-[#C2410C] shadow-md transition-transform group-hover:scale-105"
            />
            <div className="absolute inset-0 rounded-full bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-semibold">{t('choosePhoto', 'Pilih Foto')}</span>
            </div>
          </div>

          <p className="mt-3 font-semibold text-base">{user?.username}</p>
          <span className="text-[11px] uppercase font-bold tracking-wider text-[#C2410C] bg-[#FFF7ED] dark:bg-[#2A1208] px-2 py-0.5 rounded border border-[#C2410C]/20 mt-1">
            {user?.role === 'admin' ? t('administrator', 'Administrator') : t('regularUser', 'Regular User')}
          </span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Buttons */}
        <div className="space-y-2.5 pt-3 border-t border-[#E8E8EC] dark:border-[#1F1F27]">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full btn-secondary h-10 text-[13px] justify-center"
          >
            <Upload className="w-4 h-4" />
            <span>{selectedFile ? t('chooseOtherImage', 'Pilih Gambar Lain') : t('uploadNewPhoto', 'Unggah Foto Baru')}</span>
          </button>

          {selectedFile && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full btn-primary h-10 text-[13px] justify-center"
            >
              <Check className="w-4 h-4" />
              <span>{uploading ? t('savingText', 'Menyimpan...') : t('saveProfilePhoto', 'Simpan Foto Profil')}</span>
            </button>
          )}

          {user?.avatar_url && (
            <button
              onClick={handleResetToDefault}
              disabled={uploading}
              className="w-full btn-ghost h-9 text-[12px] text-[#DC2626] justify-center hover:bg-[#FEF2F2] dark:hover:bg-[#2A0808]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t('resetDefaultAvatar', 'Kembalikan ke Avatar Default')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
