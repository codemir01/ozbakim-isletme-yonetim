# -*- coding: utf-8 -*-
"""
Bitirme Projesi Raporu uretici.
python-docx ile profesyonel bir Word (.docx) dosyasi olusturur.
Calistirmak icin:  python rapor/rapor_olustur.py
Cikti:             rapor/Bitirme_Raporu.docx
"""

from docx import Document
from docx.shared import Pt, RGBColor, Cm, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

# ----------------------------------------------------------------------------
# Renk paleti (kurumsal mavi tonlari)
# ----------------------------------------------------------------------------
ANA_RENK = RGBColor(0x1F, 0x3A, 0x5F)   # koyu lacivert (basliklar)
VURGU = RGBColor(0x2E, 0x6D, 0xA4)      # mavi (alt basliklar)
GRI = RGBColor(0x55, 0x55, 0x55)

doc = Document()

# ----------------------------------------------------------------------------
# Sayfa kenar bosluklari ve varsayilan yazi tipi
# ----------------------------------------------------------------------------
for section in doc.sections:
    section.top_margin = Cm(2.5)
    section.bottom_margin = Cm(2.5)
    section.left_margin = Cm(3.0)
    section.right_margin = Cm(2.5)

normal = doc.styles["Normal"]
normal.font.name = "Calibri"
normal.font.size = Pt(11)
normal.paragraph_format.space_after = Pt(8)
normal.paragraph_format.line_spacing = 1.4


# ----------------------------------------------------------------------------
# Yardimci fonksiyonlar
# ----------------------------------------------------------------------------
def baslik1(metin):
    """Ana bolum basligi (numarali, Heading 1)."""
    h = doc.add_heading(level=1)
    run = h.add_run(metin)
    run.font.color.rgb = ANA_RENK
    run.font.size = Pt(16)
    run.font.bold = True
    h.paragraph_format.space_before = Pt(18)
    h.paragraph_format.space_after = Pt(10)
    return h


def baslik2(metin):
    h = doc.add_heading(level=2)
    run = h.add_run(metin)
    run.font.color.rgb = VURGU
    run.font.size = Pt(13)
    run.font.bold = True
    h.paragraph_format.space_before = Pt(12)
    h.paragraph_format.space_after = Pt(6)
    return h


def p(metin, alinti=False):
    par = doc.add_paragraph(metin)
    par.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    if alinti:
        par.paragraph_format.left_indent = Cm(1)
        for r in par.runs:
            r.font.italic = True
            r.font.color.rgb = GRI
    return par


def madde(metin):
    par = doc.add_paragraph(metin, style="List Bullet")
    par.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    return par


def kalin_madde(baslik, aciklama):
    """- **Baslik:** aciklama  seklinde madde."""
    par = doc.add_paragraph(style="List Bullet")
    r1 = par.add_run(baslik + ": ")
    r1.bold = True
    par.add_run(aciklama)
    par.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    return par


def yer_tutucu(metin):
    """Ekran goruntusu / kullanici doldurmasi gereken yer."""
    par = doc.add_paragraph()
    par.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = par.add_run(f"[ {metin} ]")
    r.font.italic = True
    r.font.color.rgb = RGBColor(0xB0, 0x30, 0x30)
    r.font.size = Pt(10)
    return par


def kod_blok(kod, baslik=None):
    """Tek renkli (monospace) kod kutusu. baslik verilirse üstüne 'Kod X.Y' yazar."""
    if baslik:
        cap = doc.add_paragraph()
        r = cap.add_run(baslik)
        r.bold = True; r.font.size = Pt(9); r.font.color.rgb = GRI
        cap.paragraph_format.space_after = Pt(2)
    # Tek hücreli gri tablo = kod kutusu görünümü
    t = doc.add_table(rows=1, cols=1)
    cell = t.rows[0].cells[0]
    # arka plan rengi
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear"); shd.set(qn("w:fill"), "F2F4F7")
    cell._tc.get_or_add_tcPr().append(shd)
    cell.text = ""
    for i, satir in enumerate(kod.rstrip("\n").split("\n")):
        par = cell.paragraphs[0] if i == 0 else cell.add_paragraph()
        par.paragraph_format.space_after = Pt(0)
        par.paragraph_format.line_spacing = 1.0
        run = par.add_run(satir if satir else " ")
        run.font.name = "Consolas"
        run.font.size = Pt(8.5)
        run.font.color.rgb = RGBColor(0x1A, 0x1A, 0x2A)
    doc.add_paragraph()
    return t


def tablo(basliklar, satirlar):
    t = doc.add_table(rows=1, cols=len(basliklar))
    t.style = "Light Grid Accent 1"
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdr = t.rows[0].cells
    for i, b in enumerate(basliklar):
        hdr[i].text = ""
        run = hdr[i].paragraphs[0].add_run(b)
        run.bold = True
        run.font.size = Pt(10)
    for satir in satirlar:
        cells = t.add_row().cells
        for i, deger in enumerate(satir):
            cells[i].text = ""
            run = cells[i].paragraphs[0].add_run(str(deger))
            run.font.size = Pt(10)
    doc.add_paragraph()
    return t


def sayfa_sonu():
    doc.add_page_break()


# ============================================================================
# KAPAK SAYFASI
# ============================================================================
def bos(n=1):
    for _ in range(n):
        doc.add_paragraph()

bos(2)
k = doc.add_paragraph()
k.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = k.add_run("[ ÜNİVERSİTE ADI ]")
r.bold = True; r.font.size = Pt(16); r.font.color.rgb = ANA_RENK

k = doc.add_paragraph()
k.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = k.add_run("[ FAKÜLTE / BÖLÜM ADI ]")
r.font.size = Pt(13); r.font.color.rgb = GRI

bos(4)
k = doc.add_paragraph()
k.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = k.add_run("BİTİRME PROJESİ")
r.bold = True; r.font.size = Pt(14); r.font.color.rgb = VURGU

bos(1)
k = doc.add_paragraph()
k.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = k.add_run("Yapay Zeka Destekli\nİşletme ve Cihaz Bakım Yönetim Sistemi")
r.bold = True; r.font.size = Pt(22); r.font.color.rgb = ANA_RENK

bos(1)
k = doc.add_paragraph()
k.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = k.add_run("(Web + Mobil + Yapay Zeka Servisi)")
r.font.size = Pt(12); r.font.italic = True; r.font.color.rgb = GRI

bos(6)
for etiket, deger in [
    ("Hazırlayan", "[ ADINIZ SOYADINIZ ]"),
    ("Öğrenci No", "[ NUMARANIZ ]"),
    ("Danışman", "[ DANIŞMAN ÖĞRETİM ÜYESİ ]"),
    ("Tarih", "Haziran 2026"),
]:
    par = doc.add_paragraph()
    par.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r1 = par.add_run(f"{etiket}: ")
    r1.bold = True; r1.font.size = Pt(12)
    r2 = par.add_run(deger)
    r2.font.size = Pt(12)

sayfa_sonu()

# ============================================================================
# ÖZET
# ============================================================================
baslik1("ÖZET")
p("Bu bitirme projesi kapsamında; beyaz eşya, klima, kombi ve su arıtma gibi "
  "cihazlara periyodik bakım hizmeti veren işletmelerin müşteri, satış, ürün, "
  "bakım ve görev süreçlerini tek bir çatı altında yöneten, çok kullanıcılı ve "
  "çok işletmeli (multi-tenant) bir işletme yönetim sistemi geliştirilmiştir. "
  "Sistem; bir web uygulaması, bir Android mobil uygulaması ve bir yapay zeka "
  "servisi olmak üzere üç istemciden ve bunlara hizmet veren tek bir merkezi "
  "uygulama programlama arayüzünden (API) oluşmaktadır.")
p("Sunucu tarafı (backend), katmanlı (N-katmanlı / Clean Architecture) mimari "
  "ile ASP.NET Core (.NET 10) kullanılarak geliştirilmiş; veriler PostgreSQL "
  "veritabanında Entity Framework Core ile yönetilmiştir. Kullanıcı tarafı "
  "(frontend) React ve Vite ile, mobil uygulama ise React Native (Expo) ile "
  "yazılmıştır. Kimlik doğrulama JWT (JSON Web Token) tabanlı olup yetkilendirme "
  "rol bazlıdır (Yönetici, Satış Danışmanı, Teknisyen).")
p("Projenin ayırt edici yönü, klasik bir kayıt yönetimi uygulamasının ötesine "
  "geçerek beş ayrı yapay zeka destekli özelliği bünyesinde barındırmasıdır: "
  "(1) makine öğrenmesi ile cihaz arıza riski tahmini, (2) görsel üzerinden "
  "fatura okuma (OCR), (3) teknisyenin sesli rapor dikte etmesi, (4) cihaz "
  "fotoğrafından arıza analizi ve (5) teknisyenin günlük ziyaret rotasının en "
  "kısa olacak şekilde optimize edilmesi. Bu özellikler Python (FastAPI) tabanlı "
  "ayrı bir mikroservis ve Google Gemini büyük dil modeli aracılığıyla "
  "gerçekleştirilmiştir.")
par = doc.add_paragraph()
r = par.add_run("Anahtar Kelimeler: ")
r.bold = True
par.add_run("İşletme yönetim sistemi, ASP.NET Core, React, React Native, "
            "PostgreSQL, JWT, çok kiracılı mimari, makine öğrenmesi, yapay zeka, "
            "FastAPI, Gemini, rota optimizasyonu.")
sayfa_sonu()

# ============================================================================
# İÇİNDEKİLER (Word kendisi gunceller)
# ============================================================================
baslik1("İÇİNDEKİLER")
par = doc.add_paragraph()
run = par.add_run()
fld_begin = OxmlElement("w:fldChar"); fld_begin.set(qn("w:fldCharType"), "begin")
instr = OxmlElement("w:instrText"); instr.set(qn("xml:space"), "preserve")
instr.text = r'TOC \o "1-3" \h \z \u'
fld_sep = OxmlElement("w:fldChar"); fld_sep.set(qn("w:fldCharType"), "separate")
fld_txt = OxmlElement("w:t"); fld_txt.text = "Bu satıra sağ tıklayıp 'Alanı Güncelleştir' deyin → içindekiler otomatik oluşur."
fld_end = OxmlElement("w:fldChar"); fld_end.set(qn("w:fldCharType"), "end")
run._r.append(fld_begin); run._r.append(instr); run._r.append(fld_sep)
run._r.append(fld_txt); run._r.append(fld_end)
sayfa_sonu()

# ============================================================================
# 1. GİRİŞ
# ============================================================================
baslik1("1. GİRİŞ")

baslik2("1.1. Problem Tanımı")
p("Beyaz eşya, klima, kombi ve su arıtma cihazlarına servis ve periyodik bakım "
  "hizmeti veren küçük ve orta ölçekli işletmeler, iş süreçlerini büyük ölçüde "
  "kağıt defterler, Excel tabloları veya birbirinden kopuk uygulamalar üzerinden "
  "yürütmektedir. Bu durum şu sorunlara yol açmaktadır:")
madde("Müşteri ve cihaz geçmişinin dağınık tutulması, geçmiş bakımlara hızlı erişilememesi.")
madde("Periyodik bakım tarihlerinin unutulması ve müşteri kaybı.")
madde("Satış, tahsilat ve borç takibinin elle yapılması nedeniyle oluşan hatalar.")
madde("Teknisyenlerin sahadaki görevlerinin ve yaptıkları işlerin denetlenememesi.")
madde("Gelir-gider ve fatura kayıtlarının düzensizliği.")

baslik2("1.2. Projenin Amacı")
p("Bu projenin amacı, yukarıda sıralanan süreçleri tek bir merkezi sistemde "
  "toplayan; web ve mobil ortamdan erişilebilen, rol bazlı yetkilendirmeye sahip "
  "ve yapay zeka ile zenginleştirilmiş bütünleşik bir işletme yönetim sistemi "
  "geliştirmektir. Sistem, yalnızca tek bir işletmeye değil, kayıt olan birden "
  "fazla işletmeye aynı anda ve verileri birbirinden tamamen yalıtılmış biçimde "
  "(multi-tenant) hizmet verecek şekilde tasarlanmıştır.")

baslik2("1.3. Kapsam ve Hedefler")
madde("Müşteri, ürün, satış, bakım, görev, gelir-gider ve fatura modüllerinin tam işlevsel olarak geliştirilmesi.")
madde("Yönetici, Satış Danışmanı ve Teknisyen rolleri için ayrı yetki düzeylerinin tanımlanması.")
madde("Yaklaşan bakımların otomatik e-posta ile hatırlatılması (zamanlanmış arka plan görevi).")
madde("Sahadaki teknisyen için Android mobil uygulama ile fotoğraflı iş kanıtı ve navigasyon desteği.")
madde("Beş ayrı yapay zeka özelliği ile süreçlerin akıllandırılması.")
madde("Harita üzerinde müşteri konumları ve teknisyen rota optimizasyonu.")
sayfa_sonu()

# ============================================================================
# 2. KULLANILAN TEKNOLOJİLER
# ============================================================================
baslik1("2. KULLANILAN TEKNOLOJİLER")
p("Proje, modern ve sektörde yaygın kullanılan teknolojilerle, her katmanın "
  "kendi alanında en uygun aracı kullandığı çok bileşenli bir yaklaşımla "
  "geliştirilmiştir. Aşağıdaki tabloda kullanılan başlıca teknolojiler "
  "özetlenmiştir.")
tablo(
    ["Katman", "Teknoloji", "Görevi"],
    [
        ["Sunucu (Backend)", "ASP.NET Core (.NET 10) Web API", "Merkezi REST API, iş kuralları"],
        ["Veri Erişimi", "Entity Framework Core + Npgsql", "Veritabanı erişimi (ORM)"],
        ["Veritabanı", "PostgreSQL 18", "İlişkisel veri saklama"],
        ["Kimlik Doğrulama", "JWT Bearer Token", "Oturum ve güvenlik"],
        ["Arka Plan İşleri", "Hangfire + Hangfire.PostgreSql", "Zamanlanmış bakım hatırlatma"],
        ["E-posta", "MailKit (Gmail SMTP)", "Bilgilendirme e-postaları"],
        ["PDF / Excel", "QuestPDF, ClosedXML", "Fatura ve rapor çıktıları"],
        ["Web Arayüzü", "React 19 + Vite + TailwindCSS", "Yönetim paneli"],
        ["Web Yardımcıları", "Axios, Recharts, Leaflet", "API isteği, grafik, harita"],
        ["Mobil", "React Native (Expo)", "Android teknisyen uygulaması"],
        ["Yapay Zeka Servisi", "Python + FastAPI", "AI mikroservisi"],
        ["Makine Öğrenmesi", "scikit-learn (RandomForest)", "Arıza riski tahmini"],
        ["Büyük Dil Modeli", "Google Gemini (2.0 Flash)", "OCR, ses, görüntü, NLP"],
    ],
)
p("Teknolojilerin bu şekilde ayrıştırılmasının nedeni; her bileşenin kendi "
  "güçlü olduğu alanda kullanılmasıdır. Örneğin tablo bazlı sayısal tahmin için "
  "klasik makine öğrenmesi (scikit-learn) yeterli ve hızlıyken; görsel, ses ve "
  "serbest metin gibi yapılandırılmamış verilerde büyük dil modeli (Gemini) "
  "tercih edilmiştir.")
sayfa_sonu()

# ============================================================================
# 3. SİSTEM MİMARİSİ
# ============================================================================
baslik1("3. SİSTEM MİMARİSİ")

baslik2("3.1. Genel Bakış")
p("Sistem, istemci-sunucu modeline dayanır. Üç farklı istemci (web paneli, "
  "Android mobil uygulaması ve yapay zeka servisi) merkezdeki tek bir REST API "
  "ile haberleşir. Bu API, iş kurallarını uygular ve PostgreSQL veritabanı ile "
  "konuşur. Yapay zeka servisi ise API'nin gerektiğinde çağırdığı ayrı bir "
  "Python mikroservisidir.")
yer_tutucu("EKRAN GÖRÜNTÜSÜ / ŞEMA: Genel sistem mimarisi diyagramı "
           "(Web + Mobil + AI Servisi → REST API → PostgreSQL)")

baslik2("3.2. Katmanlı Mimari (N-Katmanlı / Clean Architecture)")
p("Sunucu tarafı, sorumlulukların net biçimde ayrıldığı dört katmandan oluşur. "
  "Her katman yalnızca kendi altındaki katmana bağımlıdır; bu sayede kod test "
  "edilebilir, bakımı kolay ve genişletilebilir olur.")
tablo(
    ["Katman (Proje)", "Sorumluluğu"],
    [
        ["IsletmeYonetim.Domain", "Çekirdek varlıklar (entity) ve enum'lar. Hiçbir dış kütüphaneye bağımlı değildir."],
        ["IsletmeYonetim.Application", "DTO'lar, arayüzler (interface) ve doğrulayıcılar (validator)."],
        ["IsletmeYonetim.Infrastructure", "Servisler (iş kuralları), veritabanı (DbContext), JWT, e-posta gibi dış dünya bağlantıları."],
        ["IsletmeYonetim.API", "Controller'lar, HTTP uç noktaları, middleware, yetkilendirme."],
    ],
)
p("Bir HTTP isteğinin akışı şu şekildedir: İstek önce ilgili Controller'a (API "
  "katmanı) ulaşır. Controller, isteği doğrular ve Application katmanındaki "
  "ilgili servis arayüzünü (interface) çağırır. Bu arayüzün Infrastructure "
  "katmanındaki uygulaması (servis) iş kurallarını işletir ve DbContext "
  "üzerinden veritabanına erişir. Sonuç, standart bir yanıt zarfı (ApiResponse) "
  "içinde istemciye döner. Controller'ın somut servise değil arayüze bağımlı "
  "olması, bağımlılıkların tersine çevrilmesi (dependency inversion) ilkesine "
  "uygundur.")

baslik2("3.3. Çok Kiracılı (Multi-Tenant) Mimari")
p("Sistemin önemli bir özelliği, birden fazla işletmeye aynı veritabanı "
  "üzerinden ancak verileri tamamen yalıtarak hizmet verebilmesidir. Her kayıt, "
  "ait olduğu işletmeyi belirten bir IsletmeId (Tenant) alanı taşır "
  "(ITenantEntity arayüzü). Kullanıcı giriş yaptığında, JWT içindeki işletme "
  "bilgisi her sorguya otomatik olarak uygulanır; böylece bir işletmenin "
  "kullanıcısı, başka bir işletmenin verisine asla erişemez. Veri sorguları "
  "işletme bazında yalıtılır; e-posta adresi ise tüm sistemde tekil olacak "
  "şekilde kontrol edilir.")
p("Bu yalıtım, her sorguya elle filtre yazılarak değil, Entity Framework Core'un "
  "genel sorgu filtresi (global query filter) özelliğiyle merkezî olarak "
  "sağlanır. Aşağıdaki kod, tenant (ITenantEntity) arayüzünü uygulayan tüm "
  "varlıklara, açılışta otomatik olarak 'yalnızca aktif işletmenin satırlarını "
  "getir' filtresini ekler. Böylece bir geliştiricinin filtreyi unutması "
  "kaynaklı veri sızıntısı riski ortadan kalkar.")
kod_blok(
'''// AppDbContext.cs - OnModelCreating
// ITenantEntity uygulayan TUM entity'lere otomatik global sorgu filtresi
foreach (var entityType in modelBuilder.Model.GetEntityTypes())
{
    if (typeof(ITenantEntity).IsAssignableFrom(entityType.ClrType))
    {
        // ilgili tipe TenantFiltresiUygula<T> metodunu reflection ile uygula
        ...MakeGenericMethod(entityType.ClrType).Invoke(this, [modelBuilder]);
    }
}

// Her SELECT yalnizca aktif isletmenin satirlarini getirir:
private void TenantFiltresiUygula<T>(ModelBuilder mb) where T : class, ITenantEntity
    => mb.Entity<T>().HasQueryFilter(e => e.IsletmeId == AktifIsletmeId);''',
"Kod 3.1. Cok kiracili otomatik veri yalitimi (global sorgu filtresi)")
sayfa_sonu()

# ============================================================================
# 4. VERİTABANI TASARIMI
# ============================================================================
baslik1("4. VERİTABANI TASARIMI")
p("Veriler PostgreSQL ilişkisel veritabanında tutulur ve Entity Framework Core "
  "ile yönetilir (Code-First yaklaşımı). Başlıca varlıklar (entity) ve görevleri "
  "aşağıdaki tabloda verilmiştir.")
tablo(
    ["Varlık (Entity)", "Açıklama"],
    [
        ["Isletme", "Kayıtlı işletme (tenant). Depo/işletme konumu da burada tutulur."],
        ["Kullanici", "Sisteme giriş yapan personel; rol bilgisini taşır."],
        ["Musteri", "İşletmenin müşterileri; adres, konum ve borç bilgisi."],
        ["Urun", "Satılan/kullanılan ürünler ve stok bilgisi."],
        ["Satis", "Satış kayıtları; satışla birlikte bakım kartı açılabilir."],
        ["BakimServis", "Cihaz bakım/servis kartları ve sonraki bakım tarihi."],
        ["BakimGecmis", "Bir bakım kartına ait yapılan işlem geçmişi."],
        ["Gorev", "Teknisyene atanan görevler; tamamlanma fotoğrafı tutulur."],
        ["BorcTahsilat", "Müşteri borç ve tahsilat hareketleri (mali denetim izi)."],
        ["Fatura", "Kesilen faturalar (PDF çıktısı alınabilir)."],
        ["GelirGider", "İşletmenin gelir ve gider kayıtları."],
        ["Bildirim", "Uygulama içi bildirimler."],
        ["Lisans", "İşletmenin lisans/abonelik planı (demo/premium)."],
    ],
)
baslik2("4.1. Veri Bütünlüğü ve Performans")
kalin_madde("Yumuşak Silme (Soft Delete)", "Müşteri ve ürün kayıtları fiziksel "
            "olarak silinmez; SilindiMi alanı ile pasifleştirilir. Böylece geçmiş "
            "satış ve bakım kayıtlarının bütünlüğü korunur.")
kalin_madde("İndeksleme", "Sık sorgulanan alanlar (satış-müşteri ilişkisi, bakım "
            "tarihi, görev durumu vb.) için performans indeksleri tanımlanmıştır.")
kalin_madde("İlişkiler", "Entity Framework üzerinden varlıklar arası ilişkiler "
            "tanımlanmış; tenant (IsletmeId) alanları uygulama katmanında zorunlu "
            "tutularak veri yalıtımı güvence altına alınmıştır.")
yer_tutucu("EKRAN GÖRÜNTÜSÜ / ŞEMA: Veritabanı ilişki (ER) diyagramı")

baslik2("4.2. Şema Yönetimi ve Bilinen Kısıt")
p("Geliştirme ve demo sürecinde veritabanı şeması, Entity Framework Core'un "
  "EnsureCreated yöntemiyle uygulama ilk çalıştığında otomatik oluşturulmakta; "
  "şema üzerindeki ek değişiklikler (yeni kolon, indeks vb.) uygulama açılışında "
  "çalışan, tekrara dayanıklı (idempotent) SQL komutlarıyla uygulanmaktadır. Bu "
  "yaklaşım, kurulum ve demo aşamasını oldukça basitleştirmiştir.")
p("Bilinen kısıt: Bu yöntem, üretim ortamı için önerilen sürümlenebilir göç "
  "(EF Core Migrations) altyapısının yerini tutmaz; şema geçmişini ayrı dosyalarda "
  "takip etmez ve geri alma (rollback) imkânı sınırlıdır. Üretime geçişte şema "
  "yönetiminin EF Core Migrations'a taşınması planlanmaktadır; bu husus 'Gelecek "
  "Çalışmalar' bölümünde de ele alınmıştır.", alinti=True)
sayfa_sonu()

# ============================================================================
# 5. MODÜLLER
# ============================================================================
baslik1("5. SİSTEM MODÜLLERİ")
p("Sistem işlevsel olarak birbiriyle bütünleşik modüllerden oluşur. Aşağıda her "
  "modülün işlevi ve sunduğu başlıca özellikler özetlenmiştir.")

moduller = [
    ("5.1. Kimlik Doğrulama ve Yetkilendirme",
     "Kullanıcılar e-posta ve parola ile giriş yapar; sistem bir JWT üretir. "
     "Roller (Yönetici, Satış Danışmanı, Teknisyen) her kullanıcının "
     "erişebileceği ekran ve işlemleri belirler. Yönetici tüm modüllere "
     "erişirken, Teknisyen yalnızca görev ve bakım modüllerini görür."),
    ("5.2. Gösterge Paneli (Dashboard)",
     "Giriş sonrası açılan özet ekran; toplam müşteri, satış, gelir gibi "
     "istatistikleri kartlarla; aylık satış grafiğini ve yaklaşan bakımları "
     "gösterir. Recharts ile grafik çizilir."),
    ("5.3. Müşteri Yönetimi",
     "Müşteri ekleme, arama, borç/tahsilat takibi ve bakiye görüntüleme. Her "
     "müşterinin harita üzerinde konumu işaretlenebilir ve detay sayfasında "
     "finansal geçmişi listelenir."),
    ("5.4. Ürün ve Stok Yönetimi",
     "Ürünlerin kategori bazında listelenmesi, stok takibi ve düşük stok "
     "uyarısı. Faturadan okunan kalemler otomatik olarak stoğa eklenebilir."),
    ("5.5. Satış Yönetimi",
     "Yeni satış oluşturma; satışla birlikte ilgili cihaz için otomatik bakım "
     "kartı açılması ve borç/tahsilat hareketinin kaydedilmesi."),
    ("5.6. Bakım ve Servis Yönetimi",
     "Cihaz bakım kartlarının kart görünümünde listelenmesi, 'Bakım Yapıldı' "
     "işlemi, geçmiş kayıtların görüntülenmesi ve müşteri konumuna navigasyon. "
     "Teknisyen için 'Günün Rotası' özelliği bu modüldedir."),
    ("5.7. Görev Yönetimi",
     "Teknisyenlere görev atama, öncelik ve durum takibi (Bekliyor / Devam / "
     "Tamamlandı). Görev tamamlanırken mobil uygulamadan kamera ile zorunlu iş "
     "kanıtı fotoğrafı yüklenir."),
    ("5.8. Finans: Gelir-Gider ve Fatura",
     "Gelir-gider kayıtlarının tutulması, faturaların kesilmesi ve QuestPDF ile "
     "PDF çıktısının alınması. Fatura görselinden yapay zeka ile otomatik kayıt "
     "(OCR) bu modüldedir."),
    ("5.9. Raporlama",
     "Aylık özet raporunun PDF, müşteri listesinin Excel olarak indirilmesi "
     "(Yönetici yetkisi)."),
    ("5.10. Harita ve Konum",
     "Leaflet tabanlı harita üzerinde müşteri konumlarının gösterilmesi, "
     "sürüklenebilir pin ile konum seçimi ve Google Maps ile yol tarifi."),
    ("5.11. Bildirim ve Lisans",
     "Uygulama içi bildirim sistemi ve işletmenin lisans/abonelik planının "
     "takibi."),
]
for bas, ack in moduller:
    baslik2(bas)
    p(ack)

baslik2("5.12. Proaktif (Olay-Tetiklemeli) Bildirim Sistemi")
p("Sistem yalnızca kullanıcının sorgulamasını beklemez; iş açısından önemli "
  "olaylar gerçekleştiğinde ilgili kullanıcıyı kendiliğinden uyarır. Uygulama "
  "içi bildirimler arayüzün sağ üst köşesindeki bildirim çanında toplanır ve "
  "okunmamış sayısı rozet olarak gösterilir. Bildirime tıklandığında kullanıcı "
  "doğrudan ilgili sayfaya yönlendirilir. Bildirim üreten başlıca olaylar:")
kalin_madde("Kritik stok", "Bir satışla ürün stoğu, o ürün için tanımlı kritik "
            "seviyeye düştüğünde veya tükendiğinde işletmenin yöneticisine bildirim gider.")
kalin_madde("Yüksek müşteri borcu", "Müşterinin toplam borcu belirlenen eşiği "
            "aştığında yöneticiye uyarı gönderilir.")
kalin_madde("Görev atama / tamamlama", "Bir görev atandığında ilgili teknisyene, "
            "görev tamamlandığında ise görevi oluşturan yöneticiye bildirim iletilir.")
kalin_madde("Yaklaşan bakım", "Her gün çalışan zamanlanmış arka plan görevi "
            "(Hangfire), yaklaşan bakımları hem e-posta hem uygulama içi bildirim "
            "olarak hatırlatır.")
p("Bu bildirimler servis katmanında, ilgili iş işleminin (satış, görev "
  "güncelleme vb.) içinde tetiklenir. Bildirim gönderiminde oluşabilecek bir "
  "hata, ana iş işlemini (örneğin satışın kaydedilmesini) kesintiye uğratmaz; "
  "hata yalnızca loglanır. Böylece sistem hem proaktif hem de dayanıklı çalışır.")

yer_tutucu("EKRAN GÖRÜNTÜLERİ: Login, Dashboard (uyarı kartları), Bildirim çanı, "
           "Müşteriler, Satışlar, Bakım, Görevler ekranları")
sayfa_sonu()

# ============================================================================
# 6. YAPAY ZEKA MODÜLLERİ
# ============================================================================
baslik1("6. YAPAY ZEKA MODÜLLERİ")
p("Projenin en ayırt edici yönü, beş ayrı yapay zeka destekli özelliği "
  "barındırmasıdır. Bu özellikler, ASP.NET Core API'sinden bağımsız çalışan, "
  "Python ve FastAPI ile yazılmış ayrı bir mikroservis üzerinden sunulur. API, "
  "gerektiğinde bu servisi HTTP üzerinden çağırır (proxy deseni). Bu ayrıştırma, "
  "yapay zeka tarafının ana uygulamadan bağımsız geliştirilip "
  "ölçeklenebilmesini sağlar.")
p("Aşağıdaki örnek, bir bakım kartı için arıza riski tahmininin nasıl alındığını "
  "gösterir. API, ilgili öznitelikleri hesaplar, bunları Python servisinin "
  "/predict ucuna JSON olarak gönderir ve dönen sonucu istemciye iletir. Servise "
  "ulaşılamazsa kullanıcıya anlamlı bir hata (502) döndürülür; ana uygulama "
  "çökmez.")
kod_blok(
'''// BakimController.cs - RiskTahmini
var client = httpClientFactory.CreateClient("AiService");
var istek = new { cihazYasi, bakimSayisi, sonBakimGunSayisi };

var httpYanit = await client.PostAsJsonAsync("/predict", istek);
if (!httpYanit.IsSuccessStatusCode)
    return StatusCode(502, ApiResponse...("AI servisine ulasilamadi."));

var json  = await httpYanit.Content.ReadAsStringAsync();
var sonuc = JsonSerializer.Deserialize<RiskTahminYanit>(json, options)!;
return Ok(new ApiResponse<RiskTahminYanit>(true, sonuc, null, null));''',
"Kod 6.1. ASP.NET Core API'sinden Python AI servisine proxy cagrisi")

baslik2("6.1. Cihaz Arıza Riski Tahmini (Makine Öğrenmesi)")
p("Bir cihazın yakın gelecekte arıza yapma riski, klasik makine öğrenmesi ile "
  "tahmin edilir. Bunun için scikit-learn kütüphanesindeki Random Forest "
  "(Rastgele Orman) sınıflandırma algoritması kullanılmıştır. Model, cihazın "
  "yaşı, son bakımdan geçen süre ve kullanım yoğunluğu gibi özniteliklerle "
  "eğitilmiş ve disk üzerinde önbelleğe alınmıştır (model.pkl); böylece her "
  "açılışta yeniden eğitilmez. Bakım ekranındaki 'Risk Tahmini Al' butonu bu "
  "modeli çağırır ve sonucu renkli bir rozet ile gösterir.")
p("Not: Sektöre özgü gerçek arıza verisine erişim kısıtlı olduğundan, model "
  "10.000 kayıtlık sentetik (üretilmiş) bir veri seti ile eğitilmiştir. Gerçek "
  "işletme verisi biriktikçe modelin aynı altyapı ile yeniden eğitilmesi "
  "mümkündür; bu, raporun 'Gelecek Çalışmalar' bölümünde ele alınmıştır.", alinti=True)

baslik2("6.2. Fatura Okuma (OCR) — Görüntüden Veri Çıkarma")
p("Yönetici, bir tedarikçi faturasının fotoğrafını yüklediğinde, Google Gemini "
  "Vision modeli görseli analiz eder ve firma adı, tarih, toplam tutar ve "
  "kalemleri yapılandırılmış (JSON) biçimde çıkarır. Kullanıcıya bir onay ekranı "
  "sunulur; onaylanan kayıt otomatik olarak gelir-gider defterine işlenir ve "
  "istenirse kalemler stoğa eklenir. Bu sayede elle veri girişi büyük ölçüde "
  "ortadan kalkar.")

baslik2("6.3. Sesle Rapor (Konuşmadan Metne + Metin Düzenleme)")
p("Sahadaki teknisyenin elleri çoğu zaman doludur veya kirlidir. Bu nedenle "
  "bakım sonrası 'Yapılan İşlemler' raporu sesle doldurulabilir. Web tarafında "
  "tarayıcının Web Speech API'si konuşmayı metne çevirir; mobil tarafta ise ses "
  "kaydı doğrudan yapay zeka servisine gönderilir ve Gemini hem sesi yazıya "
  "döker hem de onu düzgün, profesyonel bir teknik rapora dönüştürür.")

baslik2("6.4. Cihaz Fotoğrafından Arıza Analizi")
p("Mobil uygulamada teknisyen, arızalı cihazın fotoğrafını çeker; Gemini Vision "
  "modeli görseli yorumlayarak olası arıza nedenleri ve öneriler hakkında "
  "Türkçe bir analiz üretir. Bu, özellikle deneyimsiz teknisyenler için bir "
  "destek aracı niteliğindedir.")

baslik2("6.5. Teknisyen Rota Optimizasyonu")
p("Bir teknisyenin gün içinde ziyaret edeceği birden fazla müşteri olduğunda, "
  "bu durakların hangi sırayla gezilirse toplam yolun en kısa olacağı bir "
  "optimizasyon problemidir (Gezgin Satıcı Problemi - TSP). Sistem, işletme "
  "deposundan başlayarak durakları en yakın komşu ve 2-opt iyileştirme "
  "yöntemiyle sıralar; mesafe hesabında coğrafi (haversine) uzaklık kullanılır. "
  "Bakım ekranındaki 'Günün Rotası' özelliği, o gün yapılması gereken konumlu "
  "bakımları en kısa rotaya dizer ve her durak için Google Maps navigasyonu "
  "sunar. Yapılan testte 6 duraklı bir rota, ham (sırasız) güzergaha göre "
  "yaklaşık %25 daha kısa elde edilmiştir.")
p("Not: Bu özellik bir makine öğrenmesi değil, bir optimizasyon problemidir. "
  "Üretim ortamında Google OR-Tools veya gerçek yol mesafesi için OSRM gibi "
  "araçlar kullanılabilir; bu alternatifler gelecek çalışma olarak not "
  "edilmiştir.", alinti=True)
yer_tutucu("EKRAN GÖRÜNTÜLERİ: Risk rozeti, Fatura okuma onay ekranı, Sesle "
           "rapor, Günün Rotası haritası")
sayfa_sonu()

# ============================================================================
# 7. GÜVENLİK
# ============================================================================
baslik1("7. GÜVENLİK")
p("Sistem, çok kullanıcılı ve çok işletmeli yapısı gereği güvenliğe özel önem "
  "verir. Alınan başlıca önlemler:")
kalin_madde("JWT Tabanlı Kimlik Doğrulama", "Kullanıcı girişinde imzalı bir "
            "token üretilir; her istekte bu token doğrulanır. Parolalar "
            "veritabanında özetlenmiş (hash) olarak saklanır.")
p("Token üretimi sırasında kullanıcı kimliği (sub), adı, rolü ve ait olduğu "
  "işletme (isletmeId) token içine claim olarak gömülür. Rol claim'i "
  "yetkilendirmede, işletme claim'i ise çok kiracılı veri yalıtımında "
  "kullanılır. Token gizli bir anahtarla HMAC-SHA256 ile imzalanır.")
kod_blok(
'''// JwtService.cs - TokenOlustur
var claims = new[]
{
    new Claim(JwtRegisteredClaimNames.Sub, kullanici.Id.ToString()),
    new Claim("ad",  $"{kullanici.Ad} {kullanici.Soyad}"),
    new Claim("rol", kullanici.Rol.ToString()),       // yetkilendirme
    new Claim("isletmeId", kullanici.IsletmeId.ToString()), // multi-tenant
    new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
};
var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
var token = new JwtSecurityToken(issuer, audience, claims,
    expires: DateTime.UtcNow.AddMinutes(sure), signingCredentials: creds);''',
"Kod 7.1. JWT token uretimi ve claim'ler")
kalin_madde("Rol Bazlı Yetkilendirme", "Controller'larda [Authorize(Roles=...)] "
            "ile her uç nokta yalnızca yetkili rollere açıktır.")
kalin_madde("Çok Kiracılı Veri Yalıtımı", "Her sorgu işletme (tenant) bazında "
            "süzülür; bir işletmenin verisi başka bir işletmeye sızmaz. Bu "
            "yalıtım kod incelemesi sırasında ayrıca denetlenip "
            "güçlendirilmiştir.")
kalin_madde("Dosya Yükleme Güvenliği", "Görev kanıt fotoğrafı gibi yüklemelerde "
            "boyut sınırı (5 MB) ve dosyanın gerçekten görsel olduğunu doğrulayan "
            "imza (magic-byte) kontrolü yapılır.")
kalin_madde("Merkezi Hata Yönetimi", "Bir middleware tüm istisnaları yakalar; "
            "bilinen hatalar uygun HTTP durum koduyla (400/401/404) döner, "
            "beklenmeyen hatalarda ise istemciye iç ayrıntı sızdırmadan bir izleme "
            "kimliği (TraceId) ile loglanır.")
kalin_madde("Sırların Ayrılması", "Veritabanı parolası, JWT anahtarı ve e-posta "
            "şifresi gibi hassas bilgiler kod deposuna konmaz; ortam bazlı "
            "yapılandırma dosyasında tutulur.")
sayfa_sonu()

# ============================================================================
# 8. TEST VE DAĞITIM
# ============================================================================
baslik1("8. TEST VE DAĞITIM")
baslik2("8.1. Test Yaklaşımı")
p("Geliştirme süresince her modül, gerçek kullanım senaryolarıyla elle (manuel) "
  "test edilmiştir. Backend uç noktaları doğrudan, web arayüzü tarayıcıda, mobil "
  "uygulama ise Android emülatörü ve gerçek cihaz üzerinde denenmiştir. Farklı "
  "roller için ayrı demo hesaplarıyla yetki sınırları doğrulanmıştır.")
tablo(
    ["Rol", "Demo Hesabı", "Erişim"],
    [
        ["Yönetici", "admin@isletme.com", "Tüm modüller"],
        ["Satış Danışmanı", "satis@isletme.com", "Satış, müşteri, ürün"],
        ["Teknisyen", "teknisyen@isletme.com", "Görev ve bakım"],
    ],
)
baslik2("8.2. Sürüm Kontrolü ve Dağıtım")
p("Proje Git ile sürüm kontrolü altında tutulmuş ve GitHub üzerinde "
  "barındırılmıştır. Hassas bilgiler depodan ayrılmış, yapılandırma örnekleri "
  "yer tutucu değerlerle paylaşılmıştır. Mobil uygulama için Expo (EAS) ile APK "
  "üretimi yapılandırılmıştır.")
baslik2("8.3. Sistemin Çalıştırılması")
madde("Backend: dotnet run ile 5096 portunda; yapay zeka servisini 8001 portunda otomatik başlatır.")
madde("Web: Vite geliştirme sunucusu 5173 portunda.")
madde("Veritabanı: PostgreSQL; ilk açılışta demo veri (seed) otomatik yüklenir.")
sayfa_sonu()

# ============================================================================
# 9. SONUÇ VE GELECEK ÇALIŞMALAR
# ============================================================================
baslik1("9. SONUÇ VE GELECEK ÇALIŞMALAR")
baslik2("9.1. Sonuç")
p("Bu proje kapsamında, cihaz bakım hizmeti veren işletmelerin tüm temel "
  "süreçlerini tek bir sistemde toplayan; web, mobil ve yapay zeka bileşenlerinden "
  "oluşan, çok kullanıcılı ve çok işletmeli bütünleşik bir yönetim sistemi "
  "başarıyla geliştirilmiştir. Katmanlı mimari sayesinde sistem "
  "sürdürülebilir ve genişletilebilir bir yapıya kavuşmuş; rol bazlı "
  "yetkilendirme ve çok kiracılı veri yalıtımı ile güvenlik sağlanmıştır. Beş "
  "ayrı yapay zeka özelliği, sistemi klasik bir kayıt uygulamasının ötesine "
  "taşımıştır.")
baslik2("9.2. Gelecek Çalışmalar")
madde("Arıza risk modelinin, biriken gerçek işletme verisiyle yeniden eğitilmesi.")
madde("Yedek parça ihtiyaç tahmini ve kalan faydalı ömür (RUL) tahmini gibi gerçek veri gerektiren ileri analizlerin eklenmesi.")
madde("Rota optimizasyonunun Google OR-Tools ve gerçek yol mesafesi (OSRM) ile güçlendirilmesi.")
madde("Veritabanı şema yönetiminin EnsureCreated + idempotent SQL yönteminden sürümlenebilir EF Core Migrations altyapısına taşınması.")
madde("iOS mobil uygulaması ve uygulama mağazası yayını.")
madde("Otomatik (birim/entegrasyon) testlerinin ve sürekli entegrasyon (CI/CD) hattının kurulması.")
madde("Müşterilere yönelik kendi kendine randevu alma portalı.")
sayfa_sonu()

# ============================================================================
# 10. KAYNAKÇA
# ============================================================================
baslik1("10. KAYNAKÇA")
kaynaklar = [
    "Microsoft. ASP.NET Core Belgeleri. https://learn.microsoft.com/aspnet/core",
    "Microsoft. Entity Framework Core Belgeleri. https://learn.microsoft.com/ef/core",
    "PostgreSQL Global Development Group. PostgreSQL Belgeleri. https://www.postgresql.org/docs/",
    "Meta. React Belgeleri. https://react.dev",
    "Expo. React Native (Expo) Belgeleri. https://docs.expo.dev",
    "Tailwind Labs. TailwindCSS Belgeleri. https://tailwindcss.com/docs",
    "FastAPI. FastAPI Belgeleri. https://fastapi.tiangolo.com",
    "scikit-learn geliştiricileri. scikit-learn Belgeleri. https://scikit-learn.org",
    "Google. Gemini API Belgeleri. https://ai.google.dev",
    "Hangfire. Hangfire Belgeleri. https://docs.hangfire.io",
    "JWT.io. JSON Web Tokens. https://jwt.io",
]
for i, k in enumerate(kaynaklar, 1):
    par = doc.add_paragraph()
    par.paragraph_format.left_indent = Cm(1)
    par.paragraph_format.first_line_indent = Cm(-1)
    par.add_run(f"[{i}] ").bold = True
    par.add_run(k)

# ----------------------------------------------------------------------------
doc.save("rapor/Bitirme_Raporu.docx")
print("OLUSTURULDU: rapor/Bitirme_Raporu.docx")
