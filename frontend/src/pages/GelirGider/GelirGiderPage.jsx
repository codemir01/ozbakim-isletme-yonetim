import { useEffect, useState } from 'react';
import api from '../../api/axios';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';

const tipConfig = {
  Gelir: { label: 'Gelir', cls: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  Gider: { label: 'Gider', cls: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
};

export default function GelirGiderPage() {
  const { kullanici } = useAuth();
  const isAdmin = kullanici?.rol === 'Admin';

  const [liste, setListe] = useState([]);
  const [ozet, setOzet] = useState({ toplamGelir: 0, toplamGider: 0, netBakiye: 0, gelirSayisi: 0, giderSayisi: 0 });
  const [yukleniyor, setYukleniyor] = useState(true);
  const [filtre, setFiltre] = useState('hepsi');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ tip: 'Gelir', miktar: '', aciklama: '', tarih: '' });
  const [kaydediliyor, setKaydediliyor] = useState(false);

  // --- AI Fatura Okuma (OCR) durumu ---
  const [ocrModal, setOcrModal] = useState(false);
  const [ocrAsama, setOcrAsama] = useState('secim');     // secim | okunuyor | onay
  const [ocrVeri, setOcrVeri] = useState(null);          // AI'dan dönen ham veri (kalemler dahil)
  const [ocrForm, setOcrForm] = useState({ tip: 'Gider', miktar: '', aciklama: '', tarih: '' });
  const [stogaEkle, setStogaEkle] = useState(true);      // kalemleri stoğa da ekle
  const [ocrKaydediliyor, setOcrKaydediliyor] = useState(false);
  const [ocrHata, setOcrHata] = useState('');

  useEffect(() => { veriCek(); }, []);

  async function veriCek() {
    try {
      const [listeRes, ozetRes] = await Promise.all([
        api.get('/gelir-gider'),
        api.get('/gelir-gider/ozet'),
      ]);
      setListe(listeRes.data.veri ?? []);
      if (ozetRes.data.veri) setOzet(ozetRes.data.veri);
    } catch (err) { console.error(err); }
    finally { setYukleniyor(false); }
  }

  async function handleKaydet(e) {
    e.preventDefault();
    setKaydediliyor(true);
    try {
      await api.post('/gelir-gider', {
        tip: form.tip,
        miktar: parseFloat(form.miktar),
        aciklama: form.aciklama,
        tarih: form.tarih ? new Date(form.tarih).toISOString() : null,
      });
      setModal(false);
      setForm({ tip: 'Gelir', miktar: '', aciklama: '', tarih: '' });
      veriCek();
    } catch (err) { console.error(err); }
    finally { setKaydediliyor(false); }
  }

  async function handleSil(id) {
    if (!window.confirm('Bu kaydı silmek istediğinizden emin misiniz?')) return;
    try {
      await api.delete(`/gelir-gider/${id}`);
      veriCek();
    } catch (err) { console.error(err); }
  }

  // Fatura görseli seçilince AI'a gönder, dönen veriyle onay formunu doldur
  async function handleFaturaSec(e) {
    const dosya = e.target.files?.[0];
    e.target.value = ''; // aynı dosya tekrar seçilebilsin
    if (!dosya) return;

    setOcrHata('');
    setOcrAsama('okunuyor');
    try {
      const fd = new FormData();
      fd.append('foto', dosya);
      const res = await api.post('/gelir-gider/fatura-oku', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const veri = res.data.veri;
      if (!veri) throw new Error('Fatura okunamadı.');
      setOcrVeri(veri);
      // Okunan kalemleri açıklamaya da ekle (ör. "Fatura: ABC Ltd — Buzdolabı, Kombi Kartı")
      const kalemOzet = (veri.kalemler || []).map((k) => k.ad).filter(Boolean).join(', ');
      const aciklamaParcalari = [
        veri.firma ? `Fatura: ${veri.firma}` : 'Fatura alımı',
        kalemOzet,
      ].filter(Boolean);
      setOcrForm({
        tip: 'Gider', // tedarikçi alım faturası varsayımı — kullanıcı onay ekranında değiştirebilir
        miktar: veri.toplamTutar ? String(veri.toplamTutar) : '',
        aciklama: aciklamaParcalari.join(' — '),
        tarih: veri.tarih || '',
      });
      setOcrAsama('onay');
    } catch (err) {
      setOcrHata(err.response?.data?.hata || 'Fatura okunamadı. AI servisi çalışıyor mu?');
      setOcrAsama('secim');
    }
  }

  // Onaylanan faturayı gider olarak (ve istenirse kalemleri stoğa) kaydet
  async function handleOcrKaydet() {
    setOcrKaydediliyor(true);
    try {
      await api.post('/gelir-gider', {
        tip: ocrForm.tip,
        miktar: parseFloat(ocrForm.miktar) || 0,
        aciklama: ocrForm.aciklama,
        tarih: ocrForm.tarih ? new Date(ocrForm.tarih).toISOString() : null,
      });

      // İstenirse her fatura kalemini yedek parça olarak stoğa ekle (sadece gider/alım faturasında mantıklı)
      if (ocrForm.tip === 'Gider' && stogaEkle && ocrVeri?.kalemler?.length) {
        for (const [i, k] of ocrVeri.kalemler.entries()) {
          if (!k.ad) continue;
          await api.post('/urunler', {
            urunAdi: k.ad,
            kategori: 'YedekParca',
            stokKodu: `OCR-${Date.now()}-${i}`,
            stokAdedi: k.adet || 0,
            alisFiyati: k.birimFiyat || 0,
          });
        }
      }

      ocrKapat();
      veriCek();
    } catch (err) {
      setOcrHata(err.response?.data?.hata || 'Kayıt sırasında hata oluştu.');
    } finally {
      setOcrKaydediliyor(false);
    }
  }

  function ocrKapat() {
    setOcrModal(false);
    setOcrAsama('secim');
    setOcrVeri(null);
    setOcrForm({ tip: 'Gider', miktar: '', aciklama: '', tarih: '' });
    setOcrHata('');
    setStogaEkle(true);
  }

  const filtrelenmis = liste.filter((k) => {
    if (filtre === 'gelir') return k.tip === 'Gelir';
    if (filtre === 'gider') return k.tip === 'Gider';
    return true;
  });

  const netPozitif = ozet.netBakiye >= 0;

  return (
    <Layout>
      <div className="p-6 space-y-4">

        {/* Özet Kartlar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              label: 'Toplam Gelir',
              value: ozet.toplamGelir,
              alt: `${ozet.gelirSayisi} kayıt`,
              gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              icon: (
                <svg className="w-6 h-6 text-white/80" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 11l5-5m0 0l5 5m-5-5v12" />
                </svg>
              ),
            },
            {
              label: 'Toplam Gider',
              value: ozet.toplamGider,
              alt: `${ozet.giderSayisi} kayıt`,
              gradient: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
              icon: (
                <svg className="w-6 h-6 text-white/80" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                </svg>
              ),
            },
            {
              label: 'Net Bakiye',
              value: ozet.netBakiye,
              alt: netPozitif ? 'Kârlı dönem' : 'Zararli dönem',
              gradient: netPozitif
                ? 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)'
                : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              icon: (
                <svg className="w-6 h-6 text-white/80" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
            },
          ].map((k) => (
            <div
              key={k.label}
              className="relative overflow-hidden rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
              style={{ background: k.gradient }}
            >
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full pointer-events-none" />
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">{k.label}</p>
                  <p className="text-2xl font-bold text-white tabular-nums mt-1">
                    {k.value.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                  </p>
                  <p className="text-white/60 text-xs mt-1">{k.alt}</p>
                </div>
                <div className="shrink-0">{k.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filtre + Yeni Kayıt */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm gap-1">
            {[
              { key: 'hepsi', label: 'Tümü' },
              { key: 'gelir', label: 'Gelirler' },
              { key: 'gider', label: 'Giderler' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFiltre(f.key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  filtre === f.key ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
                style={filtre === f.key ? { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' } : {}}
              >
                {f.label}
              </button>
            ))}
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2">
              {/* AI Fatura Tara — fatura görselini okuyup gideri otomatik doldurur */}
              <button
                onClick={() => setOcrModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 text-indigo-700 text-sm font-semibold rounded-xl border-2 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 hover:-translate-y-0.5 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Fatura Tara (AI)
              </button>

              <button
                onClick={() => setModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Yeni Kayıt
              </button>
            </div>
          )}
        </div>

        {/* Tablo */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {yukleniyor ? (
            <div className="flex items-center justify-center py-20">
              <svg className="animate-spin w-7 h-7 text-indigo-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tarih</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tür</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Açıklama</th>
                  <th className="text-right px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Miktar</th>
                  {isAdmin && <th className="px-6 py-3.5"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtrelenmis.map((k) => {
                  const tip = tipConfig[k.tip] ?? { label: k.tip, cls: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' };
                  return (
                    <tr key={k.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                        {new Date(k.tarih).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${tip.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${tip.dot}`}></span>
                          {tip.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">{k.aciklama}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`text-sm font-bold tabular-nums ${k.tip === 'Gelir' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {k.tip === 'Gelir' ? '+' : '-'}{k.miktar.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleSil(k.id)}
                            className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Sil"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {filtrelenmis.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 5 : 4} className="px-6 py-16 text-center">
                      <svg className="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-slate-400 text-sm">Kayıt bulunamadı</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Yeni Kayıt Modalı */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div
              className="flex items-center justify-between p-5 text-white"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
            >
              <div>
                <h3 className="text-base font-bold">Yeni Kayıt</h3>
                <p className="text-xs text-white/70 mt-0.5">Gelir veya gider ekleyin</p>
              </div>
              <button
                onClick={() => setModal(false)}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleKaydet} className="p-6 space-y-4">
              {/* Tür Seçimi */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tür *</label>
                <div className="flex gap-3">
                  {['Gelir', 'Gider'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, tip: t })}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                        form.tip === t
                          ? t === 'Gelir'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                            : 'bg-rose-50 border-rose-500 text-rose-700'
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {t === 'Gelir' ? '↑ Gelir' : '↓ Gider'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Miktar */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Miktar (₺) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={form.miktar}
                  onChange={(e) => setForm({ ...form, miktar: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition"
                />
              </div>

              {/* Açıklama */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Açıklama *</label>
                <input
                  type="text"
                  required
                  value={form.aciklama}
                  onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
                  placeholder="Kayıt açıklaması..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition"
                />
              </div>

              {/* Tarih */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tarih (boş bırakılırsa bugün)</label>
                <input
                  type="date"
                  value={form.tarih}
                  onChange={(e) => setForm({ ...form, tarih: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 font-medium transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={kaydediliyor}
                  className="flex-1 py-2.5 px-4 rounded-xl text-white text-sm font-semibold shadow-md disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
                >
                  {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Fatura Okuma Modalı */}
      {ocrModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div
              className="flex items-center justify-between p-5 text-white"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
            >
              <div>
                <h3 className="text-base font-bold">AI ile Fatura Tara</h3>
                <p className="text-xs text-white/70 mt-0.5">Fatura/fiş görseli yükleyin, yapay zeka okusun</p>
              </div>
              <button
                onClick={ocrKapat}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {ocrHata && (
                <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                  {ocrHata}
                </div>
              )}

              {/* 1. Aşama: dosya seçimi */}
              {ocrAsama === 'secim' && (
                <label className="flex flex-col items-center justify-center gap-3 py-10 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/40 transition-colors">
                  <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5V18a2 2 0 002 2h14a2 2 0 002-2v-1.5M16 7l-4-4m0 0L8 7m4-4v12" />
                  </svg>
                  <span className="text-sm font-semibold text-slate-600">Fatura görseli seç (JPG / PNG)</span>
                  <span className="text-xs text-slate-400">En fazla 5 MB</span>
                  <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleFaturaSec} />
                </label>
              )}

              {/* 2. Aşama: okunuyor */}
              {ocrAsama === 'okunuyor' && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <svg className="animate-spin w-8 h-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <p className="text-sm text-slate-500">Yapay zeka faturayı okuyor...</p>
                </div>
              )}

              {/* 3. Aşama: onay / düzenleme */}
              {ocrAsama === 'onay' && (
                <>
                  {/* Tür: AI karar vermez, varsayılan Gider (alım faturası). Kullanıcı değiştirebilir. */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tür *</label>
                    <div className="flex gap-3">
                      {['Gelir', 'Gider'].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setOcrForm({ ...ocrForm, tip: t })}
                          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                            ocrForm.tip === t
                              ? t === 'Gelir'
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                                : 'bg-rose-50 border-rose-500 text-rose-700'
                              : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                          }`}
                        >
                          {t === 'Gelir' ? '↑ Gelir' : '↓ Gider'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Açıklama</label>
                      <input
                        type="text"
                        value={ocrForm.aciklama}
                        onChange={(e) => setOcrForm({ ...ocrForm, aciklama: e.target.value })}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tutar (₺)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={ocrForm.miktar}
                        onChange={(e) => setOcrForm({ ...ocrForm, miktar: e.target.value })}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tarih</label>
                      <input
                        type="date"
                        value={ocrForm.tarih}
                        onChange={(e) => setOcrForm({ ...ocrForm, tarih: e.target.value })}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition"
                      />
                    </div>
                  </div>

                  {/* AI'ın bulduğu kalemler */}
                  {ocrVeri?.kalemler?.length > 0 && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-2 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                        <span>Okunan Kalemler ({ocrVeri.kalemler.length})</span>
                      </div>
                      <div className="max-h-40 overflow-y-auto divide-y divide-slate-50">
                        {ocrVeri.kalemler.map((k, i) => (
                          <div key={i} className="px-4 py-2 flex items-center justify-between text-sm">
                            <span className="text-slate-700">{k.ad || '—'}</span>
                            <span className="text-slate-400 tabular-nums">
                              {k.adet || 0} × {(k.birimFiyat || 0).toLocaleString('tr-TR')} ₺
                            </span>
                          </div>
                        ))}
                      </div>
                      {ocrForm.tip === 'Gider' && (
                        <label className="flex items-center gap-2 px-4 py-3 bg-indigo-50/50 border-t border-slate-100 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={stogaEkle}
                            onChange={(e) => setStogaEkle(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm text-slate-600">Bu kalemleri yedek parça olarak stoğa da ekle</span>
                        </label>
                      )}
                    </div>
                  )}

                  <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                    <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs text-amber-700">Yapay zeka okuması hatalı olabilir. Kaydetmeden önce değerleri kontrol edin.</p>
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={ocrKapat}
                      className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 font-medium transition-colors"
                    >
                      İptal
                    </button>
                    <button
                      type="button"
                      onClick={handleOcrKaydet}
                      disabled={ocrKaydediliyor}
                      className="flex-1 py-2.5 px-4 rounded-xl text-white text-sm font-semibold shadow-md disabled:opacity-60"
                      style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
                    >
                      {ocrKaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
