import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ÖNEMLİ: Telefonda/emulatörde "localhost" senin bilgisayarın DEĞİL, telefonun kendisidir.
// Android Emulator için bilgisayarın adresi özel olarak 10.0.2.2'dir.
// (Gerçek telefon + Expo Go kullanırsan burayı bilgisayarının yerel IP'siyle değiştir:
//  ör. 'http://192.168.1.34:5096/api/v1')
export const API_ORIGIN = 'http://10.0.2.2:5096';        // sunucu kökü (yüklenen resimler için)
export const API_BASE = `${API_ORIGIN}/api/v1`;          // REST API kökü
export const API_AI = 'http://10.0.2.2:8001';            // Python AI servisi (Gemini arıza tespiti)

const api = axios.create({ baseURL: API_BASE, timeout: 20000 });

// 401 (token süresi doldu) olduğunda AuthContext'in çıkış yaptırması için kanca.
let yetkiYokKanca = null;
export function setYetkiYokKanca(fn) {
  yetkiYokKanca = fn;
}

// Her istekten önce: telefonun hafızasındaki token'ı Authorization başlığına ekle.
// Web'deki localStorage yerine burada AsyncStorage var (asenkron olduğu için await).
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Yanıt 401 ise: token geçersiz/dolmuş → hafızayı temizle ve login'e dön.
api.interceptors.response.use(
  (yanit) => yanit,
  async (hata) => {
    if (hata.response?.status === 401) {
      await AsyncStorage.multiRemove(['token', 'kullanici']);
      if (yetkiYokKanca) yetkiYokKanca();
    }
    return Promise.reject(hata);
  }
);

// Backend hata yanıtından kullanıcıya gösterilecek mesajı çıkarır.
// İki format var: { hata: "..." } veya ASP.NET validasyon { errors: { Alan: ["mesaj"] } }
export function apiHata(e, varsayilan = 'Bir hata oluştu.') {
  const d = e.response?.data;
  if (!d) return varsayilan;
  if (d.hata) return d.hata;
  if (d.errors) return Object.values(d.errors).flat().join(' ');
  return d.mesaj || varsayilan;
}

export default api;
