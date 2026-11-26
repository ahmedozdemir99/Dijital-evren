import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Power, Star } from 'lucide-react';
import {
  getCentersByDomain,
  getDomainById,
  getModulesByCenter,
  getModulesByDomain,
} from '../core/registry/modules';
import { useAppStore } from '../store/useAppStore';

export function DomainDetailPage() {
  const { domainId } = useParams<{ domainId: string }>();
  const { moduleSettings, toggleModuleEnabled, toggleModuleFavorite } = useAppStore();

  const domain = domainId ? getDomainById(domainId) : undefined;
  const centers = domain ? getCentersByDomain(domain.id) : [];
  const domainModules = domain ? getModulesByDomain(domain.id) : [];

  if (!domain) {
    return (
      <div className="py-12 text-center space-y-3">
        <h1 className="text-2xl font-semibold">Ana alan bulunamadı</h1>
        <Link to="/" className="text-sm text-[#8C6B32] dark:text-[#D6B782] hover:underline">
          Ana Kontrol Paneline dön
        </Link>
      </div>
    );
  }

  const enabledCount = domainModules.filter(
    (m) => moduleSettings.find((s) => s.moduleId === m.id)?.enabled !== false
  ).length;

  return (
    <div className="space-y-8">
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#546070] dark:text-[#9BA7B6]">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 hover:text-[#141923] dark:hover:text-[#F1F3F5]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Ana Kontrol Paneli
          </Link>
          <span aria-hidden="true">·</span>
          <Link to="/moduller" className="hover:text-[#141923] dark:hover:text-[#F1F3F5]">
            Modül Dizini
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 shrink-0" aria-hidden="true">
              <span className="w-3.5 h-3.5 rounded-xs" style={{ backgroundColor: domain.color }} />
              <span
                className="w-3.5 h-3.5 rounded-xs"
                style={{ backgroundColor: domain.secondaryColor }}
              />
            </div>
            <h1 className="text-3xl font-semibold text-[#141923] dark:text-[#F1F3F5]">
              {domain.romanNumeral}. {domain.name} — {domain.subtitle}
            </h1>
          </div>

          <span className="text-xs tabular-nums text-[#546070] dark:text-[#9BA7B6]">
            {centers.length} tematik merkez · {enabledCount}/{domainModules.length} etkin modül
          </span>
        </div>

        <p className="text-sm text-[#546070] dark:text-[#9BA7B6] max-w-3xl leading-relaxed">
          {domain.description}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {centers.map((center) => {
          const mods = getModulesByCenter(center.id).slice().sort((a, b) => {
            const oa = moduleSettings.find((s) => s.moduleId === a.id)?.sortOrder ?? 999;
            const ob = moduleSettings.find((s) => s.moduleId === b.id)?.sortOrder ?? 999;
            return oa - ob;
          });
          const centerEnabled = mods.filter(
            (m) => moduleSettings.find((s) => s.moduleId === m.id)?.enabled !== false
          ).length;

          return (
            <section
              key={center.id}
              className="p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 flex flex-col justify-between gap-5"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3 h-3 rounded-[3px] shrink-0"
                        style={{ backgroundColor: center.color }}
                        aria-hidden="true"
                      />
                      <h2 className="text-2xl font-semibold text-[#141923] dark:text-[#F1F3F5]">
                        {center.name}
                      </h2>
                    </div>
                    <p className="text-xs font-medium text-[#546070] dark:text-[#9BA7B6] mt-1">
                      {center.subtitle} ·{' '}
                      <span className="tabular-nums">
                        {centerEnabled}/{mods.length} modül
                      </span>
                    </p>
                  </div>

                  <Link
                    to={`/merkez/${center.id}`}
                    className="h-8 inline-flex items-center justify-center gap-1.5 px-3 text-xs font-medium rounded-lg bg-[#8C6B32] dark:bg-[#D6B782] text-white dark:text-[#10151E] hover:opacity-90 whitespace-nowrap shrink-0"
                  >
                    <span>Merkezi Aç</span>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                  </Link>
                </div>

                <p className="text-sm text-[#546070] dark:text-[#9BA7B6] leading-relaxed">
                  {center.description}
                </p>

                <div className="divide-y divide-black/5 dark:divide-white/5 border-t border-black/5 dark:border-white/5 pt-1">
                  {mods.map((mod) => {
                    const setting = moduleSettings.find((s) => s.moduleId === mod.id);
                    const enabled = setting?.enabled ?? true;
                    const isFav = setting?.isFavorite ?? false;

                    return (
                      <div
                        key={mod.id}
                        className={`py-3 flex items-center justify-between gap-3 ${
                          !enabled ? 'opacity-55' : ''
                        }`}
                      >
                        <div className="min-w-0">
                          {enabled ? (
                            <Link
                              to={mod.route}
                              className="text-sm font-medium text-[#141923] dark:text-[#F1F3F5] hover:text-[#8C6B32] dark:hover:text-[#D6B782] transition-colors truncate block"
                            >
                              {mod.name}
                            </Link>
                          ) : (
                            <span className="text-sm font-medium text-[#546070] dark:text-[#9BA7B6] truncate block">
                              {mod.name}
                            </span>
                          )}
                          <p className="text-xs text-[#546070] dark:text-[#9BA7B6] truncate mt-0.5">
                            {mod.shortDescription}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleModuleFavorite(mod.id)}
                            title={isFav ? 'Favorilerden çıkar' : 'Favorilere ekle'}
                            aria-label={`${mod.name} favori`}
                            className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 shrink-0"
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${
                                isFav
                                  ? 'text-[#D5B477] fill-[#D5B477]'
                                  : 'text-[#546070] dark:text-[#9BA7B6]'
                              }`}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleModuleEnabled(mod.id)}
                            title={enabled ? 'Modülü devre dışı bırak' : 'Modülü etkinleştir'}
                            aria-label={`${mod.name} etkinleştirme`}
                            className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 shrink-0"
                          >
                            <Power
                              className={`w-3.5 h-3.5 ${
                                enabled ? 'text-[#93BF90]' : 'text-[#546070] dark:text-[#9BA7B6]'
                              }`}
                            />
                          </button>
                          {enabled && (
                            <Link
                              to={mod.route}
                              className="h-8 inline-flex items-center justify-center px-2.5 text-xs font-medium rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 whitespace-nowrap shrink-0"
                            >
                              Aç
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
