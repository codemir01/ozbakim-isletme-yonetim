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


# Fatura/fiş görselini yapılandırılmış veriye çeviren yönerge (OCR + LLM).
# Gemini'ye response_mime_type="application/json" ile birlikte verilir → temiz JSON döner.
FATURA_PROMPT = (
    "Sen bir fatura/fiş okuma asistanısın. Sana verilen fatura veya fiş görselini analiz et. "
    "SADECE şu JSON şemasında yanıt ver, başka hiçbir metin ekleme:\n"
    "{\n"
    '  "firma": "satıcı/tedarikçi firma adı (bulamazsan boş bırak)",\n'
    '  "tarih": "YYYY-AA-GG biçiminde fatura tarihi (bulamazsan boş bırak)",\n'
    '  "toplamTutar": KDV dahil genel toplam (sayı, TL sembolü ve binlik ayraç olmadan, ondalık nokta),\n'
    '  "kalemler": [ { "ad": "ürün/hizmet adı", "adet": sayı, "birimFiyat": sayı } ]\n'
    "}\n"
    "Tüm para değerlerini ondalık noktayla SAYI olarak ver (ör. 4500.00). "
    "Kalem bulamazsan boş liste döndür. Tarihi mutlaka YYYY-AA-GG biçimine çevir."
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
            hata_metni = str(e).lower()
            # Geçici sayılan hatalar: Gemini yoğunluğu (503) + anlık ağ/DNS kopmaları
            gecici = (
                "503" in hata_metni
                or "unavailable" in hata_metni
                or "overloaded" in hata_metni
                or "getaddrinfo" in hata_metni      # DNS çözümlenemedi (anlık)
                or "connection" in hata_metni        # bağlantı koptu/reddedildi
                or "timed out" in hata_metni
                or "11002" in hata_metni             # Windows: DNS sunucusu geçici yanıt vermedi
            )
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


@app.post("/fatura-oku", tags=["Görüntü"])
async def fatura_oku(foto: UploadFile = File(...)):
    """
    Fatura/fiş görselini Gemini Vision ile okur ve yapılandırılmış JSON döndürür:
    { firma, tarih, toplamTutar, kalemler:[{ad,adet,birimFiyat}] }.
    .NET backend bu uçtan gelen veriyi gelir-gider ve stok kayıtlarına aktarır.
    """
    icerik = await foto.read()
    if not icerik:
        raise HTTPException(status_code=400, detail="Boş dosya gönderildi.")

    from google.genai import types
    mime = foto.content_type or "image/jpeg"
    contents = [
        types.Content(role="user", parts=[
            types.Part.from_bytes(data=icerik, mime_type=mime),
            types.Part.from_text(text="Bu fatura/fiş görselini oku ve istenen JSON'u döndür."),
        ])
    ]
    config = types.GenerateContentConfig(
        system_instruction=FATURA_PROMPT,
        response_mime_type="application/json",   # modeli temiz JSON dönmeye zorla
    )
    ham = _gemini_cagir(contents, config=config)

    import json
    try:
        return json.loads(ham)
    except Exception:
        # Model bazen JSON'u ```json ... ``` bloğuyla sarabilir — temizleyip tekrar dene
        temiz = ham.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        try:
            return json.loads(temiz)
        except Exception:
            raise HTTPException(status_code=502, detail="Fatura çözümlenemedi (geçersiz AI yanıtı).")


# Teknisyenin sesle söylediği ham notu profesyonel servis raporuna çeviren yönerge (NLP).
RAPOR_PROMPT = (
    "Sen bir teknik servis raporu editörüsün. Teknisyen sahada yaptığı işi sesle, "
    "dağınık ve günlük dille anlatıyor. Görevin bunu düzgün, profesyonel bir Türkçe "
    "BAKIM/SERVİS RAPORUNA çevirmek. Kurallar:\n"
    "- Resmi, net ve teknik bir dil kullan.\n"
    "- Yapılan işlemleri ve değiştirilen/kullanılan parçaları açıkça belirt.\n"
    "- Gereksiz tekrar ve dolgu sözcükleri çıkar; bilgiyi koru.\n"
    "- Kısa bir paragraf veya madde listesi olabilir.\n"
    "- SADECE düzeltilmiş raporu döndür, ekstra açıklama veya başlık ekleme."
)


class RaporDuzenleIstek(BaseModel):
    metin: str = Field(..., description="Sesten yazıya çevrilmiş ham teknisyen notu")


@app.post("/rapor-duzenle", tags=["NLP"])
def rapor_duzenle(istek: RaporDuzenleIstek):
    """
    Teknisyenin sesle yazdırdığı ham metni alıp profesyonel bir servis raporuna çevirir.
    Konuşmadan-yazıya (STT) tarayıcıda yapılır; bu uç yalnızca metni düzenler (NLP).
    """
    metin = (istek.metin or "").strip()
    if not metin:
        raise HTTPException(status_code=400, detail="Boş metin gönderildi.")

    from google.genai import types
    contents = [types.Content(role="user", parts=[types.Part.from_text(text=metin)])]
    config = types.GenerateContentConfig(system_instruction=RAPOR_PROMPT)
    return {"rapor": _gemini_cagir(contents, config=config).strip()}


# ── Rota Optimizasyonu (Gezgin Satıcı Problemi / TSP) ───────────────────────
# Teknisyenin gün içinde gideceği adresleri en kısa toplam mesafeyle sıralar.
# Dış kütüphane (OR-Tools) yerine saf Python: en yakın komşu + 2-opt sezgiseli.
# Mesafe = haversine (iki GPS noktası arası kuşuçuşu km) → internet/anahtar gerekmez.
class RotaNokta(BaseModel):
    enlem: float
    boylam: float


class RotaIstek(BaseModel):
    noktalar: list[RotaNokta] = Field(..., description="Ziyaret edilecek konumlar")


def _haversine_km(a: RotaNokta, b: RotaNokta) -> float:
    import math
    R = 6371.0  # Dünya yarıçapı (km)
    lat1, lon1, lat2, lon2 = map(math.radians, [a.enlem, a.boylam, b.enlem, b.boylam])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))


def _rota_uzunluk(sira: list[int], n: list[RotaNokta]) -> float:
    return sum(_haversine_km(n[sira[i]], n[sira[i + 1]]) for i in range(len(sira) - 1))


@app.post("/rota-optimize", tags=["Rota"])
def rota_optimize(istek: RotaIstek):
    """
    Verilen konumlar için en kısa ziyaret sırasını (TSP) hesaplar.
    Dönüş: { sira: [indeks...], toplamMesafeKm }. İlk nokta başlangıç kabul edilir.
    """
    n = istek.noktalar
    if len(n) < 2:
        return {"sira": list(range(len(n))), "toplamMesafeKm": 0.0}

    # 1) En yakın komşu sezgiseli: 0. noktadan başla, her adımda en yakına git
    kalan = set(range(len(n)))
    sira = [0]
    kalan.discard(0)
    while kalan:
        son = sira[-1]
        yakin = min(kalan, key=lambda j: _haversine_km(n[son], n[j]))
        sira.append(yakin)
        kalan.discard(yakin)

    # 2) 2-opt iyileştirme: kesişen/uzayan kenarları ters çevirerek toplamı kısalt
    gelisti = True
    while gelisti:
        gelisti = False
        for i in range(1, len(sira) - 1):
            for k in range(i + 1, len(sira)):
                yeni = sira[:i] + sira[i:k + 1][::-1] + sira[k + 1:]
                if _rota_uzunluk(yeni, n) + 1e-9 < _rota_uzunluk(sira, n):
                    sira = yeni
                    gelisti = True

    return {"sira": sira, "toplamMesafeKm": round(_rota_uzunluk(sira, n), 2)}


@app.post("/rapor-sesli", tags=["NLP"])
async def rapor_sesli(ses: UploadFile = File(...)):
    """
    MOBİL için: teknisyenin ses kaydını alır, Gemini hem yazıya döker (STT)
    hem de profesyonel servis raporuna çevirir (NLP) — tek çağrıda.
    Eli kirli teknisyen klavye kullanmadan rapor yazdırır.
    """
    icerik = await ses.read()
    if not icerik:
        raise HTTPException(status_code=400, detail="Boş ses kaydı gönderildi.")

    from google.genai import types
    mime = ses.content_type or "audio/mp4"
    contents = [types.Content(role="user", parts=[
        types.Part.from_bytes(data=icerik, mime_type=mime),
        types.Part.from_text(text="Bu ses kaydını dinle ve söylenenlere göre servis raporunu üret."),
    ])]
    config = types.GenerateContentConfig(system_instruction=RAPOR_PROMPT)
    return {"rapor": _gemini_cagir(contents, config=config).strip()}
