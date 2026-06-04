"""
Arıza Risk Tahmin Modeli
========================
Eğitim verisi : veri_seti.csv (servis kayıtları)
Algoritma     : RandomForestClassifier (scikit-learn)

Özellikler:
  - cihaz_yasi      : Cihazın yaşı (yıl)
  - bakim_sayisi    : Toplam bakım / servis sayısı
  - son_bakim_gun   : Son bakımdan bu yana geçen gün

Tahmin:
  0 = Düşük risk
  1 = Orta  risk
  2 = Yüksek risk
"""

import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

ETIKETLER    = ["Düşük", "Orta", "Yüksek"]
VERI_DOSYASI = Path(__file__).parent / "veri_seti.csv"

_CIHAZ_TURLERI  = ["Çamaşır Makinesi", "Buzdolabı", "Klima", "Kombi", "Su Arıtma", "Fırın"]
_MARKALAR       = ["Arçelik", "Beko", "Bosch", "Vestel", "Samsung", "LG", "Siemens", "Vaillant", "Daikin"]
_ARIZA_TURLERI  = [
    "Motor Arızası", "Pompa Arızası", "Su Sızıntısı", "Soğutma Sorunu",
    "Termostat Arızası", "Gaz Kaçağı", "Kumanda Arızası", "Filtre Tıkanması",
    "Ateşleme Sorunu", "Kireçlenme", "Sensör Arızası", "Elektronik Kart Arızası",
    "Kapı Lastiği Yırtık", "Rulman Sesi", "Membran Arızası", "Kompresör Arızası",
]
_ISLEMLER = ["Parça Değişimi", "Genel Bakım", "Onarım", "Temizlik", "Ayar ve Test"]


def _veri_olustur_ve_kaydet(n: int = 10000) -> pd.DataFrame:
    """
    Servis kayıtlarını simüle eden veri seti oluşturur ve CSV olarak kaydeder.
    Gerçek veri geldiğinde bu fonksiyon kaldırılır, yerine hazır CSV okunur.
    """
    rng = np.random.default_rng(42)

    cihaz_yasi    = rng.integers(1, 16, size=n).astype(int)
    bakim_sayisi  = rng.integers(0, 21, size=n).astype(int)
    son_bakim_gun = rng.integers(0, 731, size=n).astype(int)

    # Domain bilgisine dayalı risk skoru
    risk_skoru = (
        cihaz_yasi * 0.4
        + (son_bakim_gun / 30) * 0.35
        - bakim_sayisi * 0.15
        + rng.normal(0, 0.3, size=n)
    )
    risk_seviyesi = np.where(risk_skoru < 2.5, 0, np.where(risk_skoru < 5.0, 1, 2))

    df = pd.DataFrame({
        "cihaz_turu"   : rng.choice(_CIHAZ_TURLERI, size=n, p=[0.28, 0.20, 0.18, 0.18, 0.08, 0.08]),
        "marka"        : rng.choice(_MARKALAR, size=n),
        "cihaz_yasi"   : cihaz_yasi,
        "ariza_turu"   : rng.choice(_ARIZA_TURLERI, size=n),
        "yapilan_islem": rng.choice(_ISLEMLER, size=n),
        "servis_ucreti": rng.integers(300, 2501, size=n),
        "bakim_sayisi" : bakim_sayisi,
        "son_bakim_gun": son_bakim_gun,
        "risk_seviyesi": risk_seviyesi,
    })

    df.to_csv(VERI_DOSYASI, index=False, encoding="utf-8-sig")
    print(f"[AI-Service] Veri seti oluşturuldu → veri_seti.csv  ({n} kayıt)")
    return df


def _veri_yukle() -> pd.DataFrame:
    if not VERI_DOSYASI.exists():
        return _veri_olustur_ve_kaydet()
    df = pd.read_csv(VERI_DOSYASI, encoding="utf-8-sig")
    print(f"[AI-Service] Veri seti yüklendi  → veri_seti.csv  ({len(df)} kayıt)")
    return df


def _model_egit() -> RandomForestClassifier:
    df = _veri_yukle()

    X = df[["cihaz_yasi", "bakim_sayisi", "son_bakim_gun"]].values
    y = df["risk_seviyesi"].values

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
        target_names=["Düşük", "Orta", "Yüksek"],
        zero_division=0,
    ))

    oznem = clf.feature_importances_
    satirlar = sorted(
        zip(["cihaz_yasi", "bakim_sayisi", "son_bakim_gun"], oznem),
        key=lambda x: -x[1],
    )
    print("  Özellik Önemleri:")
    for isim, imp in satirlar:
        bar = "█" * int(imp * 40)
        print(f"    {isim:<20}: {imp:.4f}  {bar}")
    print(f"{'─' * 52}\n")

    return clf


model: RandomForestClassifier = _model_egit()


def tahmin_et(cihaz_yasi: int, bakim_sayisi: int, son_bakim_gun: int) -> dict:
    X     = np.array([[cihaz_yasi, bakim_sayisi, son_bakim_gun]], dtype=float)
    sinif = model.predict(X)[0]
    prob  = model.predict_proba(X)[0]
    return {
        "risk"    : ETIKETLER[sinif],
        "olasilik": round(float(prob[sinif]), 4),
    }
