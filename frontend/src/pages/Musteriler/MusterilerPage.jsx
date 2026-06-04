import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import Layout from '../../components/Layout';
import KonumSeciciHarita from '../../components/KonumSeciciHarita';
import { konumVarMi, konumuHaritadaAc } from '../../utils/harita';

export default function MusterilerPage() {
  const navigate = useNavigate();
  const [musteriler, setMusteriler] = useState([]);
  const [arama, setArama] = useState('');
  const [yukleniyor, setYukleniyor] = useState(true);
  const [sayfa, setSayfa] = useState(1);
  const [toplamSayfa, setToplamSayfa] = useState(1);
  const [toplamKayit, setToplamKayit] = useState(0);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ ad: '', soyad: '', telefon: '', adres: '', enlem: null, boylam: null });
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [kaydetHata, setKaydetHata] = useState('');

  useEffect(() => { veriCek(sayfa); }, [sayfa]);

  async function veriCek(s = 1) {
    setYukleniyor(true);
    try {
      const res = await api.get(`/musteriler?sayfa=${s}&boyut=20`);
      setMusteriler(res.data.veri ?? []);
      setToplamSayfa(res.data.toplamSayfa);
      setToplamKayit(res.data.toplamKayit);
    } catch (err) { console.error(err); }
    finally { setYukleniyor(false); }
  }

  function modalKapat() {
    setModal(false);
    setForm({ ad: '', soyad: '', telefon: '', adres: '', enlem: null, boylam: null });
    setKaydetHata('');
  }

  async function handleKaydet(e) {
    e.preventDefault();
    setKaydediliyor(true);
    setKaydetHata('');
    try {
      await api.post('/musteriler', form);
      modalKapat();
      setSayfa(1);
      veriCek(1);
    } catch (err) {
      setKaydetHata(err.response?.data?.hata || 'Müşteri kaydedilemedi.');
    } finally { setKaydediliyor(false); }
  }

  async function handleSil(id) {
    if (!confirm('Bu müşteriyi silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/musteriler/${id}`);
      veriCek(sayfa);
    } catch (err) {
      const mesaj = err.response?.data?.hata || 'Müşteri silinemedi.';
      alert(mesaj);
    }
  }

  const filtreli = arama.trim()
    ? musteriler.filter((m) =>
        m.ad.toLowerCase().includes(arama.toLowerCase()) ||
        m.soyad.toLowerCase().includes(arama.toLowerCase()) ||
        m.telefon.includes(arama)
      )
    : musteriler;

  const avatarColors = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500'];

  return (
    <Layout>
      <div className="p-6 space-y-4">
        {/* Üst bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex items-center gap-2.5 shadow-sm w-72">
              <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Ad, soyad veya telefon..."
                value={arama}
                onChange={(e) => setArama(e.target.value)}
                className="flex-1 bg-transparent focus:outline-none text-sm text-slate-700 placeholder:text-slate-400"
              />
            </div>
            <span className="text-sm text-slate-500 bg-white border border-slate-200 rounded-xl px-3 py-2.5 shadow-sm">
              <strong className="text-slate-700">{toplamKayit}</strong> müşteri
            </span>
          </div>
          <button
            onClick={() => setModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Yeni Müşteri
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
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Telefon</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Adres</th>
                  <th className="text-right px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Borç</th>
                  <th className="text-right px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tahsilat</th>
                  <th className="text-right px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Kalan Borç</th>
                  <th className="px-6 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtreli.map((m, i) => {
                  const bakiye = (m.toplamBorc || 0) - (m.toplamTahsilat || 0);
                  const avatarBg = avatarColors[i % avatarColors.length];
                  return (
                    <tr key={m.id} onClick={() => navigate(`/musteriler/${m.id}`)} className="hover:bg-slate-50/70 transition-colors group cursor-pointer">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 ${avatarBg} rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0`}>
                            {m.ad[0]}{m.soyad[0]}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">{m.ad} {m.soyad}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{m.telefon}</td>
                      <td className="px-6 py-4 max-w-xs">
                        {konumVarMi(m.enlem, m.boylam) ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); konumuHaritadaAc(m.enlem, m.boylam); }}
                            className="group/loc flex items-start gap-1.5 text-sm text-slate-600 hover:text-indigo-600 text-left transition-colors w-full"
                            title="Haritada göster"
                          >
                            <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
                            </svg>
                            <span className="truncate min-w-0 group-hover/loc:underline">{m.adres || 'Konum işaretli'}</span>
                          </button>
                        ) : (
                          <div className="flex items-start gap-1.5 text-sm text-slate-400">
                            <svg className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="truncate min-w-0">{m.adres || 'Konum yok'}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-semibold text-rose-600">₺{(m.toplamBorc || 0).toLocaleString('tr-TR')}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-semibold text-emerald-600">₺{(m.toplamTahsilat || 0).toLocaleString('tr-TR')}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${bakiye > 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                          {bakiye > 0 ? `₺${bakiye.toLocaleString('tr-TR')}` : 'Borçsuz'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSil(m.id); }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filtreli.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-6 py-16 text-center">
                      <svg className="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="text-slate-400 text-sm">Müşteri bulunamadı</p>
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
              Sayfa <strong className="text-slate-700">{sayfa}</strong> / {toplamSayfa}
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

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 text-white rounded-t-2xl shrink-0" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
              <div>
                <h3 className="text-base font-bold">Yeni Müşteri</h3>
                <p className="text-xs text-white/70 mt-0.5">Müşteri bilgilerini doldurun</p>
              </div>
              <button onClick={modalKapat} className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleKaydet} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Ad *</label>
                  <input type="text" required value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Soyad *</label>
                  <input type="text" required value={form.soyad} onChange={(e) => setForm({ ...form, soyad: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Telefon *</label>
                <input type="tel" required value={form.telefon} onChange={(e) => setForm({ ...form, telefon: e.target.value })}
                  placeholder="05xx xxx xx xx"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Adres ve Konum
                  <span className="font-normal text-slate-400 ml-1">— adresi yazın, sonra pini sürükleyip tam noktayı işaretleyin</span>
                </label>
                <KonumSeciciHarita
                  value={form.enlem != null && form.boylam != null ? { lat: form.enlem, lng: form.boylam } : null}
                  baslangicMetni={form.adres}
                  onAdresMetni={(metin) => setForm((f) => ({ ...f, adres: metin }))}
                  onChange={(lat, lng) => setForm((f) => ({ ...f, enlem: lat, boylam: lng }))}
                  yukseklik="300px"
                />
              </div>
              {kaydetHata && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{kaydetHata}</p>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={modalKapat}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 font-medium transition-colors">
                  İptal
                </button>
                <button type="submit" disabled={kaydediliyor}
                  className="flex-1 py-2.5 px-4 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-60 shadow-md"
                  style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                  {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
