# Cloudflare Pages ve Sites

## Cloudflare Pages

GitHub deposu `ahmedozdemir99/Dijital-evren`, üretim dalı `main`. Proje kökü depo köküdür.

- Kurulum: `bun install --frozen-lockfile`
- Derleme: `bun run build`
- Çıktı: `dist`
- Node: 22.12 veya üzeri
- Pages Functions: `functions/api`
- `dist/_routes.json` yalnızca `/api/*` isteklerini Functions’a yönlendirir. Diğer rotalar SPA tarafından açılır.

## Sites

`node scripts/build-sites.mjs` aynı istemciyi `dist/client` ve API Worker’ını `dist/server/index.js` altında paketler. Sites ve Cloudflare adresleri ayrı tarayıcı depolarıdır. Mevcut tarayıcı verilerini başka bir origin’e geçirmek için Ayarlar’dan bir JSON yedeği indirin ve hedef sitede birleştirme seçeneğiyle yükleyin.

## Supabase

1. Dijital Evrenim’in ayrı Supabase projesi üretim için kullanılır. Şema değişiklikleri `supabase/migrations` altında tutulur.
2. Ayarlar’daki **İlk kez bulut hesabı aç** seçeneği ile Supabase tarafından e-posta almaya yetkili adrese bir onay gönderilebilir. Onaydan sonra e-posta ve parola ile oturum açılır. Üretim derlemesi ayrılmış projenin yayımlanabilir anahtarını kullanır. Başka bir ortam için hem `VITE_SUPABASE_URL` hem `VITE_SUPABASE_PUBLISHABLE_KEY` verin.
3. Ayarlar üzerinden bir test hesabıyla yükleme ve indirmeyi, ikinci hesapla yedeklere erişimin engellendiğini doğrulayın. Satır düzeyi erişim kullanıcı kimliğine dayanır. Bulut eşitleme yeni kayıtları ve daha yakın tarihli düzenlemeleri birleştirir. Yerel silmeler, profil, uygulama ayarları ve geçici işlem geçmişi cihazlar arasında birleştirilmez. Tam kapsam bu sürümün JSON yedeğinde bulunur.
4. Bulut kaydı kullanıcı isteğiyle yürütülür. Her başarılı yükleme bir sürüm oluşturur. Arayüz en son 20 sürümü listeler. İndirilen eski bir sürümü Ayarlar’dan geri yükleyebilirsiniz.

## Evren Asistanı

`dijital-evren.pages.dev` yayını, uygulamanın mevcut Supabase projesini kullanır. Cloudflare Pages projesindeki **Settings → Variables and Secrets → Production** bölümüne mevcut ücretsiz Google AI Studio projesinin `GEMINI_API_KEY` değerini şifreli secret olarak ekleyin. `AI_ALLOWED_USER_IDS` değişkenine erişmesine izin verilen Supabase kullanıcı UUID’lerini virgülle ayırarak yazın. Gerekirse `GEMINI_MODEL` ile ücretsiz kotası bulunan modeli seçin ve üretimi yeniden dağıtın.

Yerel ve diğer yayın ortamlarında ayrıca `SUPABASE_URL` ve `SUPABASE_PUBLISHABLE_KEY` sağlanır. Asistan Supabase oturumunu ve izin listesini doğrular. Anahtarları istemciye göndermeyin veya depoya eklemeyin. İstemci kayıt özeti eklemek için soru başına açık seçim sunar.

## Doğrulama

`bun run lint`, `bun run test`, `bun run build`. Canlı HTTPS adresinde doğrudan modül adresini, `/api/health`, manifesti ve çevrimdışı açılışı kontrol edin. Kaynak kodu ve paket testleri canlı Supabase, Gemini veya cihazda kuruluma ilişkin doğrulamanın yerine geçmez.
