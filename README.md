# Dijital Evrenim

**Slogan:** *Bilgiden düşünceye, düşünceden hayata.*

Edebiyat, şiir, tarih, felsefe, mantık, matematik, bilim, sanat, maneviyat, kişisel gelişim ve günlük yaşam alanlarını tek bir modüler kişisel ekosistemde birleştiren Türkçe web uygulaması.

## Mimari Özeti

- **10 entegre modül** üç ana alana dağılır.
  - **Zihin** · Şiir Deryası, Dijital Kütüphanem, Alıntı Defterim, Sohbet Arşivi.
  - **Keşif** · AutoMusicPro.
  - **Yaşam** · Şahsiyet ve Tekâmül, Mihrap ve Minber, Namaz Yolculuğum, Karadeniz Asistanı, Bugün Ne Yesem.
- **Kalıcı Yerel Depolama ve Soyut Veri Katmanı (`src/core/storage/`, `src/core/repositories/`):**
  - IndexedDB (`DijitalEvrenimDB`, Şema v3) tabanlı kalıcı depolama; Kapsam dışı modüllerin kullanıcı kayıtları, Ayarlar’daki arşiv yedeği veya tam yedek üzerinden JSON olarak indirilebilir.
  - Gerçek kullanıcı kayıtları ile örnek başlangıç (`isDemo: true`) kayıtları ayrılmıştır.
- **Ortak Servisler ve Sunucu Katmanı (`server.ts`):**
  - Evrensel Arama (`Ctrl+K`), Ortak Takvim (`/takvim`), Koleksiyonlar (`/koleksiyonlar`), Medya Merkezi (`/medya`), Bildirimler, Tema Yönetimi (Koyu / Açık / Sistem), Ayarlar, 10 bağımsız uygulama için Entegrasyon Yönetimi (`/entegrasyonlar`) ve isteğe bağlı sunucu taraflı **Evren Asistanı** (`/api/ai/assist`).

## Kurulum ve Çalıştırma

```bash
bun install --frozen-lockfile
bun run dev
```

Üretim derlemesi, test ve tip kontrolü:

```bash
bun run test
bun run lint
bun run build
NODE_ENV=production bun run start
```

Modül başlıklarındaki **Çalışma defteri** rehberli alıştırmalar ve kişisel çalışma notları içerir. Notlar ve desteklenen yedek kayıtları Evrensel Arama üzerinden açılır. **Uygulamalar** tablosu her entegrasyonun canlı adresini açar. Desteklenen kaynak yedekleri Ayarlar’dan içe aktarılır. İçe aktarma önce önizleme sunar ve aynı kaynak kimliğine bağlı yerel düzenlemeleri korur.

Entegrasyon ekranı, bağımsız yayınları kendi adresinde ve ayrı sekmede açar. Bu yayınların hesabı ve tarayıcı depolaması kaynak uygulamaya aittir. Desteklenen dışa aktarımlar ayrıca Dijital Evrenim’in yerel kayıtlarına alınabilir. Mihrap Akademisi’nin dersleri yerleşik çalışır. Şiir Deryası, Tekâmül ve AutoMusicPro için kaynak yedeğini kullanan entegre çalışma alanları vardır.

[Cloudflare ve Supabase kurulum belgesi](CLOUDFLARE.md)
