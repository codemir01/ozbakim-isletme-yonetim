import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Yeni işletme kaydı (self-signup). Başarılı kayıtta otomatik giriş yapılır.
export default function KayitPage() {
  const { kayitOl } = useAuth();
  const [form, setForm] = useState({ isletmeAdi: '', ad: '', soyad: '', eposta: '', sifre: '' });
  const [hata, setHata] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);

  function degis(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function gonder(e) {
    e.preventDefault();
    setHata(''); setYukleniyor(true);
    try {
      await kayitOl(form);
    } catch (err) {
      setHata(err.response?.data?.hata || 'Kayıt sırasında bir hata oluştu.');
    } finally {
      setYukleniyor(false);
    }
  }

  const alanlar = [
    { n: 'isletmeAdi', l: 'İşletme Adı', t: 'text', p: 'Yıldız Teknik Servis' },
    { n: 'ad', l: 'Adınız', t: 'text', p: 'Veli' },
    { n: 'soyad', l: 'Soyadınız', t: 'text', p: 'Kaya' },
    { n: 'eposta', l: 'E-posta', t: 'email', p: 'ornek@sirket.com' },
    { n: 'sifre', l: 'Şifre (en az 8 karakter, büyük/küçük harf + rakam)', t: 'password', p: '••••••••' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
      <div className="absolute top-0 w-full h-1/2 bg-white border-b border-slate-200"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        </div>
        <h2 className="mt-2 text-center text-3xl font-extrabold text-slate-900 tracking-tight">İşletmeni Oluştur</h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          14 gün ücretsiz dene — kredi kartı gerekmez
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-[440px] relative z-10">
        <div className="bg-white py-8 px-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:rounded-2xl sm:px-10 border border-slate-100">
          <form className="space-y-4" onSubmit={gonder}>
            {alanlar.map((a) => (
              <div key={a.n}>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">{a.l}</label>
                <input
                  type={a.t}
                  name={a.n}
                  required={a.n !== 'soyad'}
                  value={form[a.n]}
                  onChange={degis}
                  placeholder={a.p}
                  className="block w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition-colors"
                />
              </div>
            ))}

            {hata && (
              <div className="rounded-xl bg-red-50 p-3 border border-red-100">
                <p className="text-sm font-medium text-red-800">{hata}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={yukleniyor}
              className="w-full flex justify-center py-2.5 px-4 rounded-xl shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 transition-colors"
            >
              {yukleniyor ? 'Oluşturuluyor...' : 'İşletmemi Oluştur'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Zaten hesabın var mı?{' '}
            <Link to="/login" className="font-bold text-indigo-600 hover:text-indigo-500">Giriş yap</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
