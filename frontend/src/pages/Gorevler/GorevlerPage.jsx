import { useEffect, useState } from 'react';
import api from '../../api/axios';
import Layout from '../../components/Layout';

const oncelikConfig = {
  Yuksek: { label: 'Yüksek', cls: 'bg-rose-100 text-rose-700' },
  Orta: { label: 'Orta', cls: 'bg-orange-100 text-orange-700' },
  Dusuk: { label: 'Düşük', cls: 'bg-slate-100 text-slate-600' },
};

const durumConfig = {
  Bekliyor: { label: 'Bekliyor', cls: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  Devam: { label: 'Devam Ediyor', cls: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  Tamamlandi: { label: 'Tamamlandı', cls: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
};

export default function GorevlerPage() {
  const [gorevler, setGorevler] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [filtre, setFiltre] = useState('aktif');
  const [modal, setModal] = useState(false);
  const [musteriler, setMusteriler] = useState([]);
  const [personeller, setPersoneller] = useState([]);
  const [form, setForm] = useState({ gorevAdi: '', gorevDetayi: '', oncelik: 'Orta', atananId: '', musteriId: '', sonTeslimTarihi: '' });
  const [hata, setHata] = useState('');
  const [kaydediliyor, setKaydediliyor] = useState(false);

  useEffect(() => { veriCek(); }, []);

  async function veriCek() {
    try {
      const [gorevRes, musteriRes, personelRes] = await Promise.all([
        api.get('/gorevler'),
        api.get('/musteriler?sayfa=1&boyut=500'),
        api.get('/gorevler/personeller'),
      ]);
      setGorevler(gorevRes.data.veri ?? []);
      setMusteriler(musteriRes.data.veri ?? []);
      setPersoneller(personelRes.data.veri ?? []);
    } catch (err) { console.error(err); }
    finally { setYukleniyor(false); }
  }

  async function handleKaydet(e) {
    e.preventDefault();
    setHata('');
    setKaydediliyor(true);
    try {
      await api.post('/gorevler', {
        ...form,
        sonTeslimTarihi: form.sonTeslimTarihi ? form.sonTeslimTarihi + 'T00:00:00Z' : '',
      });
      setModal(false);
      setForm({ gorevAdi: '', gorevDetayi: '', oncelik: 'Orta', atananId: '', musteriId: '', sonTeslimTarihi: '' });
      veriCek();
    } catch (err) {
      console.error(err);
      const mesaj = err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join(', ')
        : err.response?.data?.hata || err.response?.data?.mesaj || 'Görev oluşturulamadı. Lütfen tekrar deneyin.';
      setHata(mesaj);
    } finally {
      setKaydediliyor(false);
    }
  }

  async function durumGuncelle(id, durum) {
    try {
      await api.put(`/gorevler/${id}/durum`, { durum });
      veriCek();
    } catch (err) { console.error(err); }
  }

  const filtrelenmis = gorevler.filter((g) => {
    if (filtre === 'aktif') return g.durum !== 'Tamamlandi';
    if (filtre === 'tamamlandi') return g.durum === 'Tamamlandi';
    return true;
  });

  const bekleyenSayisi = gorevler.filter((g) => g.durum === 'Bekliyor').length;
  const devamSayisi = gorevler.filter((g) => g.durum === 'Devam').length;
  const gecikmis = gorevler.filter((g) => g.gecikti).length;

  return (
    <Layout>
      <div className="p-6 space-y-4">
        {/* Özet */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Toplam', value: gorevler.length, gradient: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)' },
            { label: 'Bekliyor', value: bekleyenSayisi, gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' },
            { label: 'Devam Ediyor', value: devamSayisi, gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' },
            { label: 'Gecikmiş', value: gecikmis, gradient: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' },
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

        {/* Filtre + Yeni */}
        <div className="flex items-center justify-between">
          <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm gap-1">
            {[
              { key: 'aktif', label: 'Aktif Görevler' },
              { key: 'tamamlandi', label: 'Tamamlananlar' },
              { key: 'hepsi', label: 'Tümü' },
            ].map((f) => (
              <button key={f.key} onClick={() => setFiltre(f.key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filtre === f.key ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                style={filtre === f.key ? { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' } : {}}>
                {f.label}
              </button>
            ))}
          </div>
          <button onClick={() => setModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Yeni Görev
          </button>
        </div>

        {/* Liste */}
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
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Görev</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Müşteri</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Atanan</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Son Tarih</th>
                  <th className="text-center px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Öncelik</th>
                  <th className="text-center px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Durum</th>
                  <th className="px-6 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtrelenmis.map((g) => {
                  const oncelik = oncelikConfig[g.oncelik] ?? { label: g.oncelik, cls: 'bg-slate-100 text-slate-600' };
                  const durum = durumConfig[g.durum] ?? { label: g.durum, cls: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' };
                  return (
                    <tr key={g.id} className={`hover:bg-slate-50/70 transition-colors ${g.gecikti ? 'bg-rose-50/30' : ''}`}>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-800 text-sm">{g.gorevAdi}</p>
                        {g.gorevDetayi && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{g.gorevDetayi}</p>}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{g.musteriAdSoyad}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0">
                            {g.atananAdSoyad?.[0] ?? '?'}
                          </div>
                          <span className="text-sm text-slate-600">{g.atananAdSoyad}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-medium ${g.gecikti ? 'text-rose-600' : 'text-slate-600'}`}>
                          {g.gecikti && '⚠ '}
                          {new Date(g.sonTeslimTarihi).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${oncelik.cls}`}>
                          {oncelik.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${durum.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${durum.dot}`}></span>
                          {durum.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {g.durum !== 'Tamamlandi' && (
                          <div className="flex gap-1 justify-end">
                            {g.durum === 'Bekliyor' && (
                              <button onClick={() => durumGuncelle(g.id, 'Devam')}
                                className="px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                                Başla
                              </button>
                            )}
                            <button onClick={() => durumGuncelle(g.id, 'Tamamlandi')}
                              className="px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors">
                              Tamamla
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filtrelenmis.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-6 py-16 text-center">
                      <svg className="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p className="text-slate-400 text-sm">Bu filtrede görev yok</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Yeni Görev Modalı */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-5 text-white" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
              <div>
                <h3 className="text-base font-bold">Yeni Görev</h3>
                <p className="text-xs text-white/70 mt-0.5">Görev bilgilerini doldurun</p>
              </div>
              <button onClick={() => { setModal(false); setHata(''); }} className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleKaydet} className="p-6 space-y-4">
              {hata && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700">
                  {hata}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Görev Adı *</label>
                <input type="text" required value={form.gorevAdi} onChange={(e) => setForm({ ...form, gorevAdi: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Detay</label>
                <textarea rows={2} value={form.gorevDetayi} onChange={(e) => setForm({ ...form, gorevDetayi: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Öncelik</label>
                  <select value={form.oncelik} onChange={(e) => setForm({ ...form, oncelik: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition">
                    <option value="Yuksek">Yüksek</option>
                    <option value="Orta">Orta</option>
                    <option value="Dusuk">Düşük</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Son Tarih *</label>
                  <input type="date" required value={form.sonTeslimTarihi} onChange={(e) => setForm({ ...form, sonTeslimTarihi: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Atanan Personel *</label>
                <select required value={form.atananId} onChange={(e) => setForm({ ...form, atananId: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition">
                  <option value="">Personel seçin...</option>
                  {personeller.map((p) => (
                    <option key={p.id} value={p.id}>{p.adSoyad} ({p.rol})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Müşteri *</label>
                <select required value={form.musteriId} onChange={(e) => setForm({ ...form, musteriId: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition">
                  <option value="">Müşteri seçin...</option>
                  {musteriler.map((m) => (
                    <option key={m.id} value={m.id}>{m.ad} {m.soyad}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 font-medium transition-colors">İptal</button>
                <button type="submit" disabled={kaydediliyor}
                  className="flex-1 py-2.5 px-4 rounded-xl text-white text-sm font-semibold shadow-md disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                  {kaydediliyor ? 'Kaydediliyor...' : 'Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
