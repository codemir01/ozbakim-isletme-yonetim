import { useEffect, useState } from 'react';
import api from '../../api/axios';
import Layout from '../../components/Layout';

export default function UrunlerPage() {
  const [urunler, setUrunler] = useState([]);
  const [arama, setArama] = useState('');
  const [yukleniyor, setYukleniyor] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ urunAdi: '', kategori: 'Cihaz', stokKodu: '', stokAdedi: 0, alisFiyati: 0 });
  const [duzenlemeModal, setDuzenlemeModal] = useState(false);
  const [duzenlemeForm, setDuzenlemeForm] = useState(null);
  const [silOnayId, setSilOnayId] = useState(null);

  useEffect(() => { veriCek(); }, []);

  async function veriCek() {
    try {
      const res = await api.get('/urunler');
      setUrunler(res.data.veri ?? []);
    } catch (err) { console.error(err); }
    finally { setYukleniyor(false); }
  }

  async function handleKaydet(e) {
    e.preventDefault();
    try {
      await api.post('/urunler', { ...form, stokAdedi: Number(form.stokAdedi), alisFiyati: Number(form.alisFiyati) });
      setModal(false);
      setForm({ urunAdi: '', kategori: 'Cihaz', stokKodu: '', stokAdedi: 0, alisFiyati: 0 });
      veriCek();
    } catch (err) { console.error(err); }
  }

  function duzenlemeAc(u) {
    setDuzenlemeForm({ id: u.id, urunAdi: u.urunAdi, kategori: u.kategori, stokKodu: u.stokKodu, stokAdedi: u.stokAdedi, alisFiyati: u.alisFiyati, durum: u.durum });
    setDuzenlemeModal(true);
  }

  async function handleGuncelle(e) {
    e.preventDefault();
    try {
      await api.put(`/urunler/${duzenlemeForm.id}`, {
        urunAdi: duzenlemeForm.urunAdi,
        kategori: duzenlemeForm.kategori,
        stokKodu: duzenlemeForm.stokKodu,
        stokAdedi: Number(duzenlemeForm.stokAdedi),
        alisFiyati: Number(duzenlemeForm.alisFiyati),
        durum: duzenlemeForm.durum,
      });
      setDuzenlemeModal(false);
      setDuzenlemeForm(null);
      veriCek();
    } catch (err) { console.error(err); }
  }

  async function handleSil(id) {
    try {
      await api.delete(`/urunler/${id}`);
      setSilOnayId(null);
      veriCek();
    } catch (err) { console.error(err); }
  }

  const filtreli = urunler.filter((u) =>
    u.urunAdi.toLowerCase().includes(arama.toLowerCase()) ||
    u.stokKodu.toLowerCase().includes(arama.toLowerCase())
  );

  const dusukStok = urunler.filter((u) => u.stokAdedi < 5).length;

  return (
    <Layout>
      <div className="p-6 space-y-6">

        {/* 1. Özet Kartları */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Toplam Ürün Çeşidi</p>
            <p className="text-2xl font-bold text-slate-800">{urunler.length}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Cihaz Modelleri</p>
            <p className="text-2xl font-bold text-slate-800">{urunler.filter(u => u.kategori === 'Cihaz').length}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-violet-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Yedek Parça Modelleri</p>
            <p className="text-2xl font-bold text-slate-800">{urunler.filter(u => u.kategori === 'YedekParca').length}</p>
          </div>
          <div className="px-5 py-6 rounded-2xl shadow-sm flex flex-col justify-center relative overflow-hidden group bg-rose-50 border border-rose-100">
            <div className="absolute top-0 right-0 w-16 h-16 bg-white/40 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
            <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider mb-1">Kritik Stok Uyarısı</p>
            <div className="flex items-end gap-2">
                <p className="text-3xl font-extrabold text-rose-700 leading-none">{dusukStok}</p>
                <p className="text-sm font-medium text-rose-500 mb-0.5">ürün bitmek üzere!</p>
            </div>
          </div>
        </div>

        {/* 2. Üst bar (Arama & Buton) */}
        <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-2.5 shadow-sm w-full sm:w-96 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
            <svg className="w-5 h-5 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Ürün adı, stok kodu veya kategori ara..."
              value={arama}
              onChange={(e) => setArama(e.target.value)}
              className="flex-1 bg-transparent focus:outline-none text-sm text-slate-700 placeholder:text-slate-400"
            />
          </div>
          <button
            onClick={() => setModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Yeni Ürün
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
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ürün</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Kategori</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Stok Kodu</th>
                  <th className="text-right px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Stok</th>
                  <th className="text-right px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Alış Fiyatı</th>
                  <th className="text-center px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Durum</th>
                  <th className="px-6 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtreli.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${u.kategori === 'Cihaz' ? 'bg-blue-50' : 'bg-violet-50'}`}>
                          <svg className={`w-4 h-4 ${u.kategori === 'Cihaz' ? 'text-blue-500' : 'text-violet-500'}`} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                            {u.kategori === 'Cihaz'
                              ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                              : <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            }
                          </svg>
                        </div>
                        <p className="font-semibold text-slate-800 text-sm">{u.urunAdi}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${u.kategori === 'Cihaz' ? 'bg-blue-50 text-blue-700' : 'bg-violet-50 text-violet-700'}`}>
                        {u.kategori === 'Cihaz' ? 'Cihaz' : 'Yedek Parça'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">{u.stokKodu}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${u.stokAdedi < 5 ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-700'}`}>
                        {u.stokAdedi < 5 && (
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        )}
                        {u.stokAdedi}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-slate-800">
                      ₺{u.alisFiyati.toLocaleString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${u.durum === 'Aktif' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.durum === 'Aktif' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                        {u.durum}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => duzenlemeAc(u)}
                          className="px-2.5 py-1 text-xs font-medium bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors">
                          Düzenle
                        </button>
                        <button onClick={() => setSilOnayId(u.id)}
                          className="px-2.5 py-1 text-xs font-medium bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors">
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtreli.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-6 py-16 text-center">
                      <svg className="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      <p className="text-slate-400 text-sm">Ürün bulunamadı</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Düzenleme Modalı */}
      {duzenlemeModal && duzenlemeForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-5 text-white" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
              <div>
                <h3 className="text-base font-bold">Ürün Düzenle</h3>
                <p className="text-xs text-white/70 mt-0.5">Bilgileri güncelleyin</p>
              </div>
              <button onClick={() => setDuzenlemeModal(false)} className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleGuncelle} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Ürün Adı *</label>
                <input type="text" required value={duzenlemeForm.urunAdi} onChange={(e) => setDuzenlemeForm({ ...duzenlemeForm, urunAdi: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Kategori</label>
                  <select value={duzenlemeForm.kategori} onChange={(e) => setDuzenlemeForm({ ...duzenlemeForm, kategori: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition">
                    <option value="Cihaz">Cihaz</option>
                    <option value="YedekParca">Yedek Parça</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Stok Kodu *</label>
                  <input type="text" required value={duzenlemeForm.stokKodu} onChange={(e) => setDuzenlemeForm({ ...duzenlemeForm, stokKodu: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Stok Adedi</label>
                  <input type="number" min="0" value={duzenlemeForm.stokAdedi} onChange={(e) => setDuzenlemeForm({ ...duzenlemeForm, stokAdedi: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Alış Fiyatı (₺)</label>
                  <input type="number" min="0" step="0.01" value={duzenlemeForm.alisFiyati} onChange={(e) => setDuzenlemeForm({ ...duzenlemeForm, alisFiyati: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Durum</label>
                <select value={duzenlemeForm.durum} onChange={(e) => setDuzenlemeForm({ ...duzenlemeForm, durum: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition">
                  <option value="Aktif">Aktif</option>
                  <option value="Pasif">Pasif</option>
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setDuzenlemeModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 font-medium transition-colors">
                  İptal
                </button>
                <button type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl text-white text-sm font-semibold transition-all shadow-md"
                  style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                  Güncelle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Silme Onay Modalı */}
      {silOnayId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex flex-col items-center text-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center">
                <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-slate-800">Ürünü Sil</h3>
              <p className="text-sm text-slate-500">Bu ürünü silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setSilOnayId(null)}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 font-medium transition-colors">
                İptal
              </button>
              <button onClick={() => handleSil(silOnayId)}
                className="flex-1 py-2.5 px-4 rounded-xl text-white text-sm font-semibold bg-rose-600 hover:bg-rose-700 transition-colors shadow-md">
                Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Yeni Ürün Modalı */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-5 text-white" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
              <div>
                <h3 className="text-base font-bold">Yeni Ürün</h3>
                <p className="text-xs text-white/70 mt-0.5">Ürün bilgilerini doldurun</p>
              </div>
              <button onClick={() => setModal(false)} className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleKaydet} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Ürün Adı *</label>
                <input type="text" required value={form.urunAdi} onChange={(e) => setForm({ ...form, urunAdi: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Kategori</label>
                  <select value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition">
                    <option value="Cihaz">Cihaz</option>
                    <option value="YedekParca">Yedek Parça</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Stok Kodu *</label>
                  <input type="text" required value={form.stokKodu} onChange={(e) => setForm({ ...form, stokKodu: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Stok Adedi</label>
                  <input type="number" min="0" value={form.stokAdedi} onChange={(e) => setForm({ ...form, stokAdedi: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Alış Fiyatı (₺)</label>
                  <input type="number" min="0" step="0.01" value={form.alisFiyati} onChange={(e) => setForm({ ...form, alisFiyati: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-slate-50 focus:bg-white transition" />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 font-medium transition-colors">
                  İptal
                </button>
                <button type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl text-white text-sm font-semibold transition-all shadow-md"
                  style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
