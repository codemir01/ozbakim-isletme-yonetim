import { createContext, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // 1. (State): Kullanıcı durumu. Sayfa yenilendiğinde (F5) verinin kaybolmaması için 
  // başlangıç değerini tarayıcının hafızasından (localStorage) okuyarak başlatıyoruz.
  const [kullanici, setKullanici] = useState(() => {
    const k = localStorage.getItem('kullanici');
    return k ? JSON.parse(k) : null;
  });
  const navigate = useNavigate();

  // 2. (Giriş Fonksiyonu): Backend'deki Auth Controller ile haberleşir.
  async function girisYap(eposta, sifre) {
    // API isteği atıyoruz.
    const res = await api.post('/auth/login', { eposta, sifre });
    const { token, ad, soyad, rol, kullaniciId } = res.data.veri;

    // Backend'in ürettiği (JwtService'den gelen) şifreli token'ı tarayıcıya kaydederiz.
    // Artık api isteklerinde bu token başlıkta (Header - Authorization) yollanır.
    localStorage.setItem('token', token);
    
    // UI'ı güncelleyecek bilgileri de state ve storage'a alıyoruz.
    const k = { ad, soyad, rol, id: kullaniciId };
    localStorage.setItem('kullanici', JSON.stringify(k));
    setKullanici(k);
    
    // İşlem başarılıysa hocanın göreceği Dashboard sayfasına yönlendiriyoruz.
    navigate('/dashboard');
  }

  // 2b. (Kayıt Fonksiyonu): Yeni işletme + admin oluşturur ve otomatik giriş yapar.
  async function kayitOl(bilgi) {
    const res = await api.post('/auth/kayit', bilgi);
    const { token, ad, soyad, rol, kullaniciId } = res.data.veri;
    localStorage.setItem('token', token);
    const k = { ad, soyad, rol, id: kullaniciId };
    localStorage.setItem('kullanici', JSON.stringify(k));
    setKullanici(k);
    navigate('/dashboard');
  }

  // 3. (Çıkış Fonksiyonu): Tarayıcıdaki token ve kullanıcı bilgilerini imha eder.
  function cikisYap() {
    localStorage.removeItem('token');
    localStorage.removeItem('kullanici');
    setKullanici(null);
    navigate('/login');
  }

  return (
    <AuthContext.Provider value={{ kullanici, setKullanici, girisYap, kayitOl, cikisYap }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
