import { useEffect, useState } from 'react';
import api from '../../api/axios';
import Layout from '../../components/Layout';
import { yolTarifiAc, konumVarMi } from '../../utils/harita';

const durumBilgi = (gunKaldi, gecmis) => {
  if (gecmis) return { label: 'Gecikmiş', cls: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' };
  if (gunKaldi <= 3) return { label: `${gunKaldi} gün kaldı`, cls: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' };
  if (gunKaldi <= 7) return { label: `${gunKaldi} gün kaldı`, cls: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' };
  return { label: `${gunKaldi} gün kaldı`, cls: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' };
};

export default function BakimPage() {
  const [bakimlar, setBakimlar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [filtre, setFiltre] = useState('hepsi'); // hepsi | yaklasan | gecmis
  const [detayModal, setDetayModal] = useState(null); // { bakim, detay }
  const [gecmisModal, setGecmisModal] = useState(null); // bakım id
  const [gecmisForm, setGecmisForm] = useState({ aciklama: '', yapilmaTarihi: new Date().toISOString().split('T')[0], yeniBakimAraligiGun: 180 });
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [gecmisHata, setGecmisHata] = useState('');
  const [riskSonuc, setRiskSonuc] = useState(null); // { risk, olasilik }
  const [riskYukleniyor, setRiskYukleniyor] = useState(false);
  const [musteriler, setMusteriler] = useState([]);
  const [yeniModal, setYeniModal] = useState(false);
  const [yeniForm, setYeniForm] = useState({ musteriId: '', kartTipi: 'Bakim', sonBakimTarihi: new Date().toISOString().split('T')[0], bakimAraligiGun: 180, notlar: '' });
  const [yeniHata, setYeniHata] = useState('');

  useEffect(() => { veriCek(); }, []);

  async function veriCek() {
    try {
      const [bakimRes, musteriRes] = await Promise.all([
        api.get('/bakim'),
        // boyut=500 ile tüm aktif müşterileri tek seferde çek — dropdown için
        api.get('/musteriler?sayfa=1&boyut=500'),
      ]);
      setBakimlar(bakimRes.data.veri);
      setMusteriler(musteriRes.data.veri ?? []);
    } catch (err) { console.error(err); }
    finally { setYukleniyor(false); }
  }

  async function detayAc(id) {
    setRiskSonuc(null); // Yeni modal açılınca önceki sonucu temizle
    try {
      const res = await api.get(`/bakim/${id}`);
      setDetayModal(res.data.veri);
    } catch (err) { console.error(err); }
  }

  async function riskTahminiAl(id) {
    setRiskYukleniyor(true);
    setRiskSonuc(null);
    try {
      const res = await api.get(`/bakim/${id}/risk-tahmini`);
      setRiskSonuc(res.data.veri);
    } catch {
      setRiskSonuc({ risk: 'Hata', olasilik: 0 });
    } finally {
      setRiskYukleniyor(false);
    }
  }

  const riskRenk = {
    'Düşük': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Orta': 'bg-amber-100 text-amber-700 border-amber-200',
    'Yüksek': 'bg-rose-100 text-rose-700 border-rose-200',
    'Hata': 'bg-slate-100 text-slate-500 border-slate-200',
  };

  async function gecmisKaydet(e) {
    e.preventDefault();
    setKaydediliyor(true);
    setGecmisHata('');
    try {
      await api.post(`/bakim/${gecmisModal}/gecmis`, {
        aciklama: gecmisForm.aciklama,
        yapilmaTarihi: new Date(gecmisForm.yapilmaTarihi).toISOString(),
        yeniBakimAraligiGun: Number(gecmisForm.yeniBakimAraligiGun),
      });
      setGecmisModal(null);
      setGecmisForm({ aciklama: '', yapilmaTarihi: new Date().toISOString().split('T')[0], yeniBakimAraligiGun: 180 });
      setDetayModal(null);
      veriCek();
    } catch (err) {
      setGecmisHata(err.response?.data?.hata || 'Bakım geçmişi kaydedilemedi.');
    }
    finally { setKaydediliyor(false); }
  }

  async function yeniKaydet(e) {
    e.preventDefault();
    setYeniHata('');
    try {
      await api.post('/bakim', {
        musteriId: yeniForm.musteriId,
        kartTipi: yeniForm.kartTipi,
        sonBakimTarihi: new Date(yeniForm.sonBakimTarihi).toISOString(),
        bakimAraligiGun: Number(yeniForm.bakimAraligiGun),
        notlar: yeniForm.notlar,
      });
      setYeniModal(false);
      setYeniForm({ musteriId: '', kartTipi: 'Bakim', sonBakimTarihi: new Date().toISOString().split('T')[0], bakimAraligiGun: 180, notlar: '' });
      veriCek();
    } catch (err) {
      setYeniHata(err.response?.data?.hata || 'Bakım kartı oluşturulamadı.');
    }
  }

  const filtrelenmis = bakimlar.filter((b) => {
    if (filtre === 'yaklasan') return !b.gecmis && b.gunKaldi <= 7;
    if (filtre === 'gecmis') return b.gecmis;
    return true;
  });

  const yaklasanSayisi = bakimlar.filter((b) => !b.gecmis && b.gunKaldi <= 7).length;
  const gecmisSayisi = bakimlar.filter((b) => b.gecmis).length;

  return (
    <Layout>
      <div className="p-6 space-y-4">
        {/* Özet bantlar */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Toplam Kart', value: bakimlar.length, gradient: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)' },
            { label: '7 Gün İçinde', value: yaklasanSayisi, gradient: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)' },
            { label: 'Gecikmiş', value: gecmisSayisi, gradient: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' },
          ].map((k) => (
            <div
              key={k.label}
              className="relative overflow-hidden rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
              style={{ background: k.gradient }}
            >
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full pointer-events-none" />
              <div className="relative flex items-center gap-4">
                <p className="text-3xl font-bold text-white tabular-nums">{k.value}</p>
                <p className="text-sm text-white/75 font-medium">{k.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filtre + Yeni buton */}
        <div className="flex items-center justify-between">
          <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm gap-1">
            {[
              { key: 'hepsi', label: 'Tümü' },
              { key: 'yaklasan', label: '7 Gün İçinde' },
              { key: 'gecmis', label: 'Gecikmiş' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFiltre(f.key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filtre === f.key ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                style={filtre === f.key ? { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' } : {}}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setYeniModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Yeni Bakım Kartı
          </button>
        </div>

        {/* Kart listesi */}
        {yukleniyor ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin w-7 h-7 text-indigo-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtrelenmis.map((b) => {
              const durum = durumBilgi(b.gunKaldi, b.gecmis);
              return (
                <div key={b.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition-shadow">
                  {/* Üst satır */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${b.kartTipi === 'Bakim' ? 'bg-blue-50' : 'bg-violet-50'}`}>
                        <svg className={`w-4 h-4 ${b.kartTipi === 'Bakim' ? 'text-blue-500' : 'text-violet-500'}`} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                          {b.kartTipi === 'Bakim'
                            ? <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            : <path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                          }
                        </svg>
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{b.musteriAdSoyad}</p>
                        <p className="text-xs text-slate-400">{b.musteriTelefon}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${durum.cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${durum.dot}`}></span>
                      {durum.label}
                    </span>
                  </div>

                  {/* Tip badge */}
                  <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium mb-3 ${b.kartTipi === 'Bakim' ? 'bg-blue-50 text-blue-600' : 'bg-violet-50 text-violet-600'}`}>
                    {b.kartTipi === 'Bakim' ? 'Periyodik Bakım' : 'Servis'}
                  </span>

                  {/* Notlar */}
                  {b.notlar && <p className="text-xs text-slate-500 mb-2 line-clamp-2">{b.notlar}</p>}

                  {/* Adres */}
                  {b.musteriAdres && (
                    <div className="flex items-start gap-1.5 text-xs text-slate-500 mb-3">
                      <svg className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="line-clamp-2">{b.musteriAdres}</span>
                    </div>
                  )}

                  {/* Tarih bilgisi */}
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-3 pt-3 border-t border-slate-50">
                    <span>Son bakım: <strong className="text-slate-600">{new Date(b.sonBakimTarihi).toLocaleDateString('tr-TR')}</strong></span>
                    <span>Planlanan: <strong className="text-slate-600">{new Date(b.bakimYapilacakTarih).toLocaleDateString('tr-TR')}</strong></span>
                  </div>

                  {/* Konuma Git — teknisyen navigasyonu */}
                  {(konumVarMi(b.musteriEnlem, b.musteriBoylam) || b.musteriAdres) && (
                    <button
                      onClick={() => yolTarifiAc(b.musteriEnlem, b.musteriBoylam, b.musteriAdres)}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 mb-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors"
                      title={konumVarMi(b.musteriEnlem, b.musteriBoylam) ? 'Haritada konuma yol tarifi' : 'Adrese göre yol tarifi'}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                      Konuma Git {!konumVarMi(b.musteriEnlem, b.musteriBoylam) && '(adres)'}
                    </button>
                  )}

                  {/* Butonlar */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => detayAc(b.id)}
                      className="flex-1 py-2 px-3 text-xs font-medium border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      Geçmiş
                    </button>
                    <button
                      onClick={() => setGecmisModal(b.id)}
                      className="flex-1 py-2 px-3 text-xs font-medium text-white rounded-xl transition-colors"
                      style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
                    >
                      Bakım Yapıldı
                    </button>
                  </div>
                </div>
              );
            })}
            {filtrelenmis.length === 0 && (
              <div className="col-span-3 py-16 text-center">
                <svg className="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-slate-400 text-sm">Bu filtrede kayıt yok</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Geçmiş Ekleme Modalı */}
      {gecmisModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-5 text-white" style={{ background: 'linear-gradient(135deg, #10b981, #047857)' }}>
              <div>
                <h3 className="text-base font-bold">Bakım Yapıldı</h3>
                <p className="text-xs text-white/70 mt-0.5">Yapılan bakımı kayıt altına alın</p>
              </div>
              <button onClick={() => setGecmisModal(null)} className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={gecmisKaydet} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Bakım Yapılma Tarihi</label>
                <input type="date" value={gecmisForm.yapilmaTarihi} onChange={(e) => setGecmisForm({ ...gecmisForm, yapilmaTarihi: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Sonraki Bakım Aralığı (Gün)</label>
                <input type="number" min="1" value={gecmisForm.yeniBakimAraligiGun} onChange={(e) => setGecmisForm({ ...gecmisForm, yeniBakimAraligiGun: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Yapılan İşlemler *</label>
                <textarea required rows={3} value={gecmisForm.aciklama} onChange={(e) => setGecmisForm({ ...gecmisForm, aciklama: e.target.value })}
                  placeholder="Yapılan bakım ve değiştirilen parçalar..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition resize-none" />
              </div>
              {gecmisHata && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{gecmisHata}</p>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setGecmisModal(null); setGecmisHata(''); }}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 font-medium transition-colors">İptal</button>
                <button type="submit" disabled={kaydediliyor}
                  className="flex-1 py-2.5 px-4 rounded-xl text-white text-sm font-semibold disabled:opacity-60 shadow-md"
                  style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                  {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detay (geçmiş listesi) Modalı */}
      {detayModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-5 shrink-0 text-white" style={{ background: 'linear-gradient(135deg, #6366f1, #4338ca)' }}>
              <div>
                <h3 className="text-base font-bold">{detayModal.musteriAdSoyad} — Bakım Geçmişi</h3>
                <p className="text-xs text-white/70 mt-0.5">{detayModal.kartTipi === 'Bakim' ? 'Periyodik Bakım' : 'Servis'} Kartı</p>
              </div>
              <button onClick={() => setDetayModal(null)} className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {/* Risk Tahmini Bölümü */}
            <div className="px-6 pt-4 pb-0 border-b border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-slate-700">Arıza Risk Tahmini (AI)</p>
                <button
                  onClick={() => riskTahminiAl(detayModal.id)}
                  disabled={riskYukleniyor}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  {riskYukleniyor ? (
                    <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  )}
                  {riskYukleniyor ? 'Tahmin yapılıyor...' : 'Risk Tahmini Al'}
                </button>
              </div>

              {riskSonuc && riskSonuc.risk !== 'Hata' && (
                <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold mb-4 ${riskRenk[riskSonuc.risk] ?? riskRenk['Hata']}`}>
                  <span>Risk: {riskSonuc.risk}</span>
                  <span className="text-xs font-normal opacity-75">— Olasılık: %{Math.round(riskSonuc.olasilik * 100)}</span>
                </div>
              )}
              {riskSonuc?.risk === 'Hata' && (
                <p className="text-xs text-rose-500 mb-4">AI servisine ulaşılamadı. Python servisinin çalıştığından emin olun.</p>
              )}
            </div>

            <div className="flex-1 overflow-auto p-6">
              {detayModal.gecmisler.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <p className="text-sm">Henüz bakım geçmişi yok</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {detayModal.gecmisler.map((g) => (
                    <div key={g.id} className="flex gap-3 p-4 bg-slate-50 rounded-xl">
                      <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-semibold text-slate-700">{g.personelAdSoyad}</p>
                          <p className="text-xs text-slate-400">{new Date(g.yapilmaTarihi).toLocaleDateString('tr-TR')}</p>
                        </div>
                        <p className="text-xs text-slate-600">{g.aciklama}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Yeni Bakım Kartı Modalı */}
      {yeniModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-5 text-white" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
              <div>
                <h3 className="text-base font-bold">Yeni Bakım Kartı</h3>
                <p className="text-xs text-white/70 mt-0.5">Manuel bakım kartı oluşturun</p>
              </div>
              <button onClick={() => setYeniModal(false)} className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={yeniKaydet} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Müşteri *</label>
                <select required value={yeniForm.musteriId} onChange={(e) => setYeniForm({ ...yeniForm, musteriId: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition">
                  <option value="">Müşteri seçin...</option>
                  {musteriler.map((m) => (
                    <option key={m.id} value={m.id}>{m.ad} {m.soyad} — {m.telefon}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Kart Tipi</label>
                  <select value={yeniForm.kartTipi} onChange={(e) => setYeniForm({ ...yeniForm, kartTipi: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition">
                    <option value="Bakim">Bakım</option>
                    <option value="Servis">Servis</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Bakım Aralığı (Gün)</label>
                  <input type="number" min="1" value={yeniForm.bakimAraligiGun} onChange={(e) => setYeniForm({ ...yeniForm, bakimAraligiGun: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Son Bakım / Kurulum Tarihi</label>
                <input type="date" value={yeniForm.sonBakimTarihi} onChange={(e) => setYeniForm({ ...yeniForm, sonBakimTarihi: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Notlar</label>
                <input type="text" value={yeniForm.notlar} onChange={(e) => setYeniForm({ ...yeniForm, notlar: e.target.value })}
                  placeholder="Cihaz türü, model vb."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition" />
              </div>
              {yeniHata && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{yeniHata}</p>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setYeniModal(false); setYeniHata(''); }}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 font-medium transition-colors">İptal</button>
                <button type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl text-white text-sm font-semibold shadow-md"
                  style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>Oluştur</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
