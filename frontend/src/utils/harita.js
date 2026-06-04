// Harita / navigasyon yardımcıları.
// Teknisyen müşterinin adresine kolayca gidebilsin diye Google Maps açar.

// Koordinat geçerli mi? (null/undefined/0,0 değil)
export function konumVarMi(enlem, boylam) {
  return enlem != null && boylam != null && !(enlem === 0 && boylam === 0);
}

// Konumu Google Maps'te GÖSTER (sadece haritada nokta olarak)
export function konumuHaritadaAc(enlem, boylam) {
  if (konumVarMi(enlem, boylam)) {
    window.open(`https://www.google.com/maps/search/?api=1&query=${enlem},${boylam}`, '_blank', 'noopener');
  }
}

// Müşteriye YOL TARİFİ başlat (teknisyen navigasyonu).
// Koordinat varsa ona, yoksa adres metnine göre Google Maps yol tarifi açar.
export function yolTarifiAc(enlem, boylam, adres = '') {
  let hedef;
  if (konumVarMi(enlem, boylam)) {
    hedef = `${enlem},${boylam}`;
  } else if (adres && adres.trim()) {
    hedef = encodeURIComponent(adres.trim());
  } else {
    return; // Gidilecek bir hedef yok
  }
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${hedef}`, '_blank', 'noopener');
}
