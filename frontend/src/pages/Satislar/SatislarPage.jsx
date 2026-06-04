import { useEffect, useState } from 'react';
import api from '../../api/axios';
import Layout from '../../components/Layout';

const ozetKartlar = [
  {
    key: 'toplam',
    label: 'Toplam Satış',
    format: (v) => v,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
  },
  {
    key: 'aylikSatis',
    label: 'Bu Ay',
    format: (v) => v,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    gradient: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
  },
  {
    key: 'haftalikSatis',
    label: 'Bu Hafta',
    format: (v) => v,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
  },
  {
    key: 'toplamCiro',
    label: 'Toplam Ciro',
    format: (v) => `₺${(v || 0).toLocaleString('tr-TR')}`,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  },
];

export default function SatislarPage() {
  const [satislar, setSatislar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [ozet, setOzet] = useState(null);
  const [arama, setArama] = useState('');
  const [modal, setModal] = useState(false);
  const [sayfa, setSayfa] = useState(1);
  const [toplamSayfa, setToplamSayfa] = useState(1);
  const [toplamKayit, setToplamKayit] = useState(0);
  const [musteriler, setMusteriler] = useState([]);
  const [urunler, setUrunler] = useState([]);
  const [form, setForm] = useState({
    musteriId: '', urunId: '', satisFiyati: '', bakimTakibiAktif: false, montajTarihi: '', bakimAraligi: 180,
  });
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [kaydetHata, setKaydetHata] = useState('');
  const [modalHata, setModalHata] = useState('');

  useEffect(() => { veriCek(sayfa); }, [sayfa]);

  async function veriCek(s = 1) {
    setYukleniyor(true);
    try {
      const [satisRes, ozetRes] = await Promise.allSettled([
        api.get(`/satislar?sayfa=${s}&boyut=20`),
        api.get('/satislar/ozet'),
      ]);
      if (satisRes.status === 'fulfilled') {
        setSatislar(satisRes.value.data.veri ?? []);
        setToplamSayfa(satisRes.value.data.toplamSayfa ?? 1);
        setToplamKayit(satisRes.value.data.toplamKayit ?? 0);
      }
      if (ozetRes.status === 'fulfilled') setOzet(ozetRes.value.data.veri);
    } catch (err) { console.error(err); }
    finally { setYukleniyor(false); }
  }

  async function modalAc() {
    setModalHata('');
    setKaydetHata('');
    try {
      const [musteriRes, urunRes] = await Promise.all([
        api.get('/musteriler?sayfa=1&boyut=100'),
        api.get('/urunler'),
      ]);
      setMusteriler(musteriRes.data.veri ?? []);
      setUrunler(urunRes.data.veri ?? []);
      setModal(true);
    } catch {
      setModalHata('Müşteri veya ürün listesi yüklenemedi. Lütfen tekrar deneyin.');
    }
  }

  async function handleKaydet(e) {
    e.preventDefault();
    setKaydediliyor(true);
    setKaydetHata('');
    try {
      await api.post('/satislar', {
        musteriId: form.musteriId,
        urunId: form.urunId,
        satisFiyati: Number(form.satisFiyati),
        bakimTakibiAktif: form.bakimTakibiAktif,
        montajTarihi: form.bakimTakibiAktif && form.montajTarihi ? new Date(form.montajTarihi).toISOString() : null,
        bakimAraligi: form.bakimTakibiAktif ? Number(form.bakimAraligi) : null,
      });
      setModal(false);
      setForm({ musteriId: '', urunId: '', satisFiyati: '', bakimTakibiAktif: false, montajTarihi: '', bakimAraligi: 180 });
      setSayfa(1);
      veriCek(1);
    } catch (err) {
      setKaydetHata(err.response?.data?.hata || 'Satış kaydedilemedi.');
    } finally { setKaydediliyor(false); }
  }

  const filtreli = satislar.filter((s) =>
    s.musteriAdSoyad?.toLowerCase().includes(arama.toLowerCase()) ||
    s.urunAdi?.toLowerCase().includes(arama.toLowerCase())
  );

  return (
    <Layout>
      <div className="p-6 space-y-4">
        {/* Özet kartlar */}
        {ozet && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {ozetKartlar.map((k) => (
              <div
                key={k.key}
                className="relative overflow-hidden rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
                style={{ background: k.gradient }}
              >
                <div className="absolute -right-3 -top-3 w-20 h-20 bg-white/10 rounded-full pointer-events-none" />
                <div className="relative flex items-center gap-3">
                  <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center shrink-0 text-white">
                    {k.icon}
                  </div>
                  <div>
                    <p className="text-xl font-bold text-white tabular-nums">{k.format(ozet[k.key])}</p>
                    <p className="text-xs text-white/75 mt-0.5">{k.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Üst bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex items-center gap-2.5 shadow-sm w-72">
              <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" placeholder="Müşteri veya ürün ara..." value={arama} onChange={(e) => setArama(e.target.value)}
                className="flex-1 bg-transparent focus:outline-none text-sm text-slate-700 placeholder:text-slate-400" />
            </div>
            <span className="text-sm text-slate-500 bg-white border border-slate-200 rounded-xl px-3 py-2.5 shadow-sm">
              <strong className="text-slate-700">{satislar.length}</strong> kayıt
            </span>
          </div>
          <button onClick={modalAc}
            className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Yeni Satış
          </button>
        </div>

        {/* Tablo */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {yukleniyor ? (
            <div className="flex items-center justify-center py-20">
              <svg className="animate-spin w-7 h-7 text-indigo-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Müşteri</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ürün</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Personel</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tarih</th>
                  <th className="text-right px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fiyat</th>
                  <th className="text-center px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Bakım</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtreli.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0">
                          {s.musteriAdSoyad?.[0] ?? '?'}
                        </div>
                        <span className="font-medium text-slate-800 text-sm">{s.musteriAdSoyad}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{s.urunAdi}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{s.personelAdSoyad}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-medium">
                        {new Date(s.satisTarihi).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-bold text-slate-800">₺{s.satisFiyati.toLocaleString('tr-TR')}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {s.bakimTakibiAktif ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 bg-slate-100 text-slate-400 rounded-lg text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filtreli.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-16 text-center">
                      <svg className="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      <p className="text-slate-400 text-sm">Satış kaydı bulunamadı</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {toplamSayfa > 1 && (
          <div className="flex items-center justify-between bg-white border border-slate-100 rounded-2xl px-5 py-3 shadow-sm">
            <span className="text-sm text-slate-500">
              Sayfa <strong className="text-slate-700">{sayfa}</strong> / {toplamSayfa} · Toplam {toplamKayit} satış
            </span>
            <div className="flex gap-2">
              <button
                disabled={sayfa <= 1}
                onClick={() => setSayfa(s => s - 1)}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Önceki
              </button>
              {Array.from({ length: toplamSayfa }, (_, i) => i + 1)
                .filter(n => n === 1 || n === toplamSayfa || Math.abs(n - sayfa) <= 1)
                .reduce((acc, n, idx, arr) => {
                  if (idx > 0 && n - arr[idx - 1] > 1) acc.push('...');
                  acc.push(n);
                  return acc;
                }, [])
                .map((n, i) => n === '...'
                  ? <span key={`e${i}`} className="px-2 text-slate-400">…</span>
                  : <button
                      key={n}
                      onClick={() => setSayfa(n)}
                      className={`w-8 h-8 text-sm rounded-lg border transition-colors ${sayfa === n ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >{n}</button>
                )}
              <button
                disabled={sayfa >= toplamSayfa}
                onClick={() => setSayfa(s => s + 1)}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Sonraki →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Yeni Satış Modalı */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-5 shrink-0 text-white" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
              <div>
                <h3 className="text-base font-bold">Yeni Satış</h3>
                <p className="text-xs text-white/70 mt-0.5">Satış bilgilerini doldurun</p>
              </div>
              <button onClick={() => setModal(false)} className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleKaydet} className="flex-1 overflow-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Müşteri *</label>
                <select required value={form.musteriId} onChange={(e) => setForm({ ...form, musteriId: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition">
                  <option value="">Müşteri seçin...</option>
                  {musteriler.map((m) => <option key={m.id} value={m.id}>{m.ad} {m.soyad} — {m.telefon}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Ürün *</label>
                <select required value={form.urunId} onChange={(e) => {
                  const urun = urunler.find(u => u.id === e.target.value);
                  setForm({ ...form, urunId: e.target.value, satisFiyati: urun ? urun.alisFiyati : form.satisFiyati });
                }}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition">
                  <option value="">Ürün seçin...</option>
                  {urunler.map((u) => <option key={u.id} value={u.id}>{u.urunAdi} — Stok: {u.stokAdedi}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Satış Fiyatı (₺) *</label>
                <input type="number" required min="0" step="0.01" value={form.satisFiyati} onChange={(e) => setForm({ ...form, satisFiyati: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition" />
              </div>

              {/* Bakım takibi */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.bakimTakibiAktif} onChange={(e) => setForm({ ...form, bakimTakibiAktif: e.target.checked })}
                    className="w-4 h-4 rounded accent-indigo-600" />
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Bakım Takibi Aktif</p>
                    <p className="text-xs text-slate-400">Periyodik bakım kartı otomatik oluşturulur</p>
                  </div>
                </label>

                {form.bakimTakibiAktif && (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Montaj Tarihi</label>
                      <input type="date" value={form.montajTarihi} onChange={(e) => setForm({ ...form, montajTarihi: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white transition" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Bakım Aralığı (Gün)</label>
                      <input type="number" min="1" value={form.bakimAraligi} onChange={(e) => setForm({ ...form, bakimAraligi: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white transition" />
                    </div>
                  </div>
                )}
              </div>

              {kaydetHata && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{kaydetHata}</p>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 font-medium transition-colors">İptal</button>
                <button type="submit" disabled={kaydediliyor}
                  className="flex-1 py-2.5 px-4 rounded-xl text-white text-sm font-semibold disabled:opacity-60 shadow-md"
                  style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                  {kaydediliyor ? 'Kaydediliyor...' : 'Satışı Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
