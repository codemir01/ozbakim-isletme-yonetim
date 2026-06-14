import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
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
  // Rota optimizasyonu (AI/TSP) durumu
  const [rota, setRota] = useState([]);          // ziyaret sırasına dizilmiş duraklar (ilk = depo)
  const [rotaMesafe, setRotaMesafe] = useState(0);
  const [rotaYukleniyor, setRotaYukleniyor] = useState(false);
  // İşletme (depo) konumu — rota başlangıcı
  const [isletmeKonum, setIsletmeKonum] = useState(null); // { enlem, boylam } | null
  const [isletmeModal, setIsletmeModal] = useState(false);
  const [isletmeSecilen, setIsletmeSecilen] = useState(null); // { lat, lng }
  const [isletmeKaydediliyor, setIsletmeKaydediliyor] = useState(false);
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

  const isletmeKonumYukle = () => {
    api
      .get('/isletme/konum')
      .then((res) => {
        const k = res.data.veri;
        setIsletmeKonum(k && k.enlem != null && k.boylam != null ? k : null);
      })
      .catch(() => {});
  };

  useEffect(() => {
    musteriYukle();
    isletmeKonumYukle();
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

  // İşletme (depo) konumu kaydet
  const isletmeKonumKaydet = async () => {
    if (!isletmeSecilen) return;
    setIsletmeKaydediliyor(true);
    try {
      await api.put('/isletme/konum', { enlem: isletmeSecilen.lat, boylam: isletmeSecilen.lng });
      setIsletmeModal(false);
      setIsletmeSecilen(null);
      isletmeKonumYukle();
    } catch {
      alert('İşletme konumu kaydedilemedi.');
    } finally {
      setIsletmeKaydediliyor(false);
    }
  };

  // Rota optimizasyonu: depo (işletme) varsa ondan başlat, müşterileri en kısa sırayla gez
  const rotaOptimizeEt = async () => {
    const depoVar = isletmeKonum?.enlem != null && isletmeKonum?.boylam != null;
    if (koordinatlilar.length < (depoVar ? 1 : 2)) {
      alert(depoVar ? 'Rota için en az 1 konumlu müşteri gerekli.' : 'Rota için en az 2 konumlu müşteri gerekli (veya işletme konumunu belirleyin).');
      return;
    }
    setRotaYukleniyor(true);
    try {
      const musteriNoktalar = koordinatlilar.map((m) => ({ enlem: m.enlem, boylam: m.boylam }));
      // Depo varsa ilk sıraya koy — Python TSP ilk noktayı başlangıç kabul eder
      const noktalar = depoVar
        ? [{ enlem: isletmeKonum.enlem, boylam: isletmeKonum.boylam }, ...musteriNoktalar]
        : musteriNoktalar;
      const res = await api.post('/rota/optimize', { noktalar });
      const veri = res.data.veri;
      if (veri?.sira) {
        const sirali = veri.sira.map((i) => {
          if (depoVar && i === 0) {
            return { id: 'depo', depo: true, ad: 'İşletme', soyad: '', adres: 'Başlangıç noktası (depo)', enlem: isletmeKonum.enlem, boylam: isletmeKonum.boylam };
          }
          return depoVar ? koordinatlilar[i - 1] : koordinatlilar[i];
        });
        setRota(sirali);
        setRotaMesafe(veri.toplamMesafeKm ?? 0);
      }
    } catch (err) {
      alert(err.response?.data?.hata || 'Rota hesaplanamadı. AI servisi çalışıyor mu?');
    } finally {
      setRotaYukleniyor(false);
    }
  };

  const rotaTemizle = () => { setRota([]); setRotaMesafe(0); };

  // Rota çiziminde depo ilk sıradaysa müşteriler 1..n, depo özel ikon
  const depoBasta = rota[0]?.depo === true;
  const rotaNumarasi = (idx) => (depoBasta ? idx : idx + 1);

  // Haritada sıra numarası gösteren işaretçi
  const numaraliIkon = (no) => L.divIcon({
    className: '',
    html: `<div style="background:#4f46e5;color:#fff;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4)">${no}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });

  // İşletme (depo) için özel yeşil ev işaretçisi
  const depoIkon = () => L.divIcon({
    className: '',
    html: `<div style="background:#059669;color:#fff;width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:15px;border:2px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,0.45)">🏢</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

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
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Müşteri Konumları</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {rota.length > 0 ? 'AI ile en kısa ziyaret sırası çizildi' : 'Pin üzerine tıklayarak müşteri detayına gidin'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* İşletme (depo) konumu — rota başlangıcı */}
            <button
              onClick={() => {
                setIsletmeSecilen(isletmeKonum ? { lat: isletmeKonum.enlem, lng: isletmeKonum.boylam } : null);
                setIsletmeModal(true);
              }}
              className={`text-xs font-medium border rounded-lg px-3 py-1.5 transition-colors whitespace-nowrap ${
                isletmeKonum
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              🏢 İşletme Konumu {isletmeKonum ? '✓' : ''}
            </button>

            {koordinatlilar.length === 0 && (
              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                Henüz konumlu müşteri yok
              </span>
            )}
            {rota.length > 0 ? (
              <>
                <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg whitespace-nowrap">
                  Toplam ~{rotaMesafe} km · {rota.filter((r) => !r.depo).length} durak
                </span>
                <button
                  onClick={rotaTemizle}
                  className="text-xs text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors"
                >
                  Temizle
                </button>
              </>
            ) : (
              (koordinatlilar.length >= 2 || (isletmeKonum && koordinatlilar.length >= 1)) && (
                <button
                  onClick={rotaOptimizeEt}
                  disabled={rotaYukleniyor}
                  className="flex items-center gap-1.5 text-xs font-semibold text-white rounded-lg px-3 py-1.5 shadow-sm disabled:opacity-60 transition-all"
                  style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
                >
                  {rotaYukleniyor ? 'Hesaplanıyor...' : '🚗 Teknisyen Rotası (AI)'}
                </button>
              )
            )}
          </div>
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
            {/* Rota çizilmişse: sıralı çizgi + numaralı duraklar */}
            {rota.length > 0 && (
              <>
                <Polyline
                  positions={rota.map((m) => [m.enlem, m.boylam])}
                  pathOptions={{ color: '#4f46e5', weight: 4, opacity: 0.7 }}
                />
                {rota.map((m, idx) => (
                  <Marker key={m.id} position={[m.enlem, m.boylam]} icon={m.depo ? depoIkon() : numaraliIkon(rotaNumarasi(idx))}>
                    <Popup>
                      <div className="text-sm min-w-[140px]">
                        {m.depo ? (
                          <p className="font-bold text-emerald-700 mb-1">🏢 İşletme (Başlangıç)</p>
                        ) : (
                          <>
                            <p className="font-bold text-slate-800 mb-1">{rotaNumarasi(idx)}. {m.ad} {m.soyad}</p>
                            <p className="text-slate-500 text-xs mb-2">{m.adres}</p>
                            <button
                              onClick={() => navigate(`/musteriler/${m.id}`)}
                              className="w-full text-center text-xs bg-indigo-600 text-white rounded px-2 py-1 hover:bg-indigo-700 transition-colors"
                            >
                              Detay
                            </button>
                          </>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </>
            )}

            {/* Rota yokken işletme konumu varsa depo işaretçisini göster */}
            {rota.length === 0 && isletmeKonum && (
              <Marker position={[isletmeKonum.enlem, isletmeKonum.boylam]} icon={depoIkon()}>
                <Popup><div className="text-sm font-bold text-emerald-700">🏢 İşletme (Depo)</div></Popup>
              </Marker>
            )}

            {/* Rota yokken: normal müşteri pinleri */}
            {rota.length === 0 && koordinatlilar.map((m) => (
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

      {/* Optimize Edilmiş Rota Sırası */}
      {rota.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Optimize Edilmiş Ziyaret Sırası</h3>
              <p className="text-xs text-slate-500 mt-0.5">En kısa toplam mesafeye göre (yaklaşık ~{rotaMesafe} km)</p>
            </div>
            <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full">
              {rota.filter((r) => !r.depo).length} durak
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {rota.map((m, idx) => (
              <div key={m.id} className="px-6 py-3 flex items-center gap-3">
                {m.depo ? (
                  <span className="w-7 h-7 shrink-0 rounded-lg bg-emerald-600 text-white text-sm flex items-center justify-center">🏢</span>
                ) : (
                  <span className="w-7 h-7 shrink-0 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                    {rotaNumarasi(idx)}
                  </span>
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">
                    {m.depo ? 'İşletme' : `${m.ad} ${m.soyad}`}
                  </p>
                  <p className="text-xs text-slate-400">{m.depo ? 'Başlangıç noktası (depo)' : m.adres}</p>
                </div>
                {!m.depo && (
                  <button
                    onClick={() => navigate(`/musteriler/${m.id}`)}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Detay →
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* İşletme (Depo) Konum Belirleme Modal */}
      {isletmeModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-800">🏢 İşletme Konumu</h2>
                <p className="text-xs text-slate-500 mt-0.5">Teknisyen rotası bu noktadan başlar</p>
              </div>
              <button onClick={() => { setIsletmeModal(false); setIsletmeSecilen(null); }} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-4 overflow-y-auto flex-1">
              <KonumSeciciHarita
                value={isletmeSecilen}
                onChange={(lat, lng) => setIsletmeSecilen({ lat, lng })}
                yukseklik="340px"
              />
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => { setIsletmeModal(false); setIsletmeSecilen(null); }}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={isletmeKonumKaydet}
                disabled={!isletmeSecilen || isletmeKaydediliyor}
                className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isletmeKaydediliyor ? 'Kaydediliyor...' : 'İşletme Konumunu Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
