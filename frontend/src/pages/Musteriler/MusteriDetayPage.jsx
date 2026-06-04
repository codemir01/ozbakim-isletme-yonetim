import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import Layout from '../../components/Layout';

const formatPara = (v) => `₺${(v || 0).toLocaleString('tr-TR')}`;

export default function MusteriDetayPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [musteri, setMusteri] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  
  const [islemTipi, setIslemTipi] = useState(null); // 'borc' or 'tahsilat'
  const [miktar, setMiktar] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [gecmis, setGecmis] = useState([]);

  useEffect(() => {
    veriCek();
    gecmisCek();
  }, [id]);

  async function veriCek() {
    setYukleniyor(true);
    try {
      const res = await api.get(`/musteriler/${id}`);
      setMusteri(res.data.veri);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 404) navigate('/musteriler');
    } finally {
      setYukleniyor(false);
    }
  }

  async function gecmisCek() {
    try {
      const res = await api.get(`/musteriler/${id}/borc-gecmis`);
      setGecmis(res.data.veri || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleIslem(e) {
    e.preventDefault();
    if (!miktar || isNaN(miktar) || parseFloat(miktar) <= 0) return;

    setKaydediliyor(true);
    try {
      const endpoint = islemTipi === 'borc'
        ? `/musteriler/${id}/borc-ekle`
        : `/musteriler/${id}/tahsilat-ekle`;
      await api.post(endpoint, { miktar: parseFloat(miktar), aciklama });
      setIslemTipi(null);
      setMiktar('');
      setAciklama('');
      veriCek();
      gecmisCek();
    } catch (err) {
      const mesaj = err.response?.data?.hata || 'İşlem kaydedilemedi.';
      alert(mesaj);
    } finally {
      setKaydediliyor(false);
    }
  }

  if (yukleniyor) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[70vh]">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
      </Layout>
    );
  }

  if (!musteri) return null;

  const bakiye = (musteri.toplamBorc || 0) - (musteri.toplamTahsilat || 0);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Üst Bar - Geri Butonu */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/musteriler')}
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Müşteri Detayı</h1>
            <p className="text-sm text-slate-500">Müşterinin kümülatif bakiye ve iletişim bilgileri.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Sol Kolon - Profil Bilgileri */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
               <div className="relative mt-8">
                  <div className="w-24 h-24 mx-auto bg-white border-4 border-white shadow-md rounded-2xl flex items-center justify-center text-3xl font-bold text-indigo-600">
                    {musteri.ad[0]}{musteri.soyad[0]}
                  </div>
                  <h2 className="mt-4 text-xl font-bold text-slate-800">{musteri.ad} {musteri.soyad}</h2>
                  <p className="text-sm text-slate-500 mt-1 flex items-center justify-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                    {musteri.telefon}
                  </p>
                  
                  <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col gap-3 text-left">
                     <div>
                        <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Adres</span>
                        <p className="text-sm font-medium text-slate-700">{musteri.adres || 'Adres bilgisi yok.'}</p>
                     </div>
                     <div>
                        <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Kayıt Tarihi</span>
                        <p className="text-sm font-medium text-slate-700">{new Date(musteri.olusturmaTarihi).toLocaleDateString('tr-TR')}</p>
                     </div>
                  </div>
               </div>
            </div>
          </div>

          {/* Sağ Kolon - Finansal Matris */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Bakiye Özeti Kartı */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                 <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                 Finansal Durum
              </h3>
              
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                   <span className="text-xs font-semibold text-slate-500 uppercase">Kümülatif Borç</span>
                   <p className="text-xl font-bold text-slate-800 mt-1">{formatPara(musteri.toplamBorc)}</p>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                   <span className="text-xs font-semibold text-emerald-600 uppercase">Kümülatif Tahsilat</span>
                   <p className="text-xl font-bold text-emerald-700 mt-1">{formatPara(musteri.toplamTahsilat)}</p>
                </div>
                <div className={`p-4 rounded-xl border ${bakiye > 0 ? 'bg-orange-50 border-orange-100' : 'bg-slate-50 border-slate-100'}`}>
                   <span className={`text-xs font-semibold uppercase ${bakiye > 0 ? 'text-orange-600' : 'text-slate-500'}`}>Net Kalan Bakiye</span>
                   <p className={`text-xl font-bold mt-1 ${bakiye > 0 ? 'text-orange-700' : 'text-slate-800'}`}>{formatPara(bakiye)}</p>
                </div>
              </div>

              <div className="flex gap-4">
                 <button 
                    onClick={() => setIslemTipi('borc')}
                    className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-white border-2 border-rose-100 text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors"
                 >
                    + Borç Ekle (Satış Harici)
                 </button>
                 <button 
                    onClick={() => setIslemTipi('tahsilat')}
                    className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-emerald-500 text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-600 transition-colors"
                 >
                    + Tahsilat Al (Ödeme)
                 </button>
              </div>
            </div>

            {/* Borç / Tahsilat Geçmişi */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                İşlem Geçmişi
              </h3>
              {gecmis.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">Henüz işlem kaydı bulunmuyor.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {gecmis.map(g => (
                    <div key={g.id} className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm ${g.tip === 'Borc' ? 'bg-rose-50 border border-rose-100' : 'bg-emerald-50 border border-emerald-100'}`}>
                      <div>
                        <span className={`font-bold ${g.tip === 'Borc' ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {g.tip === 'Borc' ? '↑ Borç' : '↓ Tahsilat'}
                        </span>
                        {g.aciklama && <span className="ml-2 text-slate-500">{g.aciklama}</span>}
                        <span className="block text-xs text-slate-400 mt-0.5">
                          {new Date(g.tarih).toLocaleDateString('tr-TR', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                        </span>
                      </div>
                      <span className={`font-bold text-base ${g.tip === 'Borc' ? 'text-rose-700' : 'text-emerald-700'}`}>
                        {g.tip === 'Borc' ? '+' : '-'}{formatPara(g.miktar)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* İşlem Modalı */}
      {islemTipi && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className={`p-5 text-white ${islemTipi === 'borc' ? 'bg-rose-500' : 'bg-emerald-500'}`}>
               <h3 className="font-bold">{islemTipi === 'borc' ? 'Müşteriye Borç Yaz' : 'Tahsilat Alındı'}</h3>
               <p className="text-xs text-white/80 mt-1">{musteri.ad} {musteri.soyad} — Mevcut Bakiye: {formatPara(bakiye)}</p>
            </div>
            
            <form onSubmit={handleIslem} className="p-6">
               <label className="block text-sm font-semibold text-slate-700 mb-2">
                 {islemTipi === 'borc' ? 'Eklenecek Borç Tutarı (₺)' : 'Alınan Ödeme Tutarı (₺)'}
               </label>
               <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  autoFocus
                  value={miktar}
                  onChange={e => setMiktar(e.target.value)}
                  className="w-full px-4 py-3 text-lg font-bold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
                  placeholder="0.00"
               />
               <label className="block text-sm font-semibold text-slate-700 mt-4 mb-2">Açıklama (opsiyonel)</label>
               <input
                  type="text"
                  value={aciklama}
                  onChange={e => setAciklama(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white text-sm"
                  placeholder="Örn: Ocak kira, cihaz servisi..."
               />

               <div className="flex gap-3 mt-6">
                 <button 
                   type="button" 
                   onClick={() => { setIslemTipi(null); setMiktar(''); setAciklama(''); }}
                   className="flex-1 py-2.5 rounded-xl font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"
                 >
                   İptal
                 </button>
                 <button 
                   type="submit" 
                   disabled={kaydediliyor}
                   className={`flex-1 py-2.5 rounded-xl font-bold text-white shadow-md ${islemTipi === 'borc' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-emerald-500 hover:bg-emerald-600'} disabled:opacity-60`}
                 >
                   {kaydediliyor ? 'Kaydediliyor...' : 'Onayla'}
                 </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
