# TODO

- [ ] Davet e-postası gönderimi: `app/api/settings/members/route.ts` şu an davet linkini otomatik e-postayla
      göndermiyor, sadece yönetim ekranında kopyalanabilir link olarak gösteriyor. SMTP zaten `.env.example`
      içinde tanımlı (SMTP_HOST/PORT/USER/PASSWORD/FROM) — nodemailer (veya benzeri) ile bağlanıp
      `OrganizationInvite` oluşturulduğunda gerçek e-posta gönderimi eklenmeli.
