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
from typing import Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
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

# Teknisyenle KARŞILIKLI sohbet (chat) için yönerge — usta hem foto hem yazıyla sorabilir
SOHBET_PROMPT = (
    "Sen deneyimli bir beyaz eşya, klima ve kombi teknik servis ustasısın. "
    "Sahadaki teknisyenle sohbet ediyorsun; sana yazılı açıklama ve/veya cihaz fotoğrafı veriyor. "
    "Amacın arızayı doğru teşhis etmesine yardım etmek. Kurallar:\n"
    "- Türkçe, kısa ve net konuş; gerektiğinde madde madde yaz.\n"
    "- Olası arıza(lar)ı, kontrol edilecek noktaları ve gerekiyorsa değişmesi muhtemel parçayı söyle.\n"
    "- Teşhis için bilgi eksikse teknisyene NET sorular sor (ör. 'ekranda hata kodu var mı?', 'su alıyor mu?').\n"
    "- Önceki mesajları dikkate al; konuşmanın akışını takip et.\n"
    "- Emin olmadığında 'kesin değil' diye belirt. Sadece teknik konularda yardım et."
)


def _gemini_cagir(contents, config=None) -> str:
    """
    Gemini'yi çağırır; anlık yoğunlukta (503/UNAVAILABLE) artan beklemeyle 3 kez dener.
    Arıza sohbeti (/ariza-sohbet) bunu kullanır.
    """
    if _gemini is None:
        raise HTTPException(
            status_code=503,
            detail="Gemini anahtarı ayarlı değil. ai-service/.env içine GEMINI_API_KEY yazıp servisi yeniden başlat.",
        )
    son_hata = None
    for deneme in range(3):
        try:
            yanit = _gemini.models.generate_content(model=GEMINI_MODEL, contents=contents, config=config)
            return yanit.text
        except Exception as e:
            son_hata = e
            gecici = "503" in str(e) or "UNAVAILABLE" in str(e) or "overloaded" in str(e).lower()
            if gecici and deneme < 2:
                time.sleep(1.5 * (deneme + 1))   # 1.5sn, 3sn artan bekleme
                continue
            break
    if "503" in str(son_hata) or "UNAVAILABLE" in str(son_hata):
        raise HTTPException(status_code=503, detail="Yapay zeka servisi şu an yoğun. Lütfen birkaç saniye sonra tekrar deneyin.")
    raise HTTPException(status_code=500, detail=f"Yapay zeka isteği başarısız: {son_hata}")

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


@app.post("/ariza-sohbet", tags=["Görüntü"])
async def ariza_sohbet(
    mesajlar: str = Form(...),                 # JSON: [{"rol":"user"/"model","metin":"..."}, ...]
    foto: Optional[UploadFile] = File(None),   # opsiyonel cihaz fotoğrafı (oturum boyunca tekrar gönderilir)
):
    """
    Teknisyenle KARŞILIKLI arıza sohbeti. İstemci tüm konuşma geçmişini (`mesajlar`)
    ve varsa cihaz fotoğrafını gönderir; en güncel kullanıcı mesajı listenin sonundadır.
    Foto verilmişse ilk kullanıcı mesajına eklenir (cihaz bağlamı olarak).
    """
    import json
    try:
        gecmis = json.loads(mesajlar)
    except Exception:
        raise HTTPException(status_code=400, detail="Geçersiz mesaj listesi.")
    if not isinstance(gecmis, list) or not gecmis:
        raise HTTPException(status_code=400, detail="En az bir mesaj gönderilmeli.")

    from google.genai import types
    contents = []
    for m in gecmis:
        rol = "user" if m.get("rol") == "user" else "model"
        metin = str(m.get("metin", "")).strip()
        if metin:
            contents.append(types.Content(role=rol, parts=[types.Part.from_text(text=metin)]))
    if not contents:
        raise HTTPException(status_code=400, detail="Boş mesaj.")

    # Foto varsa ilk kullanıcı mesajına görsel olarak ekle
    if foto is not None:
        icerik = await foto.read()
        if icerik:
            mime = foto.content_type or "image/jpeg"
            for c in contents:
                if c.role == "user":
                    c.parts.insert(0, types.Part.from_bytes(data=icerik, mime_type=mime))
                    break

    config = types.GenerateContentConfig(system_instruction=SOHBET_PROMPT)
    return {"cevap": _gemini_cagir(contents, config=config)}
