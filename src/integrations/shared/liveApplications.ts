export const LIVE_APPLICATIONS: Record<string, { url: string; embedded: boolean; allow?: string }> = {
  'dijital-kutuphanem': { url: 'https://final-kutuphanem.pages.dev/', embedded: true },
  'alinti-defterim': { url: 'https://al-nt-defterim.pages.dev/', embedded: true },
  'sohbet-arsivi': { url: 'https://sohbet-arsivi-ejs.pages.dev/', embedded: true, allow: 'fullscreen; encrypted-media; picture-in-picture' },
  'siir-deryasi': { url: 'https://siir-deryasi.pages.dev/', embedded: false },
  'namaz-yolculugum': { url: 'https://namaz-yolculugum.pages.dev/', embedded: true },
  'bugun-ne-yesem': { url: 'https://bugun-ne-yesem.pages.dev/', embedded: true },
  'karadeniz-asistani': { url: 'https://karadeniz-asistani.pages.dev/', embedded: true, allow: 'geolocation' },
};
