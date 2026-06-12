import { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { setYetkiYokKanca } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [kullanici, setKullanici] = useState(null);
  // Uygulama açılırken hafızadan kullanıcıyı okuyana kadar bekleriz (splash mantığı).
  const [hazir, setHazir] = useState(false);

  useEffect(() => {
    (async () => {
      const k = await AsyncStorage.getItem('kullanici');
      if (k) setKullanici(JSON.parse(k));
      setHazir(true);
    })();
    // Token 401 alırsa otomatik çıkış yaptır.
    setYetkiYokKanca(() => setKullanici(null));
  }, []);

  // Backend'deki AuthController ile haberleşir.
  async function girisYap(eposta, sifre) {
    const res = await api.post('/auth/login', { eposta, sifre });
    const { token, ad, soyad, rol, kullaniciId, ilkGiris } = res.data.veri;
    await AsyncStorage.setItem('token', token);
    // ilkGiris: admin'in eklediği eleman ilk girişte şifre belirlemeye zorlanır
    const k = { ad, soyad, rol, id: kullaniciId, ilkGiris: !!ilkGiris };
    await AsyncStorage.setItem('kullanici', JSON.stringify(k));
    setKullanici(k);
  }

  // İlk giriş şifresi belirlendikten sonra bayrağı temizle
  async function ilkGirisTamamlandi() {
    setKullanici((onceki) => {
      const k = { ...onceki, ilkGiris: false };
      AsyncStorage.setItem('kullanici', JSON.stringify(k));
      return k;
    });
  }

  // Profil güncellenince context'teki ad/soyad'ı da tazele (Dashboard selamı vb.)
  async function guncelleKullanici(parcali) {
    setKullanici((onceki) => {
      const k = { ...onceki, ...parcali };
      AsyncStorage.setItem('kullanici', JSON.stringify(k));
      return k;
    });
  }

  async function cikisYap() {
    await AsyncStorage.multiRemove(['token', 'kullanici']);
    setKullanici(null);
  }

  return (
    <AuthContext.Provider value={{ kullanici, hazir, girisYap, cikisYap, ilkGirisTamamlandi, guncelleKullanici }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
