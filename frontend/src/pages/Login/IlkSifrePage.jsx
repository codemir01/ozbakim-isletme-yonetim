import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

// Admin tarafından oluşturulan eleman ilk girişinde KENDİ şifresini belirler.
export default function IlkSifrePage() {
  const { kullanici, ilkGirisTamamlandi } = useAuth();
  const navigate = useNavigate();
  const [sifre, setSifre] = useState('');
  const [tekrar, setTekrar] = useState('');
  const [hata, setHata] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);

  // Giriş yapılmamışsa login'e; ilk giriş değilse dashboard'a
  if (!kullanici) return <Navigate to="/login" replace />;
  if (!kullanici.ilkGiris) return <Navigate to="/dashboard" replace />;

  async function gonder(e) {
    e.preventDefault();
    setHata('');
    if (sifre.length < 6) return setHata('Şifre en az 6 karakter olmalı.');
    if (sifre !== tekrar) return setHata('Şifreler eşleşmiyor.');
    setYukleniyor(true);
    try {
      await api.put('/profil/ilk-sifre', { yeniSifre: sifre });
      ilkGirisTamamlandi();
      navigate('/dashboard');
    } catch (err) {
      setHata(err.response?.data?.hata || 'Şifre belirlenemedi.');
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
      <div className="absolute top-0 w-full h-1/2 bg-white border-b border-slate-200"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>
        <h2 className="mt-2 text-center text-2xl font-extrabold text-slate-900 tracking-tight">
          Merhaba {kullanici.ad}, hoş geldin
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          Güvenliğin için lütfen kendine yeni bir şifre belirle.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-[440px] relative z-10">
        <div className="bg-white py-8 px-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:rounded-2xl sm:px-10 border border-slate-100">
          <form className="space-y-4" onSubmit={gonder}>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Yeni Şifre</label>
              <input type="password" required value={sifre} onChange={(e) => setSifre(e.target.value)}
                placeholder="En az 6 karakter"
                className="block w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Yeni Şifre (Tekrar)</label>
              <input type="password" required value={tekrar} onChange={(e) => setTekrar(e.target.value)}
                placeholder="••••••••"
                className="block w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 text-sm focus:outline-none" />
            </div>

            {hata && (
              <div className="rounded-xl bg-red-50 p-3 border border-red-100">
                <p className="text-sm font-medium text-red-800">{hata}</p>
              </div>
            )}

            <button type="submit" disabled={yukleniyor}
              className="w-full flex justify-center py-2.5 px-4 rounded-xl shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 transition-colors">
              {yukleniyor ? 'Kaydediliyor...' : 'Şifremi Belirle ve Devam Et'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
