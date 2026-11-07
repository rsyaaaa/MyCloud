import React, { useState } from 'react';
import { Cloud, Lock, User, Wifi, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, register } = useAuth();
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

  return (
    <div className="min-h-screen bg-[#FFFBF5] dark:bg-[#171514] flex flex-col justify-center items-center p-6 selection:bg-[#FDF6EC] selection:text-[#C2410C] text-[#1C1917] dark:text-[#F5F2EB] transition-colors">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-[#C2410C] text-white rounded-[10px] flex items-center justify-center mx-auto mb-4 border-2 border-[#9A3412] shadow-modal">
          <Cloud className="w-9 h-9 stroke-[2.2]" />
        </div>
        <h1 className="font-serif font-bold text-3xl tracking-tight">
          Personal Local Cloud & Media Hub
        </h1>
        <p className="text-[14px] text-[#57534E] dark:text-[#A8A29E] mt-1.5 flex items-center justify-center gap-1.5">
          <Wifi className="w-4 h-4 text-[#22C55E]" />
          <span>Local Area Network: <strong>192.168.18.78:8080</strong></span>
        </p>
      </div>

      {/* Auth Card */}
      <div className="bg-white dark:bg-[#23201D] border-2 border-[#D6D3D1] dark:border-[#3E3834] rounded-[8px] max-w-md w-full p-8 shadow-modal">
        {/* Toggle Login / Register Tabs */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-[#FFFBF5] dark:bg-[#2E2A26] border border-[#D6D3D1] dark:border-[#3E3834] rounded-[6px] mb-6">
          <button
            type="button"
            onClick={() => { setIsRegister(false); setError(''); }}
            className={`py-2 text-[14px] font-semibold rounded-[4px] transition-all ${
              !isRegister ? 'bg-[#C2410C] text-white' : 'text-[#57534E] dark:text-[#A8A29E]'
            }`}
          >
            Masuk (Login)
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setError(''); }}
            className={`py-2 text-[14px] font-semibold rounded-[4px] transition-all ${
              isRegister ? 'bg-[#C2410C] text-white' : 'text-[#57534E] dark:text-[#A8A29E]'
            }`}
          >
            Daftar Akun Baru
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-[#FEF2F2] dark:bg-[#3D1414] border border-[#DC2626] rounded-[4px] text-[#DC2626] dark:text-[#FCA5A5] text-[13px] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-semibold mb-1">
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#A8A29E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                required
                autoFocus
                placeholder="misal: autofocus"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-artisan w-full pl-9"
              />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-semibold mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#A8A29E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-artisan w-full pl-9"
              />
            </div>
            {isRegister && (
              <p className="text-[11px] text-[#57534E] dark:text-[#A8A29E] mt-1">
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

        {/* Admin Credential Hint */}
        <div className="mt-6 pt-4 border-t border-[#E7E5E4] dark:border-[#3E3834] text-[12px] text-[#57534E] dark:text-[#A8A29E] bg-[#FFFBF5] dark:bg-[#2E2A26] -mx-4 -mb-4 p-4 rounded-b-[6px]">
          <div className="flex items-center gap-1.5 font-semibold text-[#C2410C] mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Kredensial Default Administrator:</span>
          </div>
          <p>
            Username: <strong className="font-mono text-[#1C1917] dark:text-[#F5F2EB]">admin</strong> / Password:{' '}
            <strong className="font-mono text-[#1C1917] dark:text-[#F5F2EB]">admin12345</strong>
          </p>
          <p className="text-[11px] text-[#A8A29E] mt-0.5">
            Default PIN Brankas Admin: <span className="font-mono">123456</span>
          </p>
        </div>
      </div>

      <p className="text-[12px] text-[#A8A29E] mt-6">
        Host: Ubuntu Server (autofocus-server) • Local Wi-Fi Storage Hub
      </p>
    </div>
  );
}
