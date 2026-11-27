# Dijital Evrenim

**Slogan:** *Bilgiden düşünceye, düşünceden hayata.*

Edebiyat, şiir, tarih, felsefe, mantık, matematik, bilim, sanat, maneviyat, kişisel gelişim ve günlük yaşam alanlarını tek bir modüler kişisel ekosistemde birleştiren Türkçe web uygulaması.

## Mimari Özeti (1–3–6–22)

- **1 Bütünleşik Ana Uygulama — 3 Ana Alan — 6 Tematik Merkez — 22 İşlevsel Modül (`src/core/registry/modules.ts`):**
  - **I. ZİHİN — Bilmek ve düşünmek (12 Modül)**
    - **İrfan** (*Kültür ve düşünce*, 6): Şiir Deryası, Kelime Müzesi, Edebiyat Atölyesi, Felsefe Meclisi, Mantık Akademisi, Tarih Atlası (birleşik Tarih Atlası & Simülatörü).
    - **İdrak** (*Bilgi ve hafıza*, 6): Dijital Kütüphanem, Alıntı Defterim, Sohbet Arşivi, Zihin Atlası, Hafıza Sarayı, Kendi Ansiklopedim.
  - **II. KEŞİF — Öğrenmek ve üretmek (5 Modül)**
    - **Kozmos** (*Bilim ve matematik*, 3): Matematik Laboratuvarı, Gökyüzü Atlası, Bilim Müzesi.
    - **Atölye** (*Sanat ve yaratıcılık*, 2): AutoMusicPro, Kendi Dünyam.
  - **III. YAŞAM — Yaşamak ve gelişmek (5 Modül)**
    - **Tekâmül** (*Maneviyat ve gelişim*, 3): Tekâmül Yolunda, Mihrap ve Minber, Namaz Yolculuğum.
    - **Hayat** (*Günlük yaşam ve hobiler*, 2): Karadeniz Asistanı, Bugün Ne Yesem.
- **Kalıcı Yerel Depolama ve Soyut Veri Katmanı (`src/core/storage/`, `src/core/repositories/`):**
  - IndexedDB (`DijitalEvrenimDB`, Şema v3) tabanlı kalıcı depolama; `v2 -> v3` geçişinde kapsam dışı bırakılan modüllere ait kullanıcı verileri silinmez, `Ayarlar` üzerinden `legacy_archive` kapsamında JSON olarak dışa aktarılabilir.
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

Modül başlıklarındaki **Çalışma defteri** rehberli alıştırmalar ve kişisel çalışma notları içerir. Notlar ve desteklenen yedek kayıtları Evrensel Arama üzerinden açılır. **Entegrasyonlar** sayfasında her kaynağın tanınan veri biçimi ve varsa canlı adresi gösterilir. İçe aktarma önce önizleme sunar ve aynı kaynak kimliğine bağlı yerel düzenlemeleri korur.

Entegrasyon ekranı, gömülmeye izin veren bağımsız yayınları kendi adresleriyle açar. Bu yayınların hesabı ve tarayıcı depolaması kaynak uygulamaya aittir. Desteklenen dışa aktarımlar ayrıca Dijital Evrenim’in yerel kayıtlarına alınabilir. Mihrap Akademisi’nin dersleri yerleşik çalışır. Şiir Deryası, Tekâmül ve AutoMusicPro için kaynak yedeğini kullanan entegre çalışma alanları vardır.

[Cloudflare ve Supabase kurulum belgesi](CLOUDFLARE.md)
