# NetOku Tweet Agent — Kurulum Kılavuzu

Günde 2 otomatik tweet: Claude Haiku 4.5 üretir → Telegram'dan onay alır → X'e postlar.

---

## 1. X (Twitter) API Anahtarları

1. `developer.x.com` → **Projects & Apps** → uygulamanı seç
2. **Keys and tokens** sekmesi:
   - Consumer Keys → **Regenerate** → `API Key` + `API Key Secret`
   - Access Token and Secret → **Generate** → `Access Token` + `Access Token Secret`
3. **User authentication settings** bölümünde:
   - App permissions: **Read and Write** seçili olmalı (değilse değiştir, sonra token'ları yeniden üret)

Gereken 4 değer:
```
X_API_KEY=...
X_API_SECRET=...
X_ACCESS_TOKEN=...
X_ACCESS_TOKEN_SECRET=...
```

---

## 2. Telegram Bot

1. Telegram'da `@BotFather`'a yaz → `/newbot` → isim ver → **Bot Token** al
2. Yeni bota yaz (Start bas), sonra `https://api.telegram.org/bot<TOKEN>/getUpdates` adresini aç
   - `chat.id` değerini al (sayı, eksi olabilir grup ise)
   - Ya da `@userinfobot`'a yaz → `id` değerin chat_id'dir

Gereken 2 değer:
```
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

---

## 3. Anthropic API Anahtarı

1. `console.anthropic.com` → **API Keys** → **Create Key**
2. Kaydet:
```
ANTHROPIC_API_KEY=...
```

---

## 4. GitHub Secrets'a Ekle

Netoku repo sayfasında: **Settings → Secrets and variables → Actions → New repository secret**

Eklenecek 7 secret:

| İsim | Değer |
|------|-------|
| `ANTHROPIC_API_KEY` | Anthropic'ten aldığın key |
| `TELEGRAM_BOT_TOKEN` | BotFather'dan aldığın token |
| `TELEGRAM_CHAT_ID` | Kendi chat ID'n |
| `X_API_KEY` | Twitter Consumer Key |
| `X_API_SECRET` | Twitter Consumer Secret |
| `X_ACCESS_TOKEN` | Twitter Access Token |
| `X_ACCESS_TOKEN_SECRET` | Twitter Access Token Secret |

---

## 5. Bağımlılıkları Yükle & Test Et

```bash
cd scripts/tweet-agent
npm install
```

### Dry run (tweet postlanmaz, sadece üretilir):
```bash
# .env dosyası oluştur (sadece local test için)
cp .env.example .env
# Değerleri doldur, sonra:
DRY_RUN=true npm run run
```

### Gerçek çalışma:
```bash
npm run run
```

---

## 6. GitHub'a Push Et

Agent otomatik olarak:
- Her gün **08:00 Türkiye saati** çalışır
- Her gün **19:00 Türkiye saati** çalışır

Elle tetiklemek için: **GitHub → Actions → NetOku Tweet Agent → Run workflow**

---

## Akış

```
GitHub Actions (cron)
    ↓
1. Proje analizi (netoku.today fetch + git log + marketing docs)
    ↓
2. Claude Haiku 4.5 tweet üretir (%50 Ton A, %50 Ton C)
    ↓
3. Telegram'a gönderir (inline butonlar: Onayla / Reddet / Yeniden Üret)
    ↓
4. 25 dakika bekler:
   - ✅ Onayla → X'e postlar
   - ❌ Reddet → postlanmaz
   - 🔄 Yeniden Üret → max 3 kez üretir
   - Reply at → yazdığın metni postlar (manuel düzenleme)
   - Timeout → postlanmaz
    ↓
5. posted-tweets.json günceller (tekrar önleme)
```

---

## Ton Sistemi

| Ton | Açıklama | Örnek |
|-----|----------|-------|
| **A** | Direkt değer/satış | "Sensör loglarını Excel'e aktarıp filtrelemekle uğraşma. NetOku 200MB log'u 90 saniyede sınıflıyor." |
| **C** | Build-in-public | "Bu hafta NetOku'ya batch analiz ekledim. Tek seferde 50 sensör dosyası — bir kullanıcı geri bildiriminden çıktı." |

Varsayılan: %50 A, %50 C. `src/config.ts` içinde `toneMix` ile değiştirilebilir.
