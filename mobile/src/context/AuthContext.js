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
    const { token, ad, soyad, rol, kullaniciId } = res.data.veri;
    await AsyncStorage.setItem('token', token);
    const k = { ad, soyad, rol, id: kullaniciId };
    await AsyncStorage.setItem('kullanici', JSON.stringify(k));
    setKullanici(k);
  }

  async function cikisYap() {
    await AsyncStorage.multiRemove(['token', 'kullanici']);
    setKullanici(null);
  }

  return (
    <AuthContext.Provider value={{ kullanici, hazir, girisYap, cikisYap }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
