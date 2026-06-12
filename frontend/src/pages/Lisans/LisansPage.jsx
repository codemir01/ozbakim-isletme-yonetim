import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import api from '../../api/axios';

// Abonelik planları (ödeme iyzico test ortamı üzerinden — gerçek para çekilmez)
const PLANLAR = [
  { kod: 'aylik', ad: 'Aylık', gun: 30, fiyat: '₺499', alt: 'ayda', vurgu: false },
  { kod: 'uc_aylik', ad: '3 Aylık', gun: 90, fiyat: '₺1.299', alt: '3 ayda', vurgu: true, etiket: 'Popüler' },
  { kod: 'yillik', ad: 'Yıllık', gun: 365, fiyat: '₺4.990', alt: 'yılda', vurgu: false, etiket: '2 ay bedava' },
];

export default function LisansPage() {
  const [lisans, setLisans] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [seciliPlan, setSeciliPlan] = useState(null); // ödeme modalı için
  const [odeniyor, setOdeniyor] = useState(false);
  const [basari, setBasari] = useState('');
  const [hata, setHata] = useState('');
  // iyzico'nun RESMİ test kartı önceden dolu (gerçek kart değil, kimsenin parası değil).
  // Kaynak: https://docs.iyzico.com/ek-bilgiler/test-kartlari  (Halkbank test kartı)
  const [kart, setKart] = useState({
    kartSahibi: 'John Doe',
    kartNo: '5528 7900 0000 0008',
    skt: '12/30',
    cvc: '123',
  });

  function kartGuncelle(alan, deger) {
    setKart((k) => ({ ...k, [alan]: deger }));
  }

  function lisansYukle() {
    return api.get('/lisans').then(res => setLisans(res.data.veri)).catch(() => {});
  }

  useEffect(() => {
    lisansYukle().finally(() => setYukleniyor(false));
  }, []);

  async function odemeYap(e) {
    e.preventDefault();
    setHata('');
    setOdeniyor(true);
    try {
      // SKT "AA/YY" → ay "12", yıl "2030"
      const [ay, yy] = kart.skt.split('/').map((s) => s.trim());
      const payload = {
        plan: seciliPlan.kod,
        kart: {
          kartSahibi: kart.kartSahibi,
          kartNo: kart.kartNo.replace(/\s/g, ''),
          sonAy: ay,
          sonYil: yy?.length === 2 ? `20${yy}` : yy,
          cvc: kart.cvc,
        },
      };
      const res = await api.post('/lisans/satin-al', payload);
      setLisans(res.data.veri);
      setSeciliPlan(null);
      setBasari(res.data.mesaj || 'Ödeme alındı, aboneliğiniz uzatıldı.');
      setTimeout(() => setBasari(''), 5000);
    } catch (err) {
      setHata(err.response?.data?.hata || err.response?.data?.mesaj || 'Ödeme işlenemedi. Kart bilgilerini kontrol edin.');
    } finally {
      setOdeniyor(false);
    }
  }

  if (yukleniyor) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      </Layout>
    );
  }

  if (!lisans) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto mt-10 bg-rose-50 border border-rose-200 rounded-xl p-6 text-rose-700 text-center">
          Lisans bilgisi yüklenemedi.
        </div>
      </Layout>
    );
  }

  const toplamGun = Math.max(1, Math.round((new Date(lisans.bitisTarihi) - new Date(lisans.baslangicTarihi)) / 86400000));
  const kalanGun = Math.max(0, lisans.kalanGun);
  const gecenGun = toplamGun - kalanGun;
  const yuzde = Math.min(100, Math.round((gecenGun / toplamGun) * 100));
  const durumRenk = kalanGun <= 0 ? 'text-rose-600' : kalanGun <= 30 ? 'text-amber-600' : 'text-emerald-600';
  const barRenk = kalanGun <= 0 ? 'bg-rose-500' : kalanGun <= 30 ? 'bg-amber-500' : 'bg-indigo-600';

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">

        {basari && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-4 text-sm font-medium">
            ✅ {basari}
          </div>
        )}

        {/* Durum Kartı */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{lisans.isletmeAdi}</h2>
              <p className="text-sm text-slate-500 mt-0.5">{lisans.adminEposta}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
              lisans.aktif && kalanGun > 0
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {lisans.aktif && kalanGun > 0 ? 'Aktif' : 'Süresi Doldu'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-500 font-medium mb-1">Başlangıç Tarihi</p>
              <p className="text-sm font-bold text-slate-900">{new Date(lisans.baslangicTarihi).toLocaleDateString('tr-TR')}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-500 font-medium mb-1">Bitiş Tarihi</p>
              <p className="text-sm font-bold text-slate-900">{new Date(lisans.bitisTarihi).toLocaleDateString('tr-TR')}</p>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-slate-700">Lisans Kullanımı</span>
              <span className={`text-sm font-bold ${durumRenk}`}>
                {kalanGun <= 0 ? 'Süresi doldu' : `${kalanGun} gün kaldı`}
              </span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${barRenk}`} style={{ width: `${yuzde}%` }}></div>
            </div>
            <p className="text-xs text-slate-400 mt-1.5 text-right">{gecenGun} / {toplamGun} gün geçti</p>
          </div>
        </div>

        {/* Plan Seçimi */}
        <div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Aboneliğini Uzat</h3>
          <p className="text-sm text-slate-500 mb-4">Bir plan seç; kalan günlerin kaybolmadan üzerine eklenir.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PLANLAR.map((p) => (
              <div key={p.kod} className={`relative bg-white rounded-2xl border p-5 flex flex-col ${p.vurgu ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-slate-200'}`}>
                {p.etiket && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">{p.etiket}</span>
                )}
                <p className="font-bold text-slate-800">{p.ad}</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-2">{p.fiyat}</p>
                <p className="text-xs text-slate-400">{p.alt} · {p.gun} gün</p>
                <button
                  onClick={() => setSeciliPlan(p)}
                  className={`mt-4 w-full py-2 rounded-lg text-sm font-bold transition-colors ${p.vurgu ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'}`}
                >
                  Satın Al
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Simüle Ödeme Modalı */}
      {seciliPlan && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => { if (!odeniyor) { setSeciliPlan(null); setHata(''); } }}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900">Ödeme — {seciliPlan.ad} Plan</h3>
            <p className="text-sm text-slate-500 mt-1">{seciliPlan.fiyat} · {seciliPlan.gun} gün eklenecek</p>

            <form onSubmit={odemeYap} className="mt-5 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">Kart Üzerindeki İsim</label>
                <input value={kart.kartSahibi} onChange={(e) => kartGuncelle('kartSahibi', e.target.value)} required
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Kart Numarası</label>
                <input value={kart.kartNo} onChange={(e) => kartGuncelle('kartNo', e.target.value)} required
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">SKT (AA/YY)</label>
                  <input value={kart.skt} onChange={(e) => kartGuncelle('skt', e.target.value)} required placeholder="12/30"
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">CVV</label>
                  <input value={kart.cvc} onChange={(e) => kartGuncelle('cvc', e.target.value)} required
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              {hata && (
                <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5 font-medium">
                  ⚠️ {hata}
                </p>
              )}

              <p className="text-[11px] text-slate-500 bg-slate-50 rounded-lg p-2.5">
                🔒 Ödeme <b>iyzico</b> altyapısı (test ortamı) üzerinden alınır. Form, iyzico'nun
                resmi <b>test kartıyla</b> dolu — gerçek para çekilmez.
              </p>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => { setSeciliPlan(null); setHata(''); }} disabled={odeniyor}
                  className="flex-1 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold">İptal</button>
                <button type="submit" disabled={odeniyor}
                  className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold disabled:opacity-60">
                  {odeniyor ? 'İşleniyor...' : `${seciliPlan.fiyat} Öde`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
