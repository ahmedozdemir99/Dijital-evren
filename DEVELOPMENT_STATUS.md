# Dijital Evrenim — Geliştirme ve Entegrasyon Durumu

> **Slogan:** Bilgiden düşünceye, düşünceden hayata.
> **Mimari:** **1–3–6–24** (1 Bütünleşik Uygulama, 3 Ana Alan, 6 Tematik Merkez, 24 İşlevsel Modül), IndexedDB (Şema v3) Yerel Kalıcı Veri Katmanı, PWA Çevrimdışı Desteği ve İsteğe Bağlı Sunucu Tabanlı Gemini AI Servisi.

---

## 1. Tamamlanan Ekosistem Altyapısı

- **Veri Katmanı ve Depolama (`IndexedDB v3`)**: `books`, `quotes`, `knowledgeNodes`, `entityRelations`, `quickNotes`, `moduleRecords`, `collections`, `attachments`, `moduleSettings`, `externalApps`, `activityLogs`, `notifications`, `profile`, `preferences` depoları ve `v1/v2 -> v3` migrasyon desteği.
- **Tahribatsız Migrasyon ve Kapsam Dışı Arşivleme**: `v3` geçişinde önceki `tarih-simulatoru` kayıtları ve ilişkileri birleşik `tarih-atlasi` modülüne taşınır; kapsam dışı bırakılan 5 modüle (`hatiralarim`, `soy-agacim`, `zeka-pro-ligi`, `bilge-akademi`, `deneme-analiz`) ait mevcut kullanıcı kayıtları silinmez ve Ayarlar sayfasından `legacy_archive` olarak JSON biçiminde dışa aktarılabilir.
- **Kademeli Hiyerarşi Gezinmesi**:
  - Ana Kontrol Paneli (`/`) — Özelleştirilebilir 9 widget; ana alan kartlarında yalnızca **3 Ana Alan** (`I. ZİHİN`, `II. KEŞİF`, `III. YAŞAM`)
  - Ana Alan Sayfası (`/alan/:domainId`) — Alan altındaki 2 tematik merkezi ve modül kısayollarını sunar
  - Merkez Sayfası (`/merkez/:centerId`) & Modül Dizini (`/moduller`)
  - Ortak Ekosistem Takvimi (`/takvim`), Koleksiyonlar (`/koleksiyonlar`), Dosya ve Medya Merkezi (`/medya`), Evrensel Arama (`Ctrl+K`), Evren Asistanı, Ayarlar (`/ayarlar`) ve PWA Desteği.

---

## 2. Nihai 1–3–6–24 Hiyerarşisi (3 Ana Alan · 6 Merkez · 24 Modül)

### I. ZİHİN — Bilmek ve düşünmek (12/12 Tamamlandı)

#### 1. İrfan — Kültür ve düşünce (6/6)
1. **Şiir Deryası** (`/modul/siir-deryasi`) — Şiir arşivi, şair profilleri, Türkçe hece ölçüsü ve kafiye/redif analizi; Alıntı Defterim, Kelime Müzesi ve AutoMusicPro aktarımı.
2. **Kelime Müzesi** (`/modul/kelime-muzesi`) — Sözlük, doğrulama durumlu etimoloji, anlam değişimi; Hafıza Sarayı ve Kendi Dünyam aktarımı.
3. **Edebiyat Atölyesi** (`/modul/edebiyat-atolyesi`) — Kitap/şiir referanslı çözümleme, edebî sanatlar; Zihin Atlası ve Kendi Ansiklopedim aktarımı.
4. **Felsefe Meclisi** (`/modul/felsefe-meclisi`) — Filozof galerisi, ikilemler, düşünce deneyleri, kurgu işaretli mektuplar; Sohbet Arşivi ve Mantık Akademisi aktarımı.
5. **Mantık Akademisi** (`/modul/mantik-akademisi`) — Önerme ayrıştırıcı ve otomatik doğruluk tablosu, argüman haritası, safsata kütüphanesi; Felsefe Meclisi ve Hafıza Sarayı aktarımı.
6. **Tarih Atlası** (`/modul/tarih-atlasi`) — Birleşik Dünya ve Türk tarihi, medeniyetler, şehir hafızası, karşılaştırmalı tarih/kaynakça ve kesin kurgu ayrımı işaretli Alternatif Tarih Simülatörü.

#### 2. İdrak — Bilgi ve hafıza (6/6)
7. **Dijital Kütüphanem** (`/modul/dijital-kutuphanem`) — Kitap arşivi (tekil veri sahibi), okuma ilerlemesi, hedef tarih, Alıntı Defterim ve Zihin Atlası aktarımı.
8. **Alıntı Defterim** (`/modul/alinti-defterim`) — Kaynaklı alıntılar, benzerlik/tekrar uyarısı, Zihin Atlası kavram bağlama.
9. **Sohbet Arşivi** (`/modul/sohbet-arsivi`) — Yapay zekâ ve düşünsel diyalog arşivi, Alıntı Defterim ve Kendi Ansiklopedim aktarımları, JSON içe aktarma.
10. **Zihin Atlası** (`/modul/zihin-atlasi`) — Etkileşimli SVG kavram ve bilgi ağı grafiği.
11. **Hafıza Sarayı** (`/modul/hafiza-sarayi`) — Aralıklı tekrar kartları, Kelime Müzesi ve Ansiklopedi aktarımı, Ortak Takvim entegrasyonu.
12. **Kendi Ansiklopedim** (`/modul/kendi-ansiklopedim`) — Kaynakçalı, sürüm geçmişli ve doğrulama durumlu kişisel ansiklopedi maddeleri.

### II. KEŞİF — Öğrenmek ve üretmek (5/5 Tamamlandı)

#### 3. Kozmos — Bilim ve matematik (3/3)
13. **Matematik Laboratuvarı** (`/modul/matematik-laboratuvari`) — Güvenli ifade değerlendirici ve fonksiyon çizici, denklem çözücü, geometri, olasılık, istatistik/matris, fraktal ve Sayıların Estetiği; AutoMusicPro ritim aktarımı.
14. **Gökyüzü Atlası** (`/modul/gokyuzu-atlasi`) — Açık simülasyon uyarılı güneş sistemi animasyonu, ölçek karşılaştırma, gözlem günlüğü; Kendi Dünyam gezegen ilhamı aktarımı.
15. **Bilim Müzesi** (`/modul/bilim-muzesi`) — Disiplin galerileri, zaman çizelgesi, etkileşimli Ohm/sarkaç/pH deneyleri; Kendi Dünyam ve Kendi Ansiklopedim aktarımı.

#### 4. Atölye — Sanat ve yaratıcılık (2/2)
16. **AutoMusicPro** (`/modul/automusicpro`) — Web Audio API tabanlı 16 adımlı ritim/melodi dizici, Şiir Deryası şiir ve Matematik Laboratuvarı ritim aktarımı.
17. **Kendi Dünyam** (`/modul/kendi-dunyam`) — Tamamen kurgusal olduğu işaretli SVG dünya haritası, medeniyet/dil/karakter/kronoloji editörü.

### III. YAŞAM — Yaşamak ve gelişmek (7/7 Tamamlandı)

#### 5. Tekâmül — Maneviyat ve gelişim (3/3)
18. **Tekâmül Yolunda** (`/modul/tekamul-yolunda`) — Alışkanlık takibi, hedef ilerlemesi, tefekkür günlüğü, gizlilik iznine bağlı ibadet ve sürüş tefekkürü özeti.
19. **Mihrap ve Minber** (`/modul/mihrap-ve-minber`) — Kaynak ve doğrulama durumu belirtilen dinî metin/hutbe arşivi.
20. **Namaz Yolculuğum** (`/modul/namaz-yolculugum`) — `ibadet` gizlilik alanı, vakit günlüğü, astronomik yaklaşıma dayalı referans vakit hesaplayıcı (resmî imsakiye yerine geçmez uyarılı).

#### 6. Hayat — Günlük yaşam ve hobiler (4/4)
21. **Bizbize Riders** (`/modul/bizbize-riders`) — Motosiklet garajı, sürüş ve bakım günlüğü, Karadeniz Asistanı rota ve Tekâmül Yolunda tefekkür aktarımı.
22. **Karadeniz Asistanı** (`/modul/karadeniz-asistani`) — Şematik kıyı haritası, durak ve mutfak rehberi, Bizbize Riders ve Bugün Ne Yesem aktarımları.
23. **Bugün Ne Yesem** (`/modul/bugun-ne-yesem`) — Tarif arşivi, eldeki malzemeye göre eşleştirme, haftalık plan ve otomatik alışveriş listesi.
24. **Akıllı Bileklik** (`/modul/akilli-bileklik`) — `saglik` gizlilik alanı, manuel giriş ve CSV içe aktarma (donanım sensörü bağlı değildir; dürüst biçimde `Bağlı Değil` gösterilir).

---

## 3. Kapsam Dışına Çıkarılanlar (Tahribatsız)

- **Kaldırılan Merkez:** Bilge (`bilge`).
- **Kaldırılan 5 Modül:** Hatıralarım (`hatiralarim`), Soy Ağacım (`soy-agacim`), Zekâ Pro Ligi (`zeka-pro-ligi`), Bilge Akademi (`bilge-akademi`), Deneme Analiz (`deneme-analiz`).
- **Birleştirilen Modül:** Tarih Simülatörü (`tarih-simulatoru`), Tarih Atlası (`tarih-atlasi`) altında 5. sekme (`Alternatif Tarih ve Simülatör`) olarak birleştirildi ve eski rota `/modul/tarih-atlasi?tab=simulator` adresine yönlendirildi.

---

## 4. Harici Bağlantı ve Yapılandırma Gerektiren Alanlar

- **Sunucu Yapay Zekâ Anahtarı (`GEMINI_API_KEY`)**: Evren Asistanı ve Felsefe Meclisi Sokratik sorgulaması için sunucu ortamında tanımlanmalıdır. Tanımlı olmadığında temel 24 modül eksiksiz çalışmaya devam eder.
- **12 Aktif Harici Uygulama (`/entegrasyonlar`)**: GitHub/canlı URL, API uç noktası, alan eşleme ve gerçek zamanlı bağlantı testi altyapısı hazırdır.
- **Akıllı Bileklik Donanımı**: Doğrudan Web Bluetooth bağlantısı olmadan manuel kayıt ve CSV/JSON içe aktarma ile çalışır.
