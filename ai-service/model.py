"""
Arıza Risk Tahmin Modeli
========================
Eğitim verisi : veri_seti.csv (servis firmasının bakım/onarım kayıtları)
Algoritma     : RandomForestClassifier (scikit-learn)

Kullanılan özellikler:
  - cihaz_yasi    : Cihazın yaşı (yıl)
  - bakim_sayisi  : Şimdiye kadar yapılan toplam bakım/servis sayısı
  - son_bakim_gun : Son bakımdan bu yana geçen gün

Tahmin (risk_seviyesi):
  Düşük → 0,  Orta → 1,  Yüksek → 2

Not: veri_seti.csv yoksa, veri_seti_uret.py ile gerçekçi bir veri seti otomatik üretilir.
     Gerçek bir firma verisi gelirse, aynı sütun başlıklarıyla CSV'yi değiştirmeniz yeterli.
"""

import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

ETIKETLER    = ["Düşük", "Orta", "Yüksek"]
# CSV'deki metin risk etiketini modelin beklediği sayıya çevirir
SINIF_KODU   = {"Düşük": 0, "Orta": 1, "Yüksek": 2}
OZELLIKLER   = ["cihaz_yasi", "bakim_sayisi", "son_bakim_gun"]
VERI_DOSYASI = Path(__file__).parent / "veri_seti.csv"


def _veri_yukle() -> pd.DataFrame:
    # Veri seti yoksa gerçekçi üreticiyle otomatik oluştur (numpy/pandas gerekmez)
    if not VERI_DOSYASI.exists():
        from veri_seti_uret import veri_seti_olustur
        veri_seti_olustur(kayit_sayisi=5000, dosya_yolu=VERI_DOSYASI)

    df = pd.read_csv(VERI_DOSYASI, encoding="utf-8-sig")
    print(f"[AI-Service] Veri seti yüklendi → {VERI_DOSYASI.name}  ({len(df)} kayıt)")
    return df


def _model_egit() -> RandomForestClassifier:
    df = _veri_yukle()

    X = df[OZELLIKLER].values
    # risk_seviyesi metin ("Düşük"/"Orta"/"Yüksek") → sayı (0/1/2)
    y = df["risk_seviyesi"].map(SINIF_KODU).values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X_train, y_train)

    y_pred   = clf.predict(X_test)
    dogruluk = clf.score(X_test, y_test)

    print(f"\n{'─' * 52}")
    print(f"  ÖzBakım AI — Arıza Risk Tahmin Modeli")
    print(f"{'─' * 52}")
    print(f"  Algoritma      : RandomForestClassifier")
    print(f"  Toplam kayıt   : {len(df)}")
    print(f"  Eğitim seti    : {len(X_train)} kayıt")
    print(f"  Test seti      : {len(X_test)} kayıt")
    print(f"  Test doğruluğu : %{dogruluk * 100:.1f}")
    print()
    print(classification_report(
        y_test, y_pred,
        target_names=ETIKETLER,
        zero_division=0,
    ))

    oznem = clf.feature_importances_
    satirlar = sorted(zip(OZELLIKLER, oznem), key=lambda x: -x[1])
    print("  Özellik Önemleri:")
    for isim, imp in satirlar:
        bar = "█" * int(imp * 40)
        print(f"    {isim:<20}: {imp:.4f}  {bar}")
    print(f"{'─' * 52}\n")

    return clf


model: RandomForestClassifier = _model_egit()


def tahmin_et(cihaz_yasi: int, bakim_sayisi: int, son_bakim_gun: int) -> dict:
    X     = np.array([[cihaz_yasi, bakim_sayisi, son_bakim_gun]], dtype=float)
    sinif = int(model.predict(X)[0])
    prob  = model.predict_proba(X)[0]
    return {
        "risk"    : ETIKETLER[sinif],
        "olasilik": round(float(prob[sinif]), 4),
    }
