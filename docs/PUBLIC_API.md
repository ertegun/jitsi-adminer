# Public API — Toplantı Oluşturma

## Genel Bakış

Bu API, harici uygulamaların (örn. rezervasyon sistemi, mobil uygulama, CRM entegrasyonu) admin panelindeki kullanıcı arayüzüne ihtiyaç duymadan **API anahtarı** ile toplantı oluşturmasını ve katılım linkleri almasını sağlar.

API, organizasyon bazlıdır: her API anahtarı belirli bir organizasyona (`Organization`) bağlıdır ve o organizasyonun Jitsi ayarları/lisansı üzerinden çalışır.

## Kimlik Doğrulama

Tüm `/api/v1/*` endpoint'leri `Authorization` header'ında **Bearer token** bekler:

```
Authorization: Bearer jad_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

- API anahtarı yalnızca oluşturulduğu anda **bir kez** gösterilir, sunucu tarafında sadece hash'i (`SHA-256`) saklanır. Kaybederseniz yeni bir anahtar oluşturmanız gerekir.
- İptal edilen (`revoked`) anahtarlar `401 Unauthorized` döner.
- Anahtar her kullanıldığında `lastUsedAt` alanı güncellenir (panelden görüntülenebilir).

### API Anahtarı Nasıl Oluşturulur?

1. Panelde **Ayarlar → API Anahtarları** (`/settings/api-keys`) sayfasına gidin. (OWNER veya ADMIN rolü gereklidir.)
2. Bir isim girip **Oluştur**'a tıklayın (örn. "Rezervasyon Uygulaması").
3. Gösterilen anahtarı güvenli bir yere kaydedin — bir daha gösterilmeyecektir.

Aynı işlemi backend'den de yapabilirsiniz: `POST /api/keys` (oturum/cookie auth gerektirir, bkz. aşağıdaki "İç Yönetim Endpoint'leri" bölümü).

## Endpoint'ler

Taban URL: `https://<panel-domain>/api/v1`

### `POST /meetings` — Toplantı Oluştur

Yeni bir toplantı oluşturur ve (organizasyonun Jitsi bağlantısı `CONNECTED` ise) doğrudan kullanılabilir katılım linklerini döner.

**Request body (JSON):**

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `title` | string | ✅ | Toplantı başlığı |
| `scheduledStart` | ISO 8601 datetime | ❌ | Varsayılan: şimdi |
| `scheduledEnd` | ISO 8601 datetime | ❌ | Belirtilmezse ad-hoc toplantı kabul edilir (token 24 saat geçerli) |
| `lobbyEnabled` | boolean | ❌ | Varsayılan: `false` |
| `recordingEnabled` | boolean | ❌ | Varsayılan: `false` |
| `participantRoleMode` | `"HOST_GUEST"` \| `"EVERYONE_MODERATOR"` | ❌ | Varsayılan: `"HOST_GUEST"` |
| `hostName` | string | ❌ | Host linkindeki JWT'ye gömülecek görünen isim |
| `hostEmail` | string | ❌ | Host linkindeki JWT'ye gömülecek e-posta |
| `config` | object | ❌ | `startWithAudioMuted`, `startWithVideoMuted`, `requireDisplayName`, `prejoinPageEnabled`, `disableChat`, `disableReactions`, `e2eeEnabled` (hepsi boolean, opsiyonel) |

**Örnek istek:**

```bash
curl -X POST https://panel.example.com/api/v1/meetings \
  -H "Authorization: Bearer jad_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Satış Görüşmesi",
    "scheduledStart": "2026-09-20T10:00:00Z",
    "scheduledEnd": "2026-09-20T11:00:00Z",
    "lobbyEnabled": true,
    "hostName": "Ayşe Yılmaz",
    "hostEmail": "ayse@example.com"
  }'
```

**Başarılı yanıt (`201 Created`):**

```json
{
  "meeting": {
    "id": "cmf...",
    "title": "Satış Görüşmesi",
    "roomName": "acme-1a2b3c4d5e6f7a8b",
    "status": "SCHEDULED",
    "scheduledStart": "2026-09-20T10:00:00.000Z",
    "scheduledEnd": "2026-09-20T11:00:00.000Z",
    "lobbyEnabled": true,
    "recordingEnabled": false,
    "participantRoleMode": "HOST_GUEST",
    "createdAt": "2026-09-17T12:00:00.000Z"
  },
  "hostLink": "https://meet.example.com/acme-1a2b3c4d5e6f7a8b?jwt=eyJ...",
  "guestLink": "https://meet.example.com/acme-1a2b3c4d5e6f7a8b"
}
```

> `hostLink`/`guestLink` yalnızca organizasyonun Jitsi sunucusu `CONNECTED` durumundaysa doldurulur; aksi halde `null` döner ve toplantı yine de oluşturulmuş olur (linkler daha sonra `GET /meetings/:id` ile alınabilir).
>
> `participantRoleMode` `"EVERYONE_MODERATOR"` ise `guestLink` döndürülmez (herkes moderatör linkiyle katılır — bu modda ayrı guest linki üretilmez).

### `GET /meetings/:id` — Toplantı Detayı ve Güncel Linkler

Bir toplantının durumunu ve **taze imzalanmış** katılım linklerini döner. JWT'ler kısa ömürlü olduğundan linkler her çağrıda yeniden üretilir; sonuçları önbelleğe almayın.

```bash
curl https://panel.example.com/api/v1/meetings/cmf1234567890 \
  -H "Authorization: Bearer jad_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

Yanıt formatı `POST /meetings` ile aynıdır.

### `GET /meetings` — Toplantı Listesi

Organizasyona ait toplantıları en yeniden eskiye sıralı döner (cursor tabanlı sayfalama).

**Query parametreleri:**

| Parametre | Açıklama |
|---|---|
| `limit` | Sayfa başına kayıt (1–100, varsayılan 20) |
| `cursor` | Bir önceki yanıttaki `nextCursor` değeri |

```bash
curl "https://panel.example.com/api/v1/meetings?limit=10" \
  -H "Authorization: Bearer jad_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

```json
{
  "meetings": [ { "id": "...", "title": "...", "roomName": "...", "status": "SCHEDULED", ... } ],
  "nextCursor": "cmf..."
}
```

## Hata Formatı

Tüm hata yanıtları aşağıdaki şekilde döner:

```json
{
  "error": {
    "code": "invalid_request",
    "message": "scheduledEnd must be after scheduledStart"
  }
}
```

| HTTP Status | `code` | Anlamı |
|---|---|---|
| 400 | `invalid_request` | Geçersiz/eksik alan (body validasyon hatası) |
| 401 | `unauthorized` | API anahtarı eksik, geçersiz veya iptal edilmiş |
| 403 | `license_inactive` | Organizasyonun aktif lisansı yok |
| 404 | `not_found` | Organizasyon veya toplantı bulunamadı |
| 500 | `internal_error` | Sunucu hatası |

## İç Yönetim Endpoint'leri (Panel Oturumu ile)

Aşağıdaki endpoint'ler API anahtarıyla değil, panel **oturum çerezi** ile (yani panele giriş yapmış kullanıcı olarak, tarayıcıdan veya `next-auth` session cookie'siyle) çağrılır. Harici entegrasyonlar için değildir, kendi API anahtarlarınızı programatik olarak yönetmek isterseniz kullanılır.

- `GET /api/keys` — Organizasyonunuzun API anahtarlarını listeler (anahtar değeri değil, `keyPrefix` döner).
- `POST /api/keys` — `{ "name": "..." }` ile yeni anahtar oluşturur, yanıtta anahtarı **bir kez** döner. OWNER/ADMIN rolü gerektirir.
- `DELETE /api/keys/:id` — Anahtarı iptal eder (`revokedAt` set edilir, kalıcıdır). OWNER/ADMIN rolü gerektirir.

## Önemli Notlar

### 1. Anahtarı Asla İstemci Tarafında (Frontend/Mobil App) Saklamayın
API anahtarı organizasyonunuz adına toplantı oluşturma yetkisi verir. Yalnızca backend/sunucu tarafı kodunda kullanın; tarayıcı JS'ine, mobil uygulama binary'sine gömmeyin.

### 2. Host Linki ile Guest Linki Farkı
- `hostLink`: JWT içerir, moderatör yetkisiyle girer (kayıt, lobby bypass vb.).
- `guestLink`: JWT içermez (bilinçli olarak anonim) — Jitsi sunucusunda `ENABLE_GUESTS=1` etkinse, moderatör odayı açana kadar bekleme odasında kalır. Bu, `docs/JITSI_RESERVATION_API_SETUP.md` içinde açıklanan lobby mekanizmasıyla uyumludur.

### 3. Lisans ve Jitsi Bağlantısı
- Organizasyonun `License.status = ACTIVE` olması gerekir, aksi halde `403 license_inactive` alırsınız.
- Organizasyonun Jitsi sunucusu panelden bağlanıp (`/settings/jitsi`) `CONNECTED` durumuna getirilmemişse, toplantı oluşturulur ama linkler `null` döner.

### 4. Token Süresi
Host JWT'sinin geçerlilik süresi `scheduledEnd + 4 saat tolerans` (belirtilmişse) veya `scheduledStart + 24 saat` (ad-hoc toplantılarda) olacak şekilde otomatik hesaplanır — süresiz token üretilmez.

## Sorun Giderme

**"unauthorized" hatası alıyorum**
- **Sebep:** `Authorization` header eksik, format yanlış (`Bearer ` öneki unutulmuş) veya anahtar iptal edilmiş.
- **Çözüm:** Header'ı `Authorization: Bearer <anahtar>` formatında gönderin; panelde anahtarın "İptal Edildi" işaretli olmadığını kontrol edin.

**`hostLink`/`guestLink` sürekli `null` dönüyor**
- **Sebep:** Organizasyonun Jitsi sunucusu henüz bağlanmamış veya bağlantı testi başarısız.
- **Çözüm:** Panelde **Ayarlar → Jitsi Ayarları** sayfasından domain/App ID/App Secret girip "Bağlantıyı Test Et" ile `CONNECTED` durumuna getirin.

**"license_inactive" hatası**
- **Sebep:** Organizasyonun aktif bir lisansı yok veya süresi dolmuş.
- **Çözüm:** Lisans durumunu panelden veya süper admin üzerinden kontrol edin.

## Referanslar

- Toplantı JWT üretim mantığı: `lib/jitsi/generateToken.ts`
- Link oluşturma: `lib/jitsi/buildMeetingUrl.ts`
- API anahtarı doğrulama: `lib/auth/apiKey.ts`
- Endpoint kaynak kodu: `app/api/v1/meetings/route.ts`, `app/api/v1/meetings/[id]/route.ts`
- Lobby/rezervasyon entegrasyonu: `docs/JITSI_RESERVATION_API_SETUP.md`
