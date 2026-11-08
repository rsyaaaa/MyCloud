import React, { useState } from 'react';
import { Cloud, Lock, User, Wifi, Sparkles, AlertCircle, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, loginPublic, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await register(username, password);
      } else {
        await login(username, password);
      }
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan saat otentikasi.');
    } finally {
      setLoading(false);
    }
  };

  const handlePublicLogin = async () => {
    setError('');
    setLoading(true);

    try {
      await loginPublic();
    } catch (err) {
      setError(err.message || 'Gagal masuk sebagai pengguna publik.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#000000] flex flex-col justify-center items-center p-6 selection:bg-[#FFEDD5] selection:text-[#C2410C] text-[#0A0A0A] dark:text-[#FAFAFA] transition-colors">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-[#C2410C] text-white rounded-[12px] flex items-center justify-center mx-auto mb-4 shadow-primary-glow">
          <Cloud className="w-9 h-9 stroke-[2.2]" />
        </div>
        <h1 className="font-serif font-bold text-3xl tracking-tight text-[#0A0A0A] dark:text-[#FAFAFA]">
          Personal Local Cloud & Media Hub
        </h1>
        <p className="text-[14px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-1.5 flex items-center justify-center gap-1.5">
          <Wifi className="w-4 h-4 text-[#10B981]" />
          <span>Local Area Network: <strong>192.168.18.78:8080</strong></span>
        </p>
      </div>

      {/* Auth Card */}
      <div className="bg-white dark:bg-[#0A0A0E] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[12px] max-w-md w-full p-8 shadow-modal">
        {/* Toggle Login / Register Tabs */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-[#F4F4F5] dark:bg-[#14141A] border border-[#E8E8EC] dark:border-[#1F1F27] rounded-[6px] mb-6">
          <button
            type="button"
            onClick={() => { setIsRegister(false); setError(''); }}
            className={`py-2 text-[14px] font-semibold rounded-[4px] transition-all ${
              !isRegister ? 'bg-[#C2410C] text-white shadow-primary-glow' : 'text-[#6B6B6B] dark:text-[#9C9C9C]'
            }`}
          >
            Masuk (Login)
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setError(''); }}
            className={`py-2 text-[14px] font-semibold rounded-[4px] transition-all ${
              isRegister ? 'bg-[#C2410C] text-white shadow-primary-glow' : 'text-[#6B6B6B] dark:text-[#9C9C9C]'
            }`}
          >
            Daftar Akun Baru
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-[#FEF2F2] dark:bg-[#2A0808] border border-[#EF4444]/40 rounded-[6px] text-[#EF4444] dark:text-[#FCA5A5] text-[13px] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-semibold mb-1 text-[#0A0A0A] dark:text-[#FAFAFA]">
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#9C9C9C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                required
                autoFocus
                placeholder="misal: autofocus"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-artisan w-full pl-9 dark:bg-[#000000] dark:border-[#1F1F27] dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-semibold mb-1 text-[#0A0A0A] dark:text-[#FAFAFA]">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#9C9C9C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-artisan w-full pl-9 dark:bg-[#000000] dark:border-[#1F1F27] dark:text-white"
              />
            </div>
            {isRegister && (
              <p className="text-[11px] text-[#6B6B6B] dark:text-[#9C9C9C] mt-1">
                Akun baru akan mendapatkan kuota default <strong>15 GB</strong>.
              </p>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full btn-primary h-[44px] text-[15px] justify-center"
            >
              {loading ? 'Memproses...' : (isRegister ? 'Daftar Akun' : 'Masuk ke MyCloud')}
            </button>
          </div>
        </form>

        {/* Divider: Akses User Public */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E8E8EC] dark:border-[#1F1F27]" />
          </div>
          <span className="relative px-3 bg-white dark:bg-[#0A0A0E] text-[11px] text-[#9C9C9C] uppercase font-mono tracking-wider">
            atau akses publik
          </span>
        </div>

        {/* 1-Click Public User Access Button */}
        <button
          type="button"
          onClick={handlePublicLogin}
          disabled={loading}
          className="w-full p-3.5 rounded-[8px] bg-[#FFF7ED] dark:bg-[#1E1109] hover:bg-[#FFEDD5] dark:hover:bg-[#2A160A] border border-[#C2410C]/30 hover:border-[#C2410C] text-[#C2410C] dark:text-[#FB923C] font-semibold text-[14px] flex items-center justify-center gap-2.5 transition-all shadow-sm active:scale-[0.98] group"
        >
          <Globe className="w-4.5 h-4.5 stroke-[2.2] group-hover:scale-110 transition-transform" />
          <span>Masuk sebagai User Public (50 GB Shared)</span>
        </button>
        <p className="text-[11px] text-center text-[#6B6B6B] dark:text-[#9C9C9C] mt-2 mb-1">
          Tanpa password • Klik langsung untuk ruang berbagi & unduh bersama
        </p>

        {/* Admin Credential Hint */}
        <div className="mt-6 pt-4 border-t border-[#E8E8EC] dark:border-[#1F1F27] text-[12px] text-[#6B6B6B] dark:text-[#9C9C9C] bg-[#FAFAFA] dark:bg-[#14141A] -mx-4 -mb-4 p-4 rounded-b-[12px]">
          <div className="flex items-center gap-1.5 font-semibold text-[#C2410C] mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Kredensial Default Administrator:</span>
          </div>
          <p>
            Username: <strong className="font-mono text-[#0A0A0A] dark:text-[#FAFAFA]">admin</strong> / Password:{' '}
            <strong className="font-mono text-[#0A0A0A] dark:text-[#FAFAFA]">admin12345</strong>
          </p>
          <p className="text-[11px] text-[#9C9C9C] mt-0.5">
            Default PIN Brankas Admin: <span className="font-mono">123456</span>
          </p>
        </div>
      </div>

      <p className="text-[12px] text-[#9C9C9C] mt-6">
        Host: Ubuntu Server (autofocus-server) • Local Wi-Fi Storage Hub
      </p>
    </div>
  );
}
