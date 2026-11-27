import { useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { EXISTING_APPS_LIST } from '../core/registry/modules';
import { IndependentApplicationLink } from '../integrations/shared/IndependentApplicationLink';
import { useAppStore } from '../store/useAppStore';
import { ApplicationLauncher } from './IntegrationsPage';

export function DashboardPage() {
  const externalApps = useAppStore((state) => state.externalApps);
  const { hash } = useLocation();
  const summaries = EXISTING_APPS_LIST.flatMap(({ appId, name }) => {
    const app = externalApps.find((entry) => entry.appId === appId);
    const progress = app?.sourceProgress;
    return !app?.disabled && progress?.metrics?.length ? [{ appId, name, ...progress }] : [];
  });

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [hash]);

  return (
    <div className="space-y-10">
      <ApplicationLauncher />
      {summaries.length > 0 && (
        <section aria-labelledby="progress-title" className="space-y-3 border-t border-current/10 pt-6">
          <div>
            <h2 id="progress-title" className="text-2xl font-semibold sm:text-3xl">İlerleme</h2>
            <p className="mt-1 text-sm text-[#546070] dark:text-[#9BA7B6]">Bağımsız uygulamalardan aktarılan son ilerleme.</p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-current/10 bg-white dark:bg-[#1C2633]">
            {summaries.map(({ appId, name, metrics, recent }) => (
              <details key={appId} name="application-progress" className="group border-b border-current/10 last:border-0">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 hover:bg-black/5 focus-visible:outline-2 focus-visible:-outline-offset-2 dark:hover:bg-white/5 sm:px-5 [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold sm:text-base">{name}</span>
                    <span className="mt-0.5 block text-xs text-[#546070] dark:text-[#9BA7B6]">
                      {metrics.map(({ label, value }) => `${value} ${label.toLocaleLowerCase('tr-TR')}`).join(' · ')}
                    </span>
                  </span>
                  <ChevronDown aria-hidden="true" className="size-5 shrink-0 group-open:rotate-180" />
                </summary>
                <div className="space-y-4 px-4 pb-4 sm:px-5">
                  {recent?.filter(({ entries }) => entries.length > 0).map(({ label, entries }) => (
                    <div key={label}>
                      <h3 className="text-base font-semibold">{label}</h3>
                      <ul className="mt-1 divide-y divide-current/10">
                        {entries.map(({ id, title, detail }) => (
                          <li key={id} className="break-words px-2 py-2 text-sm">
                            <span className="line-clamp-2 font-medium">{title}</span>
                            {detail && <span className="block text-xs text-[#546070] dark:text-[#9BA7B6]">{detail}</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  <IndependentApplicationLink appId={appId} className="inline-flex min-h-10 items-center text-sm font-semibold underline underline-offset-4">
                    Uygulamayı aç
                  </IndependentApplicationLink>
                </div>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
