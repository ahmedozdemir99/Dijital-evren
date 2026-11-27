import { useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { EXISTING_APPS_LIST } from '../core/registry/modules';
import { IndependentApplicationLink } from '../integrations/shared/IndependentApplicationLink';

export function IntegrationsPage() {
  const { hash } = useLocation();

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'nearest' });
  }, [hash]);

  return (
    <section className="w-full max-w-3xl space-y-4">
      <h1 id="applications-title" className="text-2xl font-semibold sm:text-3xl">Uygulamalar</h1>
      <table aria-labelledby="applications-title"
        className="w-full rounded-xl bg-white text-left shadow-sm ring-1 ring-black/10 dark:bg-[#1C2633] dark:ring-white/10">
        <thead className="sr-only">
          <tr><th scope="col">Uygulama adı</th></tr>
        </thead>
        <tbody className="divide-y divide-black/10 dark:divide-white/10">
          {EXISTING_APPS_LIST.map(({ appId, name }) => (
            <tr key={appId} id={appId} className="scroll-mt-20">
              <td className="p-0">
                <IndependentApplicationLink appId={appId}
                  className="flex min-h-12 items-center justify-between gap-3 rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-black/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#8C6B32] dark:hover:bg-white/5 dark:focus-visible:outline-[#D6B782] sm:px-5 sm:text-base">
                  <span>{name}<span className="sr-only"> (yeni sekmede açılır)</span></span>
                  <ExternalLink aria-hidden="true" className="size-4 shrink-0 text-[#546070] dark:text-[#9BA7B6]" />
                </IndependentApplicationLink>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
