# Claude Code — Agent Teams (Takım Ajanlar) Türkçe Rehberi

> Kaynak: https://code.claude.com/docs/en/agent-teams  
> Claude Code v2.1.32+ gerektirir. Versiyon kontrolü: `claude --version`

---

## Agent Teams Nedir?

Birden fazla Claude Code örneğinin birlikte çalışmasını sağlar. Bir oturum **takım lideri** olur; görevleri oluşturur, dağıtır ve sonuçları sentezler. **Takım üyeleri** (teammates) bağımsız çalışır, her biri kendi bağlam penceresine sahiptir ve birbirleriyle doğrudan mesajlaşabilir.

---

## Etkinleştirme

`.claude/settings.json` dosyasına ekle:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

> **Uyarı:** Deneysel özellik, varsayılan olarak kapalıdır.

---

## Ne Zaman Kullanılır?

### Güçlü Kullanım Alanları
| Senaryo | Neden Uygun? |
|---|---|
| Araştırma ve inceleme | Birden fazla üye farklı açılardan aynı anda araştırır |
| Yeni modül/özellik geliştirme | Her üye bağımsız bir parçaya sahip olur, çakışma olmaz |
| Hata ayıklama (competing hypotheses) | Farklı teoriler paralel test edilir, en sağlam teori kazanır |
| Katmanlar arası değişiklikler | Frontend, backend ve test her biri ayrı üyeye verilir |

### Kullanılmaması Gereken Durumlar
- Sıralı (sequential) görevler
- Aynı dosyayı düzenleyen işler
- Birbirine bağımlı çok sayıda adım
- Bu durumlarda tek oturum veya **subagent** daha verimlidir.

---

## Agent Teams vs Subagents Karşılaştırması

| Özellik | Subagents | Agent Teams |
|---|---|---|
| Bağlam | Kendi penceresi var, sonuçları ana ajana iletir | Kendi penceresi var, tamamen bağımsız |
| İletişim | Sadece ana ajana rapor verir | Üyeler birbirleriyle doğrudan mesajlaşır |
| Koordinasyon | Ana ajan tüm işi yönetir | Paylaşımlı görev listesiyle öz-koordinasyon |
| En iyi kullanım | Odaklı görevler, sadece sonuç önemli | Tartışma ve işbirliği gerektiren karmaşık işler |
| Token maliyeti | Düşük | Yüksek (her üye ayrı bir Claude örneğidir) |

**Özet kural:** Üyelerin birbiriyle konuşması gerekiyorsa → Agent Teams. Sadece sonuç önemliyse → Subagents.

---

## İlk Takımı Başlatmak

Lide doğal dilde söyle:

```
CLI aracı tasarlıyorum. Bir agent takımı oluştur:
- Bir üye UX perspektifinden
- Bir üye teknik mimari perspektifinden
- Bir üye şeytan avukatı (devil's advocate) olarak
```

Claude takımı oluşturur, üyeleri başlatır, çalışmayı koordine eder ve bitince temizlemeye çalışır.

---

## Görüntüleme Modları

### In-Process (Varsayılan)
- Tüm üyeler ana terminalde çalışır
- `Shift+Down` ile üyeler arasında geçiş yap
- Her terminalde çalışır, kurulum gerektirmez

### Split Panes
- Her üye kendi ayrı bölmesinde
- Hepsinin çıktısını aynı anda görebilirsin
- **Gereksinim:** `tmux` veya `iTerm2 (macOS)`

Modu `~/.claude.json` içinde ayarla:
```json
{
  "teammateMode": "in-process"
}
```

Veya tek seferlik:
```bash
claude --teammate-mode in-process
```

> **Not:** Split panes; VS Code terminali, Windows Terminal ve Ghostty'de **desteklenmez**.

---

## Takımı Kontrol Etmek

### Üye Sayısı ve Model Belirleme
```
4 üyeli bir takım oluştur. Her üye için Sonnet modelini kullan.
```

### Plan Onayı Zorunlu Kılmak
```
Kimlik doğrulama modülünü yeniden yapılandırmak için bir mimar üye başlat.
Herhangi bir değişiklik yapmadan önce plan onayı iste.
```

Üye → Plan hazırlar → Lide gönderir → Lider onaylar veya geri bildirimle reddeder → Üye revize eder.

### Üyeye Doğrudan Mesaj Göndermek
- **In-process:** `Shift+Down` ile üyeye geç, yaz, gönder
- **Split panes:** İlgili bölmeye tıkla

### Görev Atama
- Lider açıkça atayabilir
- Üyeler boş görevi kendileri alabilir (self-claim)
- Görev durumları: `pending → in_progress → completed`
- Bağımlı görevler, bağımlılıkları tamamlanana kadar alınamaz

### Üyeyi Kapatmak
```
Araştırmacı üyeden kapatmasını iste
```

### Takımı Temizlemek
```
Takımı temizle
```

> **Önemli:** Temizliği her zaman **lider** yapmalı. Üyeler temizleme yapmamalı.

---

## Mimari — Teknik Detaylar

| Bileşen | Rolü |
|---|---|
| Team Lead | Takımı oluşturan, üyeleri başlatan, koordine eden ana oturum |
| Teammates | Görevleri üstlenen bağımsız Claude örnekleri |
| Task List | Üyelerin claim edip tamamladığı paylaşımlı görev listesi |
| Mailbox | Ajanlar arası mesajlaşma sistemi |

**Depolama konumları:**
- Takım konfigürasyonu: `~/.claude/teams/{team-name}/config.json`
- Görev listesi: `~/.claude/tasks/{team-name}/`

> Bu dosyaları elle düzenleme — bir sonraki güncellemede üzerine yazılır.

---

## Subagent Tanımlarını Takım Üyesi Olarak Kullanmak

Bir subagent tanımı (ör. `security-reviewer`) takım üyesi olarak kullanılabilir:

```
security-reviewer agent tipini kullanarak kimlik doğrulama modülünü denetlemek için bir üye başlat.
```

- Tanımın `tools` ve `model` ayarları geçerli olur
- Takım koordinasyon araçları (`SendMessage`, görev yönetimi) her zaman aktiftir
- `skills` ve `mcpServers` frontmatter alanları takım üyesi olarak çalışırken **uygulanmaz**

---

## İzinler

- Üyeler liderle aynı izin ayarlarıyla başlar
- Lider `--dangerously-skip-permissions` ile çalışıyorsa tüm üyeler de öyle çalışır
- Başlatma sonrası her üyenin modu ayrı değiştirilebilir, ama başlatırken ayarlanamaz

---

## İletişim ve Bağlam

- Üyeler CLAUDE.md, MCP sunucuları ve skills'i otomatik yükler
- **Liderin konuşma geçmişini devralmaz**
- Mesajlar otomatik iletilir, lider polling yapmak zorunda değildir
- Üye bitince lider'e otomatik bildirim gönderir
- `broadcast` komutuyla tüm üyelere aynı anda mesaj gönderilebilir (dikkatli kullan, maliyet artar)

---

## Token Maliyeti

Her üye bağımsız bir bağlam penceresidir, token maliyeti üye sayısıyla **doğrusal** artar.

---

## En İyi Pratikler

### 1. Üyelere Yeterli Bağlam Ver
```
Güvenlik inceleyicisi üyeyi şu prompt ile başlat:
"src/auth/ altındaki kimlik doğrulama modülünü güvenlik açıkları için incele.
JWT token, oturum yönetimi ve girdi doğrulamasına odaklan.
Uygulama httpOnly cookie'de JWT kullanıyor. Sorunları önem derecesiyle raporla."
```

### 2. Takım Büyüklüğünü Doğru Seç
- **Başlangıç için 3-5 üye** idealdir
- Her üyeye **5-6 görev** düşmesi verimliliği artırır
- 15 bağımsız görev → 3 üye iyi bir başlangıç

### 3. Görev Boyutunu Ayarla
| Boyut | Sorun |
|---|---|
| Çok küçük | Koordinasyon maliyeti, faydayı geçer |
| Çok büyük | Üyeler uzun süre check-in yapmadan çalışır, hata riski artar |
| Uygun | Açık bir çıktı üretir: bir fonksiyon, test dosyası, inceleme raporu |

### 4. Üyelerin Bitmesini Bekle
Lider kendi başına işlemeye başlarsa:
```
Devam etmeden önce takım üyelerinin görevlerini tamamlamasını bekle
```

### 5. Dosya Çakışmalarını Önle
Her üyeye farklı dosya seti ver. Aynı dosyayı iki üye düzenlerse üzerine yazma olur.

### 6. Araştırma/İnceleme ile Başla
Agent teams'e yeniysen önce kod yazmayan görevlerle başla:
- PR incelemesi
- Kütüphane araştırması
- Hata soruşturması

### 7. Takımı İzle ve Yönlendir
Çalışmasına bırak ama ara sıra kontrol et. Uzun süre gözetimsiz bırakmak israfa yol açabilir.

---

## Kancalar (Hooks) ile Kalite Kapıları

| Kanca | Ne Zaman Çalışır? | Kullanım |
|---|---|---|
| `TeammateIdle` | Üye boşa düşmeden önce | Çıkış kodu 2 → geri bildirim gönder, üyeyi çalışmaya devam ettir |
| `TaskCreated` | Görev oluşturulurken | Çıkış kodu 2 → görevi engelle, geri bildirim gönder |
| `TaskCompleted` | Görev tamamlanırken | Çıkış kodu 2 → tamamlamayı engelle, geri bildirim gönder |

---

## Gerçek Kullanım Örnekleri

### Paralel Kod İncelemesi
```
PR #142'yi incelemek için bir agent takımı oluştur. Üç inceleyici başlat:
- Biri güvenlik açıklarına odaklansın
- Biri performans etkisini kontrol etsin
- Biri test kapsamını doğrulasın
Her biri bulgularını raporlasın.
```

### Rekabetçi Hipotez ile Hata Ayıklama
```
Kullanıcılar uygulamanın bir mesajdan sonra bağlantıyı kestiğini bildiriyor.
5 agent üyesi başlat ve her biri farklı bir hipotezi araştırsın.
Birbirlerinin teorilerini çürütmeye çalışsınlar (bilimsel tartışma gibi).
Ortaya çıkan uzlaşıyı bulgular belgesine yaz.
```

---

## Sorun Giderme

| Sorun | Çözüm |
|---|---|
| Üyeler görünmüyor | In-process modda `Shift+Down` dene; görevin takım gerektirip gerektirmediğini kontrol et |
| Çok fazla izin istemi | Üyeleri başlatmadan önce ortak işlemleri izin ayarlarında önceden onayla |
| Üye hata sonrası duruyor | `Shift+Down` ile çıktısını kontrol et, yeni talimat ver veya yeni üye başlat |
| Lider iş bitmeden kapanıyor | "Devam et" de veya tamamlanana kadar beklemesini söyle |
| Orphaned tmux oturumu | `tmux ls` → `tmux kill-session -t <isim>` |

---

## Bilinen Kısıtlamalar

- `/resume` ve `/rewind` in-process üyeleri geri getirmez
- Görev durumu bazen gecikmeli güncellenir; tıkanmış görevi manuel ilerlet
- Kapatma yavaş olabilir (mevcut istek bitmeden kapanmaz)
- Oturum başına yalnızca bir takım yönetilebilir
- Üyeler kendi takımlarını/üyelerini başlatamaz (iç içe takım yok)
- Liderlik devredilemez
- Üye başlatıldıktan sonra izinler bireysel değiştirilebilir ama başlatma sırasında ayarlanamaz

---

## Hızlı Başvuru

```bash
# Versiyon kontrolü
claude --version   # 2.1.32+ gerekli

# Mod geçersiz kılma
claude --teammate-mode in-process

# Orphaned tmux temizliği
tmux ls
tmux kill-session -t <oturum-adı>
```

```json
// ~/.claude.json — global mod ayarı
{
  "teammateMode": "in-process"
}
```

```json
// .claude/settings.json — özelliği etkinleştir
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```
