# ÖzBakım — İşletme Yönetim Sistemi

Beyaz eşya, klima, kombi ve su arıtma gibi cihazlara **periyodik bakım takibi** yapan; satış, müşteri, ürün, görev, fatura ve finans yönetimini tek panelde toplayan **çok kullanıcılı** işletme yönetim sistemi. Cihazların arıza riskini tahmin eden bir **yapay zekâ servisi** içerir.

> Bitirme projesi olarak geliştirilmiştir.

---

## ✨ Özellikler

- 🔐 **Rol bazlı yetkilendirme** — Admin, Satış Danışmanı, Teknisyen, İşçi (JWT ile)
- 👥 **Müşteri yönetimi** — borç/tahsilat takibi, harita üzerinde konum
- 📦 **Ürün & stok** — cihaz/yedek parça, otomatik stok düşümü
- 🛒 **Satış** — satışta otomatik bakım kartı + borç kaydı (transaction güvenli)
- 🔧 **Bakım takibi** — periyodik bakım kartları, geçmiş kaydı, gecikme uyarıları
- 🤖 **AI arıza risk tahmini** — cihaz yaşı / bakım geçmişine göre Düşük-Orta-Yüksek risk
- ✅ **Görev yönetimi** — personele görev atama, öncelik/durum takibi
- 🧾 **Fatura** — satıştan fatura kesme, **PDF** çıktısı (KDV'li)
- 💰 **Gelir/Gider** — finansal kayıt ve özet
- 📊 **Dashboard** — canlı istatistikler, satış grafiği, en çok satanlar
- 🗺️ **Müşteri haritası** — Leaflet, teknisyen için yol tarifi
- 📈 **Raporlar** — aylık özet PDF + müşteri listesi Excel
- 🔔 **Bildirimler** — uygulama içi bildirim + günlük e-posta hatırlatması
- 🪪 **Lisans takibi** — süre kontrolü ve uyarı

---

## 🧱 Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| **Backend** | ASP.NET Core Web API (N-katmanlı / Clean Architecture), EF Core, Npgsql |
| **Frontend** | React 19, Vite, TailwindCSS, React Router, Axios, Recharts, Leaflet |
| **AI Servisi** | Python, FastAPI, scikit-learn (RandomForest) |
| **Veritabanı** | PostgreSQL |
| **Kimlik Doğrulama** | JWT Bearer |
| **Arka Plan İşleri** | Hangfire (günlük bakım bildirimi) |
| **Belge / Rapor** | QuestPDF (PDF), ClosedXML (Excel) |
| **E-posta** | MailKit (Gmail SMTP) |

---

## 📂 Proje Yapısı

```
BitirmeProjesi/
├── backend/                      # ASP.NET Core çözümü
│   ├── IsletmeYonetim.Domain/        # Entity'ler, enum'lar (iş kuralı yok)
│   ├── IsletmeYonetim.Application/   # DTO, Interface, Validator
│   ├── IsletmeYonetim.Infrastructure/# Servisler, DbContext, Job, PDF, Email
│   └── IsletmeYonetim.API/           # Controller, Program.cs, middleware
├── frontend/                     # React + Vite arayüzü
│   └── src/
│       ├── pages/                    # Sayfalar (Dashboard, Müşteriler, Bakım...)
│       ├── components/               # Layout, PrivateRoute, Harita
│       ├── context/                  # AuthContext
│       └── api/                      # Axios instance
└── ai-service/                   # Python FastAPI arıza risk tahmin servisi
    ├── main.py                       # API endpoint'leri
    └── model.py                      # RandomForest modeli
```

---

## 🚀 Kurulum

### Ön Gereksinimler

- [.NET SDK](https://dotnet.microsoft.com/download) (8.0+)
- [Node.js](https://nodejs.org/) (18+)
- [Python](https://www.python.org/) (3.10+)
- [PostgreSQL](https://www.postgresql.org/) (14+)

### 1) Veritabanı

PostgreSQL'de bir veritabanı oluştur (tablolar uygulama ilk açılışta otomatik oluşur):

```sql
CREATE DATABASE isletme_yonetim;
```

### 2) Backend Konfigürasyonu ⚙️ (önemli)

Gerçek sırlar (DB şifresi, JWT anahtarı, Gmail App Password) **git'e dâhil edilmez**.
`backend/IsletmeYonetim.API/` klasöründe `appsettings.Development.json` adında bir dosya oluştur:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=isletme_yonetim;Username=postgres;Password=SIFRENIZ"
  },
  "JwtSettings": {
    "Secret": "EN_AZ_32_KARAKTERLIK_GIZLI_BIR_ANAHTAR_YAZIN"
  },
  "EmailSettings": {
    "GonderenEmail": "ornek@gmail.com",
    "AppPassword": "gmail-uygulama-sifreniz",
    "AliciEmail": "ornek@gmail.com"
  }
}
```

> `appsettings.json` içinde aynı alanların **placeholder** halleri vardır; gerçek değerleri yukarıdaki Development dosyasına yazman yeterli.

Backend'i çalıştır:

```bash
dotnet run --project backend/IsletmeYonetim.API/IsletmeYonetim.API.csproj
```

- API: `http://localhost:5096`
- Swagger: `http://localhost:5096/swagger`
- Hangfire Dashboard: `http://localhost:5096/hangfire`

### 3) AI Servisi

```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --port 8001
```

> Not: Backend açıldığında bu servisi **otomatik başlatmaya** çalışır. Otomatik başlatma için `appsettings`'teki `AiService:UvicornPath` ayarlanabilir ya da Python `PATH`'te olmalıdır.

### 4) Frontend

```bash
cd frontend
npm install
npm run dev
```

- Arayüz: `http://localhost:5173`

---

## 👤 Demo Hesapları

| Rol | E-posta | Şifre |
|-----|---------|-------|
| Admin | `admin@isletme.com` | `Admin123!` |
| Satış Danışmanı | `satis@isletme.com` | `Satis123!` |
| Teknisyen | `teknisyen@isletme.com` | `Teknis123!` |

> Bu hesaplar uygulama ilk açılışta otomatik oluşturulur.

---

## 🤖 AI Arıza Risk Tahmini

Bakım kartı detayında **"Risk Tahmini Al"** butonu, cihazın arıza riskini tahmin eder.

- **Girdiler:** cihaz yaşı (montaj tarihinden), toplam bakım sayısı, son bakımdan geçen gün
- **Çıktı:** risk seviyesi (Düşük / Orta / Yüksek) + olasılık
- **Model:** RandomForestClassifier — domain bilgisine dayalı sentetik veriyle eğitilir
  (gerçek veri gelince `ai-service/veri_seti.csv` değiştirilerek model otomatik yeniden eğitilir)

---

## 📜 Lisans

Bu proje eğitim amaçlı bir bitirme projesidir.
