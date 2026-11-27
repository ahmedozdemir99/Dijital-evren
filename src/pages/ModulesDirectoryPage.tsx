import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Power, Search, Star } from 'lucide-react';
import {
  CENTERS,
  DOMAINS,
  MODULES,
  getCenterById,
  getCentersByDomain,
  getDomainById,
} from '../core/registry/modules';
import type { CenterId, DomainId } from '../core/types/entities';
import { useAppStore } from '../store/useAppStore';

export function ModulesDirectoryPage() {
  const { moduleSettings, toggleModuleEnabled, toggleModuleFavorite } = useAppStore();
  const [selectedDomain, setSelectedDomain] = useState<'all' | DomainId>('all');
  const [selectedCenter, setSelectedCenter] = useState<'all' | CenterId>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'favorites' | 'enabled' | 'disabled'>('all');
  const [query, setQuery] = useState('');

  const visibleCenters = useMemo(
    () => (selectedDomain === 'all'
      ? CENTERS.filter((center) => MODULES.some((mod) => mod.centerId === center.id))
      : getCentersByDomain(selectedDomain)),
    [selectedDomain]
  );

  const filteredModules = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    return MODULES.filter((mod) => {
      const setting = moduleSettings.find((s) => s.moduleId === mod.id);
      const isEnabled = setting?.enabled ?? true;
      const isFav = setting?.isFavorite ?? false;
      const center = getCenterById(mod.centerId);
      if (selectedDomain !== 'all' && center?.domainId !== selectedDomain) return false;
      if (selectedCenter !== 'all' && mod.centerId !== selectedCenter) return false;
      if (statusFilter === 'favorites' && !isFav) return false;
      if (statusFilter === 'enabled' && !isEnabled) return false;
      if (statusFilter === 'disabled' && isEnabled) return false;
      if (
        q &&
        !mod.name.toLocaleLowerCase('tr-TR').includes(q) &&
        !mod.shortDescription.toLocaleLowerCase('tr-TR').includes(q)
      ) {
        return false;
      }
      return true;
    }).sort((a, b) => {
      const oa = moduleSettings.find((s) => s.moduleId === a.id)?.sortOrder ?? 999;
      const ob = moduleSettings.find((s) => s.moduleId === b.id)?.sortOrder ?? 999;
      return oa - ob;
    });
  }, [selectedDomain, selectedCenter, statusFilter, query, moduleSettings]);

  const enabledCount = MODULES.filter(
    (m) => moduleSettings.find((s) => s.moduleId === m.id)?.enabled !== false
  ).length;
  const favCount = MODULES.filter(
    (m) => moduleSettings.find((s) => s.moduleId === m.id)?.isFavorite
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-[#141923] dark:text-[#F1F3F5]">
            Modül Dizini
          </h1>
          <p className="text-sm text-[#546070] dark:text-[#9BA7B6] mt-1 tabular-nums">
            {DOMAINS.length} ana alan ve {CENTERS.length} tematik merkez altında {MODULES.length} işlevsel modül · {enabledCount} etkin · {favCount} favori
          </p>
        </div>

        <div className="h-10 flex items-center gap-2 px-3 rounded-lg bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 w-full md:w-72">
          <Search className="w-4 h-4 text-[#546070] dark:text-[#9BA7B6] shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Modül ara..."
            className="w-full bg-transparent text-sm focus:outline-none"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#EFECE5] dark:bg-[#141B26]">
            <button
              type="button"
              onClick={() => {
                setSelectedDomain('all');
                setSelectedCenter('all');
              }}
              className={`h-8 inline-flex items-center justify-center px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                selectedDomain === 'all'
                  ? 'bg-white dark:bg-[#1C2633] text-[#141923] dark:text-[#F1F3F5] shadow-xs'
                  : 'text-[#546070] dark:text-[#9BA7B6]'
              }`}
            >
              Tüm Alanlar ({MODULES.length})
            </button>
            {DOMAINS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  setSelectedDomain(d.id);
                  setSelectedCenter('all');
                }}
                className={`h-8 inline-flex items-center justify-center px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  selectedDomain === d.id
                    ? 'bg-white dark:bg-[#1C2633] text-[#141923] dark:text-[#F1F3F5] shadow-xs'
                    : 'text-[#546070] dark:text-[#9BA7B6]'
                }`}
              >
                {d.romanNumeral}. {d.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#EFECE5] dark:bg-[#141B26]">
            <button
              type="button"
              onClick={() => setSelectedCenter('all')}
              className={`h-8 inline-flex items-center justify-center px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                selectedCenter === 'all'
                  ? 'bg-white dark:bg-[#1C2633] text-[#141923] dark:text-[#F1F3F5] shadow-xs'
                  : 'text-[#546070] dark:text-[#9BA7B6]'
              }`}
            >
              Tümü ({selectedDomain === 'all' ? MODULES.length : filteredModules.length})
            </button>
            {visibleCenters.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCenter(c.id)}
                className={`h-8 inline-flex items-center justify-center px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  selectedCenter === c.id
                    ? 'bg-white dark:bg-[#1C2633] text-[#141923] dark:text-[#F1F3F5] shadow-xs'
                    : 'text-[#546070] dark:text-[#9BA7B6]'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#EFECE5] dark:bg-[#141B26]">
            {(
              [
                { id: 'all', label: 'Tümü' },
                { id: 'favorites', label: 'Favoriler' },
                { id: 'enabled', label: 'Etkin' },
                { id: 'disabled', label: 'Devre Dışı' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`h-8 inline-flex items-center justify-center px-3 text-xs font-medium rounded-md whitespace-nowrap ${
                  statusFilter === f.id
                    ? 'bg-white dark:bg-[#1C2633] text-[#141923] dark:text-[#F1F3F5] shadow-xs'
                    : 'text-[#546070] dark:text-[#9BA7B6]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredModules.map((mod) => {
          const center = getCenterById(mod.centerId);
          const domain = center ? getDomainById(center.domainId) : undefined;
          const setting = moduleSettings.find((s) => s.moduleId === mod.id);
          const enabled = setting?.enabled ?? true;
          const isFav = setting?.isFavorite ?? false;

          return (
            <div
              key={mod.id}
              className={`p-5 rounded-xl bg-white dark:bg-[#1C2633] border border-black/10 dark:border-white/10 flex flex-col justify-between gap-4 ${
                !enabled ? 'opacity-60' : ''
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-[#546070] dark:text-[#9BA7B6]">
                      <span
                        className="w-2 h-2 rounded-[2px] shrink-0"
                        style={{ backgroundColor: center?.color ?? '#D6B782' }}
                        aria-hidden="true"
                      />
                      <span>{domain?.name}</span>
                      <span aria-hidden="true">·</span>
                      <span>{center?.name}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {mod.status === 'active' ? 'Aktif' : `Aşama ${mod.stage}`}
                      </span>
                    </div>
                    <h2 className="text-xl font-semibold text-[#141923] dark:text-[#F1F3F5] mt-1">
                      {mod.name}
                    </h2>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleModuleFavorite(mod.id)}
                      aria-label="Favori"
                      className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 shrink-0"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          isFav
                            ? 'text-[#D5B477] fill-[#D5B477]'
                            : 'text-[#546070] dark:text-[#9BA7B6]'
                        }`}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleModuleEnabled(mod.id)}
                      aria-label="Etkinleştir / Devre dışı bırak"
                      className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 shrink-0"
                    >
                      <Power
                        className={`w-4 h-4 ${
                          enabled ? 'text-[#93BF90]' : 'text-[#546070] dark:text-[#9BA7B6]'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-[#546070] dark:text-[#9BA7B6] leading-relaxed">
                  {mod.shortDescription}
                </p>
              </div>

              <div className="pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-2 text-xs">
                <span className="text-[#546070] dark:text-[#9BA7B6] truncate">
                  Entegre uygulama
                </span>
                {enabled ? (
                  <Link
                    to={mod.route}
                    className="h-7 inline-flex items-center gap-1 font-medium text-[#8C6B32] dark:text-[#D6B782] hover:underline whitespace-nowrap shrink-0"
                  >
                    <span>{mod.status === 'active' ? 'Aç' : 'Yol Haritası'}</span>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                  </Link>
                ) : (
                  <span className="h-7 inline-flex items-center text-[#546070]">Devre dışı</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredModules.length === 0 && (
        <div className="p-8 text-center rounded-xl bg-white dark:bg-[#1C2633] border border-dashed border-black/15 dark:border-white/15 space-y-2">
          <p className="text-sm text-[#546070] dark:text-[#9BA7B6]">
            Seçili filtre veya arama ölçütüne uyan modül bulunamadı.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedDomain('all');
              setSelectedCenter('all');
              setStatusFilter('all');
              setQuery('');
            }}
            className="h-8 inline-flex items-center justify-center px-3 text-xs font-medium rounded-lg border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5"
          >
            Filtreleri Sıfırla
          </button>
        </div>
      )}
    </div>
  );
}
