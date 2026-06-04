import { useEffect, useState } from 'react';
import api from '../../api/axios';
import Layout from '../../components/Layout';

const rolConfig = {
  Admin: { label: 'Admin', cls: 'bg-purple-100 text-purple-700' },
  SalesConsultant: { label: 'Satış Danışmanı', cls: 'bg-blue-100 text-blue-700' },
  Technician: { label: 'Teknisyen', cls: 'bg-orange-100 text-orange-700' },
  Worker: { label: 'Çalışan', cls: 'bg-slate-100 text-slate-600' },
};

const rolSecenekleri = [
  { value: 'Admin', label: 'Admin' },
  { value: 'SalesConsultant', label: 'Satış Danışmanı' },
  { value: 'Technician', label: 'Teknisyen' },
  { value: 'Worker', label: 'Çalışan' },
];

// rol: backend'de string enum (Admin, SalesConsultant, Technician, Worker) — 1 değil
const bosForm = { ad: '', soyad: '', eposta: '', telefon: '', unvan: '', sifre: '', rol: 'Technician' };

export default function KullanicilarPage() {
  const [kullanicilar, setKullanicilar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [filtre, setFiltre] = useState('aktif');
  const [yeniModal, setYeniModal] = useState(false);
  const [duzenleModal, setDuzenleModal] = useState(null);
  const [form, setForm] = useState(bosForm);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [hata, setHata] = useState('');

  useEffect(() => { veriCek(); }, []);

  async function veriCek() {
    try {
      const res = await api.get('/kullanicilar');
      setKullanicilar(res.data.veri ?? []);
    } catch (err) { console.error(err); }
    finally { setYukleniyor(false); }
  }

  function duzenleAc(k) {
    setForm({
      ad: k.ad,
      soyad: k.soyad,
      eposta: k.eposta,
      telefon: k.telefon,
      unvan: k.unvan,
      sifre: '',
      rol: k.rol,
      aktifMi: k.aktifMi,
    });
    setDuzenleModal(k);
    setHata('');
  }

  async function handleYeniKaydet(e) {
    e.preventDefault();
    setKaydediliyor(true);
    setHata('');
    try {
      const res = await api.post('/kullanicilar', {
        ad: form.ad,
        soyad: form.soyad,
        eposta: form.eposta,
        telefon: form.telefon,
        unvan: form.unvan,
        sifre: form.sifre,
        rol: form.rol,
      });
      if (res.data.basarili) {
        setYeniModal(false);
        setForm(bosForm);
        veriCek();
      } else {
        setHata(res.data.hata || 'Bir hata oluştu.');
      }
    } catch (err) {
      setHata(err.response?.data?.hata || 'Sunucu hatası.');
    } finally { setKaydediliyor(false); }
  }

  async function handleGuncelle(e) {
    e.preventDefault();
    setKaydediliyor(true);
    setHata('');
    try {
      const res = await api.put(`/kullanicilar/${duzenleModal.id}`, {
        ad: form.ad,
        soyad: form.soyad,
        eposta: form.eposta,
        telefon: form.telefon,
        unvan: form.unvan,
        rol: form.rol,
        aktifMi: form.aktifMi,
      });
      if (res.data.basarili) {
        setDuzenleModal(null);
        veriCek();
      } else {
        setHata(res.data.hata || 'Bir hata oluştu.');
      }
    } catch (err) {
      setHata(err.response?.data?.hata || 'Sunucu hatası.');
    } finally { setKaydediliyor(false); }
  }

  async function handleSil(id) {
    if (!window.confirm('Bu kullanıcıyı pasife almak istediğinizden emin misiniz?')) return;
    try {
      await api.delete(`/kullanicilar/${id}`);
      veriCek();
    } catch (err) { console.error(err); }
  }

  const filtrelenmis = kullanicilar.filter((k) => {
    if (filtre === 'aktif') return k.aktifMi;
    if (filtre === 'pasif') return !k.aktifMi;
    return true;
  });

  const aktifSayisi = kullanicilar.filter((k) => k.aktifMi).length;
  const pasifSayisi = kullanicilar.filter((k) => !k.aktifMi).length;

  return (
    <Layout>
      <div className="p-6 space-y-4">

        {/* Özet Kartlar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Toplam', value: kullanicilar.length, gradient: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)' },
            { label: 'Aktif', value: aktifSayisi, gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
            { label: 'Pasif', value: pasifSayisi, gradient: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)' },
            {
              label: 'Roller',
              value: [...new Set(kullanicilar.map((k) => k.rol))].length,
              gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            },
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
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm gap-1">
            {[
              { key: 'aktif', label: 'Aktif' },
              { key: 'pasif', label: 'Pasif' },
              { key: 'hepsi', label: 'Tümü' },
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
          <button
            onClick={() => { setYeniModal(true); setForm(bosForm); setHata(''); }}
            className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Yeni Kullanıcı
          </button>
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
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Kullanıcı</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">İletişim</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Unvan</th>
                  <th className="text-center px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Rol</th>
                  <th className="text-center px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Durum</th>
                  <th className="px-6 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtrelenmis.map((k) => {
                  const rol = rolConfig[k.rol] ?? { label: k.rol, cls: 'bg-slate-100 text-slate-600' };
                  return (
                    <tr key={k.id} className={`hover:bg-slate-50/70 transition-colors ${!k.aktifMi ? 'opacity-50' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                            {k.ad[0]}{k.soyad[0]}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">{k.ad} {k.soyad}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{k.eposta}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{k.telefon}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{k.unvan || '—'}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${rol.cls}`}>
                          {rol.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {k.aktifMi ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>Pasif
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => duzenleAc(k)}
                            className="px-2.5 py-1 text-xs font-medium bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                          >
                            Düzenle
                          </button>
                          {k.aktifMi && (
                            <button
                              onClick={() => handleSil(k.id)}
                              className="px-2.5 py-1 text-xs font-medium bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors"
                            >
                              Pasife Al
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtrelenmis.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-16 text-center">
                      <svg className="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="text-slate-400 text-sm">Kullanıcı bulunamadı</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Yeni Kullanıcı Modalı */}
      {yeniModal && (
        <Modal
          baslik="Yeni Kullanıcı"
          altBaslik="Kullanıcı bilgilerini doldurun"
          onKapat={() => setYeniModal(false)}
          onSubmit={handleYeniKaydet}
          kaydediliyor={kaydediliyor}
          hata={hata}
        >
          <FormAlanlari form={form} setForm={setForm} sifreGorunur />
        </Modal>
      )}

      {/* Düzenle Modalı */}
      {duzenleModal && (
        <Modal
          baslik="Kullanıcıyı Düzenle"
          altBaslik={`${duzenleModal.ad} ${duzenleModal.soyad}`}
          onKapat={() => setDuzenleModal(null)}
          onSubmit={handleGuncelle}
          kaydediliyor={kaydediliyor}
          hata={hata}
        >
          <FormAlanlari form={form} setForm={setForm} duzenlemeModu />
        </Modal>
      )}
    </Layout>
  );
}

function FormAlanlari({ form, setForm, sifreGorunur, duzenlemeModu }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Ad *</label>
          <input
            type="text" required value={form.ad}
            onChange={(e) => setForm({ ...form, ad: e.target.value })}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Soyad *</label>
          <input
            type="text" required value={form.soyad}
            onChange={(e) => setForm({ ...form, soyad: e.target.value })}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">E-posta *</label>
        <input
          type="email" required value={form.eposta}
          onChange={(e) => setForm({ ...form, eposta: e.target.value })}
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Telefon</label>
          <input
            type="text" value={form.telefon}
            onChange={(e) => setForm({ ...form, telefon: e.target.value })}
            placeholder="05xx xxx xx xx"
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Unvan</label>
          <input
            type="text" value={form.unvan}
            onChange={(e) => setForm({ ...form, unvan: e.target.value })}
            placeholder="Saha Teknisyeni"
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Rol *</label>
        <select
          value={form.rol}
          onChange={(e) => setForm({ ...form, rol: e.target.value })}
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition"
        >
          {rolSecenekleri.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      {sifreGorunur && (
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Şifre *</label>
          <input
            type="password" required value={form.sifre}
            onChange={(e) => setForm({ ...form, sifre: e.target.value })}
            placeholder="En az 6 karakter"
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition"
          />
        </div>
      )}

      {duzenlemeModu && (
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Durum</label>
          <div className="flex gap-3">
            {[{ v: true, l: 'Aktif' }, { v: false, l: 'Pasif' }].map((s) => (
              <button
                key={String(s.v)} type="button"
                onClick={() => setForm({ ...form, aktifMi: s.v })}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                  form.aktifMi === s.v
                    ? s.v
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                      : 'bg-slate-100 border-slate-400 text-slate-600'
                    : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'
                }`}
              >
                {s.l}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function Modal({ baslik, altBaslik, onKapat, onSubmit, kaydediliyor, hata, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-5 text-white" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
          <div>
            <h3 className="text-base font-bold">{baslik}</h3>
            <p className="text-xs text-white/70 mt-0.5">{altBaslik}</p>
          </div>
          <button onClick={onKapat} className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          {children}
          {hata && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{hata}</p>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onKapat}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 font-medium transition-colors">
              İptal
            </button>
            <button type="submit" disabled={kaydediliyor}
              className="flex-1 py-2.5 px-4 rounded-xl text-white text-sm font-semibold shadow-md disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
              {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
