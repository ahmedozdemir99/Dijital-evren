import { useEffect, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { EXISTING_APPS_LIST } from '../core/registry/modules';
import { summarizeApplicationProgress } from '../core/services/applicationProgress';
import { localDateIso } from '../core/services/integrationService';
import { useAppStore } from '../store/useAppStore';
import { ApplicationLauncher } from './IntegrationsPage';

const appNames = new Map(EXISTING_APPS_LIST.map(({ appId, name }) => [appId, name]));

export function DashboardPage() {
  const books = useAppStore((state) => state.books);
  const quotes = useAppStore((state) => state.quotes);
  const moduleRecords = useAppStore((state) => state.moduleRecords);
  const { hash } = useLocation();
  const today = localDateIso();
  const summaries = useMemo(
    () => summarizeApplicationProgress({ books, quotes, moduleRecords }, today),
    [books, quotes, moduleRecords, today],
  );

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [hash]);

  return (
    <div className="space-y-10">
      <ApplicationLauncher />
      <section aria-labelledby="progress-title" className="space-y-3 border-t border-current/10 pt-6">
        <div>
          <h2 id="progress-title" className="text-2xl font-semibold sm:text-3xl">İlerleme</h2>
          <p className="mt-1 text-sm text-[#546070] dark:text-[#9BA7B6]">Dijital Evren’e kaydedilen ve yedekten aktarılan veriler.</p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-current/10 bg-white dark:bg-[#1C2633]">
          {summaries.map(({ appId, metrics, recent, href }) => (
            <details key={appId} name="application-progress" className="group border-b border-current/10 last:border-0">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 hover:bg-black/5 focus-visible:outline-2 focus-visible:-outline-offset-2 dark:hover:bg-white/5 sm:px-5 [&::-webkit-details-marker]:hidden">
                <span className="min-w-0">
                  <span className="block text-sm font-semibold sm:text-base">{appNames.get(appId)}</span>
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
                      {entries.map(({ id, title, detail, href: entryHref }) => (
                        <li key={id}>
                          <Link to={entryHref} className="block break-words rounded-lg px-2 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5">
                            <span className="line-clamp-2 font-medium">{title}</span>
                            {detail && <span className="block text-xs text-[#546070] dark:text-[#9BA7B6]">{detail}</span>}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {recent && !recent.some(({ entries }) => entries.length) && <p className="text-sm">Henüz kayıt yok.</p>}
                {href && <Link to={href} className="inline-flex min-h-10 items-center text-sm font-semibold underline underline-offset-4">
                  {appId === 'mihrap-ve-minber' ? 'Derslere git' : 'Dijital Evren kayıtlarını aç'}
                </Link>}
              </div>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
