export const INDEPENDENT_APPLICATIONS: Record<string, string> = {
  'dijital-kutuphanem': 'https://final-kutuphanem.pages.dev/',
  'alinti-defterim': 'https://al-nt-defterim.pages.dev/',
  'sohbet-arsivi': 'https://sohbet-arsivi-ejs.pages.dev/',
  'siir-deryasi': 'https://siir-deryasi.pages.dev/',
  'mihrap-ve-minber': 'https://mihrap-ve-minber.pages.dev/',
  'namaz-yolculugum': 'https://namaz-yolculugum.pages.dev/',
  'bugun-ne-yesem': 'https://bugun-ne-yesem.pages.dev/',
  'karadeniz-asistani': 'https://karadeniz-asistani.pages.dev/',
  automusicpro: 'https://automusic-pro.ai.studio/',
  'tekamul-yolunda': 'https://tek-mul-yolunda.pages.dev/',
  'bilge-akademi': 'https://bilge-akademi4.pages.dev/',
  'zeka-pro-ligi': 'https://zeka-pro-ligim.pages.dev/',
};

export function independentSourceUrl(appId: string): string | undefined {
  return Object.hasOwn(INDEPENDENT_APPLICATIONS, appId) ? INDEPENDENT_APPLICATIONS[appId] : undefined;
}

export function independentApplicationHref(appId: string) {
  return independentSourceUrl(appId) ?? `/uygulamalar/${encodeURIComponent(appId)}`;
}
