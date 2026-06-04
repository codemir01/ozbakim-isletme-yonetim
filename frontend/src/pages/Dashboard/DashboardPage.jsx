import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../../api/axios';
import Layout from '../../components/Layout';

const formatPara = (v) => `₺${(v || 0).toLocaleString('tr-TR')}`;

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xl">
        <p className="text-sm font-bold text-slate-800 mb-1">{label}</p>
        {payload.map((p) => (
          <div key={p.dataKey} className="flex items-center gap-2 mt-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }}></div>
            <p className="text-[13px] font-semibold text-slate-600">
              {p.dataKey === 'ciro' ? `Ciro: ${formatPara(p.value)}` : `Satış: ${p.value} adet`}
            </p>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const [kayitlar, setKayitlar] = useState({
    ozet: null,
    satisGrafik: [],
    bakimlar: { gecmis: [], bugun: [], buHafta: [] },
    enCokSatanlar: [],
    bakimCihazlar: []
  });
  const [yukleniyor, setYukleniyor] = useState(true);
  const [aktifBakimSekme, setAktifBakimSekme] = useState('bugun');
  const [sonGuncelleme, setSonGuncelleme] = useState(new Date());

  async function veriCek() {
    setYukleniyor(true);
    try {
      const [ozetRes, satisRes, bakimRes, satanlarRes, cihazlarRes] = await Promise.allSettled([
        api.get('/dashboard/ozet'),
        api.get('/dashboard/satis-grafik'),
        api.get('/dashboard/yaklasan-bakimlar'),
        api.get('/dashboard/en-cok-satanlar'),
        api.get('/dashboard/bakim-servis-cihazlar')
      ]);

      const empty = { data: { veri: null } };
      setKayitlar({
        ozet: (ozetRes.status === 'fulfilled' ? ozetRes.value : empty).data?.veri || {},
        satisGrafik: (satisRes.status === 'fulfilled' ? satisRes.value : empty).data?.veri || [],
        bakimlar: (bakimRes.status === 'fulfilled' ? bakimRes.value : empty).data?.veri || { gecmis: [], bugun: [], buHafta: [] },
        enCokSatanlar: (satanlarRes.status === 'fulfilled' ? satanlarRes.value : empty).data?.veri || [],
        bakimCihazlar: (cihazlarRes.status === 'fulfilled' ? cihazlarRes.value : empty).data?.veri || []
      });
      setSonGuncelleme(new Date());
    } catch (err) {
      console.error('Dashboard verileri alınırken hata oluştu', err);
    } finally {
      setYukleniyor(false);
    }
  }

  useEffect(() => { veriCek(); }, []);

  if (yukleniyor) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[70vh]">
          <div className="flex flex-col items-center gap-3">
             <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
             <p className="text-slate-500 font-medium animate-pulse">İstatistikler Hesaplanıyor...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const { ozet, satisGrafik, bakimlar, enCokSatanlar, bakimCihazlar } = kayitlar;

  // Pie chart data — borç ve tahsilat dağılımı
  const kalanBorc = Math.max(0, (ozet.toplamBorc || 0) - (ozet.toplamTahsilat || 0));
  const finansData = [
    { name: 'Tahsilat', value: ozet.toplamTahsilat || 0, color: '#10b981' },
    { name: 'Kalan Borç', value: kalanBorc, color: '#ef4444' }
  ];

  return (
    <Layout>
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-800">İşletme Özeti</h1>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
                Son Güncelleme: <span className="font-semibold text-slate-700">{sonGuncelleme.toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})}</span>
              </span>
              <button onClick={veriCek} disabled={yukleniyor}
                className="p-2 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-indigo-50 hover:border-indigo-200 transition-colors disabled:opacity-50"
                title="Yenile">
                <svg className={`w-4 h-4 text-slate-500 ${yukleniyor ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
        </div>

        {/* 1. Üst Kartlar (Tüm Sayaçlar) */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Personel Sayısı</p>
            <p className="text-2xl font-bold text-slate-800">{ozet.personelSayisi || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Müşteri Sayısı</p>
            <p className="text-2xl font-bold text-slate-800">{ozet.toplamMusteri || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-purple-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Ürün Çeşidi</p>
            <p className="text-2xl font-bold text-slate-800">{ozet.toplamUrun || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Toplam Satış</p>
            <p className="text-2xl font-bold text-slate-800">{ozet.toplamSatis || 0}</p>
          </div>
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-4 rounded-2xl shadow-md text-white col-span-2 flex items-center justify-between">
            <div>
              <p className="text-indigo-200 text-sm font-medium mb-1">Toplam Satış Cirosu</p>
              <p className="text-3xl font-extrabold">{formatPara(ozet.toplamCiro)}</p>
            </div>
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
        </div>

        {/* 2. Grafik + Tahsilat/Borç Pasta Grafiği */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Satışlar Son 7 Gün Alan Grafiği */}
          <div className="xl:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
             <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-bold text-slate-800">Satış Trendi (Son 7 Gün)</h3>
                  <p className="text-sm text-slate-500 mt-1">Günlük ciro ve satış adetleri</p>
                </div>
             </div>
             <div className="h-[300px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={satisGrafik} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCiro" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="tarih" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} dx={-10} tickFormatter={(val) => `₺${val/1000}k`} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Area yAxisId="left" type="monotone" dataKey="ciro" stroke="#4f46e5" strokeWidth={3} fill="url(#colorCiro)" activeDot={{ r: 6, strokeWidth: 0, fill: '#4f46e5' }} />
                  </AreaChart>
               </ResponsiveContainer>
             </div>
          </div>

          {/* Tahsilat ve Borç Durumu */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
            <h3 className="font-bold text-slate-800 mb-6">Müşteri Bakiye Durumu</h3>
            <div className="flex-1 flex flex-col items-center justify-center relative">
               <ResponsiveContainer width="100%" height={220}>
                 <PieChart>
                    <Pie data={finansData} innerRadius={70} outerRadius={90} paddingAngle={5} dataKey="value">
                       {finansData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                       ))}
                    </Pie>
                    <RechartsTooltip formatter={(value) => formatPara(value)} />
                 </PieChart>
               </ResponsiveContainer>
               {/* Center Text */}
               <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xs text-slate-500 font-medium">Kalan Borç</span>
                  <span className={`text-lg font-bold ${kalanBorc === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                     {formatPara(kalanBorc)}
                  </span>
               </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="text-center p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                    <p className="text-xs font-semibold text-emerald-600 mb-1">Toplam Tahsilat</p>
                    <p className="text-sm font-bold text-slate-700">{formatPara(ozet.toplamTahsilat)}</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-rose-50 border border-rose-100">
                    <p className="text-xs font-semibold text-rose-600 mb-1">Piyasadaki Borç</p>
                    <p className="text-sm font-bold text-slate-700">{formatPara(ozet.toplamBorc)}</p>
                </div>
            </div>
          </div>
        </div>

        {/* 3. Yaklaşan Bakımlar ve En Çok Satanlar */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            
            {/* Yaklaşan Bakımlar */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
               <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                     <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                     Yaklaşan Bakım & Servisler
                  </h3>
               </div>
               
               <div className="flex border-b border-slate-100">
                  {[['gecmis', 'Gecikenler'], ['bugun', 'Bugün'], ['buHafta', 'Bu Hafta']].map(([key, label]) => (
                    <button
                        key={key}
                        onClick={() => setAktifBakimSekme(key)}
                        className={`flex-1 py-3 text-sm font-semibold transition-colors ${aktifBakimSekme === key ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                    >
                        {label}
                        <span className={`ml-2 text-xs py-0.5 px-2 rounded-full ${aktifBakimSekme === key ? 'bg-indigo-100' : 'bg-slate-100'}`}>
                           {bakimlar[key]?.length || 0}
                        </span>
                    </button>
                  ))}
               </div>

               <div className="p-0 overflow-y-auto max-h-[300px]">
                  {bakimlar[aktifBakimSekme]?.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-sm font-medium">Bu kategoride kayıt bulunmuyor.</div>
                  ) : (
                      <div className="divide-y divide-slate-100">
                        {bakimlar[aktifBakimSekme]?.map((b, i) => (
                           <div key={i} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                              <div>
                                 <p className="font-semibold text-slate-800 text-sm mb-0.5">{b.musteriAdi}</p>
                                 <p className="text-xs text-slate-500">{b.telefon}</p>
                              </div>
                              <div className="text-right">
                                 <span className={`inline-flex mb-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${b.kartTipi === 'Bakim' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                    {b.kartTipi}
                                 </span>
                                 <p className="text-xs font-medium text-slate-600">{new Date(b.bakimYapilacakTarih).toLocaleDateString('tr-TR')}</p>
                              </div>
                           </div>
                        ))}
                      </div>
                  )}
               </div>
            </div>

            {/* En Çok Satan 10 Ürün & Bakımda Kullanılan Cihazlar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* En Çok Satan 10 Ürün */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="font-bold text-slate-800 text-sm">En Çok Satan 10 Ürün</h3>
                    </div>
                    <div className="p-0 overflow-y-auto max-h-[300px]">
                       {enCokSatanlar.length === 0 ? (
                           <div className="p-6 text-center text-slate-500 text-sm">Satış kaydı yok.</div>
                       ) : (
                           <div className="divide-y divide-slate-50">
                             {enCokSatanlar.map((u, i) => (
                                <div key={i} className="p-3 hover:bg-slate-50 flex items-center gap-3">
                                   <div className="w-6 text-center font-bold text-slate-300">{i+1}</div>
                                   <div className="flex-1 min-w-0">
                                      <p className="font-semibold text-slate-800 text-sm truncate">{u.urunAdi}</p>
                                      <p className="text-[11px] text-slate-500 uppercase">{u.kategori}</p>
                                   </div>
                                   <div className="text-right">
                                      <p className="font-bold text-indigo-600 text-sm">{u.satisAdedi} <span className="text-[10px] text-slate-400 font-normal">Adet</span></p>
                                   </div>
                                </div>
                             ))}
                           </div>
                       )}
                    </div>
                </div>

                {/* Bakımda En Çok Kullanılan Cihazlar */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="font-bold text-slate-800 text-sm">Bakımı En Çok Yapılanlar</h3>
                    </div>
                    <div className="p-0 overflow-y-auto max-h-[300px]">
                       {bakimCihazlar.length === 0 ? (
                           <div className="p-6 text-center text-slate-500 text-sm">Bakım kaydı yok.</div>
                       ) : (
                           <div className="divide-y divide-slate-50">
                             {bakimCihazlar.map((c, i) => (
                                <div key={i} className="p-3 hover:bg-slate-50 flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 border border-orange-100">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                   </div>
                                   <div className="flex-1 min-w-0">
                                      <p className="font-semibold text-slate-800 text-sm truncate">{c.cihaz}</p>
                                   </div>
                                   <div className="text-right">
                                      <p className="font-bold text-orange-600 text-sm">{c.adet} <span className="text-[10px] text-slate-400 font-normal">Kez</span></p>
                                   </div>
                                </div>
                             ))}
                           </div>
                       )}
                    </div>
                </div>

            </div>
        </div>

      </div>
    </Layout>
  );
}
