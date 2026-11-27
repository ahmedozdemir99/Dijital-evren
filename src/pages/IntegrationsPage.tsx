import { useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { EXISTING_APPS_LIST } from '../core/registry/modules';
import { IndependentApplicationLink } from '../integrations/shared/IndependentApplicationLink';

const applicationColors: Record<string, string> = {
  'dijital-kutuphanem': 'blue',
  'alinti-defterim': 'teal',
  'sohbet-arsivi': 'amber',
  'siir-deryasi': 'rose',
  automusicpro: 'violet',
  'tekamul-yolunda': 'green',
  'mihrap-ve-minber': 'indigo',
  'namaz-yolculugum': 'pink',
  'bugun-ne-yesem': 'orange',
  'karadeniz-asistani': 'cyan',
};

export function IntegrationsPage() {
  const { hash } = useLocation();

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'nearest' });
  }, [hash]);

  return (
    <section className="w-full max-w-3xl space-y-2">
      <h1 id="applications-title" className="text-2xl font-semibold sm:text-3xl">Uygulamalar</h1>
      <table aria-labelledby="applications-title"
        className="w-full border-separate border-spacing-y-2 text-left">
        <thead className="sr-only">
          <tr><th scope="col">Uygulama adı</th></tr>
        </thead>
        <tbody>
          {EXISTING_APPS_LIST.map(({ appId, name }) => (
            <tr key={appId} id={appId} className="scroll-mt-20">
              <td className="p-0">
                <IndependentApplicationLink appId={appId} color={applicationColors[appId]}
                  className="menu-link flex min-h-16 items-center justify-between gap-3 rounded-full px-5 py-2 text-base font-semibold sm:min-h-[4.5rem] sm:px-6 sm:text-lg">
                  <span>{name}<span className="sr-only"> (yeni sekmede açılır)</span></span>
                  <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-current/10">
                    <ExternalLink className="size-5" />
                  </span>
                </IndependentApplicationLink>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
