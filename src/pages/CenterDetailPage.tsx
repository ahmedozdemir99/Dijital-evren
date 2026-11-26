import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Power, Star } from 'lucide-react';
import { getCenterById, getDomainById, getModulesByCenter } from '../core/registry/modules';
import { useAppStore } from '../store/useAppStore';

export function CenterDetailPage() {
  const { centerId } = useParams<{ centerId: string }>();
  const { moduleSettings, toggleModuleEnabled, toggleModuleFavorite } = useAppStore();

  const center = centerId ? getCenterById(centerId) : undefined;
  const domain = center ? getDomainById(center.domainId) : undefined;
  const modules = (centerId ? getModulesByCenter(centerId) : []).slice().sort((a, b) => {
    const oa = moduleSettings.find((s) => s.moduleId === a.id)?.sortOrder ?? 999;
    const ob = moduleSettings.find((s) => s.moduleId === b.id)?.sortOrder ?? 999;
    return oa - ob;
  });

  if (!center) {
    return (
      <div className="py-12 text-center space-y-3">
        <h1 className="text-2xl font-semibold">Merkez bulunamadı</h1>
        <Link to="/" className="text-sm text-[#8C6B32] dark:text-[#D6B782] hover:underline">
          Ana Kontrol Paneline dön
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#546070] dark:text-[#9BA7B6]">
          {domain && (
            <>
              <Link
                to={`/alan/${domain.id}`}
                className="inline-flex items-center gap-1.5 hover:text-[#141923] dark:hover:text-[#F1F3F5]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {domain.romanNumeral}. {domain.name} Alanı
              </Link>
              <span aria-hidden="true">·</span>
            </>
          )}
          <Link
            to="/moduller"
            className="hover:text-[#141923] dark:hover:text-[#F1F3F5]"
          >
            Modül Dizini
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <span
            className="w-3.5 h-3.5 rounded-xs shrink-0"
            style={{ backgroundColor: center.color }}
            aria-hidden="true"
          />
          <h1 className="text-3xl font-semibold text-[#141923] dark:text-[#F1F3F5]">
            {center.name} — {center.subtitle}
          </h1>
        </div>
        <p className="text-sm text-[#546070] dark:text-[#9BA7B6] max-w-2xl">
          {center.description}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modules.map((mod) => {
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
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-[#141923] dark:text-[#F1F3F5]">
                      {mod.name}
                    </h2>
                    <p className="text-xs text-[#546070] dark:text-[#9BA7B6] mt-0.5">
                      {mod.status === 'active'
                        ? `Aktif Modül · Aşama ${mod.stage}`
                        : `Geliştirme Aşamasında · Aşama ${mod.stage}`}
                      {mod.isDataOwner ? ` · Veri Sahibi: ${mod.isDataOwner}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleModuleFavorite(mod.id)}
                      title={isFav ? 'Favorilerden çıkar' : 'Favorilere ekle'}
                      aria-label={`${mod.name} favori`}
                      className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 shrink-0"
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
                      className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 shrink-0"
                    >
                      <Power
                        className={`w-3.5 h-3.5 ${
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

              <div className="pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-3">
                <span className="text-xs text-[#546070] dark:text-[#9BA7B6]">
                  {enabled ? 'Etkin' : 'Devre Dışı'} · Gizlilik: {mod.privacyDomain}
                </span>
                {enabled ? (
                  <Link
                    to={mod.route}
                    className="h-8 inline-flex items-center justify-center gap-1.5 px-3 text-xs font-medium rounded-lg bg-[#8C6B32] dark:bg-[#D6B782] text-white dark:text-[#10151E] hover:opacity-90 whitespace-nowrap shrink-0"
                  >
                    <span>{mod.status === 'active' ? 'Modülü Aç' : 'Durumu Gör'}</span>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                  </Link>
                ) : (
                  <span className="h-8 inline-flex items-center text-xs text-[#546070]">Devre dışı</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
