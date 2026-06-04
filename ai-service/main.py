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

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from model import tahmin_et

app = FastAPI(
    title="ÖzBakım AI Service",
    description="Cihaz arıza riski tahmin modeli",
    version="1.0.0",
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
