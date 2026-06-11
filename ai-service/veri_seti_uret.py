"""
Servis Kayıtları Veri Seti Üretici
==================================
Adana Kozan'daki FARKLI servis işletmelerinin (marka yetkili servisleri +
bağımsız teknik servisler) yıllar içinde biriktirdiği bakım & onarım
kayıtlarını taklit eden, GERÇEKÇİ bir veri seti üretir.

Neden bu script var?
  - Elimizde gerçek bir işletmenin kaydı olmadığı için, gerçeğe yakın
    (mantıklı ilişkilere sahip) bir veri setini biz üretiyoruz.
  - Üretilen "veri_seti.csv" dosyası, AI modelinin (model.py) eğitiminde kullanılır.
  - Gerçek firma verisi gelirse: aynı sütun başlıklarıyla bir CSV koymanız yeterli.

Gerçekçiliği sağlayan kurallar:
  - Veriler TEK ŞEHİRDEN (Adana Kozan) toplanmıştır; ama BİRDEN ÇOK işletmeden gelir.
  - Her işletmenin KENDİ AÇILIŞ TARİHİ vardır; o işletmenin kayıtları yalnızca
    açıldığı tarihten BUGÜNE kadar uzanır (ör. eski bir servis 2013'ten beri,
    yeni açılan bir servis 2023'ten beri kayıt üretir).
  - Yetkili servisler ağırlıklı kendi markalarına bakar (Arçelik servisi → Arçelik/Beko).
  - Yıllar geçtikçe kayıt hacmi artar (işletmeler büyür → daha çok veri yakın tarihlerde).
  - MEVSİMSELLİK: klima arızaları yazın, kombi arızaları kışın yoğunlaşır.
  - Her cihaz türünün kendine özgü tipik arızaları ve uyumlu markaları vardır.
  - Servis ücreti yapılan işleme göre değişir; garanti içi (yeni) cihazlarda 0'dır.
  - Arıza riski; cihaz yaşı ↑, son bakımdan geçen gün ↑, bakım sayısı ↓ oldukça artar.

Kullanım:
    python veri_seti_uret.py            # 5000 kayıtlık veri_seti.csv üretir
    python veri_seti_uret.py 8000       # 8000 kayıt üretir

Sadece standart kütüphane kullanır (numpy/pandas GEREKMEZ).
"""

import csv
import calendar
import random
import sys
from datetime import date, timedelta
from pathlib import Path

CSV_YOLU = Path(__file__).parent / "veri_seti.csv"

# Tekrarlanabilirlik: aynı tohum -> her çalıştırmada AYNI veri seti üretilir.
TOHUM = 2024

# Tüm veriler tek şehirden toplandı.
SEHIR = "Adana Kozan"

# Bugün (kayıtlar bugüne kadar uzanır). Sistem saatinden alınır.
BUGUN = date.today()

# ----------------------------------------------------------------------------
# Cihaz türleri: uyumlu markalar ve o cihazda SIK görülen arızalar
# ----------------------------------------------------------------------------
CIHAZLAR = {
    "Çamaşır Makinesi": {
        "markalar": ["Arçelik", "Beko", "Bosch", "Siemens", "Vestel", "Samsung", "LG", "Profilo"],
        "arizalar": ["Pompa Arızası", "Rulman Sesi", "Kapı Lastiği Yırtık",
                     "Su Sızıntısı", "Elektronik Kart Arızası", "Motor Arızası"],
    },
    "Bulaşık Makinesi": {
        "markalar": ["Arçelik", "Beko", "Bosch", "Siemens", "Vestel", "Profilo"],
        "arizalar": ["Pompa Arızası", "Su Sızıntısı", "Filtre Tıkanması",
                     "Isıtıcı Arızası", "Elektronik Kart Arızası"],
    },
    "Buzdolabı": {
        "markalar": ["Arçelik", "Beko", "Bosch", "Siemens", "Vestel", "Samsung", "LG"],
        "arizalar": ["Soğutma Sorunu", "Kompresör Arızası", "Termostat Arızası",
                     "Gaz Kaçağı", "Fan Arızası"],
    },
    "Klima": {
        "markalar": ["Arçelik", "Vestel", "Samsung", "LG", "Daikin", "Mitsubishi", "Bosch"],
        "arizalar": ["Gaz Kaçağı", "Soğutma Sorunu", "Kompresör Arızası",
                     "Sensör Arızası", "Filtre Tıkanması"],
    },
    "Kombi": {
        "markalar": ["Vaillant", "Bosch", "Baymak", "DemirDöküm", "Buderus", "ECA"],
        "arizalar": ["Ateşleme Sorunu", "Kireçlenme", "Su Basıncı Düşük",
                     "Sensör Arızası", "Pompa Arızası", "Elektronik Kart Arızası"],
    },
    "Su Arıtma": {
        "markalar": ["Aquatech", "Tunçmatik", "Hidrotek", "Aqua Pro", "Vestel"],
        "arizalar": ["Membran Arızası", "Filtre Tıkanması", "Su Sızıntısı", "Pompa Arızası"],
    },
    "Fırın": {
        "markalar": ["Arçelik", "Beko", "Bosch", "Siemens", "Vestel", "Profilo"],
        "arizalar": ["Termostat Arızası", "Isıtıcı Arızası", "Kapı Camı Kırık",
                     "Elektronik Kart Arızası", "Ateşleme Sorunu"],
    },
}
# Cihaz türlerinin genel görülme sıklığı (bağımsız servislerde kullanılır)
CIHAZ_AGIRLIK = {
    "Çamaşır Makinesi": 0.22, "Bulaşık Makinesi": 0.12, "Buzdolabı": 0.20,
    "Klima": 0.16, "Kombi": 0.16, "Su Arıtma": 0.08, "Fırın": 0.06,
}

# ----------------------------------------------------------------------------
# İŞLETMELER — Adana Kozan'daki farklı servis firmaları
#   ad        : işletme adı (CSV'de "isletme" kolonu)
#   acilis    : açılış tarihi — kayıtları bu tarihten BUGÜNE kadar uzanır
#   markalar  : servis verdiği markalar (yetkili servisse kendi grubunun markaları)
#   cihazlar  : baktığı cihaz türleri
#   teknisyenler : bu işletmenin kendi teknisyenleri
#   agirlik   : toplam kayıt içindeki payı (büyük/küçük işletme)
# ----------------------------------------------------------------------------
ISLETMELER = [
    {
        "ad": "Kozan İklimlendirme Servisi",   # en eski — klima & kombi uzmanı
        "acilis": date(2013, 3, 1),
        "markalar": ["Daikin", "Mitsubishi", "Bosch", "Vaillant", "Baymak", "DemirDöküm", "ECA", "Buderus"],
        "cihazlar": ["Klima", "Kombi"],
        "teknisyenler": ["Mehmet Demir", "Ramazan Koç", "Tolga Şahin"],
        "agirlik": 0.24,
    },
    {
        "ad": "Arçelik Yetkili Servisi",
        "acilis": date(2015, 6, 1),
        "markalar": ["Arçelik", "Beko"],
        "cihazlar": ["Çamaşır Makinesi", "Bulaşık Makinesi", "Buzdolabı", "Klima", "Fırın"],
        "teknisyenler": ["Serkan Aydın", "Hakan Yıldız", "İbrahim Polat"],
        "agirlik": 0.22,
    },
    {
        "ad": "Bosch-Siemens Yetkili Servisi",
        "acilis": date(2017, 9, 1),
        "markalar": ["Bosch", "Siemens", "Profilo"],
        "cihazlar": ["Çamaşır Makinesi", "Bulaşık Makinesi", "Buzdolabı", "Kombi", "Fırın"],
        "teknisyenler": ["Onur Çelik", "Volkan Arslan"],
        "agirlik": 0.18,
    },
    {
        "ad": "Vestel Yetkili Servisi",
        "acilis": date(2019, 4, 1),
        "markalar": ["Vestel"],
        "cihazlar": ["Çamaşır Makinesi", "Bulaşık Makinesi", "Buzdolabı", "Klima", "Su Arıtma", "Fırın"],
        "teknisyenler": ["Kadir Yalçın", "Emre Doğan"],
        "agirlik": 0.14,
    },
    {
        "ad": "Samsung & LG Teknik Servis",
        "acilis": date(2021, 2, 1),
        "markalar": ["Samsung", "LG"],
        "cihazlar": ["Çamaşır Makinesi", "Buzdolabı", "Klima"],
        "teknisyenler": ["Burak Şen", "Gökhan Avcı"],
        "agirlik": 0.10,
    },
    {
        "ad": "Öz Teknik Genel Servis",   # en yeni — bağımsız, çok markalı
        "acilis": date(2023, 5, 1),
        "markalar": None,                  # None = tüm markalar (bağımsız servis)
        "cihazlar": list(CIHAZLAR.keys()), # her cihaza bakar
        "teknisyenler": ["Murat Kılıç", "Selim Ateş", "Yusuf Bağ"],
        "agirlik": 0.12,
    },
]

# Her işletme için baktığı (cihaz_turu -> uyumlu marka listesi) eşlemesini önceden hesapla.
# Yetkili servisin markaları ile cihazın uyumlu markalarının KESİŞİMİ alınır.
def _isletme_cihaz_marka(isletme: dict) -> dict:
    sonuc = {}
    for cihaz in isletme["cihazlar"]:
        uyumlu = CIHAZLAR[cihaz]["markalar"]
        if isletme["markalar"] is None:
            markalar = list(uyumlu)                       # bağımsız servis: hepsi
        else:
            markalar = [m for m in uyumlu if m in isletme["markalar"]]
        if markalar:                                      # kesişim boşsa o cihazı atla
            sonuc[cihaz] = markalar
    return sonuc

for _isl in ISLETMELER:
    _isl["_cihaz_marka"] = _isletme_cihaz_marka(_isl)
    # İşletmenin baktığı cihazların genel ağırlıklarını al (yeniden normalize edilir)
    _isl["_cihaz_listesi"] = list(_isl["_cihaz_marka"].keys())
    _isl["_cihaz_agirlik"] = [CIHAZ_AGIRLIK[c] for c in _isl["_cihaz_listesi"]]

# ----------------------------------------------------------------------------
# MEVSİMSELLİK — cihaz türüne göre aylık arıza yoğunluğu (Ocak..Aralık, 12 değer)
#   Klima yazın (Adana sıcak → çok belirgin), kombi kışın zirve yapar.
# ----------------------------------------------------------------------------
MEVSIM = {
    "Klima":     [3, 3, 5, 9, 15, 19, 21, 18, 11, 6, 4, 3],   # yaz zirvesi
    "Kombi":     [19, 16, 11, 6, 3, 2, 1, 1, 3, 9, 14, 17],   # kış zirvesi
    "Buzdolabı": [6, 6, 7, 8, 11, 14, 15, 13, 9, 7, 6, 6],    # sıcakta artar
    "Su Arıtma": [8, 8, 9, 9, 9, 9, 9, 8, 8, 8, 8, 9],        # ~düz
    # Beyaz eşya (çamaşır/bulaşık/fırın): hafif dalgalı, neredeyse düz
    "_VARSAYILAN": [8, 8, 9, 9, 9, 8, 8, 9, 8, 8, 8, 8],
}

# Arıza türüne göre tipik olarak değişen parça (parça değişimi yapıldıysa)
ARIZA_PARCA = {
    "Pompa Arızası": "Tahliye Pompası", "Rulman Sesi": "Rulman Seti",
    "Kapı Lastiği Yırtık": "Kapı Körüğü", "Su Sızıntısı": "Conta / Hortum",
    "Elektronik Kart Arızası": "Anakart", "Motor Arızası": "Motor",
    "Filtre Tıkanması": "Filtre", "Isıtıcı Arızası": "Rezistans",
    "Soğutma Sorunu": "Soğutucu Gaz", "Kompresör Arızası": "Kompresör",
    "Termostat Arızası": "Termostat", "Gaz Kaçağı": "Gaz Dolumu + Kaçak Tamiri",
    "Fan Arızası": "Fan Motoru", "Ateşleme Sorunu": "Ateşleme Elektrodu",
    "Kireçlenme": "Eşanjör Temizliği", "Su Basıncı Düşük": "Genleşme Tankı",
    "Sensör Arızası": "Sensör", "Membran Arızası": "RO Membran",
    "Kapı Camı Kırık": "Fırın Kapı Camı",
}

ISLEMLER = ["Parça Değişimi", "Onarım", "Genel Bakım", "Temizlik", "Ayar ve Test"]

# Yapılan işleme göre tipik ücret aralığı (TL) — garanti dışı cihazlar için
ISLEM_UCRET = {
    "Parça Değişimi": (1200, 3800),
    "Onarım":         (700, 1800),
    "Ayar ve Test":   (400, 900),
    "Genel Bakım":    (350, 800),
    "Temizlik":       (300, 650),
}

RISK_ETIKET = {0: "Düşük", 1: "Orta", 2: "Yüksek"}


def _risk_seviyesi(cihaz_yasi: int, bakim_sayisi: int, son_bakim_gun: int,
                   rng: random.Random) -> int:
    """
    Cihazın arıza riskini hesaplar (0=Düşük, 1=Orta, 2=Yüksek).
    Mantık: yaş ve son bakımdan geçen süre arttıkça risk artar;
            düzenli bakım (yüksek bakım sayısı) riski azaltır.
    Küçük bir rastgele 'gürültü' eklenir ki veri tek bir formüle hapsolmasın.
    """
    yas_p     = min(cihaz_yasi, 15) / 15.0
    bekleme_p = min(son_bakim_gun, 720) / 720.0
    bakim_p   = min(bakim_sayisi, 15) / 15.0

    skor = (0.45 * yas_p) + (0.40 * bekleme_p) - (0.25 * bakim_p)
    skor += rng.gauss(0, 0.07)  # gerçek hayattaki belirsizlik
    if skor < 0.27:
        return 0
    if skor < 0.46:
        return 1
    return 2


def _gercekci_tarih(isletme: dict, cihaz_turu: str, rng: random.Random) -> date:
    """
    Bir kayıt için gerçekçi servis tarihi üretir:
      - Tarih, işletmenin açılışı ile BUGÜN arasında olur.
      - Yıllar geçtikçe kayıt hacmi artar (işletme büyür → yakın yıllar daha yoğun).
      - Ay seçimi cihazın MEVSİMSELLİĞİNE göre ağırlıklandırılır (klima yaz, kombi kış).
    """
    acilis = isletme["acilis"]
    ilk_yil, son_yil = acilis.year, BUGUN.year

    # 1) Yıl seç — büyüme etkisi: açılıştan uzaklaştıkça (yakın yıllar) ağırlık artar
    yillar = list(range(ilk_yil, son_yil + 1))
    yil_agirlik = [(y - ilk_yil + 1) ** 1.3 for y in yillar]
    yil = rng.choices(yillar, weights=yil_agirlik, k=1)[0]

    # 2) O yıl içinde geçerli ayları belirle (açılış yılında açılış ayından önce yok;
    #    bu yılsa bugünden sonraki aylar yok) ve mevsimsel ağırlıkla ay seç
    ay_mevsim = MEVSIM.get(cihaz_turu, MEVSIM["_VARSAYILAN"])
    alt_ay = acilis.month if yil == ilk_yil else 1
    ust_ay = BUGUN.month if yil == son_yil else 12
    aylar = list(range(alt_ay, ust_ay + 1))
    ay_agirlik = [ay_mevsim[a - 1] for a in aylar]
    ay = rng.choices(aylar, weights=ay_agirlik, k=1)[0]

    # 3) Gün seç (ayın geçerli günleri; açılış/bugün sınırlarına saygı duy)
    ayin_gunu = calendar.monthrange(yil, ay)[1]
    alt_gun = acilis.day if (yil == ilk_yil and ay == acilis.month) else 1
    ust_gun = BUGUN.day if (yil == son_yil and ay == BUGUN.month) else ayin_gunu
    if alt_gun > ust_gun:           # uç durum koruması
        alt_gun = ust_gun
    gun = rng.randint(alt_gun, ust_gun)
    return date(yil, ay, gun)


def veri_seti_olustur(kayit_sayisi: int = 5000, dosya_yolu: Path = CSV_YOLU) -> Path:
    rng = random.Random(TOHUM)

    sutunlar = [
        "servis_tarihi", "isletme", "sehir",
        "cihaz_turu", "marka", "model", "cihaz_yasi", "garanti_durumu",
        "ariza_turu", "yapilan_islem", "kullanilan_parca", "servis_ucreti",
        "teknisyen", "bakim_sayisi", "son_bakim_gun", "musteri_memnuniyeti",
        "risk_seviyesi",
    ]

    isletme_agirlik = [i["agirlik"] for i in ISLETMELER]

    satirlar = []
    for _ in range(kayit_sayisi):
        # 1) İşletme seç (büyük işletme daha çok kayıt üretir)
        isletme = rng.choices(ISLETMELER, weights=isletme_agirlik, k=1)[0]

        # 2) İşletmenin baktığı cihazlardan birini seç, ona uygun markayı seç
        cihaz_turu = rng.choices(isletme["_cihaz_listesi"],
                                 weights=isletme["_cihaz_agirlik"], k=1)[0]
        marka = rng.choice(isletme["_cihaz_marka"][cihaz_turu])
        model = f"{marka[:3].upper()}-{rng.randint(1000, 9999)}"
        ariza = rng.choice(CIHAZLAR[cihaz_turu]["arizalar"])

        # 3) Gerçekçi servis tarihi (işletme açılışı + büyüme + mevsimsellik)
        servis_tarihi = _gercekci_tarih(isletme, cihaz_turu, rng)

        # Cihaz yaşı: çoğunluk 1-12 yıl, orta yaş daha sık (üçgensel dağılım)
        cihaz_yasi = int(round(rng.triangular(1, 15, 6)))

        # Garanti: ilk 2 yıl büyük ihtimalle garanti içi
        if cihaz_yasi <= 2:
            garanti = "Garanti İçi" if rng.random() < 0.8 else "Garanti Dışı"
        else:
            garanti = "Garanti Dışı"

        # Yaşlı cihaz -> daha fazla geçmiş bakım; yeni cihaz -> az bakım
        bakim_sayisi = max(0, int(round(rng.triangular(0, cihaz_yasi * 2 + 2, cihaz_yasi))))
        son_bakim_gun = rng.randint(10, 720)

        # Yapılan işlem: arıza ciddiyse daha çok parça değişimi/onarım
        if ariza in ("Kompresör Arızası", "Motor Arızası", "Elektronik Kart Arızası",
                     "Anakart", "Membran Arızası"):
            islem = rng.choices(ISLEMLER, weights=[55, 30, 7, 4, 4], k=1)[0]
        else:
            islem = rng.choices(ISLEMLER, weights=[30, 30, 18, 12, 10], k=1)[0]

        parca = ARIZA_PARCA.get(ariza, "Muhtelif Parça") if islem == "Parça Değişimi" else "-"

        # Ücret: garanti içiyse 0, değilse işleme göre aralıktan seçilir
        if garanti == "Garanti İçi":
            servis_ucreti = 0
        else:
            alt, ust = ISLEM_UCRET[islem]
            servis_ucreti = int(round(rng.uniform(alt, ust) / 10) * 10)  # 10 TL'ye yuvarla

        risk = _risk_seviyesi(cihaz_yasi, bakim_sayisi, son_bakim_gun, rng)

        # Memnuniyet: ücret düşük + sorun çözülmüşse genelde yüksek
        memnuniyet = rng.choices([3, 4, 5], weights=[15, 45, 40], k=1)[0]

        satirlar.append([
            servis_tarihi.isoformat(),
            isletme["ad"],
            SEHIR,
            cihaz_turu,
            marka,
            model,
            cihaz_yasi,
            garanti,
            ariza,
            islem,
            parca,
            servis_ucreti,
            rng.choice(isletme["teknisyenler"]),
            bakim_sayisi,
            son_bakim_gun,
            memnuniyet,
            RISK_ETIKET[risk],
        ])

    # Kayıtları tarihe göre sırala (gerçek bir dışa aktarım gibi)
    satirlar.sort(key=lambda s: s[0])

    with open(dosya_yolu, "w", newline="", encoding="utf-8-sig") as f:
        yazici = csv.writer(f)
        yazici.writerow(sutunlar)
        yazici.writerows(satirlar)

    # Özet bilgi
    dagilim = {"Düşük": 0, "Orta": 0, "Yüksek": 0}
    isletme_sayac = {}
    for s in satirlar:
        dagilim[s[-1]] += 1
        isletme_sayac[s[1]] = isletme_sayac.get(s[1], 0) + 1
    print(f"[Veri Üretici] {len(satirlar)} kayıt -> {dosya_yolu.name}")
    print(f"  Tarih aralığı : {satirlar[0][0]} … {satirlar[-1][0]}")
    print(f"  Risk dağılımı : {dagilim}")
    print(f"  İşletme bazında kayıt:")
    for ad, adet in sorted(isletme_sayac.items(), key=lambda x: -x[1]):
        print(f"    {ad:<32}: {adet}")
    return dosya_yolu


if __name__ == "__main__":
    adet = int(sys.argv[1]) if len(sys.argv) > 1 else 5000
    veri_seti_olustur(adet)
