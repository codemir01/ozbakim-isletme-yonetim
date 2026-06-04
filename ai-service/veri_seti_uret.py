"""
Servis Kayıtları Veri Seti Üretici
==================================
Bir beyaz eşya / iklimlendirme servis firmasının yıllar içinde biriktirdiği
bakım & onarım kayıtlarını taklit eden, GERÇEKÇİ bir veri seti üretir.

Neden bu script var?
  - Elimizde gerçek bir işletmenin kaydı olmadığı için, gerçeğe yakın
    (mantıklı ilişkilere sahip) bir veri setini biz üretiyoruz.
  - Üretilen "veri_seti.csv" dosyası, AI modelinin (model.py) eğitiminde kullanılır.
  - Gerçek bir firma verisi gelirse: aynı sütun başlıklarıyla bir CSV koymanız yeterli.

Gerçekçiliği sağlayan kurallar:
  - Her cihaz türünün KENDİNE ÖZGÜ tipik arızaları vardır
    (klima → gaz kaçağı, kombi → kireçlenme, çamaşır makinesi → rulman/pompa...).
  - Markalar cihaz türüyle uyumlu seçilir (kombi markası ≠ buzdolabı markası).
  - Servis ücreti, yapılan işleme göre değişir (parça değişimi > onarım > bakım).
  - Garanti içindeki (yeni) cihazlarda ücret 0 olur.
  - Arıza riski; cihaz yaşı ↑, son bakımdan geçen gün ↑ ve bakım sayısı ↓ oldukça artar.

Kullanım:
    python veri_seti_uret.py            # 5000 kayıtlık veri_seti.csv üretir
    python veri_seti_uret.py 8000       # 8000 kayıt üretir

Sadece standart kütüphane kullanır (numpy/pandas GEREKMEZ).
"""

import csv
import random
import sys
from datetime import date, timedelta
from pathlib import Path

CSV_YOLU = Path(__file__).parent / "veri_seti.csv"

# Tekrarlanabilirlik: aynı tohum -> her çalıştırmada AYNI veri seti üretilir.
TOHUM = 2024

# ----------------------------------------------------------------------------
# Sabit listeler (Türkiye pazarına uygun)
# ----------------------------------------------------------------------------
SEHIRLER = [
    "İstanbul", "Ankara", "İzmir", "Bursa", "Antalya", "Adana", "Konya",
    "Gaziantep", "Kayseri", "Mersin", "Eskişehir", "Samsun", "Denizli", "Sakarya",
]

ERKEK_ISIM = ["Ahmet", "Mehmet", "Mustafa", "Ali", "Hüseyin", "Hasan", "İbrahim",
              "Murat", "Emre", "Burak", "Serkan", "Kemal", "Oğuz", "Yusuf"]
KADIN_ISIM = ["Ayşe", "Fatma", "Emine", "Hatice", "Zeynep", "Elif", "Meryem",
              "Şenay", "Derya", "Gül", "Sibel", "Esra", "Buse", "Nur"]
SOYADLAR = ["Yılmaz", "Kaya", "Demir", "Şahin", "Çelik", "Yıldız", "Yıldırım",
            "Öztürk", "Aydın", "Arslan", "Doğan", "Kılıç", "Aslan", "Çetin",
            "Kara", "Koç", "Kurt", "Özdemir", "Şimşek", "Polat"]

TEKNISYENLER = ["Mehmet Demir", "Ramazan Koç", "Serkan Aydın", "Hakan Yıldız",
                "Onur Çelik", "Volkan Arslan", "Tolga Şahin"]

# Her cihaz türü için: uyumlu markalar ve o cihazda SIK görülen arızalar
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
# Cihaz türleri ve görülme sıklıkları (toplam = 1.0)
CIHAZ_TURLERI = list(CIHAZLAR.keys())
CIHAZ_AGIRLIK = [0.22, 0.12, 0.20, 0.16, 0.16, 0.08, 0.06]

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


def _ad_soyad(rng: random.Random) -> str:
    isim = rng.choice(ERKEK_ISIM + KADIN_ISIM)
    return f"{isim} {rng.choice(SOYADLAR)}"


def _telefon(rng: random.Random) -> str:
    return f"05{rng.randint(30, 59)} {rng.randint(100,999)} {rng.randint(10,99)} {rng.randint(10,99)}"


def _risk_seviyesi(cihaz_yasi: int, bakim_sayisi: int, son_bakim_gun: int,
                   rng: random.Random) -> int:
    """
    Cihazın arıza riskini hesaplar (0=Düşük, 1=Orta, 2=Yüksek).
    Mantık: yaş ve son bakımdan geçen süre arttıkça risk artar;
            düzenli bakım (yüksek bakım sayısı) riski azaltır.
    Küçük bir rastgele 'gürültü' eklenir ki veri tek bir formüle hapsolmasın.
    """
    # Özellikleri 0–1 aralığına normalize et (ağırlıklar adil olsun)
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


def veri_seti_olustur(kayit_sayisi: int = 5000, dosya_yolu: Path = CSV_YOLU) -> Path:
    rng = random.Random(TOHUM)

    bas_tarih = date(2022, 1, 1)
    bit_tarih = date(2025, 5, 31)
    gun_araligi = (bit_tarih - bas_tarih).days

    sutunlar = [
        "servis_no", "servis_tarihi", "sehir", "musteri_adi", "telefon",
        "cihaz_turu", "marka", "model", "cihaz_yasi", "garanti_durumu",
        "ariza_turu", "yapilan_islem", "kullanilan_parca", "servis_ucreti",
        "teknisyen", "bakim_sayisi", "son_bakim_gun", "musteri_memnuniyeti",
        "risk_seviyesi",
    ]

    satirlar = []
    for i in range(1, kayit_sayisi + 1):
        servis_tarihi = bas_tarih + timedelta(days=rng.randint(0, gun_araligi))

        cihaz_turu = rng.choices(CIHAZ_TURLERI, weights=CIHAZ_AGIRLIK, k=1)[0]
        bilgi = CIHAZLAR[cihaz_turu]
        marka = rng.choice(bilgi["markalar"])
        model = f"{marka[:3].upper()}-{rng.randint(1000, 9999)}"
        ariza = rng.choice(bilgi["arizalar"])

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

        if islem == "Parça Değişimi":
            parca = ARIZA_PARCA.get(ariza, "Muhtelif Parça")
        else:
            parca = "-"

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
            f"SRV-{servis_tarihi.year}-{i:05d}",
            servis_tarihi.isoformat(),
            rng.choice(SEHIRLER),
            _ad_soyad(rng),
            _telefon(rng),
            cihaz_turu,
            marka,
            model,
            cihaz_yasi,
            garanti,
            ariza,
            islem,
            parca,
            servis_ucreti,
            rng.choice(TEKNISYENLER),
            bakim_sayisi,
            son_bakim_gun,
            memnuniyet,
            RISK_ETIKET[risk],
        ])

    # Kayıtları tarihe göre sırala (gerçek bir dışa aktarım gibi)
    satirlar.sort(key=lambda s: s[1])

    with open(dosya_yolu, "w", newline="", encoding="utf-8-sig") as f:
        yazici = csv.writer(f)
        yazici.writerow(sutunlar)
        yazici.writerows(satirlar)

    # Özet bilgi
    dagilim = {"Düşük": 0, "Orta": 0, "Yüksek": 0}
    for s in satirlar:
        dagilim[s[-1]] += 1
    print(f"[Veri Üretici] {len(satirlar)} kayıt -> {dosya_yolu.name}")
    print(f"  Risk dağılımı: {dagilim}")
    return dosya_yolu


if __name__ == "__main__":
    adet = int(sys.argv[1]) if len(sys.argv) > 1 else 5000
    veri_seti_olustur(adet)
