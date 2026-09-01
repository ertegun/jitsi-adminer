# Jitsi Admin Panel

Self-hosted Jitsi Meet sunucuları için kurumsal video konferans yönetim paneli. JWT tabanlı kimlik doğrulama, toplantı planlama, katılımcı takibi ve raporlama özellikleri sunar.

## Özellikler

### ✅ MVP Özellikleri (Tamamlandı)

- **Kullanıcı Yönetimi**
  - Açık kayıt (email + şifre)
  - NextAuth.js ile kimlik doğrulama
  - Multi-tenant organizasyon yapısı
  - Rol bazlı yetkilendirme (OWNER, ADMIN, HOST, VIEWER)
  - **Super Admin sistemi** (sistem geneli yönetim)

- **Super Admin Panel** 🔐
  - Tüm organizasyonları görüntüleme
  - Tüm kullanıcıları listeleme
  - Tüm toplantıları ve JWT linklerini görüntüleme
  - Sistem geneli kullanım raporları
  - Organizasyon bazlı kota takibi
  - Katılımcı-saat bazlı metrikler

- **Lisans Yönetimi**
  - Mock lisans doğrulama (üretim için hazır altyapı)
  - Organizasyon bazlı lisans takibi
  - Otomatik yeniden doğrulama mekanizması

- **Jitsi Sunucu Bağlantısı**
  - Remote mode: Harici Jitsi sunucularına bağlanma
  - Organizasyon bazlı JWT App ID/Secret yönetimi
  - Bağlantı durumu takibi

- **Veritabanı**
  - SQLite (geliştirme)
  - MySQL desteği (production)
  - Prisma ORM ile DB-agnostik migration'lar

- **Webhook Altyapısı**
  - Jitsi mod_http_events_plugin entegrasyonu
  - Toplantı ve katılımcı event'lerini dinleme
  - Güvenli webhook endpoint (secret doğrulama)

### 🚧 Geliştirme Aşamasında

- Toplantı oluşturma ve yönetimi
- JWT token üretimi (host/guest linkleri)
- Toplantı detay ve katılımcı raporları
- API Key sistemi (harici uygulamalar için)
- E-posta bildirimleri + .ics takvim daveti
- Tekrarlayan toplantılar
- Kullanım/kota raporları

## Gereksinimler

- Node.js 20+
- npm veya pnpm
- SQLite (geliştirme) veya MySQL 8.0+ (production)
- Docker ve Docker Compose (opsiyonel, önerilen)

## Kurulum

### 1. Projeyi Klonlayın

```bash
git clone <repo-url>
cd jitsi-adminer
```

### 2. Bağımlılıkları Yükleyin

```bash
npm install --legacy-peer-deps
```

> **Not:** `--legacy-peer-deps` bayrağı Next.js 16 ile NextAuth beta uyumluluğu için gereklidir.

### 3. Ortam Değişkenlerini Yapılandırın

```bash
cp .env.example .env
```

`.env` dosyasını düzenleyin:

```env
# Database (SQLite for dev)
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<openssl rand -base64 32 ile üretin>"

# Jitsi
JITSI_DEPLOYMENT_MODE="remote"
JITSI_WEBHOOK_SECRET="<openssl rand -base64 32 ile üretin>"
```

### 4. Veritabanını Oluşturun

```bash
npx prisma migrate dev --name init
```

### 5. Uygulamayı Başlatın

```bash
npm run dev
```

Uygulama http://localhost:3000 adresinde çalışacaktır.

### 6. Super Admin Hesabı Oluşturma

İlk super admin hesabını oluşturun:

```bash
npm run seed
```

**Varsayılan Super Admin:**
- Email: `admin@jitsi-admin.local`
- Password: `admin123456`
- ⚠️ **Production'da mutlaka değiştirin!**

Super admin paneline `/admin` adresinden erişebilirsiniz.

## Docker ile Kurulum

### Production (MySQL)

```bash
# .env dosyasını düzenleyin (MySQL bağlantı bilgileri)
cp .env.example .env

# Servisleri başlatın
docker-compose up -d

# Logları izleyin
docker-compose logs -f app
```

### Development (Hot Reload)

```bash
# Override dosyasını kopyalayın
cp docker-compose.override.yml.example docker-compose.override.yml

# Dev modunda başlatın
docker-compose up
```

## Deployment Modları

### Remote Mode (Önerilen - SaaS)

Panel, harici Jitsi sunucularına bağlanır. Her organizasyon kendi Jitsi sunucusunu panel üzerinden yapılandırır.

**Özellikler:**
- Çoklu organizasyon desteği
- Her org'un kendi Jitsi sunucusu
- Merkezi yönetim paneli

**Kurulum:**
1. `.env` dosyasında `JITSI_DEPLOYMENT_MODE=remote` olarak ayarlayın
2. Panel'i bir sunucuya deploy edin
3. Organizasyon sahibi panel içinden "Jitsi Sunucu Ekle" ile kendi sunucusunu bağlar

### Embedded Mode (On-Premise)

Panel ve Jitsi aynı sunucuda birlikte çalışır. Tek kiracı/tek organizasyon senaryoları için.

**Kurulum:**
1. `.env` dosyasında `JITSI_DEPLOYMENT_MODE=embedded` ayarlayın
2. Resmi docker-jitsi-meet repo'sunu klonlayın:
   ```bash
   git clone https://github.com/jitsi/docker-jitsi-meet ./jitsi
   cd jitsi
   cp env.example .env
   ```
3. Jitsi `.env` dosyasını düzenleyin (JWT ayarları panel ile aynı olmalı)
4. Her iki compose dosyasını birlikte başlatın:
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.jitsi.yml up
   ```

## Jitsi Sunucu Yapılandırması

Panel'in çalışması için Jitsi sunucusunda **JWT token authentication** aktif olmalıdır.

### Jitsi Token Auth Ayarları

Jitsi docker-compose `.env` dosyasına ekleyin:

```env
ENABLE_AUTH=1
AUTH_TYPE=jwt
JWT_APP_ID=<panel tarafından üretilen App ID>
JWT_APP_SECRET=<panel tarafından üretilen App Secret>
ENABLE_GUESTS=0
```

> ⚠️ **ÖNEMLİ:** Bu ayarlar yapılmadan panel JWT üretse bile, kullanıcılar doğrudan Jitsi URL'sine gidip oda açabilir. Token auth zorunlu kılınmalıdır.

### Webhook Yapılandırması

Jitsi'de `mod_http_events_plugin` aktif olmalı ve webhook URL panel'in adresine işaret etmelidir:

```lua
-- prosody config
http_events = {
  webhook_url = "https://your-panel-domain.com/api/webhooks/jitsi"
  webhook_secret = "<JITSI_WEBHOOK_SECRET>"
}
```

## Veritabanı Migration (SQLite → MySQL)

Geliştirme aşamasında SQLite kullanıyorsanız, production'a geçerken:

1. `DATABASE_URL` değiştirin:
   ```env
   DATABASE_URL="mysql://user:password@localhost:3306/jitsi_admin"
   ```

2. Prisma schema'da provider'ı güncelleyin:
   ```prisma
   datasource db {
     provider = "mysql"
     url      = env("DATABASE_URL")
   }
   ```

3. Migration'ları tekrar çalıştırın:
   ```bash
   npx prisma migrate deploy
   ```

## Proje Yapısı

```
jitsi-adminer/
├── app/                      # Next.js App Router
│   ├── api/                  # API routes
│   │   ├── auth/             # Authentication endpoints
│   │   ├── license/          # License validation
│   │   └── webhooks/         # Jitsi webhook receiver
│   ├── auth/                 # Auth pages (signin, signup)
│   ├── dashboard/            # Main dashboard
│   └── onboarding/           # License activation flow
├── lib/                      # Shared utilities
│   ├── auth/                 # NextAuth config
│   ├── db/                   # Prisma client
│   ├── jitsi/                # JWT generation, URL building
│   └── license/              # License validation logic
├── prisma/                   # Database schema & migrations
├── types/                    # TypeScript type definitions
├── Dockerfile                # Production image
├── docker-compose.yml        # MySQL + App services
└── .env.example              # Environment template
```

## API Endpoints

### Public Endpoints

- `POST /api/auth/signup` - Yeni kullanıcı kaydı
- `POST /api/auth/signin` - Giriş (NextAuth)
- `POST /api/webhooks/jitsi` - Jitsi event webhook (secret-protected)

### Protected Endpoints

- `POST /api/license/validate` - Lisans doğrulama
- `GET /api/health` - Health check

## Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## Lisans

MIT

## Sorun Giderme

### "ENOTEMPTY: directory not empty" hatası

Windows'ta npm paketleri silinirken dosya kilitleme sorunu:
```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### Prisma Client bulunamıyor

```bash
npx prisma generate
```

### Docker container başlamıyor

Health check loglarını kontrol edin:
```bash
docker-compose logs app
docker-compose logs db
```

## Roadmap

- [ ] Toplantı oluşturma/düzenleme UI
- [ ] JWT link üretimi (host/guest)
- [ ] Katılımcı raporları
- [ ] API Key yönetimi
- [ ] E-posta/takvim entegrasyonu
- [ ] Tekrarlayan toplantılar
- [ ] Kullanım/kota dashboard
- [ ] Jibri recording entegrasyonu
- [ ] Gerçek lisans sunucusu entegrasyonu

## İletişim

Sorularınız için issue açabilir veya [email] ile iletişime geçebilirsiniz.
