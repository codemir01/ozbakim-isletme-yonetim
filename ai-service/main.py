"""
ÖzBakım AI Service — Arıza Risk Tahmin Servisi
===============================================
Port: 8001
Çalıştırmak için:
    uvicorn main:app --reload --port 8001

Endpoint:
    POST /predict
    Body: { "cihazYasi": 5, "bakimSayisi": 3, "sonBakimGunSayisi": 120 }
    Yanıt: { "risk": "Yüksek", "olasilik": 0.87 }
"""

import os, sys, time
# Windows Türkçe konsolunda (cp1254) → ─ gibi karakterler print edilince çökmesin diye
# çıktıyı UTF-8'e sabitle. model import'undan ÖNCE olmalı (model yüklenirken print yapıyor).
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from model import tahmin_et

# ai-service/.env dosyasından GEMINI_API_KEY ve GEMINI_MODEL'i oku
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash").strip()

# Gemini istemcisini sadece geçerli bir anahtar varsa kur (yoksa endpoint 503 döner)
_gemini = None
if GEMINI_API_KEY and GEMINI_API_KEY != "BURAYA_YAPISTIR":
    try:
        from google import genai
        _gemini = genai.Client(api_key=GEMINI_API_KEY)
    except Exception as _e:
        print("Gemini başlatılamadı:", _e)

# Teknisyene yardımcı olacak, görsel arıza/parça analizi için yönerge
ARIZA_PROMPT = (
    "Sen deneyimli bir beyaz eşya ve klima teknik servis uzmanısın. "
    "Sana bir cihaz veya parça fotoğrafı veriyorum. Yanıtı KISA, Türkçe ve madde madde yaz:\n"
    "1) Cihaz/Parça: Fotoğraftaki nedir? (tür, görünüyorsa marka)\n"
    "2) Görünen olası arıza/sorunlar (pas, su kaçağı, kırık, aşırı kir, fiziksel hasar, ekranda hata kodu vb.)\n"
    "3) Teknisyenin yerinde kontrol etmesi gereken noktalar\n"
    "Emin olmadığın yerleri 'kesin değil' diye belirt. Sadece teknik gözlem yap."
)

app = FastAPI(
    title="ÖzBakım AI Service",
    description="Cihaz arıza riski tahmini + görüntüyle arıza/parça analizi",
    version="1.1.0",
)

# ASP.NET Core backend'in istek atabilmesi için CORS izni
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5096", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class TahminIstek(BaseModel):
    cihazYasi: int = Field(..., ge=0, le=100, description="Cihazın yaşı (yıl)")
    bakimSayisi: int = Field(..., ge=0, description="Toplam bakım sayısı")
    sonBakimGunSayisi: int = Field(..., ge=0, description="Son bakımdan geçen gün")


class TahminYanit(BaseModel):
    risk: str            # "Düşük", "Orta", "Yüksek"
    olasilik: float      # 0.0 – 1.0


@app.get("/", tags=["Sağlık"])
def kok():
    return {"durum": "aktif", "servis": "ÖzBakım AI Service"}

@app.get("/health", tags=["Sağlık"])
def health():
    return {"status": "ok"}


@app.post("/predict", response_model=TahminYanit, tags=["Tahmin"])
def tahmin(istek: TahminIstek):
    """
    Cihaz parametrelerine göre arıza riski tahmini yapar.

    - **cihazYasi**: Cihazın kaç yıllık olduğu
    - **bakimSayisi**: Şimdiye kadar kaç bakım yapıldığı
    - **sonBakimGunSayisi**: Son bakımdan bu yana kaç gün geçtiği
    """
    sonuc = tahmin_et(istek.cihazYasi, istek.bakimSayisi, istek.sonBakimGunSayisi)
    return TahminYanit(**sonuc)


@app.post("/ariza-tespit", tags=["Görüntü"])
async def ariza_tespit(foto: UploadFile = File(...)):
    """
    Cihaz/parça fotoğrafını Gemini görüntü modeline gönderir;
    cihazı tanır ve görünen olası arızaları Türkçe açıklar.
    """
    if _gemini is None:
        raise HTTPException(
            status_code=503,
            detail="Gemini anahtarı ayarlı değil. ai-service/.env içine GEMINI_API_KEY yazıp servisi yeniden başlat.",
        )

    icerik = await foto.read()
    if not icerik:
        raise HTTPException(status_code=400, detail="Boş veya geçersiz dosya.")

    mime = foto.content_type or "image/jpeg"
    from google.genai import types
    icerikler = [types.Part.from_bytes(data=icerik, mime_type=mime), ARIZA_PROMPT]

    # Gemini bazen anlık yoğunlukta 503 UNAVAILABLE döner; geçici olduğu için
    # kısa beklemelerle birkaç kez tekrar dene (sunumda hata göstermesin).
    son_hata = None
    for deneme in range(3):
        try:
            yanit = _gemini.models.generate_content(model=GEMINI_MODEL, contents=icerikler)
            return {"sonuc": yanit.text}
        except Exception as e:
            son_hata = e
            gecici = "503" in str(e) or "UNAVAILABLE" in str(e) or "overloaded" in str(e).lower()
            if gecici and deneme < 2:
                time.sleep(1.5 * (deneme + 1))   # 1.5sn, 3sn artan bekleme
                continue
            break

    if "503" in str(son_hata) or "UNAVAILABLE" in str(son_hata):
        raise HTTPException(status_code=503, detail="Yapay zeka servisi şu an yoğun. Lütfen birkaç saniye sonra tekrar deneyin.")
    raise HTTPException(status_code=500, detail=f"Görüntü analizi başarısız: {son_hata}")
