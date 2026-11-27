import {
  BookOpen, BookOpenCheck, ChartNoAxesCombined, Compass, CookingPot, GraduationCap, LibraryBig, MessagesSquare,
  MoonStar, Music2, NotebookPen, Quote, Sprout, Trophy,
} from 'lucide-react';
import { Navigate, useLocation } from 'react-router-dom';
import { EXISTING_APPS_LIST } from '../core/registry/modules';
import { IndependentApplicationLink } from '../integrations/shared/IndependentApplicationLink';

const appearance: Record<string, { color: string; icon: typeof BookOpen }> = {
  'dijital-kutuphanem': { color: 'blue', icon: LibraryBig },
  'alinti-defterim': { color: 'teal', icon: Quote },
  'sohbet-arsivi': { color: 'amber', icon: MessagesSquare },
  'siir-deryasi': { color: 'rose', icon: BookOpen },
  automusicpro: { color: 'violet', icon: Music2 },
  'tekamul-yolunda': { color: 'green', icon: Sprout },
  'mihrap-ve-minber': { color: 'indigo', icon: GraduationCap },
  'namaz-yolculugum': { color: 'pink', icon: MoonStar },
  'bugun-ne-yesem': { color: 'orange', icon: CookingPot },
  'karadeniz-asistani': { color: 'cyan', icon: Compass },
  'bilge-akademi': { color: 'slate', icon: BookOpenCheck },
  'zeka-pro-ligi': { color: 'lime', icon: Trophy },
  'deneme-analiz': { color: 'red', icon: ChartNoAxesCombined },
  'kulliyat-gunlugum': { color: 'emerald', icon: NotebookPen },
};

const applications = [
  ...EXISTING_APPS_LIST,
  { appId: 'bilge-akademi', name: 'Bilge Akademi' },
  { appId: 'zeka-pro-ligi', name: 'Zekâ Pro Ligim' },
  { appId: 'deneme-analiz', name: 'LGS Deneme Analiz' },
  { appId: 'kulliyat-gunlugum', name: 'Külliyat Günlüğüm' },
];

export function ApplicationLauncher() {
  return (
    <nav id="uygulamalar" aria-labelledby="applications-title" className="scroll-mt-24">
      <h1 id="applications-title" className="text-3xl font-semibold sm:text-4xl">Uygulamalar</h1>
      <ul className="mt-5 grid grid-cols-3 gap-x-2 gap-y-5 text-center sm:grid-cols-5 sm:gap-y-7">
        {applications.map(({ appId, name }) => {
          const { color, icon: Icon } = appearance[appId] ?? { color: 'blue', icon: BookOpen };
          return (
            <li key={appId} id={appId} className="min-w-0 scroll-mt-24">
              <IndependentApplicationLink appId={appId}
                className="group flex h-full flex-col items-center gap-2 rounded-2xl px-1 py-1 text-[0.8125rem] font-semibold leading-snug focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8C6B32] dark:focus-visible:outline-[#D6B782] sm:text-sm">
                <span aria-hidden="true" data-menu-color={color}
                  className="menu-link grid size-16 shrink-0 place-items-center rounded-full group-hover:shadow-md sm:size-20">
                  <Icon className="size-7 sm:size-8" strokeWidth={1.75} />
                </span>
                <span className="max-w-full wrap-anywhere">{name}<span className="sr-only"> (yeni sekmede açılır)</span></span>
              </IndependentApplicationLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function IntegrationsPage() {
  const { hash } = useLocation();
  return <Navigate replace to={'/' + (hash || '#uygulamalar')} />;
}
