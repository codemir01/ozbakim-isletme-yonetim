import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

export default function ProfilPage() {
  const { setKullanici } = useAuth();

  // Profil bilgileri state'i
  const [profil, setProfil] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  // Profil düzenleme formu
  const [profilForm, setProfilForm] = useState({ ad: '', soyad: '', unvan: '' });
  const [profilKaydediliyor, setProfilKaydediliyor] = useState(false);
  const [profilMesaj, setProfilMesaj] = useState(null); // { tip: 'basari'|'hata', metin }

  // Şifre değiştirme formu
  const [sifreForm, setSifreForm] = useState({ eskiSifre: '', yeniSifre: '', yeniSifreTekrar: '' });
  const [sifreKaydediliyor, setSifreKaydediliyor] = useState(false);
  const [sifreMesaj, setSifreMesaj] = useState(null);

  // Sayfa açılınca profil bilgilerini çek
  useEffect(() => {
    async function profilYukle() {
      try {
        const res = await api.get('/profil');
        const p = res.data.veri;
        setProfil(p);
        setProfilForm({ ad: p.ad, soyad: p.soyad, unvan: p.unvan });
      } catch {
        // hata sessizce geçilir, profil null kalır
      } finally {
        setYukleniyor(false);
      }
    }
    profilYukle();
  }, []);

  // İsmin baş harflerini al (avatar için)
  const initials = profil
    ? `${profil.ad?.[0] ?? ''}${profil.soyad?.[0] ?? ''}`.toUpperCase()
    : '??';

  // Rol Türkçe etiketi
  const rolEtiket = {
    Admin: 'Yönetici',
    SalesConsultant: 'Satış Danışmanı',
    Technician: 'Teknisyen',
  };

  // Profil güncelle
  async function profilKaydet(e) {
    e.preventDefault();
    setProfilKaydediliyor(true);
    setProfilMesaj(null);
    try {
      await api.put('/profil', profilForm);
      // Yerel profil state'ini güncelle
      setProfil(prev => ({ ...prev, ...profilForm }));
      // AuthContext'teki kullanici state'ini ve localStorage'ı güncelle
      // Sayesinde sidebar'daki ad/soyad da hemen değişir
      setKullanici(prev => {
        const guncellenmis = { ...prev, ad: profilForm.ad, soyad: profilForm.soyad };
        localStorage.setItem('kullanici', JSON.stringify(guncellenmis));
        return guncellenmis;
      });
      setProfilMesaj({ tip: 'basari', metin: 'Profil başarıyla güncellendi.' });
    } catch (err) {
      setProfilMesaj({ tip: 'hata', metin: err.response?.data?.hata ?? 'Bir hata oluştu.' });
    } finally {
      setProfilKaydediliyor(false);
    }
  }

  // Şifre güncelle
  async function sifreKaydet(e) {
    e.preventDefault();
    setSifreMesaj(null);
    if (sifreForm.yeniSifre !== sifreForm.yeniSifreTekrar) {
      setSifreMesaj({ tip: 'hata', metin: 'Yeni şifreler eşleşmiyor.' });
      return;
    }
    setSifreKaydediliyor(true);
    try {
      await api.put('/profil/sifre', {
        eskiSifre: sifreForm.eskiSifre,
        yeniSifre: sifreForm.yeniSifre,
      });
      setSifreMesaj({ tip: 'basari', metin: 'Şifre başarıyla güncellendi.' });
      setSifreForm({ eskiSifre: '', yeniSifre: '', yeniSifreTekrar: '' });
    } catch (err) {
      setSifreMesaj({ tip: 'hata', metin: err.response?.data?.hata ?? 'Bir hata oluştu.' });
    } finally {
      setSifreKaydediliyor(false);
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

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Üst kısım: Avatar + Genel Bilgiler */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-indigo-500/20 shrink-0">
            {initials}
          </div>
          {/* Bilgiler */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-slate-900">{profil?.ad} {profil?.soyad}</h2>
            <p className="text-slate-500 text-sm mt-0.5">{profil?.unvan || 'Unvan girilmemiş'}</p>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-100">
                {rolEtiket[profil?.rol] ?? profil?.rol}
              </span>
              <span className="text-slate-400 text-xs">{profil?.eposta}</span>
              <span className="text-slate-400 text-xs">
                Üye: {profil?.olusturmaTarihi ? new Date(profil.olusturmaTarihi).toLocaleDateString('tr-TR') : '-'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Profil Düzenleme Formu */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-base font-bold text-slate-900 mb-5">Profil Bilgileri</h3>
            <form onSubmit={profilKaydet} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ad</label>
                <input
                  type="text"
                  value={profilForm.ad}
                  onChange={e => setProfilForm(p => ({ ...p, ad: e.target.value }))}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Soyad</label>
                <input
                  type="text"
                  value={profilForm.soyad}
                  onChange={e => setProfilForm(p => ({ ...p, soyad: e.target.value }))}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Unvan</label>
                <input
                  type="text"
                  value={profilForm.unvan}
                  onChange={e => setProfilForm(p => ({ ...p, unvan: e.target.value }))}
                  placeholder="Örn: Saha Teknisyeni"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {profilMesaj && (
                <div className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  profilMesaj.tip === 'basari'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    : 'bg-rose-50 text-rose-700 border border-rose-100'
                }`}>
                  {profilMesaj.metin}
                </div>
              )}

              <button
                type="submit"
                disabled={profilKaydediliyor}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {profilKaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </form>
          </div>

          {/* Şifre Değiştirme Formu */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-base font-bold text-slate-900 mb-5">Şifre Değiştir</h3>
            <form onSubmit={sifreKaydet} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mevcut Şifre</label>
                <input
                  type="password"
                  value={sifreForm.eskiSifre}
                  onChange={e => setSifreForm(p => ({ ...p, eskiSifre: e.target.value }))}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Yeni Şifre</label>
                <input
                  type="password"
                  value={sifreForm.yeniSifre}
                  onChange={e => setSifreForm(p => ({ ...p, yeniSifre: e.target.value }))}
                  required
                  minLength={8}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Yeni Şifre (Tekrar)</label>
                <input
                  type="password"
                  value={sifreForm.yeniSifreTekrar}
                  onChange={e => setSifreForm(p => ({ ...p, yeniSifreTekrar: e.target.value }))}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {sifreMesaj && (
                <div className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  sifreMesaj.tip === 'basari'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    : 'bg-rose-50 text-rose-700 border border-rose-100'
                }`}>
                  {sifreMesaj.metin}
                </div>
              )}

              <button
                type="submit"
                disabled={sifreKaydediliyor}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {sifreKaydediliyor ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
              </button>
            </form>
          </div>

        </div>
      </div>
    </Layout>
  );
}
