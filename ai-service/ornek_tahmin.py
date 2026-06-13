"""
Örnek Risk Tahminleri — modeli ELLE anlamak için
=================================================
Bu script, eğitilmiş modele (model.py) farklı senaryolar verip
sonuçları okunabilir bir tablo halinde gösterir. Amaç: "Risk Tahmini Al"
butonunun arka planda neye göre karar verdiğini somut örneklerle görmek.

Çalıştırma:
    python ornek_tahmin.py

Not: model.py import edilince model otomatik eğitilir (eğitim raporu yazdırılır),
ardından aşağıdaki 6 örnek senaryo için tahmin alınır.
"""

import sys
# Windows Türkçe konsolu (cp1254) → "→" gibi karakterlerde çökmesin (main.py ile aynı fix).
# model import'undan ÖNCE olmalı (model yüklenirken print yapıyor).
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

from model import tahmin_et

# Her senaryo: (açıklama, cihaz_yasi, bakim_sayisi, son_bakim_gun)
# Senaryolar bilinçle seçildi → her biri bir özelliğin etkisini gösterir.
SENARYOLAR = [
    ("Yeni cihaz, düzenli bakımlı, yakın zamanda bakıldı",      1,  4,   30),
    ("Orta yaş, normal kullanım",                                5,  3,  180),
    ("Yaşlı, neredeyse hiç bakım yok, çok uzun süredir bakımsız", 13, 1,  650),
    ("Yaşlı AMA çok düzenli bakım yapılmış (bakım riski düşürür)", 12, 12,  60),
    ("Yeni cihaz ama 2 yıldır hiç bakım yapılmamış",             3,  0,  700),
    ("Çok yaşlı, az bakım, orta süredir bakımsız",               15, 2,  300),
]


def cizgi(uzunluk=78):
    print("─" * uzunluk)


def main():
    cizgi()
    print("  ÖRNEK RİSK TAHMİNLERİ — model neye göre karar veriyor?")
    cizgi()
    print(f"  {'Senaryo':<52}{'Yaş':>4}{'Bkm':>4}{'Gün':>5}")
    print(f"  {'(girdi → çıktı)':<52}{'':>4}{'':>4}{'':>5}")
    cizgi()

    for aciklama, yas, bakim, gun in SENARYOLAR:
        sonuc = tahmin_et(yas, bakim, gun)
        risk = sonuc["risk"]
        olasilik = sonuc["olasilik"]

        # Risk seviyesine göre görsel işaret
        isaret = {"Düşük": "🟢", "Orta": "🟡", "Yüksek": "🔴"}.get(risk, "  ")

        print(f"  {aciklama:<52}{yas:>4}{bakim:>4}{gun:>5}")
        print(f"     → {isaret} {risk.upper():<8}  (model güveni: %{olasilik * 100:.0f})")
        print()

    cizgi()
    print("  YORUM:")
    print("  • Yaş ↑ ve son bakımdan geçen gün ↑  → risk ARTAR")
    print("  • Bakım sayısı ↑                      → risk AZALIR")
    print("  • 4. örnek bunu kanıtlar: 12 yaşında ama 12 kez bakım yapıldığı")
    print("    için risk, bakımsız 13 yaşındaki cihazdan DAHA DÜŞÜK çıkar.")
    cizgi()


if __name__ == "__main__":
    main()
