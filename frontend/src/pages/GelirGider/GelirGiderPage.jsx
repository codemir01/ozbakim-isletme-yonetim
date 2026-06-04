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
    </Layout>
  );
}
