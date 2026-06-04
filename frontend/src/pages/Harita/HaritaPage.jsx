import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../../api/axios';
import { useNavigate } from 'react-router-dom';
import KonumSeciciHarita from '../../components/KonumSeciciHarita';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export default function HaritaPage() {
  const [musteriler, setMusteriler] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [modalMusteri, setModalMusteri] = useState(null);
  const [secilenKonum, setSecilenKonum] = useState(null);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const navigate = useNavigate();

  const musteriYukle = () => {
    setYukleniyor(true);
    // boyut=500 ile tüm aktif müşterileri çek — harita sayfası tüm pinleri göstermeli
    api
      .get('/musteriler?sayfa=1&boyut=500')
      .then((res) => setMusteriler(res.data.veri ?? []))
      .catch(console.error)
      .finally(() => setYukleniyor(false));
  };

  useEffect(() => {
    musteriYukle();
  }, []);

  const koordinatlilar = musteriler.filter((m) => m.enlem != null && m.boylam != null);
  const koordinatsizlar = musteriler.filter((m) => m.enlem == null || m.boylam == null);

  const modalAc = (musteri) => {
    setModalMusteri(musteri);
    // Müşterinin mevcut konumu varsa onu başlangıç olarak göster
    setSecilenKonum(
      musteri.enlem != null && musteri.boylam != null
        ? { lat: musteri.enlem, lng: musteri.boylam }
        : null
    );
  };

  const modalKapat = () => {
    setModalMusteri(null);
    setSecilenKonum(null);
  };

  const konumKaydet = async () => {
    if (!secilenKonum) return;
    setKaydediliyor(true);
    try {
      await api.put(`/musteriler/${modalMusteri.id}/konum`, {
        enlem: secilenKonum.lat,
        boylam: secilenKonum.lng,
      });
      modalKapat();
      musteriYukle();
    } catch {
      alert('Konum kaydedilemedi.');
    } finally {
      setKaydediliyor(false);
    }
  };

  const konumuKaldir = async (musteri) => {
    try {
      await api.put(`/musteriler/${musteri.id}/konum`, { enlem: null, boylam: null });
      musteriYukle();
    } catch {
      alert('Konum kaldırılamadı.');
    }
  };

  if (yukleniyor) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
        Harita yükleniyor...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Özet Kartlar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Toplam Müşteri</p>
          <p className="text-3xl font-bold text-slate-800 mt-1">{musteriler.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Haritada Gösterilen</p>
          <p className="text-3xl font-bold text-indigo-600 mt-1">{koordinatlilar.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Konum Girilmemiş</p>
          <p className="text-3xl font-bold text-amber-500 mt-1">{koordinatsizlar.length}</p>
        </div>
      </div>

      {/* Ana Harita */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Müşteri Konumları</h3>
            <p className="text-xs text-slate-500 mt-0.5">Pin üzerine tıklayarak müşteri detayına gidin</p>
          </div>
          {koordinatlilar.length === 0 && (
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
              Henüz konumlu müşteri yok
            </span>
          )}
        </div>
        <div style={{ height: '480px' }}>
          <MapContainer
            center={koordinatlilar.length > 0 ? [koordinatlilar[0].enlem, koordinatlilar[0].boylam] : [39.9334, 32.8597]}
            zoom={koordinatlilar.length > 0 ? 12 : 6}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {koordinatlilar.map((m) => (
              <Marker key={m.id} position={[m.enlem, m.boylam]}>
                <Popup>
                  <div className="text-sm min-w-[160px]">
                    <p className="font-bold text-slate-800 mb-1">{m.ad} {m.soyad}</p>
                    <p className="text-slate-500 text-xs mb-1">{m.telefon}</p>
                    <p className="text-slate-500 text-xs mb-2">{m.adres}</p>
                    <div className="flex justify-between text-xs mb-3">
                      <span className="text-red-500">
                        Borç: ₺{(m.toplamBorc - m.toplamTahsilat > 0 ? m.toplamBorc - m.toplamTahsilat : 0).toLocaleString('tr-TR')}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => navigate(`/musteriler/${m.id}`)}
                        className="flex-1 text-center text-xs bg-indigo-600 text-white rounded px-2 py-1 hover:bg-indigo-700 transition-colors"
                      >
                        Detay
                      </button>
                      <button
                        onClick={() => modalAc(m)}
                        className="text-xs bg-slate-100 text-slate-600 rounded px-2 py-1 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                        title="Konumu güncelle"
                      >
                        Güncelle
                      </button>
                      <button
                        onClick={() => konumuKaldir(m)}
                        className="text-xs bg-slate-100 text-slate-600 rounded px-2 py-1 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Konumu kaldır"
                      >
                        Kaldır
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* Tüm Müşteriler Listesi */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800 text-sm">Müşteri Konum Yönetimi</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Adres arayın, GPS kullanın veya haritaya tıklayın
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {musteriler.map((m) => {
            const konumVar = m.enlem != null && m.boylam != null;
            return (
              <div key={m.id} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${konumVar ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{m.ad} {m.soyad}</p>
                    <p className="text-xs text-slate-400">{m.telefon} — {m.adres}</p>
                  </div>
                </div>
                <button
                  onClick={() => modalAc(m)}
                  className={`text-xs border rounded-lg px-3 py-1.5 transition-colors font-medium whitespace-nowrap ${
                    konumVar
                      ? 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200'
                      : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                  }`}
                >
                  {konumVar ? 'Konumu Güncelle' : 'Konum Belirle'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Konum Belirleme Modal */}
      {modalMusteri && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            {/* Başlık */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-800">Konum Belirle</h2>
                <p className="text-xs text-slate-500 mt-0.5">{modalMusteri.ad} {modalMusteri.soyad}</p>
              </div>
              <button onClick={modalKapat} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Konum Seçici (arama + GPS + tıkla/sürükle) */}
            <div className="px-6 py-4 overflow-y-auto flex-1">
              <KonumSeciciHarita
                value={secilenKonum}
                onChange={(lat, lng) => setSecilenKonum({ lat, lng })}
                yukseklik="340px"
              />
            </div>

            {/* Alt Kısım */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <div className="flex gap-2">
                <button
                  onClick={modalKapat}
                  className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={konumKaydet}
                  disabled={!secilenKonum || kaydediliyor}
                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
