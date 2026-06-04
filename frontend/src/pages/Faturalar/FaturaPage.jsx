import { useEffect, useState } from 'react';
import api from '../../api/axios';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';

export default function FaturaPage() {
  const { kullanici } = useAuth();
  const yetkili = kullanici?.rol === 'Admin' || kullanici?.rol === 'SalesConsultant';

  const [faturalar, setFaturalar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [detay, setDetay] = useState(null);
  const [detayYukleniyor, setDetayYukleniyor] = useState(false);
  const [yeniModal, setYeniModal] = useState(false);
  const [satislar, setSatislar] = useState([]);
  const [seciliSatisId, setSeciliSatisId] = useState('');
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [hata, setHata] = useState('');
  const [arama, setArama] = useState('');

  useEffect(() => { veriCek(); }, []);

  async function veriCek() {
    try {
      const res = await api.get('/faturalar');
      setFaturalar(res.data.veri ?? []);
    } catch (err) { console.error(err); }
    finally { setYukleniyor(false); }
  }

  async function detayAc(id) {
    setDetayYukleniyor(true);
    setDetay({ yukleniyor: true });
    try {
      const res = await api.get(`/faturalar/${id}`);
      setDetay(res.data.veri);
    } catch (err) { console.error(err); setDetay(null); }
    finally { setDetayYukleniyor(false); }
  }

  async function yeniModalAc() {
    setHata('');
    setSeciliSatisId('');
    setYeniModal(true);
    try {
      // boyut=500 ile fatura kesilmemiş satışları listele
      const res = await api.get('/satislar?sayfa=1&boyut=500');
      setSatislar(res.data.veri ?? []);
    } catch (err) { console.error(err); }
  }

  async function handleOlustur(e) {
    e.preventDefault();
    if (!seciliSatisId) { setHata('Lütfen bir satış seçin.'); return; }
    setKaydediliyor(true);
    setHata('');
    try {
      const res = await api.post('/faturalar', { satisId: seciliSatisId });
      if (res.data.basarili) {
        setYeniModal(false);
        veriCek();
      } else {
        setHata(res.data.hata || 'Bir hata oluştu.');
      }
    } catch (err) {
      setHata(err.response?.data?.hata || 'Sunucu hatası.');
    } finally { setKaydediliyor(false); }
  }

  async function pdfIndir(id) {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5096/api/v1/faturalar/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fatura-${id.toString().slice(0, 8).toUpperCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('PDF oluşturulamadı.');
    }
  }

  const filtrelenmis = faturalar.filter((f) =>
    f.musteriAdSoyad?.toLowerCase().includes(arama.toLowerCase()) ||
    f.urunAdi?.toLowerCase().includes(arama.toLowerCase())
  );

  const toplamTutar = faturalar.reduce((t, f) => t + f.tutar, 0);

  return (
    <Layout>
      <div className="p-6 space-y-4">

        {/* Özet Kartlar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              label: 'Toplam Fatura',
              value: faturalar.length,
              alt: 'Kayıtlı fatura',
              gradient: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
              icon: (
                <svg className="w-6 h-6 text-white/80" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              ),
            },
            {
              label: 'Toplam Ciro',
              value: toplamTutar.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺',
              alt: 'Faturalandırılan tutar',
              gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              icon: (
                <svg className="w-6 h-6 text-white/80" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
            },
            {
              label: 'Bu Ay',
              value: faturalar.filter((f) => {
                const t = new Date(f.olusturmaTarihi);
                const now = new Date();
                return t.getMonth() === now.getMonth() && t.getFullYear() === now.getFullYear();
              }).length,
              alt: 'Bu ay kesilen fatura',
              gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              icon: (
                <svg className="w-6 h-6 text-white/80" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
                  <p className="text-2xl font-bold text-white tabular-nums mt-1">{k.value}</p>
                  <p className="text-white/60 text-xs mt-1">{k.alt}</p>
                </div>
                <div className="shrink-0">{k.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Arama + Yeni Fatura */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Müşteri veya ürün ara..."
              value={arama}
              onChange={(e) => setArama(e.target.value)}
              className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm w-64"
            />
          </div>

          {yetkili && (
            <button
              onClick={yeniModalAc}
              className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Fatura Kes
            </button>
          )}
        </div>

        {/* Fatura Tablosu */}
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
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fatura No</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Müşteri</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ürün</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Kesen</th>
                  <th className="text-right px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tutar</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tarih</th>
                  <th className="px-6 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtrelenmis.map((f, i) => (
                  <tr key={f.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-xs font-mono font-semibold text-slate-400">
                        #{String(i + 1).padStart(4, '0')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0">
                          {f.musteriAdSoyad?.[0]}
                        </div>
                        <span className="text-sm font-medium text-slate-800">{f.musteriAdSoyad}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{f.urunAdi}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{f.olusturanAdi}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-bold text-emerald-600 tabular-nums">
                        {f.tutar.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                      {new Date(f.olusturmaTarihi).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => detayAc(f.id)}
                          className="px-2.5 py-1 text-xs font-medium bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                        >
                          Detay
                        </button>
                        <button
                          onClick={() => pdfIndir(f.id)}
                          title="PDF İndir"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17a9 9 0 1118 0" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtrelenmis.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-6 py-16 text-center">
                      <svg className="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-slate-400 text-sm">Fatura bulunamadı</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detay Modalı */}
      {detay && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between p-5 text-white" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
              <div>
                <h3 className="text-base font-bold">Fatura Detayı</h3>
                <p className="text-xs text-white/70 mt-0.5">
                  {detay.yukleniyor ? 'Yükleniyor...' : `${detay.musteriAd} ${detay.musteriSoyad}`}
                </p>
              </div>
              <button onClick={() => setDetay(null)} className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {detay.yukleniyor ? (
              <div className="flex items-center justify-center py-16">
                <svg className="animate-spin w-7 h-7 text-indigo-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : (
              <div className="p-6 space-y-5">
                {/* Müşteri */}
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Müşteri Bilgileri</p>
                  <div className="bg-slate-50 rounded-xl p-4 space-y-1.5">
                    <SatirBilgi label="Ad Soyad" value={`${detay.musteriAd} ${detay.musteriSoyad}`} />
                    <SatirBilgi label="Telefon" value={detay.musteriTelefon} />
                    <SatirBilgi label="Adres" value={detay.musteriAdres} />
                  </div>
                </div>

                {/* Satış */}
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Satış Bilgileri</p>
                  <div className="bg-slate-50 rounded-xl p-4 space-y-1.5">
                    <SatirBilgi label="Ürün" value={detay.urunAdi} />
                    <SatirBilgi label="Kategori" value={detay.urunKategori} />
                    <SatirBilgi label="Satış Tarihi" value={new Date(detay.satisTarihi).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })} />
                    <SatirBilgi label="Bakım Takibi" value={detay.bakimTakibiAktif ? 'Aktif' : 'Pasif'} vurgu={detay.bakimTakibiAktif} />
                  </div>
                </div>

                {/* Tutar */}
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-emerald-600 font-semibold">Fatura Tutarı</p>
                    <p className="text-xs text-slate-400 mt-0.5">Kesen: {detay.olusturanAdi}</p>
                  </div>
                  <p className="text-2xl font-bold text-emerald-600 tabular-nums">
                    {detay.tutar?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => pdfIndir(detay.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md transition-all"
                    style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17a9 9 0 1118 0" />
                    </svg>
                    PDF İndir
                  </button>
                  <button
                    onClick={() => setDetay(null)}
                    className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 font-medium transition-colors"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Yeni Fatura Modalı */}
      {yeniModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-5 text-white" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
              <div>
                <h3 className="text-base font-bold">Fatura Kes</h3>
                <p className="text-xs text-white/70 mt-0.5">Satış seçerek fatura oluşturun</p>
              </div>
              <button onClick={() => setYeniModal(false)} className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleOlustur} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Satış Seçin *</label>
                <select
                  value={seciliSatisId}
                  onChange={(e) => setSeciliSatisId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition"
                >
                  <option value="">Satış seçin...</option>
                  {satislar.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.musteriAdSoyad} — {s.urunAdi} ({s.satisFiyati?.toLocaleString('tr-TR')} ₺)
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1.5">Bir satış için yalnızca bir fatura kesilebilir.</p>
              </div>

              {hata && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{hata}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setYeniModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 font-medium transition-colors">
                  İptal
                </button>
                <button type="submit" disabled={kaydediliyor}
                  className="flex-1 py-2.5 px-4 rounded-xl text-white text-sm font-semibold shadow-md disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                  {kaydediliyor ? 'Oluşturuluyor...' : 'Fatura Kes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

function SatirBilgi({ label, value, vurgu }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={`font-medium ${vurgu ? 'text-emerald-600' : 'text-slate-800'}`}>{value || '—'}</span>
    </div>
  );
}
