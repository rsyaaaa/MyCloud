import React, { useState, useRef } from 'react';
import { X, Upload, Trash2, Camera, User, Check, RefreshCw } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function AvatarModal({ isOpen, onClose, onUpdated }) {
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  if (!isOpen) return null;

  const currentAvatarUrl = api.getAvatarUrl(user);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('File harus berupa gambar (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Ukuran gambar maksimal 10 MB.');
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
      setSuccess('Foto profil berhasil diperbarui!');
      setTimeout(() => {
        if (onUpdated) onUpdated();
        onClose();
      }, 1000);
    } catch (err) {
      setError(err.message || 'Gagal mengunggah avatar.');
    } finally {
      setUploading(false);
    }
  };

  const handleResetToDefault = async () => {
    if (!window.confirm('Kembalikan foto profil ke default?')) return;

    setUploading(true);
    setError(null);
    try {
      await api.resetAvatar();
      await refreshUser();
      setPreviewUrl(null);
      setSelectedFile(null);
      setSuccess('Foto profil dikembalikan ke default.');
      setTimeout(() => {
        if (onUpdated) onUpdated();
        onClose();
      }, 1000);
    } catch (err) {
      setError(err.message || 'Gagal mereset avatar.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-white dark:bg-[#23201D] border-2 border-[#D6D3D1] dark:border-[#3E3834] rounded-[10px] p-5 shadow-modal text-[#1C1917] dark:text-[#F5F2EB] animate-enter"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#E7E5E4] dark:border-[#3E3834] mb-4">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#C2410C]" />
            <h3 className="font-serif font-bold text-lg">Ganti Foto Profil</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#57534E] hover:text-[#1C1917] dark:text-[#A8A29E] dark:hover:text-[#F5F2EB]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-3 p-2.5 bg-[#FEF2F2] dark:bg-[#3D1414] border border-[#DC2626] rounded-[4px] text-[12px] text-[#DC2626] dark:text-[#FCA5A5]">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-3 p-2.5 bg-[#F0FDF4] dark:bg-[#143D14] border border-[#22C55E] rounded-[4px] text-[12px] text-[#166534] dark:text-[#86EFAC] flex items-center gap-1.5">
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
              className="w-28 h-28 rounded-full object-cover border-4 border-[#D4A373] shadow-md transition-transform group-hover:scale-105"
            />
            <div className="absolute inset-0 rounded-full bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-semibold">Pilih Foto</span>
            </div>
          </div>

          <p className="mt-3 font-semibold text-base">{user?.username}</p>
          <span className="text-[11px] uppercase font-bold tracking-wider text-[#C2410C] bg-[#FAF1E6] dark:bg-[#2E2A26] px-2 py-0.5 rounded border border-[#D4A373] mt-1">
            {user?.role === 'admin' ? 'Administrator' : 'Regular User'}
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
        <div className="space-y-2.5 pt-3 border-t border-[#E7E5E4] dark:border-[#3E3834]">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full btn-secondary h-10 text-[13px] justify-center"
          >
            <Upload className="w-4 h-4" />
            <span>{selectedFile ? 'Pilih Gambar Lain' : 'Unggah Foto Baru'}</span>
          </button>

          {selectedFile && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full btn-primary h-10 text-[13px] justify-center"
            >
              <Check className="w-4 h-4" />
              <span>{uploading ? 'Menyimpan...' : 'Simpan Foto Profil'}</span>
            </button>
          )}

          {user?.avatar_url && (
            <button
              onClick={handleResetToDefault}
              disabled={uploading}
              className="w-full btn-ghost h-9 text-[12px] text-[#DC2626] justify-center hover:bg-[#FEF2F2] dark:hover:bg-[#3D1414]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Kembalikan ke Avatar Default</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
