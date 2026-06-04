import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axios';

const menuItems = [
  {
    path: '/dashboard',
    label: 'Genel Bakış',
    roller: ['Admin', 'SalesConsultant', 'Technician'],
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    path: '/musteriler',
    label: 'Müşteriler',
    roller: ['Admin', 'SalesConsultant'],
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    path: '/urunler',
    label: 'Ürünler',
    roller: ['Admin', 'SalesConsultant'],
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    path: '/satislar',
    label: 'Satışlar',
    roller: ['Admin', 'SalesConsultant'],
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    path: '/bakim',
    label: 'Bakım Takibi',
    roller: ['Admin', 'Technician'],
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    path: '/gorevler',
    label: 'Görevler',
    roller: ['Admin', 'Technician'],
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    path: '/kullanicilar',
    label: 'Kullanıcılar',
    roller: ['Admin'],
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    path: '/faturalar',
    label: 'Faturalar',
    roller: ['Admin', 'SalesConsultant'],
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    path: '/gelir-gider',
    label: 'Gelir / Gider',
    roller: ['Admin'],
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    path: '/raporlar',
    label: 'Raporlar',
    roller: ['Admin'],
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    path: '/lisans',
    label: 'Lisans',
    roller: ['Admin'],
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    path: '/harita',
    label: 'Müşteri Haritası',
    roller: ['Admin', 'SalesConsultant'],
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
  },
];

export default function Layout({ children }) {
  const { kullanici, cikisYap } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Lisans uyarı state'i
  const [lisansUyari, setLisansUyari] = useState(null); // kalan gün sayısı

  useEffect(() => {
    if (kullanici?.rol !== 'Admin') return;
    api.get('/lisans')
      .then(res => {
        const kalan = res.data.veri?.kalanGun ?? 999;
        if (kalan <= 30) setLisansUyari(kalan);
      })
      .catch(() => {});
  }, [kullanici]);

  // Bildirim state'leri
  const [bildirimler, setBildirimler] = useState([]);
  const [bildirimAcik, setBildirimAcik] = useState(false);
  const bildirimRef = useRef(null);

  // useCallback: kullanici değişmedikçe fonksiyon referansı aynı kalır
  // Bu sayede useEffect'te dependency olarak güvenle kullanılabilir
  const bildirimleriYukle = useCallback(async () => {
    if (!kullanici) return;
    try {
      const res = await api.get('/bildirimler');
      setBildirimler(res.data.veri ?? []);
    } catch {
      // sessizce geç
    }
  }, [kullanici]);

  // İlk yüklemede ve her 30 saniyede bir yenile
  useEffect(() => {
    bildirimleriYukle();
    const interval = setInterval(bildirimleriYukle, 30000);
    return () => clearInterval(interval);
  }, [bildirimleriYukle]);

  // Dropdown dışına tıklanınca kapat
  useEffect(() => {
    function disaTikla(e) {
      if (bildirimRef.current && !bildirimRef.current.contains(e.target)) {
        setBildirimAcik(false);
      }
    }
    document.addEventListener('mousedown', disaTikla);
    return () => document.removeEventListener('mousedown', disaTikla);
  }, []);

  const okunmamisSayi = bildirimler.filter(b => !b.okunduMu).length;

  async function hepsiniOku() {
    try {
      await api.put('/bildirimler/hepsini-oku');
      setBildirimler(prev => prev.map(b => ({ ...b, okunduMu: true })));
    } catch { /* sessiz */ }
  }

  async function bildirimOku(id) {
    try {
      await api.put(`/bildirimler/${id}/oku`);
      setBildirimler(prev => prev.map(b => b.id === id ? { ...b, okunduMu: true } : b));
    } catch { /* sessiz */ }
  }

  const tipRenk = { Bilgi: 'bg-indigo-500', Uyari: 'bg-amber-500', Hata: 'bg-rose-500' };

  const pageTitles = {
    '/dashboard': 'Genel Bakış',
    '/musteriler': 'Müşteriler',
    '/urunler': 'Ürünler',
    '/satislar': 'Satışlar',
    '/bakim': 'Bakım Takibi',
    '/gorevler': 'Görevler',
    '/kullanicilar': 'Kullanıcı Yönetimi',
    '/faturalar': 'Faturalar',
    '/gelir-gider': 'Gelir / Gider',
    '/harita': 'Müşteri Haritası',
    '/profil': 'Profilim',
    '/lisans': 'Lisans Bilgileri',
    '/raporlar': 'Raporlar',
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-sans">
      {/* Vercel-like sleek dark sidebar */}
      <aside className="w-[260px] flex flex-col bg-[#0f172a] text-slate-300 shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.05)] border-r border-slate-800">
        {/* Logo Section */}
        <div className="px-5 py-6 border-b border-white/5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-white font-bold text-[15px] leading-tight truncate">ÖzBakım</h1>
            <p className="text-indigo-300 text-[11px] font-semibold tracking-wider uppercase mt-0.5 truncate">Workspace</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto custom-scrollbar">
          <p className="px-3 text-[11px] font-bold tracking-widest text-slate-500 uppercase mb-3">Menü</p>
          {menuItems.filter(item => item.roller.includes(kullanici?.rol)).map((item) => {
            const aktif = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`group flex items-center gap-3.5 px-3 py-3 rounded-lg transition-all font-medium text-[14px] ${
                  aktif
                    ? 'bg-indigo-500/10 text-indigo-400'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
              >
                <div className={`shrink-0 ${aktif ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-400'}`}>
                  {item.icon}
                </div>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-white/5 bg-[#0b1120] space-y-2">
          {/* Profil linki */}
          <Link
            to="/profil"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === '/profil'
                ? 'bg-indigo-500/10 text-indigo-400'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Profil
          </Link>

          <div className="bg-[#1e293b] border border-slate-700/50 p-3 rounded-xl flex items-center gap-3">
            <div
              onClick={() => navigate('/profil')}
              className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-inner cursor-pointer"
            >
              {kullanici?.ad?.[0]}{kullanici?.soyad?.[0]}
            </div>
            <div className="flex-1 min-w-0 pr-2">
              <p className="text-[14px] font-semibold text-white truncate">{kullanici?.ad} {kullanici?.soyad}</p>
              <p className="text-[12px] text-slate-400 truncate">{kullanici?.rol}</p>
            </div>
            <button
              onClick={cikisYap}
              className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 p-2 rounded-lg transition-colors outline-none shrink-0"
              title="Çıkış Yap"
            >
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        
        {/* Simple & Clean Header */}
        <header className="h-[72px] shrink-0 px-8 flex items-center justify-between border-b border-slate-200 bg-white sticky top-0 z-10 transition-shadow">
          <div className="flex items-center gap-4 min-w-0">
            <h2 className="text-[18px] font-bold text-slate-900 truncate">
              {pageTitles[location.pathname] || 'Yönetim Paneli'}
            </h2>
            <span className="hidden md:inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-600 border border-emerald-100 shrink-0">
              <span className="mr-1.5 flex h-2 w-2 rounded-full bg-emerald-500"></span>
              Sistem Aktif
            </span>
          </div>

          <div className="flex items-center gap-5 shrink-0 pl-4">
            <div className="relative hidden w-full md:block md:w-72">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input 
                type="text" 
                placeholder="Herhangi bir şey arayın..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent rounded-lg text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <kbd className="inline-flex items-center rounded border border-slate-200 px-1.5 font-sans text-[10px] font-medium text-slate-500">⌘K</kbd>
              </div>
            </div>

            {/* Bildirim Zili */}
            <div className="relative" ref={bildirimRef}>
              <button
                onClick={() => setBildirimAcik(prev => !prev)}
                className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors outline-none shrink-0"
              >
                {okunmamisSayi > 0 && (
                  <span className="absolute top-1 right-1 flex items-center justify-center h-4 w-4 rounded-full bg-rose-500 ring-2 ring-white text-[9px] font-bold text-white">
                    {okunmamisSayi > 9 ? '9+' : okunmamisSayi}
                  </span>
                )}
                <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>

              {/* Bildirim Dropdown */}
              {bildirimAcik && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <span className="font-semibold text-slate-900 text-sm">Bildirimler</span>
                    {okunmamisSayi > 0 && (
                      <button
                        onClick={hepsiniOku}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        Tümünü okundu işaretle
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {bildirimler.length === 0 ? (
                      <div className="px-4 py-8 text-center text-slate-400 text-sm">
                        Bildirim yok
                      </div>
                    ) : (
                      bildirimler.map(b => (
                        <div
                          key={b.id}
                          onClick={() => !b.okunduMu && bildirimOku(b.id)}
                          className={`flex items-start gap-3 px-4 py-3 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors ${!b.okunduMu ? 'bg-indigo-50/40' : ''}`}
                        >
                          <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${tipRenk[b.tip] ?? 'bg-slate-400'}`}></span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${!b.okunduMu ? 'font-medium text-slate-800' : 'text-slate-500'}`}>
                              {b.mesaj}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {new Date(b.olusturmaTarihi).toLocaleString('tr-TR')}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Lisans uyarı banner'ı — 30 günden az kaldıysa göster */}
        {lisansUyari !== null && (
          <div className="bg-amber-50 border-b border-amber-200 px-8 py-2 flex items-center gap-2 text-amber-800 text-sm font-medium shrink-0">
            <svg className="w-4 h-4 shrink-0 text-amber-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {lisansUyari <= 0
              ? 'Lisansınızın süresi doldu! Yenileme için yöneticinizle iletişime geçin.'
              : `Lisansınızın süresi ${lisansUyari} gün içinde dolacak.`}
          </div>
        )}

        {/* Scrollable Main Segment */}
        <main className="flex-1 overflow-auto p-4 md:p-8 z-0">
          {children}
        </main>
      </div>
    </div>
  );
}
