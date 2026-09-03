# Jitsi Prosody Reservation API Setup

## Genel Bakış

**Reservation API**, Prosody'nin oda oluşturmadan önce backend'e sorduğu bir mekanizmadır. 
Bu sayede **her toplantı için lobby'yi ayrı ayrı** kontrol edebilir, sadece kayıtlı odaların açılmasına izin verebilir ve toplantı süresini sınırlayabilirsiniz.

## Nasıl Çalışır?

1. **Kullanıcı Jitsi odaya girer** → Prosody oda yoksa oluşturacak
2. **Prosody önce backend'e sorar:** `POST /api/reservation/conference`
   - Request: `name=grup-arge-abc123`, `mail_owner=user@example.com`
3. **Backend DB'ye bakar:**
   - ✅ Oda kayıtlı ve `lobbyEnabled=true` → `200 { lobby: true, duration: 3600 }`
   - ❌ Oda kayıtlı değil → `403 { message: "Toplantı bulunamadı" }`
4. **Prosody odayı oluşturur** (403 aldıysa oda açılmaz)
5. **Moderator lobby'yi manuel açmak zorunda kalmaz** - DB'den gelen ayar zaten aktif

## Backend API (✅ Zaten Hazır)

`jitsi-adminer` projesinde aşağıdaki endpoint'ler **zaten mevcut:**

- `POST /api/reservation/conference` → Oda oluşturma kontrolü
- `GET /api/reservation/conference/:id` → 409 recovery flow
- `DELETE /api/reservation/conference/:id` → Oda kapandığında bildirim

Backend kodu: `app/api/reservation/conference/route.ts`

## Jitsi Server Tarafı Ayarları (❌ Eksik - Eklenmeli)

### Self-Hosted Jitsi Meet Docker Compose

Jitsi Meet docker-compose.yml dosyanızdaki **`prosody`** servisine şu environment variable'ları ekleyin:

```yaml
services:
  prosody:
    image: jitsi/prosody:stable-9220
    restart: unless-stopped
    environment:
      # 1. Reservation API'yi aktif et
      - PROSODY_RESERVATION_ENABLED=1
      
      # 2. Backend URL (admin panel'in PUBLIC erişilebilir URL'i)
      - PROSODY_RESERVATION_REST_BASE_URL=https://admin.gruparge.tr
      
      # 3. Lobby desteğini aç (virgülle ayrılmış Lua config)
      - XMPP_CONFIGURATION=reservations_enable_lobby_support = true
      
      # 4. Guest ve Lobby modüllerini aktif et
      - ENABLE_GUESTS=1
      - ENABLE_LOBBY=1
      
      # 5. JWT Auth (zaten var olmalı)
      - ENABLE_AUTH=1
      - AUTH_TYPE=jwt
      - JWT_APP_ID=jitsi-e7e13546abbfed28
      - JWT_APP_SECRET=your-secret-here
      - XMPP_GUEST_DOMAIN=guest.meet.jitsi
      
      # 6. Lobby modülleri (virgülle ayrılmış liste)
      - XMPP_MODULES=muc_lobby_rooms,muc_wait_for_host,persistent_lobby
```

### Coolify / Tek Container Env Var Yönetimi

Eğer Coolify, Portainer veya manuel env file kullanıyorsanız:

```bash
PROSODY_RESERVATION_ENABLED=1
PROSODY_RESERVATION_REST_BASE_URL=https://admin.gruparge.tr
XMPP_CONFIGURATION=reservations_enable_lobby_support = true
ENABLE_GUESTS=1
ENABLE_LOBBY=1
ENABLE_AUTH=1
AUTH_TYPE=jwt
JWT_APP_ID=jitsi-e7e13546abbfed28
JWT_APP_SECRET=your-secret-here
XMPP_GUEST_DOMAIN=guest.meet.jitsi
XMPP_MODULES=muc_lobby_rooms,muc_wait_for_host,persistent_lobby
```

## Önemli Notlar

### 1. Backend URL Public Erişilebilir Olmalı
Prosody, `PROSODY_RESERVATION_REST_BASE_URL` adresine HTTP POST yapacak. Bu URL:
- ✅ Jitsi server'dan erişilebilir olmalı (localhost değil, gerçek domain)
- ✅ HTTPS olmalı (SSL sertifikası geçerli)
- ❌ Firewall tarafından engellenmemeli

### 2. Guest Domain Ayarları
`XMPP_GUEST_DOMAIN=guest.meet.jitsi` değeri:
- `jitsi-web` servisinde de aynı olmalı
- `jicofo` servisinde de tanımlı olmalı
- Prosody internal DNS'inde guest virtualhost olarak ayaklanır

### 3. XMPP_CONFIGURATION Syntax
```bash
# ✅ Doğru (virgülle ayrılmış, eşittir etrafında boşluk)
XMPP_CONFIGURATION=reservations_enable_lobby_support = true,max_participants = 50

# ❌ Yanlış (newline ile ayrılmış)
XMPP_CONFIGURATION="reservations_enable_lobby_support = true
max_participants = 50"
```

## Test Adımları

### 1. Prosody Loglarını Kontrol Et
```bash
docker logs <prosody-container-name> 2>&1 | grep -i reservation

# Beklenen çıktı:
# mod_reservations info Reservation API enabled at https://admin.gruparge.tr
```

### 2. Backend API Test
```bash
curl -X POST https://admin.gruparge.tr/api/reservation/conference \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "name=grup-arge-test123&mail_owner=test@example.com"

# Beklenen response (200):
{
  "id": "...",
  "name": "grup-arge-test123",
  "duration": 14400,
  "lobby": true
}

# Veya kayıtlı değilse (403):
{
  "message": "Bu toplantı sistemde kayıtlı değil"
}
```

### 3. Gerçek Toplantı Testi

1. Admin panelden **lobby enabled** bir toplantı oluştur
2. **Misafir linki** (JWT'siz) ile incognito modda gir
3. **Beklenen:** "Waiting for the host..." mesajı görünmeli
4. **Host linki** (JWT'li) ile normal pencerede gir
5. **Beklenen:** Lobby UI'da görünmeli, moderator misafiri kabul edebilmeli

### 4. Lobby Kapalı Toplantı Testi

1. Admin panelden **lobby disabled** bir toplantı oluştur
2. Misafir linki ile gir
3. **Beklenen:** Doğrudan odaya girilmeli, bekleme yok

## Sorun Giderme

### "Rejected by reservation server, code 405"
- **Sebep:** Backend `/api/reservation/conference` endpoint'i `POST` method'unu desteklemiyor
- **Çözüm:** Next.js route.ts dosyasında `export async function POST(...)` olduğundan emin ol

### "Rejected by reservation server, code 403"
- **Sebep:** Oda DB'de kayıtlı değil veya backend bilerek reddetti
- **Çözüm:** `meeting.roomName` değerinin DB'de mevcut olduğunu kontrol et

### Lobby Her Zaman Kapalı Geliyor
- **Sebep:** `XMPP_CONFIGURATION=reservations_enable_lobby_support = true` eksik veya yanlış yazılmış
- **Çözüm:** 
  1. Prosody container'ını yeniden başlat
  2. `docker logs prosody | grep reservations_enable_lobby_support` ile kontrol et

### Misafir JWT ile Giriyor ve Lobby'yi Bypass Ediyor
- **Sebep:** Guest link yanlışlıkla JWT içeriyor
- **Çözüm:** Guest link tamamen anonymous olmalı (sadece `https://meet.example.com/room-name`)

## Referanslar

- [Jitsi Handbook - Reservation System](https://jitsi.github.io/handbook/docs/devops-guide/reservation)
- [Prosody Reservation Module Source](https://github.com/jitsi/jitsi-meet/blob/master/resources/prosody-plugins/mod_reservations.lua)
- Skill: `jitsi-meet-jwt-lobby` → `skill_view(name='jitsi-meet-jwt-lobby')`
