import React, { useState, useEffect } from 'react';
import { X, FileText, Save, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../api';
import { useLanguage } from '../context/LanguageContext';
import { formatBytes } from './QuotaBar';

export default function TextEditorModal({ isOpen, media, onClose, onSaved }) {
  const { t } = useLanguage();
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isDirty = content !== originalContent;

  useEffect(() => {
    if (!isOpen || !media?.id) return undefined;

    let cancelled = false;
    setLoading(true);
    setError('');
    setContent('');
    setOriginalContent('');

    api
      .getTextContent(media.id)
      .then((res) => {
        if (cancelled) return;
        const text = res.content || '';
        setContent(text);
        setOriginalContent(text);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || t('textLoadFailed', 'Gagal memuat file teks.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, media?.id]);

  const handleSave = async () => {
    if (!media?.id || saving || loading) return;
    setSaving(true);
    setError('');
    try {
      const res = await api.saveTextContent(media.id, content);
      setOriginalContent(content);
      if (onSaved) onSaved(res.media);
    } catch (e) {
      setError(e.message || t('textSaveFailed', 'Gagal menyimpan file teks.'));
    } finally {
      setSaving(false);
    }
  };

  // Ctrl/Cmd+S saves; Escape closes the editor.
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        e.stopPropagation();
        handleSave();
      } else if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, content, saving, loading, media?.id]);

  if (!isOpen || !media) return null;

  const byteSize = new Blob([content]).size;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-enter"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl h-[85vh] flex flex-col bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px] shadow-modal overflow-hidden text-[#0A0A0A] dark:text-[#FAFAFA]"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#E8E8EC] dark:border-[#1F1F27] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-[8px] bg-[#FFF7ED] dark:bg-[#2A1208] text-[#C2410C] border border-[#C2410C]/20 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <h3 className="font-serif font-bold text-[15px] leading-tight truncate">
                {media.display_name || media.original_name}
              </h3>
              <p className="text-[11px] font-mono text-[#6B6B6B] dark:text-[#9C9C9C]">
                {media.original_name} • {t('textEditor', 'Editor Teks')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-[#6B6B6B] dark:text-[#9C9C9C] hover:text-[#0A0A0A] dark:hover:text-white hover:bg-[#F4F4F5] dark:hover:bg-[#141418] transition-colors shrink-0"
            title={t('close', 'Tutup')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-4 mt-3 p-2.5 bg-[#FEF2F2] dark:bg-[#200A0A] border border-[#EF4444]/40 rounded-[8px] text-[#EF4444] dark:text-[#FCA5A5] text-[12px] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Editor */}
        <div className="flex-1 min-h-0 p-4">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-[#6B6B6B] dark:text-[#9C9C9C] text-[13px]">
              <Loader2 className="w-6 h-6 animate-spin text-[#C2410C]" />
              <span>{t('loadingText', 'Memuat...')}</span>
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              spellCheck={false}
              disabled={Boolean(error) && !content}
              placeholder={t('textEmptyHint', 'File teks ini masih kosong...')}
              className="w-full h-full resize-none rounded-[8px] border border-[#E8E8EC] dark:border-[#1F1F27] bg-[#FAFAFA] dark:bg-[#121217] p-3 font-mono text-[13px] leading-relaxed text-[#0A0A0A] dark:text-[#FAFAFA] outline-none focus:border-[#C2410C] focus:ring-2 focus:ring-[#C2410C]/20 transition-all"
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-[#E8E8EC] dark:border-[#1F1F27] shrink-0">
          <span className="text-[11px] font-mono text-[#6B6B6B] dark:text-[#9C9C9C]">
            {content.length} {t('characters', 'karakter')} • {formatBytes(byteSize)}
            {isDirty && <span className="ml-2 text-[#C2410C] font-semibold">{t('unsavedChanges', 'Belum tersimpan')}</span>}
          </span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="btn-secondary text-[13px] h-9 px-3.5">
              {t('cancel', 'Batal')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading || !isDirty}
              className="btn-primary text-[13px] h-9 px-4 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? t('savingText', 'Menyimpan...') : t('save', 'Simpan')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
