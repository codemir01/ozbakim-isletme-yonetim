import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Vite ile leaflet marker ikonu yolu bozulduğu için CDN'den yükle
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const TURKIYE_MERKEZ = [39.0, 35.0];

// Tek bir Nominatim sorgusu
async function nominatimSorgu(q) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=tr`,
      { headers: { 'Accept-Language': 'tr' } }
    );
    return await res.json();
  } catch {
    return [];
  }
}

// Türkiye adresleri için KADEMELİ arama.
// Nominatim'de kapı no / cadde verisi çoğu zaman yoktur; tam adres bulunamazsa
// kapı numarasını, sonra cadde/sokağı atıp mahalle+ilçe+il ile dener.
// Böylece en azından doğru ilçeye/mahalleye düşer, kullanıcı pini sürükleyip düzeltir.
async function kademeliAra(sorgu) {
  const adaylar = [];
  const ekle = (q) => { const t = (q || '').trim(); if (t.length >= 3 && !adaylar.includes(t)) adaylar.push(t); };

  // 1) Tam haliyle
  ekle(sorgu);

  // 2) Kapı numarasını temizle (no:130 / no 130 / no.130)
  const noTemiz = sorgu.replace(/no[:.\s]*\d+/gi, ' ').replace(/\s+/g, ' ').trim();
  ekle(noTemiz);

  // 3) Cadde/sokak/bulvardan SONRAKİ kısım (genelde ilçe + il) + varsa mahalle adı
  const sokakSonrasi = noTemiz.match(/(?:caddesi|cadde|cad|cd|sokağı|sokak|sk|bulvarı|bulvar|blv)\b[\s,/]*(.+)/i);
  const mah = noTemiz.match(/([\wçğıöşüÇĞİÖŞÜ]+)\s+mahalle/i);
  if (sokakSonrasi && sokakSonrasi[1]) {
    const onek = mah ? `${mah[1]} mahallesi ` : '';
    ekle(onek + sokakSonrasi[1]);
    ekle(sokakSonrasi[1]); // sadece ilçe + il
  }

  // 4) Son çare: virgül/slash ile ayrılan son iki parça (ilçe + il)
  const kabaParcalar = sorgu.split(/[/,]/).map((s) => s.trim()).filter(Boolean);
  if (kabaParcalar.length) {
    ekle(kabaParcalar.slice(-2).join(' '));
    ekle(kabaParcalar[kabaParcalar.length - 1]);
  }

  // Adayları sırayla dene, ilk sonuç döneni kullan
  for (const q of adaylar) {
    const data = await nominatimSorgu(q);
    if (data.length) return data;
  }
  return [];
}

// Haritaya tıklanınca konum seçer
function HaritaTiklama({ onSec }) {
  useMapEvents({
    click(e) { onSec(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}

// Haritayı programatik olarak bir hedefe uçurur
function HaritaUcur({ hedef }) {
  const map = useMap();
  useEffect(() => {
    if (hedef) map.flyTo([hedef.lat, hedef.lng], 16, { duration: 1.1 });
  }, [hedef, map]);
  return null;
}

/**
 * Yeniden kullanılabilir konum seçici harita.
 *
 * Props:
 *  - value: { lat, lng } | null            → seçili konum
 *  - onChange: (lat, lng) => void          → konum değişince (arama/tıklama/sürükleme/GPS)
 *  - onAdresMetni: (text) => void          → (opsiyonel) arama kutusuna yazılan metin
 *  - baslangicMetni: string                → (opsiyonel) arama kutusu başlangıç değeri
 *  - yukseklik: string                     → harita yüksekliği (varsayılan 320px)
 */
export default function KonumSeciciHarita({ value, onChange, onAdresMetni, baslangicMetni = '', yukseklik = '320px' }) {
  const [arama, setArama] = useState(baslangicMetni);
  const [sonuclar, setSonuclar] = useState([]);
  const [araniyor, setAraniyor] = useState(false);
  const [gpsAraniyor, setGpsAraniyor] = useState(false);
  const [ucurHedef, setUcurHedef] = useState(value || null);
  const timeoutRef = useRef(null);

  const aramaDegisti = (deger) => {
    setArama(deger);
    onAdresMetni?.(deger);
    setSonuclar([]);
    clearTimeout(timeoutRef.current);
    if (deger.trim().length < 3) return;

    timeoutRef.current = setTimeout(async () => {
      setAraniyor(true);
      const data = await kademeliAra(deger);
      setSonuclar(data);
      if (data.length) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        onChange(lat, lng);
        setUcurHedef({ lat, lng });
      }
      setAraniyor(false);
    }, 700);
  };

  const sonucSec = (s) => {
    const lat = parseFloat(s.lat);
    const lng = parseFloat(s.lon);
    onChange(lat, lng);
    setUcurHedef({ lat, lng });
    setSonuclar([]);
  };

  // Haritaya tıklama / pin sürükleme — sadece koordinat değişir, harita uçmaz
  const haritadaSec = (lat, lng) => onChange(lat, lng);

  const gpsKullan = () => {
    if (!navigator.geolocation) {
      alert('Tarayıcınız konum özelliğini desteklemiyor.');
      return;
    }
    setGpsAraniyor(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        onChange(lat, lng);
        setUcurHedef({ lat, lng });
        setGpsAraniyor(false);
      },
      () => {
        alert('Konum alınamadı. Tarayıcı iznini kontrol edin.');
        setGpsAraniyor(false);
      }
    );
  };

  return (
    <div className="space-y-2">
      {/* Arama + GPS araçları (haritanın üstünde durmalı) */}
      <div className="relative z-[1001] space-y-2">
        <div className="relative">
          <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500 transition">
            <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <input
              type="text"
              value={arama}
              onChange={(e) => aramaDegisti(e.target.value)}
              placeholder="Mahalle, cadde, ilçe, şehir yazın..."
              className="flex-1 bg-transparent focus:outline-none text-sm text-slate-700 placeholder:text-slate-400"
            />
            {araniyor && (
              <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0" />
            )}
          </div>

          {/* Arama sonuçları */}
          {sonuclar.length > 0 && (
            <div className="absolute z-[1002] top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
              {sonuclar.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => sonucSec(s)}
                  className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 border-b border-slate-100 last:border-0 transition-colors"
                >
                  {s.display_name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={gpsKullan}
            disabled={gpsAraniyor}
            className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 hover:bg-emerald-100 transition-colors disabled:opacity-50"
          >
            {gpsAraniyor ? (
              <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a10 10 0 0 1 0 20A10 10 0 0 1 12 2zm0 0v4m0 16v-4m10-6h-4M6 12H2m15.07-7.07-2.83 2.83M8.76 15.24l-2.83 2.83m0-11.31 2.83 2.83m6.48 6.48 2.83 2.83" />
              </svg>
            )}
            {gpsAraniyor ? 'Konum alınıyor...' : 'Konumumu kullan'}
          </button>
          <p className="text-xs text-slate-400">Haritaya tıklayın veya pini sürükleyin</p>
        </div>
      </div>

      {/* Harita */}
      <div style={{ height: yukseklik, position: 'relative', zIndex: 0 }} className="rounded-xl overflow-hidden border border-slate-200">
        <MapContainer
          center={value ? [value.lat, value.lng] : TURKIYE_MERKEZ}
          zoom={value ? 15 : 6}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <HaritaTiklama onSec={haritadaSec} />
          <HaritaUcur hedef={ucurHedef} />
          {value && (
            <Marker
              draggable
              position={[value.lat, value.lng]}
              eventHandlers={{
                dragend: (e) => {
                  const ll = e.target.getLatLng();
                  haritadaSec(ll.lat, ll.lng);
                },
              }}
            />
          )}
        </MapContainer>
      </div>

      {/* Seçili koordinat bilgisi */}
      <div className="text-xs">
        {value ? (
          <span className="text-emerald-600 font-medium inline-flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Konum seçildi: {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
          </span>
        ) : (
          <span className="text-slate-400">Henüz konum seçilmedi</span>
        )}
      </div>
    </div>
  );
}
